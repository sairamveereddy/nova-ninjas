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
    
    # Remove script and style elements, but also code blocks (common in LinkedIn for JS metadata)
    # and unnecessary visual elements
    for element in soup(["script", "style", "nav", "footer", "header", "aside", "code", "svg", "button", "input"]):
        element.decompose()

    # Get text
    text = soup.get_text(separator=' ')
    
    # Break into lines and remove leading/trailing whitespace
    lines = (line.strip() for line in text.splitlines())
    # Break multi-headlines into a line each
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    # Drop blank lines
    text = '\n'.join(chunk for chunk in chunks if chunk)
    
    # Limit text length to avoid overwhelmed AI context (approx 10k chars)
    return text[:12000]

async def scrape_job_description(url: str) -> Dict[str, Any]:
    """
    Scrape a job URL and use AI to extract the job description.
    """
    processed_url = url
    
    # Specific handling for Monster.com search results with specific IDs
    if "monster.com/jobs/search" in url.lower() and "id=" in url.lower():
        match = re.search(r'id=([a-f0-9-]+)', url.lower())
        if match:
            job_id = match.group(1)
            # Try to construct a more direct URL if it's a search page pointing to an ID
            processed_url = f"https://www.monster.com/job-openings/job-description--{job_id}"
            logger.info(f"Targeting direct Monster job link: {processed_url}")

    # Specific handling for LinkedIn URLs - try to use the guest API which is more stable
    elif "linkedin.com/jobs" in url.lower():
        job_id = None
        # Pattern 1: /jobs/view/12345
        view_match = re.search(r'/jobs/view/(\d+)', url)
        # Pattern 2: ?currentJobId=12345
        query_match = re.search(r'currentJobId=(\d+)', url)
        # Pattern 3: jobs/view/some-title-12345
        slug_match = re.search(r'-(\d+)(?:/|\?|$)', url)
        
        if view_match:
            job_id = view_match.group(1)
        elif query_match:
            job_id = query_match.group(1)
        elif slug_match:
            job_id = slug_match.group(1)
            
        if job_id:
            # LinkedIn has multiple guest API endpoints, let's try the most common one first
            processed_url = f"https://www.linkedin.com/jobs-guest/jobs/api/jobListing/{job_id}"
            logger.info(f"Targeting LinkedIn guest API: {processed_url}")
            # We'll also try a direct approach if this fails in the fallback logic below

    # Specific handling for Workday URLs - they are almost always JS-heavy and block simple scraping
    if "myworkdayjobs.com" in url.lower():
        return {
            "success": False,
            "error": "Workday job links are protected and require manual entry. Please click 'Enter Manually' below and paste the job description text."
        }

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
        
        return {
            "success": False, 
            "error": "Access blocked by the job board. This site (like Monster, LinkedIn, or Indeed) has strong anti-scraping measures. Please copy and paste the job description manually."
        }

    raw_text = extract_main_text(html)
    logger.info(f"Extracted {len(raw_text)} chars of raw text from {processed_url}")
    
    # Check if text is too short or just boilerplate
    if len(raw_text) < 300:
        logger.warning(f"Extracted text too short ({len(raw_text)} chars). Sample: {raw_text[:200]}")
        return {
            "success": False,
            "error": "The page content could not be read properly (likely needs JavaScript). Please paste the description manually."
        }
    
    prompt = f"""
Extract the job title, company name, and full job description from the following raw text scraped from a job board URL ({url}).

RAW TEXT:
{raw_text}

Return ONLY valid JSON with this structure:
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
    "error": "Could not identify job information in the page content."
}}

Important:
- The description should be the full job details, responsibilities, and requirements.
- Use newlines in the description for readability.
- Clean up any residual website navigation text.
"""

    raw_text = extract_main_text(html)
    logger.info(f"Extracted {len(raw_text)} chars from {url}")
    
    # Truncate text to avoid hitting token limits, especially for messy LinkedIn pages
    # 8000 chars is roughly 1500-2000 tokens, which is plenty for a job description
    truncated_text = raw_text[:8000]
    
    prompt = f"""Extract job details from the following raw text:
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
        # Use a higher-limit model for extraction to avoid 429 errors
        # groq/compound-mini has much higher RPM/TPM than 70B models
        response_text = await call_groq_api(prompt, max_tokens=2000, model="groq/compound-mini")
        if not response_text:
            return {"success": False, "error": "AI extraction failed. (No response from AI)"}
        
        json_text = clean_json_response(response_text)
        result = json.loads(json_text, strict=False)
        return result
    except Exception as e:
        logger.error(f"Error extracting job data from URL: {e}")
        return {"success": False, "error": f"Failed to parse page content: {str(e)}"}
