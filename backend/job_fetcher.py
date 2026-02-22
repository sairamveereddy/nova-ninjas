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
import html
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from supabase_service import SupabaseService
import re
import json

import logging
print("LOADED NEW JOB FETCHER")
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


def sanitize_description(text: str) -> str:
    """
    Sanitize HTML but PRESERVE rich formatting (bullets, bold, paragraphs)
    """
    if not text:
        return ""
    
    # 0. Decode HTML entities first
    text = html.unescape(str(text))

    # 1. Remove dangerous tags
    text = re.sub(r'<(script|style|iframe|object|embed|applet)[^>]*>.*?</\1>', '', text, flags=re.IGNORECASE|re.DOTALL)
    
    # 2. Parse "Job Description" artifacts (More robust)
    # Remove "Job" or "Job Description" if it appears at the end of the text or on a new line
    text = re.sub(r'(\n|^)Job\s*$', '', text, flags=re.MULTILINE|re.IGNORECASE)
    text = re.sub(r'(\n|^)Job Description\s*$', '', text, flags=re.MULTILINE|re.IGNORECASE)
    
    # Also remove "Job" if it's the last word of the text (or line)
    text = re.sub(r'\s+Job\s*$', '', text, flags=re.MULTILINE | re.IGNORECASE)

    # 3. Allow-list approach: Replace allowed tags with placeholders, strip everything else, then restore
    # Actually, simpler approach: Just strip attributes from allowed tags and strip all other tags? 
    # Or just use a regex to strip tags that are NOT in the allow list.
    
    # Strategy: 
    # A. Replace <br>, <p>, <ul>, <li>, <b>, <strong>, <em>, <i>, <h3>, <h4> with unique tokens
    # B. Strip all <...>
    # C. Restore tokens
    
    # Simplify: matches tags that are NOT allowed
    # Allowed: p, br, ul, ol, li, b, strong, i, em, h3, h4, span (clean span)
    
    allowed_tags = ['p', 'br', 'ul', 'ol', 'li', 'b', 'strong', 'i', 'em', 'h3', 'h4']
    
    # Heuristic: If text looks like a wall of text (no tags), we might need to add linebreaks
    # But for now, let's just KEEP the tags we want.
    
    # Simple tag stripper that preserves specific tags
    def strip_tags_preserve(html_text, preserve):
        # Placeholder for preserved tags
        # logic: find all tags, if tag name in preserve, keep it (maybe strip attrs), else remove
        
        # Regex to match a tag: </?([a-z0-9]+)[^>]*>
        def replace_tag(match):
            tag_name = match.group(1).lower()
            if tag_name in preserve:
                is_close = match.group(0).startswith('</')
                if is_close:
                    return f"</{tag_name}>"
                else:
                    return f"<{tag_name}>" # Strip attributes
            return "" # Strip tag
            
        return re.sub(r'</?([a-z0-9]+)[^>]*>', replace_tag, html_text, flags=re.IGNORECASE)

    clean = strip_tags_preserve(text, allowed_tags)
    
    # 4. Cleanup excessive whitespace
    clean = re.sub(r'\n\s*\n', '\n', clean) # Collapse multiple newlines if any
    clean = clean.strip()
    
    return clean


