"""
Job Fetcher Module - Multi-Source Edition
Fetches 5000+ real job listings from multiple free APIs:
- Adzuna API (general jobs)
- RemoteOK API (remote jobs - NO API KEY NEEDED)
- Remotive API (remote tech jobs - NO API KEY NEEDED)
- Arbeitnow API (EU/remote jobs - NO API KEY NEEDED)
- Jobicy API (remote jobs - NO API KEY NEEDED)
- Y Combinator Jobs RSS (startup jobs - NO API KEY NEEDED)
"""

import aiohttp
import asyncio
import os
import logging
import feedparser
import hashlib
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import re
import json

logger = logging.getLogger(__name__)

# =============================================================================
# API Configuration
# =============================================================================

# Adzuna API (requires API key)
ADZUNA_APP_ID = os.environ.get('ADZUNA_APP_ID', '')
ADZUNA_API_KEY = os.environ.get('ADZUNA_API_KEY', '')

# Free APIs (NO API KEYS NEEDED!)
REMOTEOK_API_URL = "https://remoteok.com/api"
REMOTIVE_API_URL = "https://remotive.com/api/remote-jobs"
ARBEITNOW_API_URL = "https://www.arbeitnow.com/api/job-board-api"
JOBICY_API_URL = "https://jobicy.com/api/v2/remote-jobs"
YC_JOBS_RSS_URL = "https://www.ycombinator.com/jobs/rss"

# =============================================================================
# Constants
# =============================================================================

VISA_KEYWORDS = [
    'visa sponsorship', 'h1b', 'h-1b', 'sponsor visa', 'work authorization',
    'will sponsor', 'sponsorship available', 'visa sponsor', 'immigration sponsorship',
    'green card', 'work visa', 'employment visa', 'opt', 'cpt', 'ead'
]

STARTUP_KEYWORDS = [
    'startup', 'start-up', 'seed', 'series a', 'series b', 'early stage',
    'venture', 'funded', 'yc', 'y combinator', 'techstars', '500 startups'
]

HIGH_PAY_THRESHOLD = 120000

# =============================================================================
# Helper Functions
# =============================================================================

def generate_job_id(source: str, title: str, company: str) -> str:
    """Generate a unique ID for jobs without an external ID"""
    unique_string = f"{source}-{title}-{company}".lower()
    return hashlib.md5(unique_string.encode()).hexdigest()[:16]


def detect_visa_sponsorship(text: str) -> bool:
    """Check if job description mentions visa sponsorship"""
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in VISA_KEYWORDS)


def detect_startup(text: str, company: str) -> bool:
    """Check if job is at a startup"""
    combined = f"{text} {company}".lower()
    return any(keyword in combined for keyword in STARTUP_KEYWORDS)


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
    
    if not salary_min and not salary_max:
        desc = str(job.get('description', ''))
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


def clean_html(text: str) -> str:
    """Remove HTML tags from text"""
    if not text:
        return ""
    clean = re.sub(r'<[^>]+>', '', str(text))
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean[:2000]  # Limit description length


def build_job_tags(job_data: Dict) -> List[str]:
    """Build tags for a job"""
    tags = []
    
    if job_data.get('visaTags'):
        tags.append("visa-sponsoring")
    if job_data.get('highPay'):
        tags.append("high-paying")
    if job_data.get('type') == 'remote':
        tags.append("remote")
    if job_data.get('isStartup'):
        tags.append("startup")
    
    return tags


# =============================================================================
# API 1: Adzuna (Requires API Key)
# =============================================================================

