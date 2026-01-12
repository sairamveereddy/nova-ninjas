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
GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')

# Groq API settings
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"  # Latest and most powerful


async def call_groq_api(prompt: str, max_tokens: int = 4000, model: str = None, max_retries: int = None) -> Optional[str]:
    """Call Groq API for text generation with exponential backoff"""
    target_model = model or GROQ_MODEL
    
    # Re-check key in case it was loaded later
    api_key = GROQ_API_KEY or os.environ.get('GROQ_API_KEY')
    
    if not api_key:
        logger.error("GROQ_API_KEY not found in environment or already set variables")
        return None
    
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


async def analyze_resume(resume_text: str, job_description: str) -> Dict[str, Any]:
    """
    Analyze a resume against a job description using Groq AI
    
    Args:
        resume_text: The extracted text from the resume
        job_description: The job description text
        
    Returns:
        Analysis results including match score, skills comparison, and suggestions
    """
    if not GROQ_API_KEY:
        return {
            "error": "GROQ_API_KEY not configured. Please add it to environment variables.",
            "matchScore": 0
        }
    
    prompt = f"""
You are an expert ATS (Applicant Tracking System) and resume analyst. Analyze this resume against the job description and provide a detailed assessment.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}

Analyze and return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{{
    "matchScore": <number 0-100>,
    "summary": "<brief 2-sentence assessment>",
    "searchability": {{
        "score": <number 0-100>,
        "hasEmail": <boolean>,
        "hasPhone": <boolean>,
        "hasLinkedIn": <boolean>,
        "hasSummary": <boolean>,
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
        "<actionable suggestion 1>",
        "<actionable suggestion 2>",
        "<actionable suggestion 3>",
        "<actionable suggestion 4>",
        "<actionable suggestion 5>"
    ],
    "keywordsToAdd": ["<keyword1>", "<keyword2>", "<keyword3>"]
}}

Important:
- Be accurate with skill matching - only mark as matched if truly present
- Provide specific, actionable suggestions
- Score should reflect realistic ATS pass probability
- Return ONLY the JSON, no other text
"""

    try:
        # Use 3.3-70b specifically for analysis as it requires better reasoning
        response_text = await call_groq_api(prompt, model="llama-3.3-70b-versatile")
        
        if not response_text:
            return {
                "error": "Failed to get response from AI",
                "matchScore": 0
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


async def extract_resume_data(resume_text: str) -> Dict[str, Any]:
    """
    Extract structured data from resume text using Groq AI
    
    Args:
        resume_text: The extracted text from the resume
        
    Returns:
        Structured resume data
    """
    if not GROQ_API_KEY:
        return {"error": "GROQ_API_KEY not configured"}
    
    prompt = f"""
Extract structured data from this resume text. Return ONLY valid JSON.

RESUME TEXT:
{resume_text}

Return this JSON structure:
{{
    "contactInfo": {{
        "name": "<full name>",
        "email": "<email or null>",
        "phone": "<phone or null>",
        "linkedin": "<linkedin url or null>",
        "location": "<city, state or null>"
    }},
    "summary": "<professional summary if present, or null>",
    "experience": [
        {{
            "title": "<job title>",
            "company": "<company name>",
            "location": "<location or null>",
            "startDate": "<start date>",
            "endDate": "<end date or 'Present'>",
            "bullets": ["<achievement 1>", "<achievement 2>"]
        }}
    ],
    "education": [
        {{
            "degree": "<degree>",
            "school": "<school name>",
            "graduationDate": "<date or null>",
            "gpa": "<gpa or null>"
        }}
    ],
    "skills": {{
        "technical": ["<skill1>", "<skill2>"],
        "soft": ["<skill1>", "<skill2>"],
        "certifications": ["<cert1>", "<cert2>"]
    }}
}}

Return ONLY the JSON, no other text.
"""

    try:
        # Use high-availability compound model for extraction
        response_text = await call_groq_api(prompt, max_tokens=1000, model="groq/compound-mini")
        if not response_text:
            return {"error": "Failed to get response from AI"}
        json_text = clean_json_response(response_text)
        result = json.loads(json_text, strict=False)
        return result
    except Exception as e:
        logger.error(f"Failed to extract resume data: {e}")
        return {"error": str(e)}


async def generate_optimized_resume(resume_text: str, job_description: str) -> Dict[str, Any]:
    """
    Generate suggestions for an optimized resume tailored to the job
    
    Args:
        resume_text: The original resume text
        job_description: The target job description
        
    Returns:
        Optimized resume suggestions
    """
    if not GROQ_API_KEY:
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
        response_text = await call_groq_api(prompt)
        if not response_text:
            return {"error": "Failed to get response from AI"}
        json_text = clean_json_response(response_text)
        result = json.loads(json_text, strict=False)
        return result
    except Exception as e:
        logger.error(f"Failed to generate optimized resume: {e}")
        return {"error": str(e)}