def parse_job_sections(description: str) -> Dict[str, str]:
    """
    Parse the job description to extract Responsibilities, Qualifications, and Benefits.
    Returns a dictionary with these keys.
    """
    sections = {
        "responsibilities": "",
        "qualifications": "",
        "benefits": ""
    }
    
    if not description:
        return sections
        
    # Define regex patterns for headers
    patterns = {
        "responsibilities": [
            r"Responsibilities[:\?]?", r"What You'll Do[:\?]?", r"What You Will Do[:\?]?", 
            r"Key Responsibilities[:\?]?", r"The Role[:\?]?", r"About the Role[:\?]?"
        ],
        "qualifications": [
            r"Qualifications[:\?]?", r"Requirements[:\?]?", r"What You Bring[:\?]?", 
            r"Who You Are[:\?]?", r"Minimum Qualifications[:\?]?", r"Preferred Qualifications[:\?]?",
            r"What We're Looking For[:\?]?"
        ],
        "benefits": [
            r"Benefits[:\?]?", r"Perks[:\?]?", r"What We Offer[:\?]?", r"Compensation[:\?]?",
            r"Why Join Us[:\?]?"
        ]
    }
    
    # Simple splitting strategy: Find the indices of these headers
    # This is a bit complex because headers can appear in any order.
    # We'll normalize the text to find headers, but extract from original.
    
    # 1. Map all found headers to their positions
    found_headers = []
    for section_name, regex_list in patterns.items():
        for pattern in regex_list:
            # Look for headers that are either at start of line or wrapped in tags like <b> or <strong>
            # Simplified: just look for the text pattern
            matches = list(re.finditer(pattern, description, re.IGNORECASE))
            for m in matches:
                # Filter out if it's in the middle of a sentence (heuristic)
                # Check if preceded by > or \n or start of string
                start = m.start()
                if start == 0 or description[start-1] in ['>', '\n', ' ']:
                    found_headers.append({
                        "pos": start,
                        "end": m.end(),
                        "type": section_name,
                        "text": m.group(0)
                    })
    
    # Sort headers by position
    found_headers.sort(key=lambda x: x["pos"])
    
    # If no headers found, return empty (everything stays in description)
    if not found_headers:
        return sections
        
    # Extract content between headers
    for i, header in enumerate(found_headers):
        section_type = header["type"]
        start_content = header["end"]
        
        if i < len(found_headers) - 1:
            end_content = found_headers[i+1]["pos"]
        else:
            end_content = len(description)
            
        content = description[start_content:end_content].strip()
        
        # Remove leading/trailing formatting like <br>, <ul> if it leaves empty shells
        # Append to existing content (in case multiple headers map to same section)
        if sections[section_type]:
            sections[section_type] += "\n\n" + content
        else:
            sections[section_type] = content
            
    return sections


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
                        "description": sanitize_description(description),
                        "fullDescription": sanitize_description(description),
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
                        "description": sanitize_description(description),
                        "fullDescription": sanitize_description(description),
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
                        "country": "us"
                    }
                    
                    # STRICT US FILTER: Check location text
                    loc_lower = location.lower()
                    if any(x in loc_lower for x in ['india', 'uk', 'united kingdom', 'london', 'canada', 'toronto', 'australia', 'germany', 'france', 'europe']):
                        continue
                        
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
                        "description": sanitize_description(description),
                        "fullDescription": sanitize_description(description),
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
                        "country": "us"
                    }
                    
                    # STRICT US FILTER
                    loc_lower = location.lower()
                    allowed_regions = ['united states', 'usa', 'us', 'north america', 'worldwide', 'anywhere']
                    if not any(r in loc_lower for r in allowed_regions) and 'remote' not in loc_lower:
                         continue
                         
                    # Explicitly exclude common non-US tech hubs if not paired with US
                    if any(x in loc_lower for x in ['india', 'uk', 'london', 'canada', 'berlin', 'amsterdam']) and 'united states' not in loc_lower:
                        continue
                        
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
    DISABLED: User requested US-only jobs.
    """
    return [] # Disabled to ensure no EU jobs


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
        params = {"count": count, "tag": "remote", "geo": "usa"} # Forced USA geo
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
                        "description": sanitize_description(description),
                        "fullDescription": sanitize_description(description),
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
    """
    try:
        feed = feedparser.parse(YC_JOBS_RSS_URL)
        jobs = []
        
        for entry in feed.entries:
            title_parts = entry.title.split(' at ')
            if len(title_parts) >= 2:
                title = title_parts[0]
                company = title_parts[1].split(' (')[0]
            else:
                title = entry.title
                company = "Y Combinator Startup"
                
            description = entry.description if 'description' in entry else ""
            
            # Simple detection
            is_visa_friendly = detect_visa_sponsorship(description)
            is_remote = "remote" in title.lower() or "remote" in description.lower()
            work_type = "remote" if is_remote else "hybrid"
            
            tags = ["startup"]
            if is_visa_friendly:
                tags.append("visa-sponsoring")
            if is_remote:
                tags.append("remote")
            
            # Extract ID from link
            job_id_match = re.search(r'jobs/(\d+)', entry.link)
            external_id = f"yc-{job_id_match.group(1)}" if job_id_match else generate_job_id('yc', title, company)
            
            job_data = {
                "externalId": external_id,
                "title": title,
                "company": company,
                "location": "Remote / US" if is_remote else "San Francisco, CA",
                "description": sanitize_description(description),
                "fullDescription": sanitize_description(description),
                "salaryRange": "Competitive",
                "salaryMin": 0,
                "salaryMax": 0,
                "sourceUrl": entry.link,
                "source": "yc_rss",
                "type": work_type,
                "visaTags": ["visa-sponsoring"] if is_visa_friendly else [],
                "categoryTags": tags,
                "highPay": False,
                "isStartup": True,
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc),
                "expiresAt": None,
                "isActive": True,
                "country": 'us'
            }
            jobs.append(job_data)
            
        logger.info(f"✅ Y Combinator: Fetched {len(jobs)} startup jobs")
        return jobs
        
    except Exception as e:
        logger.error(f"Error fetching jobs from YC RSS: {e}")
        return []

