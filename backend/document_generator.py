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


async def call_groq_api(prompt: str, max_tokens: int = 8000) -> Optional[str]:
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
                "content": "You are an expert ATS resume optimization specialist. Your job is to enhance resumes to match job descriptions while preserving ALL original content, experience, and achievements. Never remove or shorten existing content - only enhance and reorganize."
            },
            {
                "role": "user", 
                "content": prompt
            }
        ],
        "temperature": 0.3,
        "max_tokens": max_tokens
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
    """Generate optimized resume content using AI - preserves ALL original content"""
    
    missing_skills = []
    if analysis.get("hardSkills", {}).get("missing"):
        missing_skills.extend([s.get("skill", s) if isinstance(s, dict) else s for s in analysis["hardSkills"]["missing"]])
    if analysis.get("softSkills", {}).get("missing"):
        missing_skills.extend([s.get("skill", s) if isinstance(s, dict) else s for s in analysis["softSkills"]["missing"]])
    
    keywords = analysis.get("keywordsToAdd", [])
    matched_skills = []
    if analysis.get("hardSkills", {}).get("matched"):
        matched_skills.extend([s.get("skill", s) if isinstance(s, dict) else s for s in analysis["hardSkills"]["matched"]])
    
    prompt = f"""
You are an expert ATS resume optimizer. Your task is to enhance this resume for the target job.

CRITICAL RULES:
1. PRESERVE ALL original content - every job, every bullet point, every achievement
2. DO NOT shorten or summarize - keep FULL details from the original
3. DO NOT remove any experience, education, or sections
4. ENHANCE bullet points by adding metrics, keywords, and action verbs
5. REORDER sections to highlight most relevant experience first
6. ADD missing keywords naturally into existing bullet points
7. Include ALL original projects, certifications, and achievements

ORIGINAL RESUME (PRESERVE ALL CONTENT):
{resume_text}

TARGET JOB DESCRIPTION:
{job_description}

KEYWORDS ALREADY MATCHED (emphasize these): {', '.join(matched_skills[:20])}
KEYWORDS TO ADD (weave into bullet points): {', '.join(missing_skills[:15])}
ADDITIONAL KEYWORDS: {', '.join(keywords[:10])}

Return a comprehensive JSON object. Include ALL experiences from the original resume with ENHANCED bullet points (4-6 bullets per job minimum):

{{
    "contactInfo": {{
        "name": "Exact name from resume",
        "email": "email from resume",
        "phone": "phone from resume",
        "linkedin": "linkedin URL if present",
        "location": "location from resume",
        "website": "portfolio/github if present"
    }},
    "summary": "A compelling 4-5 sentence professional summary that incorporates target job keywords while highlighting the candidate's strongest qualifications. Make it specific and impactful.",
    "experience": [
        {{
            "title": "Exact Job Title",
            "company": "Company Name",
            "location": "City, State",
            "dates": "Start Date - End Date",
            "bullets": [
                "Strong action verb + specific achievement with quantifiable metrics (%, $, numbers)",
                "Another detailed bullet showing relevant skills and impact",
                "Include ALL original bullets, enhanced with keywords",
                "Add more bullets to fully capture the role's scope",
                "Minimum 4-6 bullets per position"
            ]
        }}
    ],
    "projects": [
        {{
            "name": "Project Name",
            "technologies": "Tech stack used",
            "description": "What the project does",
            "bullets": ["Achievement 1", "Achievement 2"]
        }}
    ],
    "education": [
        {{
            "degree": "Full Degree Name",
            "school": "University/Institution Name",
            "location": "City, State",
            "date": "Graduation Date",
            "gpa": "GPA if above 3.0",
            "details": "Relevant coursework, honors, activities"
        }}
    ],
    "skills": {{
        "technical": ["All technical skills from resume + relevant missing keywords"],
        "tools": ["Software, platforms, tools"],
        "other": ["Languages, certifications, soft skills"]
    }},
    "certifications": [
        {{
            "name": "Certification Name",
            "issuer": "Issuing Organization",
            "date": "Date obtained"
        }}
    ],
    "additionalSections": [
        {{
            "title": "Section Name (e.g., Publications, Awards, Volunteer)",
            "items": ["Item 1", "Item 2"]
        }}
    ]
}}

IMPORTANT: The output resume should be LONGER and MORE DETAILED than the input, not shorter. Every original bullet point should be preserved and enhanced.
"""

    try:
        response = await call_groq_api(prompt, max_tokens=8000)
        if not response:
            return None
        
        # Clean the response
        response = response.strip()
        if response.startswith("```"):
            lines = response.split("```")
            response = lines[1] if len(lines) > 1 else lines[0]
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
    """Create a comprehensive Word document from resume data"""
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
    
    # Name - Large and Bold
    name_para = doc.add_paragraph()
    name_run = name_para.add_run(name)
    name_run.bold = True
    name_run.font.size = Pt(20)
    name_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    name_para.paragraph_format.space_after = Pt(4)
    
    # Contact details - First line (email, phone, location)
    contact_line1 = []
    if contact.get("email"):
        contact_line1.append(contact["email"])
    if contact.get("phone"):
        contact_line1.append(contact["phone"])
    if contact.get("location"):
        contact_line1.append(contact["location"])
    
    if contact_line1:
        contact_para1 = doc.add_paragraph(" | ".join(contact_line1))
        contact_para1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        contact_para1.paragraph_format.space_after = Pt(2)
    
    # Contact details - Second line (linkedin, website)
    contact_line2 = []
    if contact.get("linkedin"):
        contact_line2.append(contact["linkedin"])
    if contact.get("website"):
        contact_line2.append(contact["website"])
    
    if contact_line2:
        contact_para2 = doc.add_paragraph(" | ".join(contact_line2))
        contact_para2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        contact_para2.paragraph_format.space_after = Pt(8)
    
    # Professional Summary
    if resume_data.get("summary"):
        heading = doc.add_heading("PROFESSIONAL SUMMARY", level=1)
        heading.runs[0].font.size = Pt(12)
        summary_para = doc.add_paragraph(resume_data["summary"])
        summary_para.paragraph_format.space_after = Pt(12)
    
    # Professional Experience
    if resume_data.get("experience"):
        heading = doc.add_heading("PROFESSIONAL EXPERIENCE", level=1)
        heading.runs[0].font.size = Pt(12)
        
        for i, exp in enumerate(resume_data["experience"]):
            # Title and Company on same line
            exp_header = doc.add_paragraph()
            title_run = exp_header.add_run(f"{exp.get('title', 'Title')}")
            title_run.bold = True
            title_run.font.size = Pt(11)
            
            company_text = f" | {exp.get('company', 'Company')}"
            if exp.get("location"):
                company_text += f", {exp['location']}"
            exp_header.add_run(company_text)
            exp_header.paragraph_format.space_after = Pt(2)
            
            # Dates
            if exp.get("dates"):
                dates_para = doc.add_paragraph()
                dates_run = dates_para.add_run(exp["dates"])
                dates_run.italic = True
                dates_para.paragraph_format.space_after = Pt(4)
            
            # Bullets - all of them
            bullets = exp.get("bullets", [])
            for bullet in bullets:
                if bullet and bullet.strip():
                    bullet_para = doc.add_paragraph(bullet, style='List Bullet')
                    bullet_para.paragraph_format.space_after = Pt(2)
            
            # Add space between experiences
            if i < len(resume_data["experience"]) - 1:
                doc.add_paragraph().paragraph_format.space_after = Pt(6)
    
    # Projects Section
    if resume_data.get("projects"):
        heading = doc.add_heading("PROJECTS", level=1)
        heading.runs[0].font.size = Pt(12)
        
        for project in resume_data["projects"]:
            proj_header = doc.add_paragraph()
            name_run = proj_header.add_run(f"{project.get('name', 'Project')}")
            name_run.bold = True
            if project.get("technologies"):
                proj_header.add_run(f" | {project['technologies']}")
            proj_header.paragraph_format.space_after = Pt(2)
            
            if project.get("description"):
                desc_para = doc.add_paragraph(project["description"])
                desc_para.paragraph_format.space_after = Pt(4)
            
            for bullet in project.get("bullets", []):
                if bullet and bullet.strip():
                    doc.add_paragraph(bullet, style='List Bullet')
    
    # Education
    if resume_data.get("education"):
        heading = doc.add_heading("EDUCATION", level=1)
        heading.runs[0].font.size = Pt(12)
        
        for edu in resume_data["education"]:
            edu_para = doc.add_paragraph()
            degree_run = edu_para.add_run(f"{edu.get('degree', 'Degree')}")
            degree_run.bold = True
            edu_para.add_run(f" | {edu.get('school', 'School')}")
            if edu.get("location"):
                edu_para.add_run(f", {edu['location']}")
            edu_para.paragraph_format.space_after = Pt(2)
            
            # Date and GPA
            details_parts = []
            if edu.get("date"):
                details_parts.append(edu["date"])
            if edu.get("gpa"):
                details_parts.append(f"GPA: {edu['gpa']}")
            if details_parts:
                details_para = doc.add_paragraph(" | ".join(details_parts))
                details_para.runs[0].italic = True
                details_para.paragraph_format.space_after = Pt(2)
            
            if edu.get("details"):
                doc.add_paragraph(edu["details"])
    
    # Skills - Handle both list and dict formats
    skills_data = resume_data.get("skills", {})
    if skills_data:
        heading = doc.add_heading("SKILLS", level=1)
        heading.runs[0].font.size = Pt(12)
        
        if isinstance(skills_data, dict):
            # New format with categories
            if skills_data.get("technical"):
                tech_para = doc.add_paragraph()
                tech_label = tech_para.add_run("Technical: ")
                tech_label.bold = True
                tech_para.add_run(" • ".join(skills_data["technical"]))
            
            if skills_data.get("tools"):
                tools_para = doc.add_paragraph()
                tools_label = tools_para.add_run("Tools & Platforms: ")
                tools_label.bold = True
                tools_para.add_run(" • ".join(skills_data["tools"]))
            
            if skills_data.get("other"):
                other_para = doc.add_paragraph()
                other_label = other_para.add_run("Other: ")
                other_label.bold = True
                other_para.add_run(" • ".join(skills_data["other"]))
        else:
            # Old format - simple list
            skills_text = " • ".join(skills_data)
            doc.add_paragraph(skills_text)
    
    # Certifications
    if resume_data.get("certifications"):
        heading = doc.add_heading("CERTIFICATIONS", level=1)
        heading.runs[0].font.size = Pt(12)
        
        for cert in resume_data["certifications"]:
            cert_para = doc.add_paragraph()
            cert_name = cert_para.add_run(f"{cert.get('name', 'Certification')}")
            cert_name.bold = True
            if cert.get("issuer"):
                cert_para.add_run(f" - {cert['issuer']}")
            if cert.get("date"):
                cert_para.add_run(f" ({cert['date']})")
    
    # Additional Sections (Awards, Publications, Volunteer, etc.)
    if resume_data.get("additionalSections"):
        for section in resume_data["additionalSections"]:
            if section.get("title") and section.get("items"):
                heading = doc.add_heading(section["title"].upper(), level=1)
                heading.runs[0].font.size = Pt(12)
                
                for item in section["items"]:
                    if item and item.strip():
                        doc.add_paragraph(f"• {item}")
    
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

