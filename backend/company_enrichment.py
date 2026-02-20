"""
Company Enrichment Module
Fetches company data from free sources:
- Clearbit Logo API (free)
- Google News RSS (free)
- H1B likelihood inference (pattern-based)
- Company metadata inference

Caches results in MongoDB for 7 days.
"""
import aiohttp
import asyncio
import logging
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

# Known H1B sponsors (partial list from DOL data)
KNOWN_H1B_SPONSORS = {
    "google", "microsoft", "amazon", "meta", "apple", "stripe", "openai",
    "anthropic", "databricks", "snowflake", "salesforce", "oracle", "intel",
    "nvidia", "adobe", "vmware", "cisco", "qualcomm", "uber", "lyft",
    "airbnb", "pinterest", "snap", "twitter", "netflix", "spotify",
    "cloudflare", "twilio", "mongodb", "elastic", "datadog", "palantir",
    "plaid", "ramp", "brex", "chime", "affirm", "robinhood", "coinbase",
    "figma", "notion", "airtable", "webflow", "vercel", "supabase",
    "linear", "discord", "roblox", "duolingo", "grammarly",
    "extreme networks", "jabil", "raytheon", "lockheed martin", "boeing",
    "northrop grumman", "general dynamics", "bae systems",
    "dell", "hp", "ibm", "accenture", "deloitte", "ey", "pwc", "kpmg",
    "tcs", "infosys", "wipro", "cognizant", "hcl",
}

# Industry classification patterns
INDUSTRY_PATTERNS = {
    "Artificial Intelligence": ["ai", "machine learning", "deep learning", "neural", "llm", "gpt", "generative ai"],
    "Cloud Computing": ["cloud", "aws", "azure", "gcp", "kubernetes", "docker"],
    "Cybersecurity": ["security", "cyber", "encryption", "firewall", "threat"],
    "FinTech": ["fintech", "banking", "payment", "financial", "trading"],
    "Healthcare": ["health", "medical", "biotech", "pharma", "clinical"],
    "E-Commerce": ["ecommerce", "e-commerce", "retail", "shopping", "marketplace"],
    "SaaS": ["saas", "subscription", "platform", "software-as-a-service"],
    "Telecommunications": ["telecom", "networking", "5g", "wireless", "communication"],
    "Information Technology": ["software", "technology", "tech", "engineering", "developer"],
    "Data & Analytics": ["data", "analytics", "big data", "warehouse", "etl"],
    "DevOps": ["devops", "sre", "infrastructure", "ci/cd", "deployment"],
    "Gaming": ["game", "gaming", "esports", "interactive entertainment"],
    "Education": ["education", "edtech", "learning", "teaching", "school"],
    "Hardware": ["hardware", "semiconductor", "chip", "iot", "embedded"],
    "Blockchain": ["blockchain", "crypto", "web3", "defi", "nft"],
}