# =============================================================================
# NEW: Greenhouse & Lever Scrapers (No API Key!)
# =============================================================================

async def fetch_greenhouse_jobs(company_id: str) -> List[Dict[str, Any]]:
    """
    Fetch jobs from public Greenhouse board
    URL format: https://boards-api.greenhouse.io/v1/boards/{company_id}/jobs?content=true
    """
    url = f"https://boards-api.greenhouse.io/v1/boards/{company_id}/jobs?content=true"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=30) as response:
                if response.status != 200:
                    logger.warning(f"Greenhouse board not found for {company_id}")
                    return []
                
                data = await response.json()
                jobs = []
                
                for job in data.get("jobs", []):
                    title = job.get("title", "")
                    location = job.get("location", {}).get("name", "Unknown")
                    description = job.get("content", "")
                    
                    # Parse using new functions
                    sections = parse_job_sections(description)
                    is_visa = detect_visa_sponsorship(description)
                    work_type = detect_work_type(title, location)
                    
                    # Construct job object
                    job_data = {
                        "externalId": f"gh-{job.get('id')}",
                        "title": title,
                        "company": company_id.capitalize(), # Best guess for name
                        "location": location,
                        "description": sanitize_description(description), # Legacy support
                        "responsibilities": sanitize_description(sections["responsibilities"]),
                        "qualifications": sanitize_description(sections["qualifications"]),
                        "benefits": sanitize_description(sections["benefits"]),
                        "fullDescription": sanitize_description(description), # Store full for legacy fallback
                        "salaryRange": "Competitive",
                        "sourceUrl": job.get("absolute_url", ""),
                        "source": "greenhouse",
                        "type": work_type,
                        "visaTags": ["visa-sponsoring"] if is_visa else [],
                        "categoryTags": build_job_tags({"visaTags": is_visa, "type": work_type}),
                        "createdAt": datetime.now(timezone.utc),
                        "updatedAt": datetime.now(timezone.utc),
                        "isActive": True
                    }
                    jobs.append(job_data)
                    
                logger.info(f"✅ Greenhouse: Fetched {len(jobs)} jobs for {company_id}")
                return jobs
                
    except Exception as e:
        logger.error(f"Error fetching Greenhouse jobs for {company_id}: {e}")
        return []

