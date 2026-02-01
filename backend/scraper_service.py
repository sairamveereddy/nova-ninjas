import aiohttp
import logging
import re
from typing import Dict, Any, Optional
from bs4 import BeautifulSoup
from resume_analyzer import call_groq_api, clean_json_response
import json

logger = logging.getLogger(__name__)

from typing import List, Dict, Any, Optional, Tuple

async def fetch_url_content(url: str) -> Tuple[Optional[str], int]:
    """Fetch raw HTML content from a URL with improved headers to bypass bot detection"""
    
    # Common browser headers
    desktop_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
    }
    
    # Mobile User-Agent (often less restricted)
    mobile_headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }
    
    headers_list = [desktop_headers, mobile_headers]
    
    # If it's monster.com, try mobile headers first as it often works better
    if "monster.com" in url.lower():
        headers_list = [mobile_headers, desktop_headers]

    last_status = 200
    for headers in headers_list:
        try:
            logger.info(f"Attempting to fetch {url} with headers sample: {headers.get('User-Agent')[:50]}...")
            timeout = aiohttp.ClientTimeout(total=15)
            async with aiohttp.ClientSession(headers=headers, timeout=timeout) as session:
                async with session.get(url, allow_redirects=True) as response:
                    last_status = response.status
                    logger.info(f"Response status for {url}: {last_status}")
                    if response.status == 200:
                        content = await response.text()
                        logger.info(f"Fetched {len(content)} characters from {url}")
                        # Check if we got a "JS required" or "Blocked" shell
                        blocked_keywords = [
                            "enable JavaScript", "Access blocked", "Verification Required", 
                            "Security verification", "sign in to", "login to", 
                            "Please solve this CAPTCHA", "robot or a human"
                        ]
                        if len(content) < 5000 and any(keyword.lower() in content.lower() for keyword in blocked_keywords):
                            logger.warning(f"Detected blocked/restricted content for {url} with current headers. Content sample: {content[:200]}")
                            continue
                        return content, 200
                    elif response.status == 403:
                        logger.warning(f"403 Forbidden for {url} with current headers. Retrying...")
                        continue
                    else:
                        logger.error(f"Failed to fetch URL {url}: Status {response.status}")
                        continue
        except Exception as e:
            logger.error(f"Error fetching URL {url} with current headers: {e}")
            continue
            
    return None, last_status

def extract_main_text(html: str) -> str:
    """Extract readable text from HTML, removing scripts and styles"""
    soup = BeautifulSoup(html, 'html.parser')
    # PRE-CLEANING: Look for JSON-LD data which often survives even when main HTML is obfuscated
    json_ld_data = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)
            if isinstance(data, dict):
                json_ld_data.append(data)
            elif isinstance(data, list):
                json_ld_data.extend([d for d in data if isinstance(d, dict)])
        except:
            continue

    # Extract info from JSON-LD if found
    json_ld_text = ""
    for data in json_ld_data:
        # Looking for JobPosting or similar
        types = [data.get("@type", "")]
        if isinstance(data.get("@graph"), list):
            for item in data["@graph"]:
                if isinstance(item, dict): json_ld_data.append(item)
        
        if any(t in str(types) for t in ["JobPosting", "Job"]):
            title = data.get("title", "")
            company = data.get("hiringOrganization", {}).get("name", "") if isinstance(data.get("hiringOrganization"), dict) else data.get("hiringOrganization", "")
            desc = data.get("description", "")
            if desc:
                # Clean HTML tags from JSON-LD description if present
                desc = BeautifulSoup(desc, "html.parser").get_text(separator="\n")
                json_ld_text += f"TITLE: {title}\nCOMPANY: {company}\nDESCRIPTION: {desc}\n\n"

    # Remove script and style elements
    for element in soup(["script", "style", "nav", "footer", "header", "aside", "code", "svg", "button", "input"]):
        element.decompose()

    # Get text
    text = soup.get_text(separator=' ')
    
    # Prepend JSON-LD text if we found it
    if json_ld_text:
        text = json_ld_text + "\n--- RAW PAGE TEXT ---\n" + text

    # Break into lines and remove leading/trailing whitespace
    lines = (line.strip() for line in text.splitlines())
    # Break multi-headlines into a line each
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    
    # Aggressive noise filtering
    clean_chunks = []
    noise_patterns = [
        "sign in", "welcome back", "email or phone", "password", "forgot password",
        "join now", "new to linkedin", "user agreement", "privacy policy", "cookie policy",
        "security verification", "sign in to evaluate", "sign in to tailor", "skip to main",
        "save report", "share this job", "get notified about", "similar jobs"
    ]
    
    for chunk in chunks:
        if not chunk: continue
        # Skip chunks that are purely noise
        if any(pattern in chunk.lower() for pattern in noise_patterns):
            continue
        # Skip very short fragments that are usually navigation
        if len(chunk) < 4 and not chunk.isdigit():
            continue
        clean_chunks.append(chunk)

    text = '\n'.join(clean_chunks)
    
    # Limit text length to avoid overwhelmed AI context
    return text[:10000]