async def fetch_jobs_from_adzuna(
    country: str = "us",
    what: str = "software engineer",
    results_per_page: int = 50,
    page: int = 1,
    max_days_old: int = 3,
    where: str = ""
) -> List[Dict[str, Any]]:
    """Fetch jobs from Adzuna API"""
    if not ADZUNA_APP_ID or not ADZUNA_API_KEY:
        logger.warning("Adzuna API credentials not configured. Skipping Adzuna.")
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
                    company = job.get("company", {}).get("display_name", "Unknown Company")
                    
                    is_visa_friendly = detect_visa_sponsorship(description)
                    is_startup = detect_startup(description, company)
                    work_type = detect_work_type(title, description)
                    is_high_pay = salary_min >= HIGH_PAY_THRESHOLD or salary_max >= HIGH_PAY_THRESHOLD
                    
                    tags = []
                    if is_visa_friendly:
                        tags.append("visa-sponsoring")
                    if is_high_pay:
                        tags.append("high-paying")
                    if work_type == "remote":
                        tags.append("remote")
                    if is_startup:
                        tags.append("startup")
                    
                    job_data = {
                        "externalId": f"adzuna-{job.get('id', '')}",
                        "title": title,
                        "company": company,
                        "location": job.get("location", {}).get("display_name", "Unknown Location"),
                        "description": clean_html(description),
                        "salaryRange": format_salary_range(salary_min, salary_max),
                        "salaryMin": salary_min,
                        "salaryMax": salary_max,
                        "sourceUrl": job.get("redirect_url", ""),
                        "source": "adzuna",
                        "type": work_type,
                        "visaTags": ["visa-sponsoring"] if is_visa_friendly else [],
                        "categoryTags": tags,
                        "highPay": is_high_pay,
                        "isStartup": is_startup,
                        "createdAt": datetime.now(timezone.utc),
                        "updatedAt": datetime.now(timezone.utc),
                        "expiresAt": None,
                        "isActive": True,
                        "country": country  # Explicitly save country code
                    }
                    jobs.append(job_data)
                
                logger.info(f"✅ Adzuna: Fetched {len(jobs)} jobs for '{what}'")
                return jobs
                
    except asyncio.TimeoutError:
        logger.error("Adzuna API request timed out")
        return []
    except Exception as e:
        logger.error(f"Error fetching jobs from Adzuna: {e}")
        return []


# =============================================================================
# API 2: RemoteOK (FREE - No API Key!)
# =============================================================================