async def fetch_lever_jobs(company_id: str) -> List[Dict[str, Any]]:
    """
    Fetch jobs from public Lever board
    URL format: https://api.lever.co/v0/postings/{company_id}?mode=json
    """
    url = f"https://api.lever.co/v0/postings/{company_id}?mode=json"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=30) as response:
                if response.status != 200:
                    logger.warning(f"Lever board not found for {company_id}")
                    return []
                
                data = await response.json()
                jobs = []
                
                for job in data:
                    title = job.get("text", "")
                    description = job.get("descriptionPlain", "") # Use plain text description
                    repo_html = job.get("description", "") # Or HTML if available
                    
                    # Prefer HTML for parsing if possible, but Levoer structure is complex
                    # Lever returns description as HTML usually.
                    
                    sections = parse_job_sections(repo_html)
                    is_visa = detect_visa_sponsorship(repo_html)
                    
                    # Lever categories usually contain location/commitment
                    categories = job.get("categories", {})
                    location = categories.get("location", "Unknown")
                    commitment = categories.get("commitment", "Full-time")
                    
                    work_type = "remote" if "remote" in location.lower() else "onsite"
                    
                    job_data = {
                        "externalId": f"lever-{job.get('id')}",
                        "title": title,
                        "company": company_id.capitalize(),
                        "location": location,
                        "description": sanitize_description(repo_html),
                        "responsibilities": sanitize_description(sections["responsibilities"]),
                        "qualifications": sanitize_description(sections["qualifications"]),
                        "benefits": sanitize_description(sections["benefits"]),
                        "fullDescription": sanitize_description(repo_html),
                        "salaryRange": "Competitive",
                        "sourceUrl": job.get("hostedUrl", ""),
                        "source": "lever",
                        "type": work_type,
                        "visaTags": ["visa-sponsoring"] if is_visa else [],
                        "categoryTags": build_job_tags({"visaTags": is_visa, "type": work_type}),
                        "createdAt": datetime.now(timezone.utc),
                        "updatedAt": datetime.now(timezone.utc),
                        "isActive": True
                    }
                    jobs.append(job_data)
                    
                logger.info(f"✅ Lever: Fetched {len(jobs)} jobs for {company_id}")
                return jobs
                
    except Exception as e:
        logger.error(f"Error fetching Lever jobs for {company_id}: {e}")
        return []

# =============================================================================
# NEW: Ashby Scrapers (No API Key!)
# =============================================================================

