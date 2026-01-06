"""
Resume Analyzer using Google Gemini API
Analyzes resumes against job descriptions and provides match scores
"""

import os
import json
import re
import logging
import asyncio
from typing import Dict, Any, Optional
import google.generativeai as genai

logger = logging.getLogger(__name__)

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 7  # seconds to wait on rate limit

# Configure Gemini
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')
model = None

def get_gemini_model():
    """Get an available Gemini model"""
    global model
    if model:
        return model
    
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set - Resume analyzer will not work")
        return None
    
    genai.configure(api_key=GOOGLE_API_KEY)
    
    # Try different model names in order of preference
    model_names = [
        'gemini-2.0-flash',
        'gemini-1.5-flash-latest', 
        'gemini-1.5-flash',
        'gemini-pro',
        'models/gemini-pro'
    ]
    
    for name in model_names:
        try:
            model = genai.GenerativeModel(name)
            logger.info(f"Using Gemini model: {name}")
            return model
        except Exception as e:
            logger.debug(f"Model {name} not available: {e}")
            continue
    
    logger.error("No Gemini model available")
    return None


def clean_json_response(text: str) -> str:
    """Clean up Gemini response to extract valid JSON"""
    # Remove markdown code blocks if present
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    text = text.strip()
    return text


async def analyze_resume(resume_text: str, job_description: str) -> Dict[str, Any]:
    """
    Analyze a resume against a job description using Gemini AI
    
    Args:
        resume_text: The extracted text from the resume
        job_description: The job description text
        
    Returns:
        Analysis results including match score, skills comparison, and suggestions
    """
    gemini_model = get_gemini_model()
    if not gemini_model:
        return {
            "error": "Gemini API not configured",
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

    # Retry logic for rate limits
    for attempt in range(MAX_RETRIES):
        try:
            response = gemini_model.generate_content(prompt)
            json_text = clean_json_response(response.text)
            result = json.loads(json_text)
            return result
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            logger.error(f"Raw response: {response.text[:500]}")
            return {
                "error": "Failed to parse analysis results",
                "matchScore": 0,
                "rawResponse": response.text[:1000]
            }
        except Exception as e:
            error_str = str(e).lower()
            # Check if it's a rate limit error (429)
            if "429" in str(e) or "quota" in error_str or "rate" in error_str:
                if attempt < MAX_RETRIES - 1:
                    logger.warning(f"Rate limit hit, waiting {RETRY_DELAY}s before retry {attempt + 2}/{MAX_RETRIES}")
                    await asyncio.sleep(RETRY_DELAY)
                    continue
            logger.error(f"Gemini API error: {e}")
            return {
                "error": str(e),
                "matchScore": 0
            }
    
    return {"error": "Max retries exceeded", "matchScore": 0}


async def extract_resume_data(resume_text: str) -> Dict[str, Any]:
    """
    Extract structured data from resume text using Gemini
    
    Args:
        resume_text: The extracted text from the resume
        
    Returns:
        Structured resume data
    """
    gemini_model = get_gemini_model()
    if not gemini_model:
        return {"error": "Gemini API not configured"}
    
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
        response = gemini_model.generate_content(prompt)
        json_text = clean_json_response(response.text)
        result = json.loads(json_text)
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
    gemini_model = get_gemini_model()
    if not gemini_model:
        return {"error": "Gemini API not configured"}
    
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
        response = gemini_model.generate_content(prompt)
        json_text = clean_json_response(response.text)
        result = json.loads(json_text)
        return result
    except Exception as e:
        logger.error(f"Failed to generate optimized resume: {e}")
        return {"error": str(e)}