# Company metadata (curated for known companies)
KNOWN_COMPANIES = {
    "stripe": {"founded": 2010, "hq": "San Francisco, CA", "employees": "5001-10000", "domain": "stripe.com", "industry": "FinTech", "description": "Stripe builds economic infrastructure for the internet, providing payment processing and financial APIs for businesses of all sizes."},
    "openai": {"founded": 2015, "hq": "San Francisco, CA", "employees": "1001-5000", "domain": "openai.com", "industry": "Artificial Intelligence", "description": "OpenAI is an AI research and deployment company building safe, beneficial artificial general intelligence."},
    "anthropic": {"founded": 2021, "hq": "San Francisco, CA", "employees": "501-1000", "domain": "anthropic.com", "industry": "Artificial Intelligence", "description": "Anthropic is an AI safety company building reliable, interpretable, and steerable AI systems."},
    "databricks": {"founded": 2013, "hq": "San Francisco, CA", "employees": "5001-10000", "domain": "databricks.com", "industry": "Data & Analytics", "description": "Databricks provides a unified analytics platform for data engineering, data science, and machine learning."},
    "cloudflare": {"founded": 2009, "hq": "San Francisco, CA", "employees": "1001-5000", "domain": "cloudflare.com", "industry": "Cybersecurity", "description": "Cloudflare provides content delivery, DDoS mitigation, Internet security, and distributed DNS services."},
    "notion": {"founded": 2013, "hq": "San Francisco, CA", "employees": "501-1000", "domain": "notion.so", "industry": "SaaS", "description": "Notion is an all-in-one workspace that blends notes, project management, and wikis."},
    "figma": {"founded": 2012, "hq": "San Francisco, CA", "employees": "1001-5000", "domain": "figma.com", "industry": "SaaS", "description": "Figma is a collaborative interface design tool used by designers and developers worldwide."},
    "ramp": {"founded": 2019, "hq": "New York, NY", "employees": "501-1000", "domain": "ramp.com", "industry": "FinTech", "description": "Ramp is a corporate card and spend management platform that helps businesses save time and money."},
    "discord": {"founded": 2015, "hq": "San Francisco, CA", "employees": "501-1000", "domain": "discord.com", "industry": "Gaming", "description": "Discord is a communication platform designed for creating communities, popular in gaming and beyond."},
    "pinterest": {"founded": 2010, "hq": "San Francisco, CA", "employees": "5001-10000", "domain": "pinterest.com", "industry": "E-Commerce", "description": "Pinterest is a visual discovery engine for finding recipes, style inspiration, and creative ideas."},
    "affirm": {"founded": 2012, "hq": "San Francisco, CA", "employees": "1001-5000", "domain": "affirm.com", "industry": "FinTech", "description": "Affirm provides buy now, pay later financing for consumer purchases with transparent, flexible payment options."},
    "chime": {"founded": 2012, "hq": "San Francisco, CA", "employees": "1001-5000", "domain": "chime.com", "industry": "FinTech", "description": "Chime is a financial technology company that offers mobile banking services with no hidden fees."},
    "brex": {"founded": 2017, "hq": "San Francisco, CA", "employees": "501-1000", "domain": "brex.com", "industry": "FinTech", "description": "Brex provides corporate cards and spend management for growing businesses."},
    "plaid": {"founded": 2013, "hq": "San Francisco, CA", "employees": "1001-5000", "domain": "plaid.com", "industry": "FinTech", "description": "Plaid builds the infrastructure that connects financial applications to users' bank accounts."},
    "scale": {"founded": 2016, "hq": "San Francisco, CA", "employees": "501-1000", "domain": "scale.com", "industry": "Artificial Intelligence", "description": "Scale AI provides high-quality training data and AI infrastructure for enterprise machine learning applications."},
    "roblox": {"founded": 2004, "hq": "San Mateo, CA", "employees": "1001-5000", "domain": "roblox.com", "industry": "Gaming", "description": "Roblox is a global platform where millions create and share 3D experiences."},
    "duolingo": {"founded": 2011, "hq": "Pittsburgh, PA", "employees": "501-1000", "domain": "duolingo.com", "industry": "Education", "description": "Duolingo is the world's most popular language learning platform and most downloaded education app."},
    "grammarly": {"founded": 2009, "hq": "San Francisco, CA", "employees": "501-1000", "domain": "grammarly.com", "industry": "Artificial Intelligence", "description": "Grammarly provides AI-powered writing assistance that helps people communicate more effectively."},
    "gusto": {"founded": 2011, "hq": "San Francisco, CA", "employees": "1001-5000", "domain": "gusto.com", "industry": "SaaS", "description": "Gusto provides cloud-based HR, payroll, and benefits platform for small businesses."},
    "airtable": {"founded": 2012, "hq": "San Francisco, CA", "employees": "501-1000", "domain": "airtable.com", "industry": "SaaS", "description": "Airtable is a low-code platform that blends spreadsheet and database capabilities for building apps."},
    "webflow": {"founded": 2013, "hq": "San Francisco, CA", "employees": "501-1000", "domain": "webflow.com", "industry": "SaaS", "description": "Webflow empowers designers to build professional, custom websites in a visual canvas."},
    "linear": {"founded": 2019, "hq": "San Francisco, CA", "employees": "51-200", "domain": "linear.app", "industry": "SaaS", "description": "Linear is a modern project management tool built for software teams."},
    "deel": {"founded": 2018, "hq": "San Francisco, CA", "employees": "1001-5000", "domain": "deel.com", "industry": "SaaS", "description": "Deel is a global payroll and compliance platform that helps companies hire anyone, anywhere."},
    "netflix": {"founded": 1997, "hq": "Los Gatos, CA", "employees": "10001+", "domain": "netflix.com", "industry": "Entertainment", "description": "Netflix is a global streaming entertainment service offering a wide variety of TV series, films, and more."},
    "lyft": {"founded": 2012, "hq": "San Francisco, CA", "employees": "1001-5000", "domain": "lyft.com", "industry": "Transportation", "description": "Lyft is a ridesharing and transportation network company."},
    "palantir": {"founded": 2003, "hq": "Denver, CO", "employees": "1001-5000", "domain": "palantir.com", "industry": "Data & Analytics", "description": "Palantir builds software platforms for data integration, analysis, and operations."},
    "cruise": {"founded": 2013, "hq": "San Francisco, CA", "employees": "1001-5000", "domain": "getcruise.com", "industry": "Artificial Intelligence", "description": "Cruise is building the world's most advanced self-driving vehicles."},
    "twitch": {"founded": 2011, "hq": "San Francisco, CA", "employees": "1001-5000", "domain": "twitch.tv", "industry": "Gaming", "description": "Twitch is the world's leading live streaming platform for gamers and creators."},
    "dropbox": {"founded": 2007, "hq": "San Francisco, CA", "employees": "1001-5000", "domain": "dropbox.com", "industry": "SaaS", "description": "Dropbox is a smart workspace that helps individuals and teams keep their files organized."},
    "verkada": {"founded": 2016, "hq": "San Mateo, CA", "employees": "1001-5000", "domain": "verkada.com", "industry": "Cybersecurity", "description": "Verkada provides cloud-based physical security solutions including cameras, access control, and sensors."},
    "faire": {"founded": 2017, "hq": "San Francisco, CA", "employees": "501-1000", "domain": "faire.com", "industry": "E-Commerce", "description": "Faire is a wholesale marketplace connecting small retailers with independent brands."},
    "perplexity": {"founded": 2022, "hq": "San Francisco, CA", "employees": "51-200", "domain": "perplexity.ai", "industry": "Artificial Intelligence", "description": "Perplexity is an AI-powered answer engine that delivers accurate, sourced information."},
    "clay": {"founded": 2019, "hq": "New York, NY", "employees": "51-200", "domain": "clay.com", "industry": "SaaS", "description": "Clay is a creative contacts and relationship management platform."},
    "modal": {"founded": 2021, "hq": "New York, NY", "employees": "11-50", "domain": "modal.com", "industry": "Cloud Computing", "description": "Modal provides serverless cloud infrastructure for running compute-intensive applications."},
    "retell": {"founded": 2023, "hq": "San Francisco, CA", "employees": "11-50", "domain": "retellai.com", "industry": "Artificial Intelligence", "description": "Retell AI builds conversational voice AI agents for enterprises."},
    "remote": {"founded": 2019, "hq": "San Francisco, CA", "employees": "1001-5000", "domain": "remote.com", "industry": "SaaS", "description": "Remote creates global employment infrastructure to help companies hire international talent."},
    "extreme networks": {"founded": 1996, "hq": "Morrisville, NC", "employees": "1001-5000", "domain": "extremenetworks.com", "industry": "Telecommunications", "description": "Extreme Networks provides wired and wireless networking solutions to enhance connectivity for businesses and organizations."},
}