async def fetch_ashby_jobs(company_id: str) -> List[Dict[str, Any]]:
    """
    Fetch jobs from Ashby:
    1. Get list via GraphQL (fast)
    2. Concurrently fetch HTML for each job to get full description (slow but necessary)
    """
    gql_url = "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams"
    
    # 1. Fetch List
    jobs_list = []
    try:
        payload = {
            "operationName": "ApiJobBoardWithTeams",
            "variables": { "organizationHostedJobsPageName": company_id },
            "query": """
            query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
              jobBoard: jobBoardWithTeams(
                organizationHostedJobsPageName: $organizationHostedJobsPageName
              ) {
                jobPostings {
                  id
                  title
                  locationName
                  employmentType
                  secondaryLocations {
                    locationName
                  }
                  compensationTierSummary
                }
              }
            }
            """
        }
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json"
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(gql_url, json=payload, headers=headers) as response:
                if response.status != 200:
                    logger.warning(f"Ashby GraphQL failed for {company_id}: {response.status}")
                    return []
                
                data = await response.json()
                job_board = data.get("data", {}).get("jobBoard")
                if not job_board:
                    return []
                jobs_list = job_board.get("jobPostings", [])
                
    except Exception as e:
        logger.error(f"Error fetching Ashby list for {company_id}: {e}")
        return []

    # 2. Fetch Details (HTML Scraping)
    if not jobs_list:
        return []

    logger.info(f"Ashby: Fetching details for {len(jobs_list)} jobs from {company_id}...")
    sem = asyncio.Semaphore(10) # Limit concurrency
    
    import re
    import json
    from bs4 import BeautifulSoup
    
    async def fetch_detail(job_summary):
        job_id = job_summary.get("id")
        title = job_summary.get("title")
        job_url = f"https://jobs.ashbyhq.com/{company_id}/{job_id}"
        
        full_desc = "See full job post"
        desc_text = title
        
        async with sem:
            try:
                # Reuse session? Better to create one or pass it. Creating one for simplicity/isolation
                async with aiohttp.ClientSession() as session:
                    async with session.get(job_url, headers={"User-Agent": headers["User-Agent"]}, timeout=20) as resp:
                        if resp.status == 200:
                            html = await resp.text()
                            
                            # Extract JSON
                            pattern = re.compile(r'window\.__appData\s*=\s*({.+?});', re.DOTALL)
                            match = pattern.search(html)
                            if match:
                                try:
                                    data = json.loads(match.group(1))
                                    
                                    # Recursive find description
                                    def find_key(obj, key):
                                        if isinstance(obj, dict):
                                            if key in obj: return obj[key]
                                            for k, v in obj.items():
                                                res = find_key(v, key)
                                                if res: return res
                                        elif isinstance(obj, list):
                                            for item in obj:
                                                res = find_key(item, key)
                                                if res: return res
                                        return None

                                    html_desc = find_key(data, "descriptionHtml")
                                    if html_desc:
                                        full_desc = html_desc
                                        # Parse text from HTML for snippet
                                        soup = BeautifulSoup(html_desc, 'html.parser')
                                        desc_text = soup.get_text()[:500] + "..."
                                    else:
                                        plain_desc = find_key(data, "description")
                                        if plain_desc:
                                            full_desc = plain_desc
                                            desc_text = plain_desc[:500] + "..."
                                            
                                except:
                                    pass # JSON parse fail, keep defaults
            except Exception as e:
                # logger.warning(f"Failed to fetch details for {job_id}: {e}")
                pass
        
        # Merge data
        loc_name = job_summary.get("locationName", "")
        sec_locs = job_summary.get("secondaryLocations", [])
        if sec_locs:
            loc_extras = [l["locationName"] for l in sec_locs if l.get("locationName")]
            if loc_extras:
                loc_name += f" (+ {', '.join(loc_extras)})"
                
        salary = job_summary.get("compensationTierSummary") or "Competitive"
        
        # Parse sections
        sections = parse_job_sections(full_desc)
        is_visa = detect_visa_sponsorship(full_desc)
        work_type = "remote" if "remote" in loc_name.lower() else "onsite"
        
        return {
            "externalId": f"ashby-{company_id}-{job_id}",
            "title": title,
            "company": company_id.capitalize(),
            "location": loc_name,
            "description": sanitize_description(desc_text),
            "responsibilities": sanitize_description(sections["responsibilities"]),
            "qualifications": sanitize_description(sections["qualifications"]),
            "benefits": sanitize_description(sections["benefits"]),
            "fullDescription": sanitize_description(full_desc), # Store FULL HTML
            "salaryRange": salary,
            "sourceUrl": job_url,
            "source": "ashby",
            "type": work_type,
            "visaTags": ["visa-sponsoring"] if is_visa else [],
            "categoryTags": build_job_tags({"visaTags": is_visa, "type": work_type}),
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
            "isActive": True
        }

    # Run concurrent fetches
    tasks = [fetch_detail(job) for job in jobs_list]
    results = await asyncio.gather(*tasks)
    
    # Filter nones
    valid_jobs = [j for j in results if j]
    logger.info(f"✅ Ashby: Fetched {len(valid_jobs)} jobs with details for {company_id}")
    return valid_jobs

# =============================================================================
# NEW: Workday Scraper (Internal API)
# =============================================================================