async def fetch_jobs_from_remoteok() -> List[Dict[str, Any]]:
    """
    Fetch remote jobs from RemoteOK API
    FREE API - No authentication required!
    Returns 200-400 remote jobs
    """
    try:
        headers = {
            "User-Agent": "NovaNinjas/1.0 (Job Aggregator)"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(REMOTEOK_API_URL, headers=headers, timeout=30) as response:
                if response.status != 200:
                    logger.error(f"RemoteOK API error: {response.status}")
                    return []
                
                data = await response.json()
                jobs = []
                
                # First item is usually metadata, skip it
                job_list = data[1:] if len(data) > 1 else data
                
                for job in job_list:
                    if not isinstance(job, dict):
                        continue
                    
                    title = job.get("position", "")
                    company = job.get("company", "Unknown Company")
                    description = job.get("description", "")
                    
                    # Parse salary
                    salary_min = 0
                    salary_max = 0
                    salary_str = job.get("salary", "")
                    if salary_str:
                        salary_matches = re.findall(r'\d+', salary_str.replace(',', ''))
                        if len(salary_matches) >= 2:
                            salary_min = int(salary_matches[0]) * 1000 if int(salary_matches[0]) < 1000 else int(salary_matches[0])
                            salary_max = int(salary_matches[1]) * 1000 if int(salary_matches[1]) < 1000 else int(salary_matches[1])
                        elif len(salary_matches) == 1:
                            salary_min = int(salary_matches[0]) * 1000 if int(salary_matches[0]) < 1000 else int(salary_matches[0])
                    
                    is_visa_friendly = detect_visa_sponsorship(description)
                    is_startup = detect_startup(description, company)
                    is_high_pay = salary_min >= HIGH_PAY_THRESHOLD or salary_max >= HIGH_PAY_THRESHOLD
                    
                    tags = ["remote"]
                    if is_visa_friendly:
                        tags.append("visa-sponsoring")
                    if is_high_pay:
                        tags.append("high-paying")
                    if is_startup:
                        tags.append("startup")
                    
                    # Get tags from API
                    api_tags = job.get("tags", [])
                    if isinstance(api_tags, list):
                        for tag in api_tags[:5]:
                            if tag and tag.lower() not in [t.lower() for t in tags]:
                                tags.append(tag.lower())
                    
                    location = job.get("location", "Remote")
                    if not location or location.lower() == "remote":
                        location = "Remote / Worldwide"
                    
                    job_data = {
                        "externalId": f"remoteok-{job.get('id', generate_job_id('remoteok', title, company))}",
                        "title": title,
                        "company": company,
                        "location": location,
                        "description": clean_html(description),
                        "salaryRange": format_salary_range(salary_min, salary_max),
                        "salaryMin": salary_min,
                        "salaryMax": salary_max,
                        "sourceUrl": job.get("url", job.get("apply_url", "")),
                        "source": "remoteok",
                        "type": "remote",
                        "visaTags": ["visa-sponsoring"] if is_visa_friendly else [],
                        "categoryTags": tags,
                        "highPay": is_high_pay,
                        "isStartup": is_startup,
                        "companyLogo": job.get("company_logo", job.get("logo", "")),
                        "createdAt": datetime.now(timezone.utc),
                        "updatedAt": datetime.now(timezone.utc),
                        "expiresAt": None,
                        "isActive": True,
                        "country": "us" if "united states" in location.lower() or "usa" in location.lower() or "remote" in location.lower() else "us" # Default to US for remote jobs
                    }
                    jobs.append(job_data)
                
                logger.info(f"✅ RemoteOK: Fetched {len(jobs)} remote jobs")
                return jobs
                
    except Exception as e:
        logger.error(f"Error fetching jobs from RemoteOK: {e}")
        return []


# =============================================================================
# API 3: Remotive (FREE - No API Key!)
# =============================================================================

async def fetch_jobs_from_remotive(category: str = None, limit: int = 500) -> List[Dict[str, Any]]:
    """
    Fetch remote tech jobs from Remotive API
    FREE API - No authentication required!
    
    Categories: software-dev, customer-support, design, marketing, sales, product, etc.
    """
    try:
        params = {"limit": limit}
        if category:
            params["category"] = category
        
        async with aiohttp.ClientSession() as session:
            async with session.get(REMOTIVE_API_URL, params=params, timeout=30) as response:
                if response.status != 200:
                    logger.error(f"Remotive API error: {response.status}")
                    return []
                
                data = await response.json()
                jobs = []
                
                for job in data.get("jobs", []):
                    title = job.get("title", "")
                    company = job.get("company_name", "Unknown Company")
                    description = job.get("description", "")
                    
                    # Parse salary from description
                    salary_min, salary_max = 0, 0
                    salary_text = job.get("salary", "") or description
                    salary_matches = re.findall(r'\$(\d{2,3}),?(\d{3})?', str(salary_text))
                    if salary_matches:
                        try:
                            first_match = salary_matches[0]
                            if first_match[1]:
                                salary_min = int(first_match[0] + first_match[1])
                            else:
                                salary_min = int(first_match[0]) * 1000
                        except:
                            pass
                    
                    is_visa_friendly = detect_visa_sponsorship(description)
                    is_startup = detect_startup(description, company)
                    is_high_pay = salary_min >= HIGH_PAY_THRESHOLD or salary_max >= HIGH_PAY_THRESHOLD
                    
                    tags = ["remote"]
                    if is_visa_friendly:
                        tags.append("visa-sponsoring")
                    if is_high_pay:
                        tags.append("high-paying")
                    if is_startup:
                        tags.append("startup")
                    
                    # Add job type tag
                    job_type = job.get("job_type", "")
                    if job_type:
                        tags.append(job_type.lower().replace("_", "-"))
                    
                    location = job.get("candidate_required_location", "Remote")
                    if not location:
                        location = "Remote / Worldwide"
                    
                    job_data = {
                        "externalId": f"remotive-{job.get('id', generate_job_id('remotive', title, company))}",
                        "title": title,
                        "company": company,
                        "location": location,
                        "description": clean_html(description),
                        "salaryRange": format_salary_range(salary_min, salary_max),
                        "salaryMin": salary_min,
                        "salaryMax": salary_max,
                        "sourceUrl": job.get("url", ""),
                        "source": "remotive",
                        "type": "remote",
                        "visaTags": ["visa-sponsoring"] if is_visa_friendly else [],
                        "categoryTags": tags,
                        "highPay": is_high_pay,
                        "isStartup": is_startup,
                        "companyLogo": job.get("company_logo", ""),
                        "category": job.get("category", ""),
                        "createdAt": datetime.now(timezone.utc),
                        "updatedAt": datetime.now(timezone.utc),
                        "expiresAt": None,
                        "isActive": True,
                        "country": "us" if "united states" in location.lower() or "usa" in location.lower() or "remote" in location.lower() else "us"
                    }
                    jobs.append(job_data)
                
                logger.info(f"✅ Remotive: Fetched {len(jobs)} remote tech jobs")
                return jobs
                
    except Exception as e:
        logger.error(f"Error fetching jobs from Remotive: {e}")
        return []


# =============================================================================
# API 4: Arbeitnow (FREE - No API Key!)
# =============================================================================

async def fetch_jobs_from_arbeitnow(page: int = 1) -> List[Dict[str, Any]]:
    """
    Fetch jobs from Arbeitnow API (EU + Remote jobs)
    FREE API - No authentication required!
    """
    try:
        params = {"page": page}
        
        async with aiohttp.ClientSession() as session:
            async with session.get(ARBEITNOW_API_URL, params=params, timeout=30) as response:
                if response.status != 200:
                    logger.error(f"Arbeitnow API error: {response.status}")
                    return []
                
                data = await response.json()
                jobs = []
                
                for job in data.get("data", []):
                    title = job.get("title", "")
                    company = job.get("company_name", "Unknown Company")
                    description = job.get("description", "")
                    
                    is_remote = job.get("remote", False)
                    is_visa_friendly = detect_visa_sponsorship(description)
                    is_startup = detect_startup(description, company)
                    work_type = "remote" if is_remote else detect_work_type(title, description)
                    
                    tags = []
                    if is_remote:
                        tags.append("remote")
                    if is_visa_friendly:
                        tags.append("visa-sponsoring")
                    if is_startup:
                        tags.append("startup")
                    
                    # Add job tags from API
                    api_tags = job.get("tags", [])
                    if isinstance(api_tags, list):
                        for tag in api_tags[:5]:
                            if tag and tag.lower() not in [t.lower() for t in tags]:
                                tags.append(tag.lower())
                    
                    location = job.get("location", "")
                    if is_remote and not location:
                        location = "Remote / EU"
                    
                    job_data = {
                        "externalId": f"arbeitnow-{job.get('slug', generate_job_id('arbeitnow', title, company))}",
                        "title": title,
                        "company": company,
                        "location": location,
                        "description": clean_html(description),
                        "salaryRange": "Competitive",
                        "salaryMin": 0,
                        "salaryMax": 0,
                        "sourceUrl": job.get("url", ""),
                        "source": "arbeitnow",
                        "type": work_type,
                        "visaTags": ["visa-sponsoring"] if is_visa_friendly else [],
                        "categoryTags": tags,
                        "highPay": False,
                        "isStartup": is_startup,
                        "createdAt": datetime.now(timezone.utc),
                        "updatedAt": datetime.now(timezone.utc),
                        "expiresAt": None,
                        "isActive": True
                    }
                    jobs.append(job_data)
                
                logger.info(f"✅ Arbeitnow: Fetched {len(jobs)} jobs (page {page})")
                return jobs
                
    except Exception as e:
        logger.error(f"Error fetching jobs from Arbeitnow: {e}")
        return []


# =============================================================================
# API 5: Jobicy (FREE - No API Key!)
# =============================================================================

async def fetch_jobs_from_jobicy(count: int = 50, geo: str = None, industry: str = None) -> List[Dict[str, Any]]:
    """
    Fetch remote jobs from Jobicy API
    FREE API - No authentication required!
    
    Geo options: usa, uk, europe, asia, africa, oceania, anywhere
    Industry options: marketing, design, development, customer-support, etc.
    """
    try:
        params = {"count": count, "tag": "remote"}
        if geo:
            params["geo"] = geo
        if industry:
            params["industry"] = industry
        
        async with aiohttp.ClientSession() as session:
            async with session.get(JOBICY_API_URL, params=params, timeout=30) as response:
                if response.status != 200:
                    logger.error(f"Jobicy API error: {response.status}")
                    return []
                
                data = await response.json()
                jobs = []
                
                for job in data.get("jobs", []):
                    title = job.get("jobTitle", "")
                    company = job.get("companyName", "Unknown Company")
                    description = job.get("jobDescription", "")
                    
                    # Parse salary
                    salary_min = 0
                    salary_max = 0
                    annual_salary_min = job.get("annualSalaryMin")
                    annual_salary_max = job.get("annualSalaryMax")
                    if annual_salary_min:
                        try:
                            salary_min = int(annual_salary_min)
                        except:
                            pass
                    if annual_salary_max:
                        try:
                            salary_max = int(annual_salary_max)
                        except:
                            pass
                    
                    is_visa_friendly = detect_visa_sponsorship(description)
                    is_startup = detect_startup(description, company)
                    is_high_pay = salary_min >= HIGH_PAY_THRESHOLD or salary_max >= HIGH_PAY_THRESHOLD
                    
                    tags = ["remote"]
                    if is_visa_friendly:
                        tags.append("visa-sponsoring")
                    if is_high_pay:
                        tags.append("high-paying")
                    if is_startup:
                        tags.append("startup")
                    
                    # Add job type
                    job_type = job.get("jobType", "")
                    if job_type and job_type.lower() not in [t.lower() for t in tags]:
                        tags.append(job_type.lower().replace(" ", "-"))
                    
                    # Add industry
                    industry_tag = job.get("jobIndustry", "")
                    if industry_tag:
                        for ind in industry_tag:
                            if ind and ind.lower() not in [t.lower() for t in tags]:
                                tags.append(ind.lower())
                    
                    location = job.get("jobGeo", "Remote")
                    if not location:
                        location = "Remote / Worldwide"
                    
                    job_data = {
                        "externalId": f"jobicy-{job.get('id', generate_job_id('jobicy', title, company))}",
                        "title": title,
                        "company": company,
                        "location": location,
                        "description": clean_html(description),
                        "salaryRange": format_salary_range(salary_min, salary_max),
                        "salaryMin": salary_min,
                        "salaryMax": salary_max,
                        "sourceUrl": job.get("url", ""),
                        "source": "jobicy",
                        "type": "remote",
                        "visaTags": ["visa-sponsoring"] if is_visa_friendly else [],
                        "categoryTags": tags,
                        "highPay": is_high_pay,
                        "isStartup": is_startup,
                        "companyLogo": job.get("companyLogo", ""),
                        "createdAt": datetime.now(timezone.utc),
                        "updatedAt": datetime.now(timezone.utc),
                        "expiresAt": None,
                        "isActive": True
                    }
                    jobs.append(job_data)
                
                logger.info(f"✅ Jobicy: Fetched {len(jobs)} remote jobs")
                return jobs
                
    except Exception as e:
        logger.error(f"Error fetching jobs from Jobicy: {e}")
        return []


# =============================================================================
# API 6: Y Combinator Jobs RSS (FREE - Startup Jobs!)
# =============================================================================

async def fetch_jobs_from_yc_rss() -> List[Dict[str, Any]]:
    """
    Fetch startup jobs from Y Combinator RSS feed
    FREE - No authentication required!
    All jobs are from YC-backed startups
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(YC_JOBS_RSS_URL, timeout=30) as response:
                if response.status != 200:
                    logger.error(f"YC Jobs RSS error: {response.status}")
                    return []
                
                content = await response.text()
        
        # Parse RSS feed
        feed = feedparser.parse(content)
        jobs = []
        
        for entry in feed.entries:
            title = entry.get("title", "")
            
            # Parse company from title (usually "Company - Job Title" or "Job Title at Company")
            company = "YC Startup"
            if " at " in title:
                parts = title.split(" at ")
                if len(parts) >= 2:
                    title = parts[0].strip()
                    company = parts[1].strip()
            elif " - " in title:
                parts = title.split(" - ")
                if len(parts) >= 2:
                    company = parts[0].strip()
                    title = parts[1].strip()
            
            description = entry.get("summary", entry.get("description", ""))
            link = entry.get("link", "")
            
            is_visa_friendly = detect_visa_sponsorship(description)
            work_type = detect_work_type(title, description)
            
            tags = ["startup", "yc-backed"]
            if work_type == "remote":
                tags.append("remote")
            if is_visa_friendly:
                tags.append("visa-sponsoring")
            
            job_data = {
                "externalId": f"yc-{generate_job_id('yc', title, company)}",
                "title": title,
                "company": company,
                "location": "San Francisco Bay Area / Remote",
                "description": clean_html(description),
                "salaryRange": "Competitive + Equity",
                "salaryMin": 0,
                "salaryMax": 0,
                "sourceUrl": link,
                "source": "ycombinator",
                "type": work_type,
                "visaTags": ["visa-sponsoring"] if is_visa_friendly else [],
                "categoryTags": tags,
                "highPay": True,  # YC startups typically pay well
                "isStartup": True,
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc),
                "expiresAt": None,
                "isActive": True
            }
            jobs.append(job_data)
        
        logger.info(f"✅ YC Jobs: Fetched {len(jobs)} startup jobs")
        return jobs
        
    except Exception as e:
        logger.error(f"Error fetching jobs from YC RSS: {e}")
        return []


# =============================================================================
# Aggregation Functions
# =============================================================================

async def fetch_all_adzuna_jobs() -> List[Dict[str, Any]]:
    """Fetch jobs from Adzuna across multiple categories"""
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
        "security engineer",
        "QA engineer",
        "mobile developer",
        "iOS developer",
        "android developer",
        "systems engineer",
        "technical lead",
        "solutions architect",
        "UX designer",
        "startup jobs",
        "early stage startup",
    ]
    
    all_jobs = []
    
    for category in categories:
        for page in range(1, 3):  # 2 pages per category
            try:
                jobs = await fetch_jobs_from_adzuna(
                    what=category, 
                    results_per_page=50,
                    page=page,
                    max_days_old=3
                )
                all_jobs.extend(jobs)
                await asyncio.sleep(0.2)
            except Exception as e:
                logger.error(f"Error fetching Adzuna {category} page {page}: {e}")
                continue
    
    return all_jobs


async def fetch_all_arbeitnow_jobs() -> List[Dict[str, Any]]:
    """Fetch multiple pages from Arbeitnow"""
    all_jobs = []
    
    for page in range(1, 6):  # 5 pages
        try:
            jobs = await fetch_jobs_from_arbeitnow(page=page)
            all_jobs.extend(jobs)
            await asyncio.sleep(0.2)
        except Exception as e:
            logger.error(f"Error fetching Arbeitnow page {page}: {e}")
            continue
    
    return all_jobs


async def fetch_all_jobicy_jobs() -> List[Dict[str, Any]]:
    """Fetch jobs from Jobicy with different filters"""
    all_jobs = []
    
    # Different geo locations
    geos = ["usa", "uk", "europe", "anywhere"]
    # Different industries
    industries = ["development", "design", "marketing", "customer-support"]
    
    for geo in geos:
        try:
            jobs = await fetch_jobs_from_jobicy(count=50, geo=geo)
            all_jobs.extend(jobs)
            await asyncio.sleep(0.2)
        except Exception as e:
            logger.error(f"Error fetching Jobicy geo={geo}: {e}")
    
    for industry in industries:
        try:
            jobs = await fetch_jobs_from_jobicy(count=50, industry=industry)
            all_jobs.extend(jobs)
            await asyncio.sleep(0.2)
        except Exception as e:
            logger.error(f"Error fetching Jobicy industry={industry}: {e}")
    
    return all_jobs


async def fetch_all_remotive_jobs() -> List[Dict[str, Any]]:
    """Fetch jobs from Remotive with different categories"""
    categories = [
        "software-dev",
        "customer-support", 
        "design",
        "marketing",
        "sales",
        "product",
        "data",
        "devops-sysadmin",
        "hr",
        "finance-legal",
    ]
    
    all_jobs = []
    
    # First fetch all jobs
    try:
        jobs = await fetch_jobs_from_remotive(limit=500)
        all_jobs.extend(jobs)
    except Exception as e:
        logger.error(f"Error fetching all Remotive jobs: {e}")
    
    return all_jobs


# =============================================================================
# Main Aggregation Function
# =============================================================================

async def fetch_all_job_sources() -> List[Dict[str, Any]]:
    """
    Fetch jobs from ALL sources in parallel
    Target: 5000+ unique jobs
    """
    logger.info("🚀 Starting multi-source job fetch...")
    
    # Fetch from all sources in parallel
    results = await asyncio.gather(
        fetch_all_adzuna_jobs(),
        fetch_jobs_from_remoteok(),
        fetch_all_remotive_jobs(),
        fetch_all_arbeitnow_jobs(),
        fetch_all_jobicy_jobs(),
        fetch_jobs_from_yc_rss(),
        return_exceptions=True
    )
    
    all_jobs = []
    source_counts = {}
    
    source_names = ["Adzuna", "RemoteOK", "Remotive", "Arbeitnow", "Jobicy", "YC Jobs"]
    
    for i, result in enumerate(results):
        source_name = source_names[i]
        if isinstance(result, Exception):
            logger.error(f"❌ {source_name} failed: {result}")
            source_counts[source_name] = 0
        else:
            all_jobs.extend(result)
            source_counts[source_name] = len(result)
            logger.info(f"📦 {source_name}: {len(result)} jobs")
    
    # Remove duplicates based on externalId
    seen_ids = set()
    unique_jobs = []
    
    for job in all_jobs:
        job_id = job.get("externalId", "")
        if job_id and job_id not in seen_ids:
            seen_ids.add(job_id)
            unique_jobs.append(job)
    
    # Also deduplicate by title+company (different sources might have same job)
    seen_title_company = set()
    final_jobs = []
    
    for job in unique_jobs:
        key = f"{job.get('title', '').lower()}-{job.get('company', '').lower()}"
        if key not in seen_title_company:
            seen_title_company.add(key)
            final_jobs.append(job)
    
    # Log summary
    logger.info("=" * 50)
    logger.info("📊 JOB FETCH SUMMARY")
    logger.info("=" * 50)
    for source, count in source_counts.items():
        logger.info(f"  {source}: {count} jobs")
    logger.info("-" * 50)
    logger.info(f"  Total before dedup: {len(all_jobs)}")
    logger.info(f"  Total after dedup: {len(final_jobs)}")
    logger.info("=" * 50)
    
    # Count startup jobs
    startup_count = sum(1 for j in final_jobs if j.get("isStartup"))
    remote_count = sum(1 for j in final_jobs if j.get("type") == "remote")
    
    logger.info(f"🚀 Startup jobs: {startup_count}")
    logger.info(f"🏠 Remote jobs: {remote_count}")
    
    return final_jobs


# Legacy function for backward compatibility
async def fetch_all_job_categories() -> List[Dict[str, Any]]:
    """
    Backward compatible function name
    Now fetches from ALL sources
    """
    return await fetch_all_job_sources()


# =============================================================================
# Database Functions
# =============================================================================

async def update_jobs_in_database(db, jobs: List[Dict[str, Any]]) -> int:
    """
    Update jobs in MongoDB database
    """
    if not jobs:
        logger.warning("No jobs to update")
        return 0
    
    try:
        # Get all sources from jobs
        sources = list(set(job.get("source", "unknown") for job in jobs))
        
        # Mark old jobs from these sources as inactive
        await db.jobs.update_many(
            {"source": {"$in": sources}},
            {"$set": {"isActive": False}}
        )
        
        # Insert/update new jobs
        for job in jobs:
            job["isActive"] = True
            await db.jobs.update_one(
                {"externalId": job["externalId"]},
                {"$set": job},
                upsert=True
            )
        
        # Ensure all new jobs are active
        external_ids = [job["externalId"] for job in jobs]
        await db.jobs.update_many(
            {"externalId": {"$in": external_ids}},
            {"$set": {"isActive": True}}
        )
        
        # Create indexes for better query performance
        await db.jobs.create_index("externalId", unique=True)
        await db.jobs.create_index("source")
        await db.jobs.create_index("isActive")
        await db.jobs.create_index("type")
        await db.jobs.create_index("isStartup")
        await db.jobs.create_index([("title", "text"), ("description", "text")])
        
        logger.info(f"✅ Updated {len(jobs)} jobs in database")
        return len(jobs)
        
    except Exception as e:
        logger.error(f"Error updating jobs in database: {e}")
        return 0


# =============================================================================
# Scheduler Function
# =============================================================================

async def scheduled_job_fetch(db):
    """
    Main function to fetch and update jobs from ALL sources
    Called by the scheduler every few hours
    """
    logger.info("🔄 Starting scheduled multi-source job fetch...")
    
    try:
        jobs = await fetch_all_job_sources()
        count = await update_jobs_in_database(db, jobs)
        logger.info(f"✅ Scheduled job fetch complete. Updated {count} jobs from 6 sources.")
        return count
    except Exception as e:
        logger.error(f"❌ Scheduled job fetch failed: {e}")
        return 0
