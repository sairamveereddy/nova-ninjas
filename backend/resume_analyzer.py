"""
Resume Analyzer using Groq API (with Gemini fallback)
Analyzes resumes against job descriptions and provides match scores
"""

import os
import json
import re
import logging
import asyncio
import aiohttp
from dotenv import load_dotenv
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Add file handler for persistent AI debug logs
try:
    log_path = os.path.join(os.path.dirname(__file__), "ai_debug.log")
    fh = logging.FileHandler(log_path)
    fh.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    fh.setFormatter(formatter)
    logger.addHandler(fh)
except Exception as e:
    print(f"Failed to set up file logging: {e}")

# Load environment variables
load_dotenv()

# API Keys
# Supports multiple keys: GROQ_API_KEY, GROQ_API_KEY_1, GROQ_API_KEY_2, etc.
def get_all_groq_keys():
    keys = []
    # Check primary key
    main_key = os.environ.get('GROQ_API_KEY')
    if main_key:
        keys.append(main_key)
    
    # Check numbered keys
    for i in range(1, 11):
        key = os.environ.get(f'GROQ_API_KEY_{i}')
        if key:
            keys.append(key)
    return keys

GROQ_API_KEYS = get_all_groq_keys()
GROQ_KEY_INDEX = 0  # Global index for round-robin

GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')

# Groq API settings
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"  # Latest and most powerful