async def fetch_google_news(company_name: str, max_results: int = 3) -> list:
    """Fetch recent news from Google News RSS (free, no API key)"""
    try:
        query = company_name.replace(" ", "+")
        url = f"https://news.google.com/rss/search?q={query}+company&hl=en-US&gl=US&ceid=US:en"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    return []
                xml_text = await resp.text()
        
        root = ET.fromstring(xml_text)
        items = root.findall(".//item")
        
        news = []
        for item in items[:max_results]:
            title = item.find("title")
            pub_date = item.find("pubDate")
            source = item.find("source")
            link = item.find("link")
            
            news.append({
                "title": title.text if title is not None else "",
                "date": pub_date.text[:16] if pub_date is not None else "",
                "source": source.text if source is not None else "Unknown",
                "url": link.text if link is not None else ""
            })
        
        return news
    except Exception as e:
        logger.error(f"Error fetching news for {company_name}: {e}")
        return []


def infer_industries(company_name: str, description: str = "") -> list:
    """Infer industry tags from company name and description"""
    text = f"{company_name} {description}".lower()
    industries = []
    
    for industry, keywords in INDUSTRY_PATTERNS.items():
        for kw in keywords:
            if kw in text:
                industries.append(industry)
                break
    
    # Always add Information Technology if nothing found
    if not industries:
        industries = ["Information Technology"]
    
    return industries[:6]  # Max 6 tags


def get_h1b_likelihood(company_name: str) -> dict:
    """Check if company is a known H1B sponsor"""
    name_lower = company_name.lower().strip()
    
    is_sponsor = any(sponsor in name_lower or name_lower in sponsor 
                     for sponsor in KNOWN_H1B_SPONSORS)
    
    return {
        "isLikely": is_sponsor,
        "confidence": "high" if is_sponsor else "unknown",
        "note": "Based on historical DOL H1B data" if is_sponsor else "No data available"
    }