async def fetch_workday_jobs(tenant: str, site: str) -> List[Dict[str, Any]]:
    """
    Fetch jobs from Workday using internal CXS API
    URL format: https://{tenant}.wd1.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
    """
    base_url = f"https://{tenant}.wd1.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs"
    
    try:
        async with aiohttp.ClientSession() as session:
            # Payload to get all jobs, US only if possible
            payload = {
                "appliedFacets": {"locationCountry": ["bc33aa3152ec42d4995f4791a106ed09"]}, # US Country ID (often standard)
                "limit": 20, 
                "offset": 0, 
                "searchText": ""
            }
            
            # Note: locationCountry ID varies by tenant, so we might need to fetch without it filter first
            # and filter in client. Let's send empty facets first for safety.
            payload = {"limit": 20, "offset": 0, "searchText": ""}

            async with session.post(base_url, json=payload, timeout=30) as response:
                if response.status != 200:
                    logger.warning(f"Workday not found for {tenant}/{site}")
                    return []
                
                data = await response.json()
                jobs = []
                
                for job in data.get("jobPostings", []):
                    title = job.get("title", "")
                    external_path = job.get("externalPath", "")
                    job_url = f"https://{tenant}.wd1.myworkdayjobs.com/{site}{external_path}"
                    
                    # Workday often doesn't give full description in list view, 
                    # but sometimes gives a snippet. We might need to fetch detail or just use snippet.
                    # For speed, we'll use the snippet or title as description if full not available.
                    description = job.get("bulletFields", [])
                    description_text = " ".join(description) if description else title
                    
                    location = job.get("locationsText", "Unknown")
                    
                    # Filter US/Remote
                    is_remote = "remote" in location.lower() or "remote" in title.lower()
                    if not is_remote and "united states" not in location.lower() and "us" not in location.lower():
                        continue

                    job_data = {
                        "externalId": f"wd-{tenant}-{job.get('bulletFields', [''])[0] if job.get('bulletFields') else title}", # Fallback ID
                        "externalId": f"wd-{tenant}-{job.get('jobPostingId', '')}", # Better ID
                        "title": title,
                        "company": tenant.capitalize(), # Approximate
                        "location": location,
                        "description": description_text,
                        "responsibilities": description_text,
                        "qualifications": "See job post",
                        "benefits": "See job post",
                        "fullDescription": f"Please visit {job_url} for full details.",
                        "salaryRange": "Competitive",
                        "sourceUrl": job_url,
                        "source": "workday",
                        "type": "remote" if is_remote else "onsite",
                        "visaTags": [],
                        "categoryTags": ["workday"],
                        "createdAt": datetime.now(timezone.utc),
                        "updatedAt": datetime.now(timezone.utc),
                        "isActive": True
                    }
                    jobs.append(job_data)
                    
                logger.info(f"✅ Workday: Fetched {len(jobs)} jobs for {tenant}")
                return jobs
                
    except Exception as e:
        logger.error(f"Error fetching Workday jobs for {tenant}: {e}")
        return []

# =============================================================================
# NEW: Paylocity Scraper (Custom Wrapper)
# =============================================================================

async def fetch_ashby_jobs(company_id: str) -> List[Dict[str, Any]]:
    """
    Fetch jobs from Ashby using their public GraphQL API.
    Endpoint: https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams
    """
    url = "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams"
    payload = {
        "operationName": "ApiJobBoardWithTeams",
        "variables": { "organizationHostedJobsPageName": company_id },
        "query": """
        query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
          jobBoard: jobBoardWithTeams(
            organizationHostedJobsPageName: $organizationHostedJobsPageName
          ) {
            jobPostings {
              id
              title
              locationName
              employmentType
              secondaryLocations {
                locationName
              }
              compensationTierSummary
            }
          }
        }
        """
    }
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate", # No brotli
        "Content-Type": "application/json"
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status != 200:
                    logger.warning(f"Ashby API failed for {company_id}: {response.status}")
                    return []
                
                data = await response.json()
                job_board = data.get("data", {}).get("jobBoard")
                if not job_board:
                    return []
                    
                raw_jobs = job_board.get("jobPostings", [])
                jobs = []
                
                for job in raw_jobs:
                    job_id = job.get("id")
                    title = job.get("title")
                    loc_name = job.get("locationName", "")
                    
                    # Handle secondary locations
                    sec_locs = job.get("secondaryLocations", [])
                    if sec_locs:
                        loc_extras = [l["locationName"] for l in sec_locs if l.get("locationName")]
                        if loc_extras:
                            loc_name += f" (+ {', '.join(loc_extras)})"
                            
                    salary = job.get("compensationTierSummary") or "Competitive"
                    emp_type = job.get("employmentType", "Full Time")
                    
                    job_url = f"https://jobs.ashbyhq.com/{company_id}/{job_id}"
                    
                    job_data = {
                        "externalId": f"ashby-{company_id}-{job_id}",
                        "title": title,
                        "company": company_id.capitalize(),
                        "location": loc_name,
                        "description": title, # Description is detailed in individual job query, keep simple here
                        "responsibilities": "See full job post",
                        "qualifications": "See full job post",
                        "benefits": "See full job post",
                        "fullDescription": f"Apply at: {job_url}",
                        "salaryRange": salary,
                        "sourceUrl": job_url,
                        "source": "ashby",
                        "type": "remote" if "remote" in loc_name.lower() else "onsite",
                        "visaTags": [],
                        "categoryTags": ["startup", "ashby"],
                        "createdAt": datetime.now(timezone.utc),
                        "updatedAt": datetime.now(timezone.utc),
                        "isActive": True
                    }
                    jobs.append(job_data)
                
                logger.info(f"✅ Ashby: Fetched {len(jobs)} jobs for {company_id}")
                return jobs

    except Exception as e:
        logger.error(f"Error fetching Ashby jobs for {company_id}: {e}")
        return [] 