async def scrape_job_description(url: str) -> Dict[str, Any]:
    """
    Scrape a job URL and use AI to extract the job description.
    """
    processed_url = url
    
    # Handle shortened LinkedIn URLs
    if "lnkd.in" in url.lower():
        try:
            async with aiohttp.ClientSession() as session:
                async with session.head(url, allow_redirects=True, timeout=5) as resp:
                    processed_url = str(resp.url)
                    logger.info(f"Resolved shortened URL {url} to {processed_url}")
        except:
            logger.warning(f"Failed to resolve shortened URL: {url}")

    # Specific handling for Monster.com search results with specific IDs
    if "monster.com/jobs/search" in processed_url.lower() and "id=" in processed_url.lower():
        match = re.search(r'id=([a-f0-9-]+)', processed_url.lower())
        if match:
            job_id = match.group(1)
            processed_url = f"https://www.monster.com/job-openings/job-description--{job_id}"
            logger.info(f"Targeting direct Monster job link: {processed_url}")

    # Specific handling for LinkedIn URLs - try to use the guest API which is more stable
    elif "linkedin.com/jobs" in processed_url.lower() or "linkedin.com/mwlite/jobs" in processed_url.lower():
        job_id = None
        # Pattern 1: /jobs/view/12345
        view_match = re.search(r'/jobs/(?:view|view/|search/\?currentJobId=)(\d+)', processed_url)
        # Pattern 2: ?currentJobId=12345
        query_match = re.search(r'currentJobId=(\d+)', processed_url)
        # Pattern 3: jobs/view/some-title-12345
        slug_match = re.search(r'-(\d+)(?:/|\?|$)', processed_url)
        
        if view_match:
            job_id = view_match.group(1)
        elif query_match:
            job_id = query_match.group(1)
        elif slug_match:
            job_id = slug_match.group(1)
            
        if job_id:
            # LinkedIn has multiple guest API endpoints
            guest_api_url = f"https://www.linkedin.com/jobs-guest/jobs/api/jobListing/{job_id}"
            logger.info(f"Targeting LinkedIn guest API: {guest_api_url}")
            html, status = await fetch_url_content(guest_api_url)
            
            # If guest API failed (e.g. 404), maybe it's an older link format, try public page
            if not html or status == 404:
                logger.info(f"LinkedIn Guest API failed ({status}), trying public page view for {job_id}")
                processed_url = f"https://www.linkedin.com/jobs/view/{job_id}"
                html, status = await fetch_url_content(processed_url)
        else:
            # No ID found, just fetch the URL as is
            html, status = await fetch_url_content(processed_url)
    
    # Specific handling for Workday URLs - they are almost always JS-heavy and block simple scraping
    elif "myworkdayjobs.com" in processed_url.lower():
        return {
            "success": False,
            "error": "Workday job links are protected and require manual entry. Please click 'Enter Manually' below and paste the job description text."
        }
    else:
        # Standard fetch for other sites
        html, status = await fetch_url_content(processed_url)
    
    # If the direct link failed, try the original URL as fallback
    if not html and processed_url != url:
        logger.info(f"Direct link failed with status {status}, falling back to original URL with extra headers: {url}")
        # Add LinkedIn-specific AJAX header as some boards check for it
        # This can sometimes trigger a JSON response or a more scrapable HTML version
        html, status = await fetch_url_content(url)

    if not html:
        logger.warning(f"Final fetch failed for {url}. Status: {status}")
        if status == 404:
            return {
                "success": False,
                "error": "This job posting appears to be inactive or no longer exists (404 Error). Please verify the link is still valid."
            }
        
        domain_name = "This site"
        if "linkedin" in url.lower(): domain_name = "LinkedIn"
        elif "monster" in url.lower(): domain_name = "Monster"
        elif "indeed" in url.lower(): domain_name = "Indeed"
        elif "jpmc" in url.lower() or "oraclecloud" in url.lower(): domain_name = "JPMorgan/Oracle"
        
        return {
            "success": False, 
            "error": f"Access blocked by {domain_name}. This site has strong anti-scraping measures. Please copy and paste the job description manually."
        }

    raw_text = extract_main_text(html)
    logger.info(f"Extracted {len(raw_text)} chars from {url}")
    
    # Check if text is too short or just boilerplate after cleaning
    if len(raw_text) < 300:
        logger.warning(f"Extracted text too short or blocked ({len(raw_text)} chars). Sample: {raw_text[:200]}")
        
        domain_name = "The job board"
        if "linkedin" in url.lower(): domain_name = "LinkedIn"
        elif "jpmc" in url.lower() or "oraclecloud" in url.lower(): domain_name = "JPMorgan/Oracle"

        return {
            "success": False,
            "error": f"{domain_name} is blocking access to this job's details. Please copy the job description and paste it manually into the field below."
        }
    
    # Truncate text to avoid hitting token limits
    # Reduced to 4000 to drastically reduce token usage and rate limits
    truncated_text = raw_text[:4000]
    
    prompt = f"""Extract job details from the following raw text scraped from {url}:
---
{truncated_text}
---

Return ONLY a JSON object with this exact structure:
{{
    "success": true,
    "jobTitle": "...",
    "company": "...",
    "description": "...",
    "location": "...",
    "salary": "..."
}}

If you cannot find clear job information, return:
{{
    "success": false,
    "error": "Could not identify job information in the page content. This might be a login wall or an inactive job post."
}}

Important:
- The description should be the full job details, responsibilities, and requirements.
- Use newlines in the description for readability.
- Clean up any residual website navigation text.
"""

    try:
        # For scraping, we want to fail faster if Groq is overloaded
        # Use 3 retries max instead of the global 7
        response_text = await call_groq_api(prompt, max_tokens=2000, model="llama-3.1-8b-instant", max_retries=3)
        if not response_text:
            logger.warning("AI extraction failed (rate limit or timeout). Falling back to raw text.")
            # FALLBACK: If AI fails, return the raw text so the user at least gets the content
            return {
                "success": True,
                "jobTitle": "Job details found (AI busy)",
                "company": "Detected from URL",
                "description": raw_text,  # Return the full clean text
                "location": "",
                "salary": "",
                "note": "AI rate limit reached, showing raw text."
            }
        
        json_text = clean_json_response(response_text)
        result = json.loads(json_text, strict=False)
        return result
    except Exception as e:
        logger.error(f"Error extracting job data from URL: {e}")
        return {"success": False, "error": f"Failed to parse page content: {str(e)}"}
