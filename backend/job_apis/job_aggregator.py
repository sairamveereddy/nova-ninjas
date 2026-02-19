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

logger = logging.getLogger(__name__)

class JobAggregator:
    def __init__(self, db):
        """
        Initialize job aggregator
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.adzuna = AdzunaService()
        self.jsearch = JSearchService()
        self.usajobs = USAJobsService()
        self.rss = RSSJobService()
        
    async def aggregate_all_jobs(
        self,
        use_adzuna: bool = True,
        use_jsearch: bool = False, # DISABLED: Quota Exceeded (429)
        use_usajobs: bool = True,
        use_rss: bool = True,
        max_adzuna_pages: int = 20,
        max_jsearch_queries: int = 10
    ) -> Dict[str, Any]:
        """
        Aggregate jobs from all enabled sources
        
        Args:
            use_adzuna: Whether to fetch from Adzuna
            use_jsearch: Whether to fetch from JSearch
            use_usajobs: Whether to fetch from USAJobs
            max_adzuna_pages: Max pages to fetch from Ad

zuna
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
        
        # Fetch from Direct ATS (Greenhouse & Lever)
        try:
            logger.info("Fetching jobs from Greenhouse & Lever...")
            from job_fetcher import fetch_greenhouse_jobs, fetch_lever_jobs
            
            gh_jobs = await fetch_greenhouse_jobs()
            lev_jobs = await fetch_lever_jobs()
            
            all_jobs.extend(gh_jobs)
            all_jobs.extend(lev_jobs)
            
            stats["greenhouse"] = len(gh_jobs)
            stats["lever"] = len(lev_jobs)
            logger.info(f"Fetched {len(gh_jobs)} Greenhouse jobs and {len(lev_jobs)} Lever jobs")
        except Exception as e:
            logger.error(f"Error fetching ATS jobs: {e}")
            stats["errors"].append(f"ATS: {str(e)}")
                
        stats["total_fetched"] = len(all_jobs)
        logger.info(f"Total jobs fetched from all sources: {len(all_jobs)}")
        
        # Deduplicate jobs
        unique_jobs = self._deduplicate_jobs(all_jobs)
        stats["total_unique"] = len(unique_jobs)
        logger.info(f"Unique jobs after deduplication: {len(unique_jobs)}")
        
        # Store in MongoDB
        stored_count = await self._store_jobs(unique_jobs)
        stats["total_stored"] = stored_count
        
        elapsed_time = (datetime.now() - start_time).total_seconds()
        stats["elapsed_seconds"] = elapsed_time
        
        logger.info(f"Job aggregation completed in {elapsed_time:.1f}s. Stored {stored_count} jobs.")
        
        return stats
        
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
        Store jobs in MongoDB, avoiding duplicates
        
        Args:
            jobs: List of job dictionaries
            
        Returns:
            Number of jobs stored
        """
        if not jobs:
            return 0
            
        stored_count = 0
        
        for job in jobs:
            try:
                # Add metadata
                job['createdAt'] = datetime.now()
                job['updatedAt'] = datetime.now()
                
                # Upsert based on URL (or title+company if no URL)
                filter_query = {}
                if job.get('url'):
                    filter_query = {"url": job['url']}
                else:
                    filter_query = {
                        "title": job.get('title'),
                        "company": job.get('company')
                    }
                    
                result = await self.db.jobs.update_one(
                    filter_query,
                    {"$set": job},
                    upsert=True
                )
                
                if result.upserted_id or result.modified_count > 0:
                    stored_count += 1
                    
            except Exception as e:
                logger.error(f"Error storing job {job.get('title', 'Unknown')}: {e}")
                
        logger.info(f"Stored {stored_count} jobs in MongoDB")
        return stored_count
        
    async def refresh_jobs_light(self) -> Dict[str, Any]:
        """
        Light refresh - fetch a smaller number of jobs for daily updates
        Uses fewer API calls to stay within free tier limits
        """
        logger.info("Running light job refresh...")
        
        return await self.aggregate_all_jobs(
            use_adzuna=True,
            use_jsearch=True,
            use_usajobs=False,  # Skip federal jobs for light refresh
            max_adzuna_pages=5,  # Only 5 pages = ~250 jobs
            max_jsearch_queries=3  # Only 3 queries to conserve API calls
        )
        
    async def get_job_stats(self) -> Dict[str, Any]:
        """
        Get statistics about jobs in the database
        
        Returns:
            Dictionary with job statistics
        """
        try:
            total_jobs = self.db.jobs.count_documents({})
            
            # Count by source
            by_source = {}
            for source in ["Adzuna", "JSearch", "USAJobs.gov"]:
                count = self.db.jobs.count_documents({"source": source})
                by_source[source] = count
            
            # Count RSS sources
            rss_sources = await self.db.jobs.distinct('source', {"source": {"$regex": "^RSS-"}})
            for s in rss_sources:
                count = await self.db.jobs.count_documents({"source": s})
                by_source[s] = count
                
            # Count by work type
            by_work_type = {}
            for work_type in ["Remote", "Hybrid", "On-site"]:
                count = self.db.jobs.count_documents({"workType": work_type})
                by_work_type[work_type] = count
                
            return {
                "total_jobs": total_jobs,
                "by_source": by_source,
                "by_work_type": by_work_type
            }
        except Exception as e:
            logger.error(f"Error getting job stats: {e}")
            return {"error": str(e)}