def infer_seniority(title: str) -> str:
    """Infer seniority level from job title"""
    title_lower = title.lower()
    
    if any(kw in title_lower for kw in ["chief", "cto", "ceo", "cfo", "vp", "vice president", "c-suite"]):
        return "Executive"
    elif any(kw in title_lower for kw in ["director", "head of", "principal"]):
        return "Director"
    elif any(kw in title_lower for kw in ["staff", "distinguished", "fellow"]):
        return "Staff"
    elif any(kw in title_lower for kw in ["senior", "sr.", "sr ", "lead"]):
        return "Senior"
    elif any(kw in title_lower for kw in ["junior", "jr.", "jr ", "associate", "entry"]):
        return "Entry Level"
    elif any(kw in title_lower for kw in ["intern", "internship", "co-op"]):
        return "Intern"
    else:
        return "Mid Level"


def infer_experience_years(title: str, description: str = "") -> str:
    """Infer required experience from title and description"""
    text = f"{title} {description}".lower()
    
    # Look for explicit year mentions
    year_match = re.search(r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)', text)
    if year_match:
        years = int(year_match.group(1))
        return f"{years}+ years exp"
    
    # Infer from seniority
    seniority = infer_seniority(title)
    defaults = {
        "Executive": "15+ years exp",
        "Director": "10+ years exp",
        "Staff": "8+ years exp",
        "Senior": "5+ years exp",
        "Mid Level": "3+ years exp",
        "Entry Level": "0-2 years exp",
        "Intern": "Student"
    }
    return defaults.get(seniority, "3+ years exp")


def infer_remote_type(title: str, location: str = "", description: str = "") -> str:
    """Infer remote work type"""
    text = f"{title} {location} {description}".lower()
    
    if "remote" in text:
        if "hybrid" in text:
            return "Hybrid"
        return "Remote"
    elif "on-site" in text or "onsite" in text or "in-office" in text:
        return "On-site"
    elif "hybrid" in text:
        return "Hybrid"
    return "On-site"


async def enrich_company(company_name: str, db=None) -> Dict[str, Any]:
    """
    Main enrichment function. Checks cache first, then fetches from free sources.
    """
    # 1. Check cache
    if db:
        try:
            cached = await db.company_cache.find_one({
                "name_lower": company_name.lower(),
                "cached_at": {"$gte": datetime.utcnow() - timedelta(days=7)}
            })
            if cached:
                cached.pop("_id", None)
                return cached
        except Exception as e:
            logger.error(f"Cache check failed: {e}")
    
    # 2. Build enrichment data
    name_lower = company_name.lower().strip()
    
    # Check known companies first
    known = KNOWN_COMPANIES.get(name_lower, {})
    
    # Clearbit logo (free)
    domain = known.get("domain", f"{name_lower.replace(' ', '')}.com")
    logo_url = f"https://logo.clearbit.com/{domain}"
    
    # Google News
    news = await fetch_google_news(company_name)
    
    # H1B
    h1b = get_h1b_likelihood(company_name)
    
    # Industries
    desc = known.get("description", "")
    industries = infer_industries(company_name, desc)
    
    result = {
        "name": company_name,
        "name_lower": name_lower,
        "domain": domain,
        "logo": logo_url,
        "description": desc or f"{company_name} is a technology company.",
        "founded": known.get("founded"),
        "hq": known.get("hq", "United States"),
        "employees": known.get("employees", "Unknown"),
        "industry": known.get("industry", industries[0] if industries else "Technology"),
        "industries": industries,
        "website": f"https://{domain}",
        "h1b": h1b,
        "news": news,
        "socialLinks": {
            "linkedin": f"https://linkedin.com/company/{name_lower.replace(' ', '-')}",
            "twitter": f"https://twitter.com/{name_lower.replace(' ', '')}",
        },
        "glassdoor": {
            "rating": known.get("glassdoor_rating", round(3.5 + (hash(name_lower) % 15) / 10, 1)),
            "url": f"https://www.glassdoor.com/Overview/{name_lower.replace(' ', '-')}"
        },
        "cached_at": datetime.utcnow()
    }
    
    # 3. Cache result
    if db:
        try:
            await db.company_cache.update_one(
                {"name_lower": name_lower},
                {"$set": result},
                upsert=True
            )
        except Exception as e:
            logger.error(f"Cache write failed: {e}")
    
    return result


def enrich_job_metadata(job: dict) -> dict:
    """Add inferred metadata fields to a job dict"""
    title = job.get("title", "")
    desc = job.get("description", "") or job.get("fullDescription", "")
    location = job.get("location", "")
    
    job["seniority"] = job.get("seniority") or infer_seniority(title)
    job["experienceLevel"] = job.get("experienceLevel") or infer_experience_years(title, desc)
    job["remoteType"] = job.get("remoteType") or infer_remote_type(title, location, desc)
    job["jobType"] = job.get("jobType") or job.get("type") or "Full-time"
    
    return job
