"""
Job Sync Service - Fetches jobs from Adzuna and JSearch APIs
Implements hybrid approach with deduplication and USA filtering
"""

import os
import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class JobSyncService:
    def __init__(self, db):
        self.db = db
        self.adzuna_app_id = os.getenv("ADZUNA_APP_ID")
        self.adzuna_app_key = os.getenv("ADZUNA_APP_KEY")
        self.rapidapi_key = os.getenv("RAPIDAPI_KEY")
        
    async def sync_adzuna_jobs(self, query: str = "software engineer", max_days_old: int = 3) -> int:
        """Fetch jobs from Adzuna API (unlimited free) - multiple high-intent queries"""
        try:
            if not self.adzuna_app_id or not self.adzuna_app_key:
                logger.warning("Adzuna API credentials not configured")
                return 0
            
            # List of high-intent queries to cycle through
            queries = [
                "software engineer",
                "visa sponsorship", 
                "h1b friendly",
                "work visa",
                "data scientist",
                "product manager",
                "project manager",
                "business analyst",
                "devops engineer",
                "full stack developer"
            ]
            
            total_jobs_added = 0
            
            async with aiohttp.ClientSession() as session:
                for q in queries:
                    try:
                        url = "https://api.adzuna.com/v1/api/jobs/us/search/1"
                        params = {
                            "app_id": self.adzuna_app_id,
                            "app_key": self.adzuna_app_key,
                            "results_per_page": 50,
                            "what": q,
                            "max_days_old": max_days_old,  # Only jobs from last 3 days (72 hours)
                            "sort_by": "date"
                        }
                        
                        async with session.get(url, params=params, timeout=30) as response:
                            if response.status != 200:
                                logger.error(f"Adzuna error for query '{q}': {response.status}")
                                continue
                                
                            data = await response.json()
                    
                            jobs_added_this_query = 0
                            for job_data in data.get("results", []):
                                job = self._normalize_adzuna_job(job_data)
                                if await self._is_usa_job(job):
                                    categorized_job = await self._categorize_job(job)
                                    # Add tag based on query for easier filtering if needed
                                    if "visa" in q or "h1b" in q:
                                        if "visa-sponsoring" not in categorized_job.get("categoryTags", []):
                                             categorized_job.setdefault("categoryTags", []).append("visa-sponsoring")
                                             
                                    if await self._save_job(categorized_job):
                                        jobs_added_this_query += 1
                                        
                            total_jobs_added += jobs_added_this_query
                            logger.info(f"Adzuna query '{q}': {jobs_added_this_query} new jobs added")
                            
                            # Small delay to be nice to the API
                            await asyncio.sleep(1)
                            
                    except Exception as e:
                        logger.error(f"Error in Adzuna loop for '{q}': {e}")
                        continue
            
            # Update sync status
            await self.db.job_sync_status.update_one(
                {"source": "adzuna"},
                {
                    "$set": {
                        "last_sync": datetime.utcnow(),
                        "jobs_added": total_jobs_added,
                        "status": "success"
                    }
                },
                upsert=True
            )
            
            logger.info(f"Adzuna sync cycle completed: {total_jobs_added} total jobs added across {len(queries)} queries")
            return total_jobs_added
            
        except Exception as e:
            logger.error(f"Adzuna sync failed: {str(e)}")
            await self.db.job_sync_status.update_one(
                {"source": "adzuna"},
                {
                    "$set": {
                        "last_sync": datetime.utcnow(),
                        "status": "failed",
                        "error": str(e)
                    }
                },
                upsert=True
            )
            return 0
    
    async def sync_jsearch_jobs(self, query: str = "software engineer") -> int:
        """Fetch jobs from JSearch API (200 free requests/month)"""
        try:
            if not self.rapidapi_key:
                logger.warning("RapidAPI key not configured")
                return 0
            
            url = "https://jsearch.p.rapidapi.com/search"
            headers = {
                "X-RapidAPI-Key": self.rapidapi_key,
                "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
            }
            params = {
                "query": query,
                "page": "1",
                "num_pages": "1",
                "date_posted": "today",
                "country": "us"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, params=params, timeout=30) as response:
                    response.raise_for_status()
                    data = await response.json()
            
            jobs_added = 0
            for job_data in data.get("data", []):
                job = self._normalize_jsearch_job(job_data)
                if await self._is_usa_job(job):
                    categorized_job = await self._categorize_job(job)
                    if await self._save_job(categorized_job):
                        jobs_added += 1
            
            # Update sync status
            await self.db.job_sync_status.update_one(
                {"source": "jsearch"},
                {
                    "$set": {
                        "last_sync": datetime.utcnow(),
                        "jobs_added": jobs_added,
                        "status": "success"
                    }
                },
                upsert=True
            )
            
            logger.info(f"JSearch sync completed: {jobs_added} jobs added")
            return jobs_added
            
        except Exception as e:
            logger.error(f"JSearch sync failed: {str(e)}")
            await self.db.job_sync_status.update_one(
                {"source": "jsearch"},
                {
                    "$set": {
                        "last_sync": datetime.utcnow(),
                        "status": "failed",
                        "error": str(e)
                    }
                },
                upsert=True
            )
            return 0
    
    def _normalize_adzuna_job(self, job_data: Dict) -> Dict:
        """Normalize Adzuna job data to common format"""
        return {
            "job_id": f"adzuna_{job_data.get('id', '')}",
            "source": "adzuna",
            "title": job_data.get("title", ""),
            "company": job_data.get("company", {}).get("display_name", ""),
            "location": job_data.get("location", {}).get("display_name", ""),
            "description": job_data.get("description", ""),
            "url": job_data.get("redirect_url", ""),
            "salary_min": job_data.get("salary_min"),
            "salary_max": job_data.get("salary_max"),
            "posted_date": job_data.get("created"),
            "contract_type": job_data.get("contract_type"),
            "category": job_data.get("category", {}).get("label", ""),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "country": "us"
        }
    
    def _normalize_jsearch_job(self, job_data: Dict) -> Dict:
        """Normalize JSearch job data to common format"""
        return {
            "job_id": f"jsearch_{job_data.get('job_id', '')}",
            "source": "jsearch",
            "title": job_data.get("job_title", ""),
            "company": job_data.get("employer_name", ""),
            "location": f"{job_data.get('job_city', '')}, {job_data.get('job_state', '')}",
            "description": job_data.get("job_description", ""),
            "url": job_data.get("job_apply_link", ""),
            "salary_min": job_data.get("job_min_salary"),
            "salary_max": job_data.get("job_max_salary"),
            "posted_date": job_data.get("job_posted_at_datetime_utc"),
            "contract_type": job_data.get("job_employment_type"),
            "is_remote": job_data.get("job_is_remote", False),
            "job_highlights": job_data.get("job_highlights", {}),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "country": "us"
        }
    
    async def _is_usa_job(self, job: Dict) -> bool:
        """Strict USA-only filtering - reject any non-USA jobs"""
        location = job.get("location", "").lower()
        
        # Explicit rejection of non-USA countries
        non_usa_indicators = [
            "uk", "gb", "united kingdom", "england", "scotland", "wales",
            "canada", "ca", "toronto", "vancouver", "montreal",
            "india", "in", "bangalore", "mumbai", "delhi", "hyderabad",
            "australia", "au", "sydney", "melbourne",
            "germany", "de", "berlin", "munich",
            "france", "fr", "paris",
            "china", "cn", "beijing", "shanghai",
            "japan", "jp", "tokyo",
            "singapore", "sg",
            "ireland", "ie", "dublin",
            "netherlands", "nl", "amsterdam",
            "remote - worldwide", "remote worldwide", "anywhere"
        ]
        
        # REJECT if contains any non-USA indicator
        for indicator in non_usa_indicators:
            if indicator in location:
                return False
        
        # Positive USA indicators
        usa_keywords = ["united states", "usa", "u.s.", "us,", ", us"]
        if any(keyword in location for keyword in usa_keywords):
            return True
        
        # USA state names and abbreviations (comprehensive list)
        usa_states = {
            # Full names
            "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
            "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
            "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana",
            "maine", "maryland", "massachusetts", "michigan", "minnesota",
            "mississippi", "missouri", "montana", "nebraska", "nevada",
            "new hampshire", "new jersey", "new mexico", "new york",
            "north carolina", "north dakota", "ohio", "oklahoma", "oregon",
            "pennsylvania", "rhode island", "south carolina", "south dakota",
            "tennessee", "texas", "utah", "vermont", "virginia", "washington",
            "west virginia", "wisconsin", "wyoming",
            # Abbreviations
            "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga",
            "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md",
            "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj",
            "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc",
            "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy",
            # Major cities (helps catch USA jobs)
            "new york", "los angeles", "chicago", "houston", "phoenix",
            "philadelphia", "san antonio", "san diego", "dallas", "san jose",
            "austin", "jacksonville", "fort worth", "columbus", "charlotte",
            "san francisco", "indianapolis", "seattle", "denver", "washington",
            "boston", "nashville", "detroit", "portland", "las vegas",
            "memphis", "louisville", "baltimore", "milwaukee", "albuquerque",
            "tucson", "fresno", "sacramento", "atlanta", "kansas city",
            "colorado springs", "miami", "raleigh", "omaha", "long beach",
            "virginia beach", "oakland", "minneapolis", "tulsa", "tampa"
        }
        
        # Check for state names/abbreviations in location
        location_parts = [part.strip().lower() for part in location.split(",")]
        for part in location_parts:
            if part in usa_states:
                return True
            # Check if part contains a state name
            for state in usa_states:
                if state in part:
                    return True
        
        # Default to REJECT if we can't confirm it's USA
        return False
    
    async def _categorize_job(self, job: Dict) -> Dict:
        """Categorize job (sponsoring, high-paying, startup)"""
        title = job.get("title", "").lower()
        description = job.get("description", "").lower()
        salary_max = job.get("salary_max", 0) or 0
        
        categories = []
        
        # High-paying (>$150k)
        if salary_max > 150000:
            categories.append("high_paying")
        
        # Sponsorship
        sponsorship_keywords = ["visa", "sponsorship", "h1b", "green card", "work authorization"]
        if any(keyword in description for keyword in sponsorship_keywords):
            categories.append("sponsoring")
        else:
            categories.append("non_sponsoring")
        
        # Startups
        startup_keywords = ["startup", "early stage", "seed", "series a", "series b"]
        if any(keyword in description for keyword in startup_keywords):
            categories.append("startup")
        
        job["categories"] = categories
        
        # Calculate hours since posted
        if job.get("posted_date"):
            try:
                if isinstance(job["posted_date"], str):
                    posted_dt = datetime.fromisoformat(job["posted_date"].replace("Z", "+00:00"))
                else:
                    posted_dt = job["posted_date"]
                
                hours_since_posted = (datetime.utcnow() - posted_dt.replace(tzinfo=None)).total_seconds() / 3600
                job["posted_within_hours"] = int(hours_since_posted)
            except:
                job["posted_within_hours"] = None
        
        return job
    
    async def _save_job(self, job: Dict) -> bool:
        """Save job to database with deduplication"""
        try:
            # Check if job already exists
            existing = await self.db.jobs.find_one({
                "$or": [
                    {"job_id": job["job_id"]},
                    {
                        "title": job["title"],
                        "company": job["company"],
                        "location": job["location"]
                    }
                ]
            })
            
            if existing:
                # Update if this is newer or from a better source
                if job.get("posted_date") and existing.get("posted_date"):
                    if job["posted_date"] > existing["posted_date"]:
                        await self.db.jobs.update_one(
                            {"_id": existing["_id"]},
                            {"$set": job}
                        )
                        return True
                return False
            else:
                # Insert new job
                await self.db.jobs.insert_one(job)
                return True
                
        except Exception as e:
            logger.error(f"Error saving job: {str(e)}")
            return False
    
    
    async def get_sync_status(self) -> Dict:
        """Get status of last sync operations"""
        adzuna_status = await self.db.job_sync_status.find_one({"source": "adzuna"})
        jsearch_status = await self.db.job_sync_status.find_one({"source": "jsearch"})
        
        total_jobs = await self.db.jobs.count_documents({})
        recent_jobs = await self.db.jobs.count_documents({
            "created_at": {"$gte": datetime.utcnow() - timedelta(hours=1)}
        })
        
        return {
            "adzuna": adzuna_status or {"status": "never_run"},
            "jsearch": jsearch_status or {"status": "never_run"},
            "total_jobs": total_jobs,
            "jobs_last_hour": recent_jobs
        }
    
    async def cleanup_old_jobs(self) -> int:
        """Remove jobs older than 72 hours (3 days)"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(hours=72)
            
            # Delete jobs older than 72 hours
            result = await self.db.jobs.delete_many({
                "created_at": {"$lt": cutoff_date}
            })
            
            deleted_count = result.deleted_count
            logger.info(f"Cleanup completed: {deleted_count} old jobs removed (older than 72 hours)")
            
            # Update cleanup status
            await self.db.job_sync_status.update_one(
                {"source": "cleanup"},
                {
                    "$set": {
                        "last_cleanup": datetime.utcnow(),
                        "jobs_deleted": deleted_count,
                        "status": "success"
                    }
                },
                upsert=True
            )
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Cleanup failed: {str(e)}")
            await self.db.job_sync_status.update_one(
                {"source": "cleanup"},
                {
                    "$set": {
                        "last_cleanup": datetime.utcnow(),
                        "status": "failed",
                        "error": str(e)
                    }
                },
                upsert=True
            )
            return 0
    
    async def cleanup_non_usa_jobs(self) -> int:
        """Remove all non-USA jobs from database"""
        try:
            # List of non-USA country indicators to search for
            non_usa_patterns = [
                "uk", "gb", "united kingdom", "england", "scotland", "wales",
                "canada", "toronto", "vancouver", "montreal",
                "india", "bangalore", "mumbai", "delhi", "hyderabad",
                "australia", "sydney", "melbourne",
                "germany", "berlin", "munich",
                "france", "paris",
                "china", "beijing", "shanghai",
                "japan", "tokyo",
                "singapore",
                "ireland", "dublin",
                "netherlands", "amsterdam"
            ]
            
            # Build regex pattern for all non-USA indicators
            pattern = "|".join(non_usa_patterns)
            
            # Delete jobs with non-USA locations
            result = await self.db.jobs.delete_many({
                "location": {"$regex": pattern, "$options": "i"}
            })
            
            deleted_count = result.deleted_count
            logger.info(f"Non-USA cleanup completed: {deleted_count} non-USA jobs removed")
            
            # Update cleanup status
            await self.db.job_sync_status.update_one(
                {"source": "non_usa_cleanup"},
                {
                    "$set": {
                        "last_cleanup": datetime.utcnow(),
                        "jobs_deleted": deleted_count,
                        "status": "success"
                    }
                },
                upsert=True
            )
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Non-USA cleanup failed: {str(e)}")
            await self.db.job_sync_status.update_one(
                {"source": "non_usa_cleanup"},
                {
                    "$set": {
                        "last_cleanup": datetime.utcnow(),
                        "status": "failed",
                        "error": str(e)
                    }
                },
                upsert=True
            )
            return 0
