"""
Job Fetcher Module
Fetches real job listings from Adzuna API every 24 hours
"""

import aiohttp
import asyncio
import os
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
import re

logger = logging.getLogger(__name__)

# Adzuna API Configuration
ADZUNA_APP_ID = os.environ.get('ADZUNA_APP_ID', '')
ADZUNA_API_KEY = os.environ.get('ADZUNA_API_KEY', '')

# Visa sponsorship keywords to detect
VISA_KEYWORDS = [
    'visa sponsorship', 'h1b', 'h-1b', 'sponsor visa', 'work authorization',
    'will sponsor', 'sponsorship available', 'visa sponsor', 'immigration sponsorship',
    'green card', 'work visa', 'employment visa', 'opt', 'cpt', 'ead'
]

# High-paying threshold
HIGH_PAY_THRESHOLD = 120000


def detect_visa_sponsorship(text: str) -> bool:
    """Check if job description mentions visa sponsorship"""
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in VISA_KEYWORDS)


def detect_work_type(title: str, description: str) -> str:
    """Detect if job is remote, hybrid, or onsite"""
    text = f"{title} {description}".lower()
    if 'remote' in text or 'work from home' in text or 'wfh' in text:
        return 'remote'
    elif 'hybrid' in text:
        return 'hybrid'
    return 'onsite'


def extract_salary_range(job: Dict) -> tuple:
    """Extract salary min and max from job data"""
    salary_min = job.get('salary_min', 0) or 0
    salary_max = job.get('salary_max', 0) or 0
    
    # If no salary, try to extract from description
    if not salary_min and not salary_max:
        desc = job.get('description', '')
        # Look for patterns like $100,000 or $100k
        salary_matches = re.findall(r'\$(\d{2,3}),?(\d{3})?[kK]?', desc)
        if salary_matches:
            try:
                first_match = salary_matches[0]
                if first_match[1]:
                    salary_min = int(first_match[0] + first_match[1])
                else:
                    salary_min = int(first_match[0]) * 1000
            except:
                pass
    
    return salary_min, salary_max


def format_salary_range(salary_min: int, salary_max: int) -> str:
    """Format salary range as string"""
    if salary_min and salary_max:
        return f"${salary_min:,} - ${salary_max:,}"
    elif salary_min:
        return f"${salary_min:,}+"
    elif salary_max:
        return f"Up to ${salary_max:,}"
    return "Competitive"


async def fetch_jobs_from_adzuna(
    country: str = "us",
    what: str = "software engineer",
    results_per_page: int = 50,
    page: int = 1,
    max_days_old: int = 1,
    where: str = ""
) -> List[Dict[str, Any]]:
    """
    Fetch jobs from Adzuna API
    
    Args:
        country: Country code (us, gb, ca, au, etc.)
        what: Job search keywords
        results_per_page: Number of results per page (max 50)
        page: Page number
        max_days_old: Only show jobs posted in the last N days
        where: Location filter
    
    Returns:
        List of job dictionaries
    """
    if not ADZUNA_APP_ID or not ADZUNA_API_KEY:
        logger.warning("Adzuna API credentials not configured. Using sample data.")
        return []
    
    url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/{page}"
    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_API_KEY,
        "results_per_page": results_per_page,
        "what": what,
        "max_days_old": max_days_old,
        "sort_by": "date",
        "content-type": "application/json"
    }
    
    if where:
        params["where"] = where
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, timeout=30) as response:
                if response.status != 200:
                    logger.error(f"Adzuna API error: {response.status}")
                    return []
                
                data = await response.json()
                jobs = []
                
                for job in data.get("results", []):
                    salary_min, salary_max = extract_salary_range(job)
                    description = job.get("description", "")
                    title = job.get("title", "")
                    
                    # Detect visa sponsorship
                    is_visa_friendly = detect_visa_sponsorship(description)
                    
                    # Detect work type
                    work_type = detect_work_type(title, description)
                    
                    # Check if high paying
                    is_high_pay = salary_min >= HIGH_PAY_THRESHOLD or salary_max >= HIGH_PAY_THRESHOLD
                    
                    # Build tags
                    tags = []
                    if is_visa_friendly:
                        tags.append("visa-sponsoring")
                    if is_high_pay:
                        tags.append("high-paying")
                    if work_type == "remote":
                        tags.append("remote")
                    
                    job_data = {
                        "externalId": str(job.get("id", "")),
                        "title": title,
                        "company": job.get("company", {}).get("display_name", "Unknown Company"),
                        "location": job.get("location", {}).get("display_name", "Unknown Location"),
                        "description": description,
                        "salaryRange": format_salary_range(salary_min, salary_max),
                        "salaryMin": salary_min,
                        "salaryMax": salary_max,
                        "sourceUrl": job.get("redirect_url", ""),
                        "source": "adzuna",
                        "type": work_type,
                        "visaTags": ["visa-sponsoring"] if is_visa_friendly else [],
                        "categoryTags": tags,
                        "highPay": is_high_pay,
                        "createdAt": datetime.now(timezone.utc),
                        "updatedAt": datetime.now(timezone.utc),
                        "expiresAt": None,
                        "isActive": True
                    }
                    jobs.append(job_data)
                
                logger.info(f"Fetched {len(jobs)} jobs from Adzuna")
                return jobs
                
    except asyncio.TimeoutError:
        logger.error("Adzuna API request timed out")
        return []
    except Exception as e:
        logger.error(f"Error fetching jobs from Adzuna: {e}")
        return []