# =============================================================================
# EXPORTED FUNCTIONS: Main Orchestration
# =============================================================================

async def fetch_all_job_categories(db=None) -> List[Dict[str, Any]]:
    """
    Main function to fetch jobs from ALL sources
    """
    logger.info("🚀 Starting multi-source job fetch...")
    all_jobs = []
    
    # 1. Fetch from Adzuna (US Software Engineers)
    try:
        adzuna_jobs = await fetch_jobs_from_adzuna(
            country="us", 
            what="software engineer",
            results_per_page=50
        )
        all_jobs.extend(adzuna_jobs)
    except Exception as e:
        logger.error(f"Failed to fetch Adzuna jobs: {e}")

    # 2. Fetch from RemoteOK
    try:
        remoteok_jobs = await fetch_jobs_from_remoteok()
        all_jobs.extend(remoteok_jobs)
    except Exception as e:
        logger.error(f"Failed to fetch RemoteOK jobs: {e}")

    # 3. Fetch from Remotive (Software Dev)
    try:
        remotive_jobs = await fetch_jobs_from_remotive(category="software-dev")
        all_jobs.extend(remotive_jobs)
    except Exception as e:
        logger.error(f"Failed to fetch Remotive jobs: {e}")
        
    # 4. Fetch from Arbeitnow (DISABLED)
    # arbeitnow_jobs = await fetch_jobs_from_arbeitnow()
    # all_jobs.extend(arbeitnow_jobs)
    
    # 5. Fetch from Jobicy
    try:
        jobicy_jobs = await fetch_jobs_from_jobicy(count=50, geo="usa")
        all_jobs.extend(jobicy_jobs)
    except Exception as e:
        logger.error(f"Failed to fetch Jobicy jobs: {e}")
        
    # 6. Fetch from YC RSS
    try:
        yc_jobs = await fetch_jobs_from_yc_rss()
        all_jobs.extend(yc_jobs)
    except Exception as e:
        logger.error(f"Failed to fetch YC jobs: {e}")

    # 7. Fetch from Greenhouse (Direct Scraping) - Top Tech Companies
    # Expanded list for better coverage
    greenhouse_companies = [
        "stripe", "twitch", "dropbox", "airbnb", "reddit", "gusto",
        "linear", "notion", "grammarly", "plaid", "brex", "doorDash",
        "ramp", "whatnot", "retool", "vercel", "samsara", "snowflake",
        "databricks", "openai", "anthropic", "scale", "anduril",
        "block", "cashapp", "square", "instacart", "pinterest", 
        "canva", "figma", "miro", "clickup", "discord", "duolingo"
    ]
    
    # Shuffle to distribute load if fetching many
    import random
    random.shuffle(greenhouse_companies)
    
    # Simple rate limiting/batching - only fetch 10 random ones per run to avoid timeout
    # Or fetch all if async is fast enough. Let's try 25 random ones.
    target_greenhouse = greenhouse_companies[:25]
    
    for company in target_greenhouse:
        try:
            gh_jobs = await fetch_greenhouse_jobs(company)
            all_jobs.extend(gh_jobs)
        except Exception as e:
            logger.error(f"Failed to fetch Greenhouse jobs for {company}: {e}")

    # 8. Fetch from Lever (Direct Scraping) - Top Tech Companies
    lever_companies = [
        "netflix", "atlassian", "affirm", "palantir", "udemy", 
        "coursera", "lyft", "fiverr", "upwork", "kraken",
        "consensys", "ripple", "chainlink", "dbt", "launchdarkly"
    ]
    
    random.shuffle(lever_companies)
    target_lever = lever_companies[:10]
    
    for company in target_lever:
        try:
            lever_jobs = await fetch_lever_jobs(company)
            all_jobs.extend(lever_jobs)
        except Exception as e:
            logger.error(f"Failed to fetch Lever jobs for {company}: {e}")
    
    # 9. Fetch from Ashby (GraphQL) - High Growth Startups
    ashby_companies = [
        "deel", "ramp", "remote", "notion", "airtable",
        "webflow", "retell", "clay", "perplexity", "modal", "linear"
    ]
    random.shuffle(ashby_companies)
    target_ashby = ashby_companies[:8]
    
    for company in target_ashby:
        try:
            ashby_jobs = await fetch_ashby_jobs(company)
            all_jobs.extend(ashby_jobs)
        except Exception as e:
            logger.error(f"Failed to fetch Ashby jobs for {company}: {e}")

    # 10. Fetch from Workday (Internal API) - Enterprise Tech
    # DISABLED: Bypassing due to 422 errors and potential blocking
    # Format: (tenant, site_path)
    # workday_targets = [
    #     ("nvidia", "NVIDIAExternalCareerSite"),
    #     ("salesforce", "External_Career_Site"), 
    #     ("workday", "Workday"),
    #     ("walmart", "WalmartExternal"),
    #     ("vmware", "VMware_Careers"),
    #     ("target", "target") 
    # ]
    
    # for tenant, site in workday_targets:
    #     try:
    #         wd_jobs = await fetch_workday_jobs(tenant, site)
    #         all_jobs.extend(wd_jobs)
    #     except Exception as e:
    #         logger.error(f"Failed to fetch Workday jobs for {tenant}: {e}")

    logger.info(f"🏁 Total jobs fetched from all sources: {len(all_jobs)}")
    return all_jobs


