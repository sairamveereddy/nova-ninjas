"""
Job Sync Service - Fetches jobs from Adzuna and JSearch APIs
Implements hybrid approach with deduplication and USA filtering
"""

import os
import requests
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
        """Fetch jobs from Adzuna API (unlimited free) - only jobs from last 3 days"""
        try:
            if not self.adzuna_app_id or not self.adzuna_app_key:
                logger.warning("Adzuna API credentials not configured")
                return 0
            
            url = "https://api.adzuna.com/v1/api/jobs/us/search/1"
            params = {
                "app_id": self.adzuna_app_id,
                "app_key": self.adzuna_app_key,
                "results_per_page": 50,
                "what": query,
                "max_days_old": max_days_old,  # Only jobs from last 3 days (72 hours)
                "sort_by": "date"
            }
            
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            jobs_added = 0
            for job_data in data.get("results", []):
                job = self._normalize_adzuna_job(job_data)
                if await self._is_usa_job(job):
                    categorized_job = await self._categorize_job(job)
                    if await self._save_job(categorized_job):
                        jobs_added += 1
            
            # Update sync status
            await self.db.job_sync_status.update_one(
                {"source": "adzuna"},
                {
                    "$set": {
                        "last_sync": datetime.utcnow(),
                        "jobs_added": jobs_added,
                        "status": "success"
                    }
                },
                upsert=True
            )
            
            logger.info(f"Adzuna sync completed: {jobs_added} jobs added")
            return jobs_added
            
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
            
            response = requests.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
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
            "updated_at": datetime.utcnow()
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
            "updated_at": datetime.utcnow()
        }
    
    async def _is_usa_job(self, job: Dict) -> bool:
        """Check if job is in USA"""
        location = job.get("location", "").lower()
        usa_keywords = ["united states", "usa", "us", "america"]
        
        # Check for USA state abbreviations
        usa_states = [
            "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga",
            "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md",
            "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj",
            "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc",
            "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy"
        ]
        
        # Check if location contains USA keywords or state codes
        if any(keyword in location for keyword in usa_keywords):
            return True
        
        # Check for state abbreviations
        location_parts = location.split(",")
        for part in location_parts:
            part = part.strip().lower()
            if part in usa_states:
                return True
        
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