async def fetch_all_job_categories() -> List[Dict[str, Any]]:
    """
    Fetch thousands of jobs from multiple categories, pages, and locations
    """
    # Expanded job categories
    categories = [
        "software engineer",
        "senior software engineer",
        "data scientist", 
        "data engineer",
        "product manager",
        "machine learning engineer",
        "AI engineer",
        "frontend developer",
        "backend developer",
        "full stack developer",
        "devops engineer",
        "cloud engineer",
        "site reliability engineer",
        "data analyst",
        "business analyst",
        "python developer",
        "java developer",
        "javascript developer",
        "react developer",
        "node.js developer",
        "aws engineer",
        "azure engineer",
        "security engineer",
        "QA engineer",
        "mobile developer",
        "iOS developer",
        "android developer",
        "blockchain developer",
        "systems engineer",
        "network engineer",
        "database administrator",
        "project manager IT",
        "scrum master",
        "technical lead",
        "solutions architect",
        "UX designer",
        "UI developer"
    ]
    
    # Major tech hub locations
    locations = [
        "",  # No filter - all US
        "New York",
        "San Francisco",
        "Seattle",
        "Austin",
        "Boston",
        "Los Angeles",
        "Chicago",
        "Denver",
        "Atlanta",
        "Remote"
    ]
    
    all_jobs = []
    
    # Fetch jobs for each category
    for category in categories:
        for page in range(1, 4):  # Fetch 3 pages per category (150 jobs per category)
            logger.info(f"Fetching {category} - page {page}")
            try:
                jobs = await fetch_jobs_from_adzuna(
                    what=category, 
                    results_per_page=50,
                    page=page,
                    max_days_old=3  # Jobs from last 3 days
                )
                all_jobs.extend(jobs)
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.3)
            except Exception as e:
                logger.error(f"Error fetching {category} page {page}: {e}")
                continue
    
    # Also fetch by location for key categories
    key_categories = ["software engineer", "data scientist", "devops engineer", "product manager"]
    for location in locations[1:6]:  # Top 5 locations
        for category in key_categories:
            logger.info(f"Fetching {category} in {location}")
            try:
                jobs = await fetch_jobs_from_adzuna(
                    what=category,
                    results_per_page=50,
                    page=1,
                    max_days_old=3,
                    where=location
                )
                all_jobs.extend(jobs)
                await asyncio.sleep(0.3)
            except Exception as e:
                logger.error(f"Error fetching {category} in {location}: {e}")
                continue
    
    # Remove duplicates based on externalId
    seen_ids = set()
    unique_jobs = []
    for job in all_jobs:
        if job["externalId"] not in seen_ids:
            seen_ids.add(job["externalId"])
            unique_jobs.append(job)
    
    logger.info(f"🎯 Total unique jobs fetched: {len(unique_jobs)}")
    return unique_jobs


async def update_jobs_in_database(db, jobs: List[Dict[str, Any]]) -> int:
    """
    Update jobs in MongoDB database
    
    Args:
        db: MongoDB database instance
        jobs: List of job dictionaries
    
    Returns:
        Number of jobs updated
    """
    if not jobs:
        logger.warning("No jobs to update")
        return 0
    
    try:
        # Mark old jobs as inactive instead of deleting
        await db.jobs.update_many(
            {"source": "adzuna"},
            {"$set": {"isActive": False}}
        )
        
        # Insert new jobs (upsert based on externalId) - all new jobs are active
        for job in jobs:
            job["isActive"] = True  # Ensure new jobs are active
            await db.jobs.update_one(
                {"externalId": job["externalId"]},
                {"$set": job},
                upsert=True
            )
        
        # Also mark all freshly inserted jobs as active
        external_ids = [job["externalId"] for job in jobs]
        await db.jobs.update_many(
            {"externalId": {"$in": external_ids}},
            {"$set": {"isActive": True}}
        )
        
        logger.info(f"Updated {len(jobs)} jobs in database")
        return len(jobs)
        
    except Exception as e:
        logger.error(f"Error updating jobs in database: {e}")
        return 0


# Scheduler function to be called periodically
async def scheduled_job_fetch(db):
    """
    Main function to fetch and update jobs
    Called by the scheduler every 24 hours
    """
    logger.info("🔄 Starting scheduled job fetch...")
    
    try:
        jobs = await fetch_all_job_categories()
        count = await update_jobs_in_database(db, jobs)
        logger.info(f"✅ Scheduled job fetch complete. Updated {count} jobs.")
        return count
    except Exception as e:
        logger.error(f"❌ Scheduled job fetch failed: {e}")
        return 0