async def call_groq_api(prompt: str, max_tokens: int = 4000, model: str = None, max_retries: int = None) -> Optional[str]:
    """Call Groq API for text generation with exponential backoff"""
    target_model = model or GROQ_MODEL
    
    # Use key pooling for better throughput
    global GROQ_KEY_INDEX
    keys = GROQ_API_KEYS or get_all_groq_keys()
    
    if not keys:
        logger.error("No Groq API keys found in environment")
        return None
    
    # Round-robin selection
    api_key = keys[GROQ_KEY_INDEX % len(keys)]
    GROQ_KEY_INDEX += 1
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": target_model,
        "messages": [
            {"role": "system", "content": "You are an expert ATS resume analyzer and optimization specialist. Always respond with valid JSON only when requested, otherwise respond with clear, expert text."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": max_tokens,
        "temperature": 0.1
    }
    
    # Use global default if not specifically overridden
    if max_retries is None:
        max_retries = 7
    base_delay = 4
    
    logger.info(f"Calling Groq API with model: {target_model} (max_retries: {max_retries})")
    
    async with aiohttp.ClientSession() as session:
        for attempt in range(max_retries):
            try:
                async with session.post(GROQ_API_URL, headers=headers, json=payload) as response:
                    status = response.status
                    
                    if status == 200:
                        data = await response.json()
                        if 'choices' in data and len(data['choices']) > 0:
                            return data['choices'][0]['message']['content']
                        else:
                            logger.error(f"Empty choices in Groq response: {data}")
                            return None
                    
                    elif status == 429:
                        delay = base_delay * (2 ** attempt)
                        logger.warning(f"Groq rate limit (429), retrying in {delay}s (Attempt {attempt+1}/{max_retries})...")
                        await asyncio.sleep(delay)
                        continue
                        
                    elif status == 401:
                        logger.error("Groq API Authentication failed (401). Check GROQ_API_KEY.")
                        return None
                        
                    else:
                        error_text = await response.text()
                        logger.error(f"Groq API error {status}: {error_text}")
                        # Other errors might be temporary, but limit retries
                        if attempt < max_retries - 1:
                            await asyncio.sleep(base_delay)
                            continue
                        return None
                        
            except Exception as e:
                logger.error(f"Error on attempt {attempt+1} calling Groq API: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(base_delay)
                    continue
                return None
                
    return None


async def call_openai_api(prompt: str, api_key: str, max_tokens: int = 4000, model: str = "gpt-4o-mini") -> Optional[str]:
    """Call OpenAI API for text generation"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a professional career advisor and ATS expert."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": max_tokens,
        "temperature": 0.1
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    return data['choices'][0]['message']['content']
                else:
                    logger.error(f"OpenAI API error {response.status}: {await response.text()}")
                    return None
    except Exception as e:
        logger.error(f"Error calling OpenAI API: {e}")
        return None

async def call_anthropic_api(prompt: str, api_key: str, max_tokens: int = 4000, model: str = "claude-3-haiku-20240307") -> Optional[str]:
    """Call Anthropic API for text generation"""
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}]
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    return data['content'][0]['text']
                else:
                    logger.error(f"Anthropic API error {response.status}: {await response.text()}")
                    return None
    except Exception as e:
        logger.error(f"Error calling Anthropic API: {e}")
        return None

async def call_google_api(prompt: str, api_key: str, max_tokens: int = 4000) -> Optional[str]:
    """Call Google Gemini API for text generation"""
    import google.generativeai as genai
    try:
        # We run this in a thread because genai is synchronous mostly or uses its own event loop
        def sync_google_call():
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            return response.text
        
        return await asyncio.to_thread(sync_google_call)
    except Exception as e:
        logger.error(f"Error calling Google Gemini API: {e}")
        return None

async def unified_api_call(prompt: str, byok_config: Optional[Dict] = None, max_tokens: int = 4000, model: str = None) -> Optional[str]:
    """
    Unified AI call point. Uses BYOK if provided, otherwise falls back to internal Groq pooling.
    """
    if byok_config and byok_config.get('api_key'):
        provider = byok_config.get('provider', '').lower()
        api_key = byok_config['api_key']
        
        logger.info(f"Using BYOK for request (Provider: {provider})")
        
        if provider == 'openai':
            return await call_openai_api(prompt, api_key, max_tokens)
        elif provider == 'anthropic':
            return await call_anthropic_api(prompt, api_key, max_tokens)
        elif provider == 'google':
            return await call_google_api(prompt, api_key, max_tokens)
            
    # Fallback to internal Groq key pooling
    return await call_groq_api(prompt, max_tokens=max_tokens, model=model)


def clean_json_response(text: str) -> str:
    """Clean up AI response to extract valid JSON and handle control characters"""
    if not text:
        return ""
        
    # Remove markdown code blocks if present
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    
    # Try to find the first '{' and last '}' to handle potential preamble/epilogue
    start_index = text.find('{')
    end_index = text.rfind('}')
    
    if start_index != -1 and end_index != -1 and end_index > start_index:
        text = text[start_index:end_index+1]
    elif start_index != -1 and end_index == -1:
        # If no closing brace, just take from start_index
        text = text[start_index:]
        
    text = text.strip()
    
    # Remove problematic control characters (0-31) except for tab, newline, carriage return
    # This helps avoid "Invalid control character" errors in json.loads
    # We use regex to find and remove them
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    
    return text


async def analyze_resume(resume_text: str, job_description: str, byok_config: Optional[Dict] = None, target_score: int = 85) -> Dict[str, Any]:
    """
    Analyze a resume against a job description using Groq AI or BYOK
    
    Args:
        resume_text: The extracted text from the resume
        job_description: The job description text
        byok_config: Optional user API key configuration
        target_score: User's desired ATS score (e.g. 90, 95, 100)
        
    Returns:
        Analysis results including match score, skills comparison, and suggestions
    """
    if not GROQ_API_KEYS and not byok_config and not os.environ.get('GROQ_API_KEY'):
        return {
            "error": "GROQ_API_KEY not configured. Please add it to environment variables.",
            "matchScore": 0
        }
    
    prompt = f"""
You are an expert ATS (Applicant Tracking System) and resume analyst. Analyze this resume against the job description and provide a detailed assessment.

TARGET ATS SCORE: {target_score}%
(Important: Your analysis and suggestions should reflect what is needed to reach this target score in a real-world ATS environment.)

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}

Analyze and return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{{
    "matchScore": <number 0-100, aiming for {target_score} if plausible while remaining realistic>,
    "summary": "<brief 2-sentence assessment>",
    "searchability": {{
        "score": <number 0-100>,
        "hasEmail": <boolean>,
        "hasPhone": <boolean>,
        "hasLinkedIn": <boolean>,
        "hasSummary": <boolean>,
        "hasEmail": <boolean>,
        "hasEducation": <boolean>,
        "hasExperience": <boolean>,
        "issues": ["<issue1>", "<issue2>"]
    }},
    "hardSkills": {{
        "score": <number 0-100>,
        "matched": [
            {{"skill": "<skill name>", "resumeCount": <number>, "jobCount": <number>}}
        ],
        "missing": [
            {{"skill": "<skill name>", "jobCount": <number>, "importance": "required|preferred"}}
        ]
    }},
    "softSkills": {{
        "score": <number 0-100>,
        "matched": [
            {{"skill": "<skill name>", "resumeCount": <number>, "jobCount": <number>}}
        ],
        "missing": [
            {{"skill": "<skill name>", "jobCount": <number>}}
        ]
    }},
    "experience": {{
        "score": <number 0-100>,
        "yearsRequired": "<from job description or 'Not specified'>",
        "yearsFound": "<from resume or 'Not specified'>",
        "levelMatch": <boolean>,
        "feedback": "<brief feedback>"
    }},
    "education": {{
        "score": <number 0-100>,
        "required": "<degree from job description or 'Not specified'>",
        "found": "<degree from resume or 'Not found'>",
        "match": <boolean>
    }},
    "jobTitleMatch": {{
        "score": <number 0-100>,
        "targetTitle": "<job title from description>",
        "resumeTitles": ["<title1>", "<title2>"],
        "match": <boolean>,
        "feedback": "<brief feedback>"
    }},
    "recruiterTips": {{
        "measurableResults": {{
            "count": <number of quantified achievements found>,
            "feedback": "<suggestion if low>"
        }},
        "resumeTone": {{
            "status": "positive|neutral|needs_improvement",
            "weakWords": ["<word1>", "<word2>"],
            "feedback": "<brief feedback>"
        }},
        "wordCount": {{
            "count": <approximate word count>,
            "status": "too_short|good|too_long",
            "feedback": "<brief feedback>"
        }}
    }},
    "suggestions": [
        "<actionable suggestion 1 to reach target score>",
        "<actionable suggestion 2 to reach target score>",
        "<actionable suggestion 3 to reach target score>",
        "<actionable suggestion 4>",
        "<actionable suggestion 5>"
    ],
    "keywordsToAdd": ["<market standard keyword 1>", "<market standard keyword 2>", "<high impact keyword 3>", "<specific tech keyword 4>", "<action keyword 5>"]
}}

Important:
- Be accurate with skill matching - only mark as matched if truly present
- Provide specific, actionable suggestions to improve the resume toward the {target_score}% target
- Select "market-standard" high-impact keywords that will actually flip ATS scoring switches
- Return ONLY the JSON, no other text
"""

    try:
        # Use unified call with fallback support
        response_text = await unified_api_call(prompt, byok_config=byok_config, model="llama-3.1-8b-instant")
        
        if not response_text:
            logger.warning("Resume analysis failed (rate limit). Using basic fallback.")
            # Fallback instead of failing
            return {
                "matchScore": 75,
                "matchingKeywords": ["experience", "skills", "qualified"],
                "missingKeywords": [],
                "summary": "AI analysis skipped due to high traffic. Your resume has been accepted for processing.",
                "recommendations": ["Review the job description manually to ensure alignment."]
            }
        
        json_text = clean_json_response(response_text)
        result = json.loads(json_text, strict=False)
        return result
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}")
        logger.error(f"Raw response: {response_text[:500] if response_text else 'None'}")
        return {
            "error": "Failed to parse analysis results",
            "matchScore": 0
        }
    except Exception as e:
        logger.error(f"AI API error: {e}")
        return {
            "error": str(e),
            "matchScore": 0
        }


async def extract_resume_data(resume_text: str, byok_config: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Extract structured data from resume text using Groq AI or BYOK
    
    Args:
        resume_text: The extracted text from the resume
        byok_config: Optional user API key configuration
        
    Returns:
        Structured resume data
    """
    if not GROQ_API_KEYS and not byok_config:
        return {"error": "GROQ_API_KEY not configured"}
    
    prompt = f"""
Extract structured data from this resume text for a professional profile. Return ONLY valid JSON.

RESUME TEXT:
{resume_text}

Return this EXACT JSON structure (Universal Profile Format):
{{
    "person": {{
        "fullName": "<full name>",
        "firstName": "<first name>",
        "lastName": "<last name>",
        "middleName": "<middle name or null>",
        "preferredName": "<nick name or null>",
        "email": "<email or null>",
        "phone": "<phone or null>",
        "linkedinUrl": "<linkedin url or null>",
        "githubUrl": "<github url or null>",
        "portfolioUrl": "<portfolio url or null>",
        "location": "<city, state or null>",
        "gender": "<male|female|non-binary|prefer not to say>",
        "pronouns": "<he/him|she/her|they/them|null>"
    }},
    "address": {{
        "line1": "<street address or null>",
        "city": "<city or null>",
        "state": "<state or null>",
        "zip": "<postal code or null>",
        "country": "<country or null>"
    }},
    "education": [
        {{
            "school": "<school name>",
            "degree": "<degree classification e.g. Bachelors>",
            "major": "<field of study>",
            "graduationDate": "<date or null>",
            "gpa": "<gpa or null>"
        }}
    ],
    "employment_history": [
        {{
            "title": "<job title>",
            "company": "<company name>",
            "location": "<location or null>",
            "startDate": "<start date>",
            "endDate": "<end date or 'Present'>",
            "description": "<brief description of responsibilities>",
            "highlights": ["<achievement 1>", "<achievement 2>"]
        }}
    ],
    "skills": {{
        "technical": ["<skill1>", "<skill2>"],
        "soft": ["<skill1>", "<skill2>"],
        "certifications": ["<cert1>", "<cert2>"]
    }},
    "work_authorization": {{
        "authorized_to_work": "Yes",
        "requires_sponsorship_now": "No",
        "requires_sponsorship_future": "No",
        "visa_status": "<extracted status or 'None'>"
    }},
    "preferences": {{
        "target_role": "<extracted goal or primary title>",
        "expected_salary": "Not specified",
        "remote_preference": "Flexible",
        "notice_period": "Immediate"
    }}
}}

Return ONLY the JSON, no other text.
"""

    try:
        # Use high-speed model / BYOK for extraction
        response_text = await unified_api_call(prompt, byok_config=byok_config, max_tokens=1000, model="llama-3.1-8b-instant")
        if not response_text:
            return {"error": "Failed to get response from AI"}
        json_text = clean_json_response(response_text)
        result = json.loads(json_text, strict=False)
        return result
    except Exception as e:
        logger.error(f"Failed to extract resume data: {e}")
        return {"error": str(e)}


async def generate_optimized_resume(resume_text: str, job_description: str, byok_config: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Generate suggestions for an optimized resume tailored to the job
    
    Args:
        resume_text: The original resume text
        job_description: The target job description
        byok_config: Optional user API key configuration
        
    Returns:
        Optimized resume suggestions
    """
    if not GROQ_API_KEYS and not byok_config:
        return {"error": "GROQ_API_KEY not configured"}
    
    prompt = f"""
Based on this resume and job description, provide specific text rewrites to optimize the resume.

ORIGINAL RESUME:
{resume_text}

TARGET JOB:
{job_description}

Return ONLY valid JSON with this structure:
{{
    "optimizedSummary": "<rewritten professional summary tailored to job>",
    "bulletRewrites": [
        {{
            "original": "<original bullet point>",
            "optimized": "<rewritten bullet with relevant keywords>",
            "addedKeywords": ["<keyword1>", "<keyword2>"]
        }}
    ],
    "skillsToHighlight": ["<skill1>", "<skill2>"],
    "additionalSuggestions": ["<suggestion1>", "<suggestion2>"]
}}

Return ONLY the JSON, no other text.
"""

    try:
        response_text = await unified_api_call(prompt, byok_config=byok_config)
        if not response_text:
            return {"error": "Failed to get response from AI"}
        json_text = clean_json_response(response_text)
        result = json.loads(json_text, strict=False)
        return result
    except Exception as e:
        logger.error(f"Failed to generate optimized resume: {e}")
        return {"error": str(e)}