async def update_jobs_in_database(jobs: List[Dict[str, Any]], db=None) -> int:
    """
    Update jobs in Supabase database
    """
    if not jobs:
        logger.warning("No jobs to update")
        return 0
    
    try:
        # Get all sources from jobs
        sources = list(set(job.get("source", "unknown") for job in jobs))
        
        # Mark old jobs from these sources as inactive
        SupabaseService.mark_jobs_inactive(sources)
        
        # Format jobs for Supabase (ensure job_id and ISO dates)
        for job in jobs:
            job["is_active"] = True
            job["job_id"] = job.get("externalId") or job.get("job_id")
            # Cleanup camelCase if present
            job.pop("isActive", None)
            job.pop("externalId", None)
            if isinstance(job.get("createdAt"), datetime):
                job["createdAt"] = job["createdAt"].isoformat()
            if isinstance(job.get("updatedAt"), datetime):
                job["updatedAt"] = job["updatedAt"].isoformat()

        # Bulk upsert
        count = SupabaseService.upsert_jobs(jobs)
        
        logger.info(f"💾 Supabase update complete: {count} jobs inserted/updated")
        return count
        
    except Exception as e:
        logger.error(f"❌ Supabase update failed: {e}")
        return 0


async def scheduled_job_fetch(db=None):
    """
    Task to be run on schedule
    Uses JobAggregator for robust multi-source fetching
    """
    logger.info("⏰ Starting scheduled job fetch...")
    
    try:
        from job_apis.job_aggregator import JobAggregator
        
        # Aggregator internal storage is now Supabase-native
        aggregator = JobAggregator()
        
        # Run aggregation
        # FOCUS ON QUALITY: Disable Adzuna/JSearch as they lack full descriptions
        stats = await aggregator.aggregate_all_jobs(
            use_adzuna=False,
            use_jsearch=False, 
            use_usajobs=True, # USAJobs usually has ok details or is niche
            use_rss=True,     # RemoteOK/Remotive are usually ok
        )
        
        logger.info(f"✅ Scheduled job fetch completed. Stats: {stats}")
        
    except Exception as e:
        logger.error(f"❌ Scheduled job fetch failed: {e}")
        # Fallback to legacy method if aggregator fails entirely
        try:
            logger.info("⚠️ Falling back to legacy fetcher...")
            jobs = await fetch_all_job_categories()
            if jobs:
                await update_jobs_in_database(jobs)
        except Exception as fallback_error:
            logger.error(f"❌ Fallback fetch also failed: {fallback_error}")
