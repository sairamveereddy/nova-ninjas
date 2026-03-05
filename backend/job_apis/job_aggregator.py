"""
Job Aggregator - Orchestrates all job sources
Fetches, deduplicates, and stores jobs from multiple APIs
"""
import asyncio
import logging
from typing import List, Dict, Any, Set
from datetime import datetime
from pymongo import MongoClient
import os

from job_apis.adzuna_service import AdzunaService
from job_apis.jsearch_service import JSearchService
from job_apis.usajobs_service import USAJobsService
from job_apis.rss_service import RSSJobService
from supabase_service import SupabaseService

import logging
print("LOADED NEW JOB AGGREGATOR")
logger = logging.getLogger(__name__)

class JobAggregator:
    def __init__(self):
        """
        Initialize job aggregator
        """
        self.db = None
        self.adzuna = AdzunaService()
        self.jsearch = JSearchService()
        self.usajobs = USAJobsService()
        self.rss = RSSJobService()
        
    async def aggregate_all_jobs(
        self,
        use_adzuna: bool = False, 
        use_jsearch: bool = False, # Changed to False by default
        use_usajobs: bool = True,
        use_rss: bool = True,
        max_adzuna_pages: int = 10,
        max_jsearch_queries: int = 10
    ) -> Dict[str, Any]:
        """
        Aggregate jobs from all enabled sources
        
        Args:
            use_adzuna: Whether to fetch from Adzuna
            use_jsearch: Whether to fetch from JSearch
            use_usajobs: Whether to fetch from USAJobs
            max_adzuna_pages: Max pages to fetch from Adzuna
            max_jsearch_queries: Number of different job queries for JSearch
            
        Returns:
            Dictionary with stats about the aggregation
        """
        logger.info("Starting job aggregation from multiple sources...")
        start_time = datetime.now()
        
        all_jobs = []
        stats = {
            "adzuna": 0,
            "jsearch": 0,
            "usajobs": 0,
            "rss": 0,
            "total_fetched": 0,
            "total_unique": 0,
            "total_stored": 0,
            "errors": []
        }
        
        # Fetch from Adzuna (US Only)
        if use_adzuna:
            try:
                logger.info("Fetching jobs from Adzuna (US)...")
                # Increased pages to get more jobs as requested
                adzuna_jobs = await self.adzuna.fetch_multiple_pages(country='us', max_pages=50) 
                all_jobs.extend(adzuna_jobs)
                stats["adzuna"] += len(adzuna_jobs)
                logger.info(f"Fetched {len(adzuna_jobs)} jobs from Adzuna (US)")
            except Exception as e:
                logger.error(f"Error fetching Adzuna jobs: {e}")
                stats["errors"].append(f"Adzuna: {str(e)}")
                
        # Fetch from JSearch with multiple queries
        if use_jsearch:
            try:
                logger.info("Fetching jobs from JSearch...")
                popular_queries = [
                    "software engineer",
                    "full stack developer",
                    "frontend developer", 
                    "backend developer",
                    "data scientist",
                    "product manager",
                    "devops engineer",
                    "site reliability engineer",
                    "machine learning engineer",
                    "artificial intelligence engineer",
                    "marketing manager",
                    "sales representative",
                    "account executive",
                    "business analyst", 
                    "project manager",
                    "hr manager",
                    "recruiter"
                ]
                jsearch_jobs = await self.jsearch.fetch_multiple_queries(
                    queries=popular_queries[:max_jsearch_queries],
                    pages_per_query=3
                )
                all_jobs.extend(jsearch_jobs)
                stats["jsearch"] = len(jsearch_jobs)
                logger.info(f"Fetched {len(jsearch_jobs)} jobs from JSearch")
            except Exception as e:
                logger.error(f"Error fetching JSearch jobs: {e}")
                stats["errors"].append(f"JSearch: {str(e)}")
                
        # Fetch from USAJobs
        if use_usajobs:
            try:
                logger.info("Fetching jobs from USAJobs.gov...")
                usajobs_jobs = await self.usajobs.fetch_all_pages(max_results=20000)
                all_jobs.extend(usajobs_jobs)
                stats["usajobs"] = len(usajobs_jobs)
                logger.info(f"Fetched {len(usajobs_jobs)} jobs from USAJobs.gov")
            except Exception as e:
                logger.error(f"Error fetching USAJobs: {e}")
                stats["errors"].append(f"USAJobs: {str(e)}")
                
        # Fetch from RSS feeds
        if use_rss:
            try:
                logger.info("Fetching jobs from RSS feeds...")
                rss_jobs = await self.rss.fetch_popular_usa_jobs()
                all_jobs.extend(rss_jobs)
                stats["rss"] = len(rss_jobs)
                logger.info(f"Fetched {len(rss_jobs)} jobs from RSS feeds")
            except Exception as e:
                logger.error(f"Error fetching RSS jobs: {e}")
                stats["errors"].append(f"RSS: {str(e)}")
        
        # Fetch from Direct ATS (Greenhouse & Lever & Ashby)
        try:
            logger.info("Fetching jobs from Greenhouse & Lever & Ashby...")
            from job_fetcher import fetch_greenhouse_jobs, fetch_lever_jobs, fetch_ashby_jobs
            
            # 1. Greenhouse (expanded to 60+ companies)
            gh_companies = [
                "stripe", "openai", "anthropic", "scale", "databricks", 
                "pinterest", "gusto", "notion", "airtable", "roblox",
                "cruise", "twitch", "discord", "plaid", "brex", "ramp",
                "benchling", "faire", "verkada", "kearney", "fivetran",
                "grammarly", "lattice", "dbt", "coda", "webflow", "duolingo",
                "lemonade", "chime", "affirm", "cloudflare", "dropbox",
                # New additions
                "anduril", "rippling", "wiz-inc", "vanta", "snyk",
                "hashicorp", "gitlab", "datadog", "elastic", "confluent",
                "cockroachlabs", "samsara", "toast", "bill", "marqeta",
                "thoughtspot", "allbirds", "peloton-interactive", "rivian",
                "lucid-motors", "joby-aviation", "relativity-space",
                "flexport", "miro", "calendly", "zapier", "canva",
                "supabase", "vercel", "netlify", "clickup", "asana",
                "monday", "amplitude", "mixpanel", "segment",
                "twilio", "sendgrid", "contentful", "auth0",
                "retool", "airbyte", "dbt-labs", "stytch",
            ]
            import random
            random.shuffle(gh_companies)
            target_gh = gh_companies[:25] # Fetch from 25 random companies
            
            gh_jobs = []
            for company in target_gh:
                try:
                    jobs = await fetch_greenhouse_jobs(company)
                    gh_jobs.extend(jobs)
                except Exception as e:
                    logger.error(f"Failed GH fetch for {company}: {e}")

            # 2. Lever (expanded to 30+ companies)
            lev_companies = [
                "netflix", "atlassian", "lyft", "palantir", "figma",
                "benchling", "plaid", "affirm", "box", "sprout-social",
                "udemy", "eventbrite", "farfetch", "instacart",
                # New additions
                "postman", "sourcegraph", "render", "supabase",
                "loom", "notion", "descript", "pitch",
                "replit", "assembly", "sanity-io", "ghost",
                "clerk", "neon", "turso", "railway",
            ]
            random.shuffle(lev_companies)
            target_lev = lev_companies[:15]
            
            lev_jobs = []
            for company in target_lev:
                try:
                    jobs = await fetch_lever_jobs(company)
                    lev_jobs.extend(jobs)
                except Exception as e:
                    logger.error(f"Failed Lever fetch for {company}: {e}")

            # 3. Ashby (expanded to 25+ companies)
            ashby_companies = [
                "deel", "ramp", "remote", "notion", "airtable",
                "webflow", "retell", "clay", "perplexity", "modal", "linear",
                # New additions
                "cursor", "cohere", "mistral", "together-ai",
                "weights-biases", "labelbox", "runway", "stability-ai",
                "descript", "jasper", "copy-ai", "writer",
                "assembled", "ashby",
            ]
            random.shuffle(ashby_companies)
            target_ashby = ashby_companies[:15]
            
            ashby_jobs = []
            for company in target_ashby:
                try:
                    company_jobs = await fetch_ashby_jobs(company)
                    ashby_jobs.extend(company_jobs)
                except Exception as e:
                    logger.error(f"Failed Ashby fetch for {company}: {e}")

            all_jobs.extend(gh_jobs)
            all_jobs.extend(lev_jobs)
            all_jobs.extend(ashby_jobs)
            
            stats["greenhouse"] = len(gh_jobs)
            stats["lever"] = len(lev_jobs)
            stats["ashby"] = len(ashby_jobs)
            logger.info(f"Fetched {len(gh_jobs)} Greenhouse, {len(lev_jobs)} Lever, {len(ashby_jobs)} Ashby jobs")
            
        except Exception as e:
            logger.error(f"Error fetching ATS jobs: {e}")
            stats["errors"].append(f"ATS: {str(e)}")
                
        stats["total_fetched"] = len(all_jobs)
        logger.info(f"Total jobs fetched from all sources: {len(all_jobs)}")

        # --- USER REQUESTED FILTERING ---
        # Exclude: Adzuna, ZipRecruiter, Monster, Dice, Indeed, "Easy Apply"
        # Keep: Greenhouse, Lever, Ashby, Company Career Sites, LinkedIn (Non-Easy Apply)
        filtered_jobs = []
        excluded_sources = {'adzuna', 'ziprecruiter', 'monster', 'dice', 'indeed'}
        
        for job in all_jobs:
            url = (job.get('url') or job.get('sourceUrl') or '').lower()
            publisher = (job.get('publisher') or '').lower()
            source = (job.get('source') or '').lower()
            title = (job.get('title') or '').lower()
            description = (job.get('description') or '').lower()
            
            # 1. Block known excluded sources
            is_excluded = False
            for ex in excluded_sources:
                if ex in publisher or ex in source or ex in url:
                    is_excluded = True
                    break
            
            if is_excluded:
                continue
            
            # 2. LinkedIn Easy Apply Filter
            # Heuristic: LinkedIn jobs that are ONLY on LinkedIn (no greenhouse/lever/direct links)
            # are likely Easy Apply if we found them via a general search.
            if 'linkedin.com' in url:
                # If there's no indicator of a carrier site in the URL, it might be easy apply
                career_indicators = ['greenhouse.io', 'lever.co', 'ashbyhq.com', 'apply.', 'careers.', 'jobs.', 'workdayjobs.com', 'breezy.hr']
                has_career_site = any(ind in url for ind in career_indicators)
                
                # Check description for "easy apply" or similar keywords
                is_easy_apply = "easy apply" in description or "easy apply" in title
                
                if is_easy_apply or (not has_career_site and 'linkedin.com/jobs/view' in url):
                    logger.debug(f"Skipping likely LinkedIn Easy Apply: {job.get('title')} @ {job.get('company')}")
                    continue

            filtered_jobs.append(job)
            
        logger.info(f"Filtered {len(all_jobs)} down to {len(filtered_jobs)} jobs after applying exclusion rules.")
        all_jobs = filtered_jobs
        
        # Deduplicate jobs
        unique_jobs = self._deduplicate_jobs(all_jobs)
        stats["total_unique"] = len(unique_jobs)
        logger.info(f"Unique jobs after deduplication: {len(unique_jobs)}")
        
        # Store in Supabase
        stored_count = await self._store_jobs(unique_jobs)
        stats["total_stored"] = stored_count
        
        elapsed_time = (datetime.now() - start_time).total_seconds()
        stats["elapsed_seconds"] = elapsed_time
        
        logger.info(f"Job aggregation completed in {elapsed_time:.1f}s. Stored {stored_count} jobs in Supabase.")
        
        return stats
        
    def generate_hr_contacts(self, company_name: str) -> List[Dict[str, str]]:
        """Generate 2-3 deterministic mock HR contacts for a company"""
        import hashlib
        h = hashlib.md5(company_name.encode()).hexdigest()
        
        first_names = ["Sarah", "David", "Emily", "Michael", "Jessica", "Robert", "Jennifer", "William", "Linda", "Richard"]
        last_names = ["Miller", "Chen", "Wilson", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin"]
        roles = ["Senior Talent Acquisition", "Technical Recruiter", "HR Manager", "University Recruiting", "People Operations"]
        
        contacts = []
        # Use parts of the hash to pick names and roles
        for i in range(2):
            idx1 = int(h[i*4 : i*4+2], 16) % len(first_names)
            idx2 = int(h[i*4+2 : i*4+4], 16) % len(last_names)
            idx3 = int(h[i*4+4 : i*4+6], 16) % len(roles)
            
            name = f"{first_names[idx1]} {last_names[idx2]}"
            email_name = f"{first_names[idx1][0].lower()}.{last_names[idx2].lower()}"
            domain = company_name.lower().replace(" ", "").replace("&", "").replace("-", "")
            if not domain: domain = "company"
            
            contacts.append({
                "name": name,
                "role": roles[idx3],
                "email": f"{email_name}@{domain}.com"
            })
        return contacts
        
    def _deduplicate_jobs(self, jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Remove duplicate jobs based on URL and title+company combo
        
        Args:
            jobs: List of job dictionaries
            
        Returns:
            List of unique jobs
        """
        seen_urls: Set[str] = set()
        seen_combos: Set[str] = set()
        unique_jobs = []
        
        for job in jobs:
            url = job.get('url', '').strip().lower()
            title = job.get('title', '').strip().lower()
            company = job.get('company', '').strip().lower()
            combo = f"{title}|{company}"
            
            # Skip if we've seen this URL or title+company combo
            if url and url in seen_urls:
                continue
            if combo in seen_combos:
                continue
                
            # Add to seen sets
            if url:
                seen_urls.add(url)
            seen_combos.add(combo)
            
            unique_jobs.append(job)
            
        duplicates_removed = len(jobs) - len(unique_jobs)
        logger.info(f"Removed {duplicates_removed} duplicate jobs")
        
        return unique_jobs
        
    async def _store_jobs(self, jobs: List[Dict[str, Any]]) -> int:
        """
        Store jobs in Supabase with smart deduplication and updates.
        Preserves rich descriptions if new fetch returns snippets.
        """
        if not jobs:
            return 0
            
        stored_count = 0
        
        for job in jobs:
            try:
                # Add metadata (ISO strings for Supabase)
                now_iso = datetime.now().isoformat()
                job['created_at'] = now_iso
                job['updated_at'] = now_iso
                
                # Add HR contacts if missing
                if not job.get('hr_contacts'):
                    job['hr_contacts'] = self.generate_hr_contacts(job.get('company', 'Unknown'))
                
                # Determine stable job_id for cross-source deduplication
                import hashlib
                title = (job.get('title') or '').strip().lower()
                company = (job.get('company') or '').strip().lower()
                location = (job.get('location') or '').strip().lower()
                
                # Create a stable content hash (title + company + location)
                # This ensures the same job from different sources results in a single entry
                unique_string = f"{title}|{company}|{location}"
                job['job_id'] = hashlib.md5(unique_string.encode()).hexdigest()[:24]
                
                # Check for existing job to perform smart update
                job_id = job.get('job_id')
                existing = SupabaseService.get_job_by_external_id(job_id) if job_id else None
                
                if existing:
                    # SMART UPDATE LOGIC
                    old_desc = existing.get("description", "") or ""
                    new_desc = job.get("description", "") or ""
                    
                    # If existing has a long description and new is short
                    # KEEP EXISTING description
                    if len(old_desc) > len(new_desc) + 100:
                        job["description"] = old_desc
                            
                # Final cleanup
                job.pop('createdAt', None)
                job.pop('updatedAt', None)
                job.pop('fullDescription', None)
                            
                # Upsert to Supabase
                SupabaseService.upsert_job(job)
                stored_count += 1
                
            except Exception as e:
                logger.error(f"Error processing job {job.get('title', 'Unknown')}: {e}")
                continue
                
        logger.info(f"Stored {stored_count} jobs in Supabase")
        return stored_count
        
    async def refresh_jobs_light(self) -> Dict[str, Any]:
        """
        Light refresh - fetch a smaller number of jobs for daily updates
        Uses fewer API calls to stay within free tier limits
        """
        logger.info("Running light job refresh...")
        
        return await self.aggregate_all_jobs(
            use_adzuna=False,
            use_jsearch=True,
            use_usajobs=False,  # Skip federal jobs for light refresh
            max_adzuna_pages=5,  # Only 5 pages = ~250 jobs
            max_jsearch_queries=5  # Only 3 queries to conserve API calls
        )
        
    async def get_job_stats(self) -> Dict[str, Any]:
        """
        Get statistics about jobs in the database (Supabase)
        
        Returns:
            Dictionary with job statistics
        """
        return SupabaseService.get_job_stats_24h()
