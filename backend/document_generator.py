"""
Document Generator - Creates optimized resumes and cover letters
"""

import os
import io
import logging
from typing import Dict, Any, Optional
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE
import aiohttp
import json

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


async def call_groq_api(prompt: str) -> Optional[str]:
    """Call Groq API for text generation"""
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set")
        return None
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are an expert resume writer and career coach. Provide clear, professional content."
            },
            {
                "role": "user", 
                "content": prompt
            }
        ],
        "temperature": 0.4,
        "max_tokens": 4000
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(GROQ_API_URL, headers=headers, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    error_text = await response.text()
                    logger.error(f"Groq API error {response.status}: {error_text}")
                    return None
    except Exception as e:
        logger.error(f"Groq API request failed: {e}")
        return None


async def generate_optimized_resume_content(resume_text: str, job_description: str, analysis: Dict) -> Optional[Dict]:
    """Generate optimized resume content using AI"""
    
    missing_skills = []
    if analysis.get("hardSkills", {}).get("missing"):
        missing_skills.extend([s.get("skill", s) if isinstance(s, dict) else s for s in analysis["hardSkills"]["missing"]])
    if analysis.get("softSkills", {}).get("missing"):
        missing_skills.extend([s.get("skill", s) if isinstance(s, dict) else s for s in analysis["softSkills"]["missing"]])
    
    keywords = analysis.get("keywordsToAdd", [])
    
    prompt = f"""
Based on this resume and job description, create an optimized resume. 
Incorporate the missing skills where truthfully possible and add relevant keywords.

ORIGINAL RESUME:
{resume_text[:3000]}

TARGET JOB:
{job_description[:2000]}

MISSING SKILLS TO INCORPORATE (if applicable): {', '.join(missing_skills[:15])}
KEYWORDS TO ADD: {', '.join(keywords[:10])}

Return a JSON object with this structure (no markdown):
{{
    "contactInfo": {{
        "name": "Full Name",
        "email": "email@example.com",
        "phone": "123-456-7890",
        "linkedin": "linkedin.com/in/username",
        "location": "City, State"
    }},
    "summary": "A compelling 3-4 sentence professional summary tailored to this job...",
    "experience": [
        {{
            "title": "Job Title",
            "company": "Company Name",
            "dates": "Jan 2020 - Present",
            "bullets": [
                "Achievement-focused bullet with metrics...",
                "Another impactful bullet..."
            ]
        }}
    ],
    "education": [
        {{
            "degree": "Degree Name",
            "school": "University Name",
            "date": "2020",
            "details": "Relevant coursework or honors"
        }}
    ],
    "skills": ["Skill 1", "Skill 2", "Skill 3"]
}}

Make the content ATS-friendly and keyword-optimized. Keep truthful to the original experience but enhance presentation.
"""

    try:
        response = await call_groq_api(prompt)
        if not response:
            return None
        
        # Clean the response
        response = response.strip()
        if response.startswith("```"):
            response = response.split("```")[1]
            if response.startswith("json"):
                response = response[4:]
        response = response.strip()
        
        return json.loads(response)
    except Exception as e:
        logger.error(f"Failed to generate resume content: {e}")
        return None


async def generate_cover_letter_content(resume_text: str, job_description: str, job_title: str, company: str) -> Optional[str]:
    """Generate a cover letter using AI"""
    
    prompt = f"""
Write a professional, compelling cover letter for this job application.

APPLICANT'S RESUME:
{resume_text[:2500]}

JOB TITLE: {job_title}
COMPANY: {company}

JOB DESCRIPTION:
{job_description[:2000]}

Write a 3-4 paragraph cover letter that:
1. Opens with enthusiasm for the specific role and company
2. Highlights 2-3 most relevant experiences/achievements from the resume
3. Shows knowledge of the company/industry
4. Closes with a strong call to action

Use a professional but personable tone. Do NOT use brackets or placeholders.
Return ONLY the cover letter text, no JSON or markdown.
"""

    try:
        response = await call_groq_api(prompt)
        return response
    except Exception as e:
        logger.error(f"Failed to generate cover letter: {e}")
        return None


def create_resume_docx(resume_data: Dict) -> io.BytesIO:
    """Create a Word document from resume data"""
    doc = Document()
    
    # Set margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.5)
        section.bottom_margin = Inches(0.5)
        section.left_margin = Inches(0.6)
        section.right_margin = Inches(0.6)
    
    # Contact Info / Header
    contact = resume_data.get("contactInfo", {})
    name = contact.get("name", "Your Name")
    
    # Name
    name_para = doc.add_paragraph()
    name_run = name_para.add_run(name)
    name_run.bold = True
    name_run.font.size = Pt(18)
    name_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Contact details
    contact_parts = []
    if contact.get("email"):
        contact_parts.append(contact["email"])
    if contact.get("phone"):
        contact_parts.append(contact["phone"])
    if contact.get("location"):
        contact_parts.append(contact["location"])
    if contact.get("linkedin"):
        contact_parts.append(contact["linkedin"])
    
    if contact_parts:
        contact_para = doc.add_paragraph(" | ".join(contact_parts))
        contact_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Summary
    if resume_data.get("summary"):
        doc.add_heading("Professional Summary", level=1)
        doc.add_paragraph(resume_data["summary"])
    
    # Experience
    if resume_data.get("experience"):
        doc.add_heading("Professional Experience", level=1)
        for exp in resume_data["experience"]:
            # Title and Company
            exp_header = doc.add_paragraph()
            title_run = exp_header.add_run(f"{exp.get('title', 'Title')}")
            title_run.bold = True
            exp_header.add_run(f" | {exp.get('company', 'Company')}")
            
            # Dates
            if exp.get("dates"):
                dates_para = doc.add_paragraph(exp["dates"])
                dates_para.paragraph_format.space_after = Pt(6)
            
            # Bullets
            for bullet in exp.get("bullets", []):
                bullet_para = doc.add_paragraph(bullet, style='List Bullet')
    
    # Education
    if resume_data.get("education"):
        doc.add_heading("Education", level=1)
        for edu in resume_data["education"]:
            edu_para = doc.add_paragraph()
            degree_run = edu_para.add_run(f"{edu.get('degree', 'Degree')}")
            degree_run.bold = True
            edu_para.add_run(f" - {edu.get('school', 'School')}")
            if edu.get("date"):
                edu_para.add_run(f" ({edu['date']})")
            if edu.get("details"):
                doc.add_paragraph(edu["details"])
    
    # Skills
    if resume_data.get("skills"):
        doc.add_heading("Skills", level=1)
        skills_text = " • ".join(resume_data["skills"])
        doc.add_paragraph(skills_text)
    
    # Save to BytesIO
    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)
    return file_stream


def create_cover_letter_docx(cover_letter_text: str, job_title: str, company: str) -> io.BytesIO:
    """Create a Word document for the cover letter"""
    doc = Document()
    
    # Set margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
    
    # Date
    from datetime import datetime
    date_para = doc.add_paragraph(datetime.now().strftime("%B %d, %Y"))
    date_para.alignment = WD_ALIGN_PARAGRAPH.LEFT
    
    doc.add_paragraph()  # Spacing
    
    # Greeting
    doc.add_paragraph(f"Re: Application for {job_title} at {company}")
    doc.add_paragraph()
    doc.add_paragraph("Dear Hiring Manager,")
    doc.add_paragraph()
    
    # Body - split into paragraphs
    paragraphs = cover_letter_text.strip().split('\n\n')
    for para in paragraphs:
        if para.strip():
            p = doc.add_paragraph(para.strip())
            p.paragraph_format.space_after = Pt(12)
    
    doc.add_paragraph()
    doc.add_paragraph("Sincerely,")
    doc.add_paragraph("[Your Name]")
    
    # Save to BytesIO
    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)
    return file_stream

