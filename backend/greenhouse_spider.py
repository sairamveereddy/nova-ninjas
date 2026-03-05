import sys
import asyncio
import json
import logging
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any

from scrapling.spiders import Spider, Response
import os
from dotenv import load_dotenv

# Load env variables for Supabase
load_dotenv()

# Assuming these helpers exist or we mock them if we run stand-alone
try:
    from backend.job_fetcher import sanitize_description, detect_visa_sponsorship, detect_startup, HIGH_PAY_THRESHOLD, format_salary_range
    from backend.supabase_service import SupabaseService
except ImportError:
    # Fallbacks if running standalone directly without python -m backend...
    try:
        from job_fetcher import sanitize_description, detect_visa_sponsorship, detect_startup, HIGH_PAY_THRESHOLD, format_salary_range
        from supabase_service import SupabaseService
    except ImportError:
        pass # Will handle gracefully if just testing

logger = logging.getLogger("greenhouse_spider")
logging.basicConfig(level=logging.INFO)

TARGET_COMPANIES = {
    "openai": "OpenAI",
    "anthropic": "Anthropic",
    "stripe": "Stripe",
    "discord": "Discord",
    "airbnb": "Airbnb",
    "reddit": "Reddit",
    "figma": "Figma",
    "notion": "Notion",
    "plaid": "Plaid",
    "scale": "Scale AI"
}

def generate_job_id(source: str, title: str, company: str) -> str:
    unique_string = f"{source}-{title}-{company}".lower()
    return hashlib.md5(unique_string.encode()).hexdigest()[:16]

class GreenhouseSpider(Spider):
    name = "greenhouse_tech"
    
    # Generate API URLs for all target companies
    start_urls = [f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true" for slug in TARGET_COMPANIES.keys()]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.scraped_jobs = []

    async def parse(self, response: Response):
        try:
            data = response.json()
            jobs = data.get("jobs", [])
            
            # Extract company slug from URL
            url_parts = response.url.split('/')
            company_slug = url_parts[5] # https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
            company_name = TARGET_COMPANIES.get(company_slug, company_slug.title())
            
            logger.info(f"Loaded {len(jobs)} jobs for {company_name}")
            
            for job in jobs:
                title = job.get("title", "")
                url = job.get("absolute_url", "")
                
                # Filter out purely non-US jobs if desired, but for top tech, we grab them all
                location_obj = job.get("location", {})
                location = location_obj.get("name", "") if isinstance(location_obj, dict) else str(location_obj)
                
                # Fetch detailed description HTML
                raw_html = job.get("content", "")
                
                # Parse salary min/max placeholder (rarely in GH API unless in metadata)
                salary_min = 0
                salary_max = 0
                
                # Metadata might hold salary or tags
                metadata = job.get("metadata", [])
                for meta in metadata:
                    if meta.get("name") == "Salary Range":
                        # Attempt to parse
                        pass
                
                # Clean description
                description = raw_html # We'll let sanitize_description handle it later if needed or parse here
                
                try:
                    desc_clean = sanitize_description(description) if 'sanitize_description' in globals() else description
                    visa_friendly = detect_visa_sponsorship(desc_clean) if 'detect_visa_sponsorship' in globals() else False
                    is_startup = detect_startup(desc_clean, company_name) if 'detect_startup' in globals() else True
                except NameError:
                    desc_clean = description
                    visa_friendly = False
                    is_startup = True
                
                tags = ["startup"] if is_startup else []
                if visa_friendly:
                    tags.append("visa-sponsoring")
                    
                job_data = {
                    "externalId": f"gh-{job.get('id', generate_job_id('greenhouse', title, company_name))}",
                    "title": title.strip(),
                    "company": company_name,
                    "location": location.strip(),
                    "description": desc_clean,
                    "fullDescription": desc_clean,
                    "salaryRange": format_salary_range(salary_min, salary_max) if 'format_salary_range' in globals() else "Competitive",
                    "salaryMin": salary_min,
                    "salaryMax": salary_max,
                    "sourceUrl": url,
                    "source": "greenhouse",
                    "type": "onsite" if "remote" not in location.lower() and "remote" not in title.lower() else "remote",
                    "visaTags": ["visa-sponsoring"] if visa_friendly else [],
                    "categoryTags": tags,
                    "highPay": False,
                    "isStartup": is_startup,
                    "createdAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc),
                    "expiresAt": None,
                    "isActive": True,
                    "country": "us" if "us" in location.lower() or "united states" in location.lower() else "global"
                }
                
                self.scraped_jobs.append(job_data)
                yield job_data
                
        except Exception as e:
            logger.error(f"Error parsing Greenhouse JSON for {response.url}: {e}")

    def on_close(self):
        """Called when spider finishes"""
        logger.info(f"Spider finished. Total jobs scraped: {len(self.scraped_jobs)}")
        
        # Save to database if SupabaseService is available
        if 'SupabaseService' in globals() and self.scraped_jobs:
            logger.info("Saving jobs to database...")
            try:
                # Deduplicate and attach job_id
                unique_jobs = []
                seen = set()
                for job in self.scraped_jobs:
                    title = (job.get('title') or '').strip().lower()
                    company = (job.get('company') or '').strip().lower()
                    location = (job.get('location') or '').strip().lower()
                    unique_string = f"{title}|{company}|{location}"
                    job_id = hashlib.md5(unique_string.encode()).hexdigest()[:24]
                    job['job_id'] = job_id
                    
                    if job_id not in seen:
                        seen.add(job_id)
                        
                        # Add ISO dates for Supabase
                        now_iso = datetime.now().isoformat()
                        job['created_at'] = now_iso
                        job['updated_at'] = now_iso
                        
                        job.pop('createdAt', None)
                        job.pop('updatedAt', None)
                        job.pop('fullDescription', None)
                        
                        unique_jobs.append(job)

                count = 0
                for job in unique_jobs:
                    if SupabaseService.upsert_job(job):
                        count += 1
                logger.info(f"Successfully saved {count} jobs to Supabase.")
            except Exception as e:
                logger.error(f"DB Save error: {e}")

if __name__ == "__main__":
    spider = GreenhouseSpider()
    spider.start()
