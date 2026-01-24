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
import asyncio
import json
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from resume_analyzer import call_groq_api, unified_api_call, clean_json_response

logger = logging.getLogger(__name__)

# These are now imported from resume_analyzer.py
# GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
# GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
# GROQ_MODEL = "llama-3.3-70b-versatile"

# ============================================
# STRUCTURED RESUME SCHEMA (Step 3 & 4)
# ============================================

class ResumeHeader(BaseModel):
    full_name: str
    city_state: str
    phone: str
    email: str
    linkedin: str = ""
    portfolio: str = ""

class CoreSkills(BaseModel):
    languages: List[str] = []
    data_etl: List[str] = []
    cloud: List[str] = []
    databases: List[str] = []
    devops_tools: List[str] = []
    other: List[str] = []

class ExperienceRole(BaseModel):
    company: str
    job_title: str
    city_state_or_remote: str
    start: str
    end: str
    bullets: List[str]

class ProjectItem(BaseModel):
    name: str
    tech_stack: List[str] = []
    link: str = ""
    bullets: List[str]

class EducationItem(BaseModel):
    degree: Optional[str] = ""
    major: Optional[str] = ""
    university: Optional[str] = ""
    year: Optional[str] = ""

class ResumeDataSchema(BaseModel):
    """The structured data for a tailored resume"""
    header: ResumeHeader
    target_title: str
    positioning_statement: str
    core_skills: CoreSkills
    experience: List[ExperienceRole]
    projects: List[ProjectItem] = []
    education: List[EducationItem] = []
    certifications: List[str] = []

class ExpertTailoringOutput(BaseModel):
    """The complete response from the Expert AI"""
    alignment_highlights: List[str]
    cover_letter: str
    resume_data: ResumeDataSchema


def cleanup_bullet(s: str) -> str:
    """Removes weird bullet characters and extra whitespace (Step 4)"""
    import re
    cleaned = re.sub(r'[•●▪︎\-]', '', str(s))
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


def render_ats_resume_from_json(r: ResumeDataSchema) -> str:
    """
    Deterministic rendering of the ATS template (Step 4).
    Guarantees same headings, order, and style.
    """
    header_parts = [
        r.header.city_state,
        r.header.phone,
        r.header.email,
        r.header.linkedin,
        r.header.portfolio
    ]
    header_line = " | ".join([p for p in header_parts if p and p.strip()])

    out = []
    out.append(r.header.full_name)
    out.append(header_line)
    out.append("")

    out.append(r.target_title)
    out.append(r.positioning_statement)
    out.append("")


    out.append("CORE SKILLS")
    out.append("")
    out.append(f"Languages: {', '.join(r.core_skills.languages or [])}")
    out.append(f"Data/ETL: {', '.join(r.core_skills.data_etl or [])}")
    out.append(f"Cloud: {', '.join(r.core_skills.cloud or [])}")
    out.append(f"Databases: {', '.join(r.core_skills.databases or [])}")
    out.append(f"DevOps/Tools: {', '.join(r.core_skills.devops_tools or [])}")
    out.append(f"Other: {', '.join(r.core_skills.other or [])}")
    out.append("")

    out.append("PROFESSIONAL EXPERIENCE")
    out.append("")
    for role in r.experience:
        role_header = f"{role.company} — {role.job_title} | {role.city_state_or_remote}"
        out.append(role_header)
        out.append(f"{role.start} – {role.end}")
        for b in role.bullets[:6]:
            out.append(f"- {cleanup_bullet(b)}")
        out.append("")

    if r.projects:
        out.append("PROJECTS")
        out.append("")
        for p in r.projects[:2]:
            tech = ", ".join(p.tech_stack)
            link = f" ({p.link})" if p.link else ""
            out.append(f"{p.name} — {tech}{link}")
            for b in p.bullets[:3]:
                out.append(f"- {cleanup_bullet(b)}")
            out.append("")

    if r.education:
        out.append("EDUCATION")
        out.append("")
        for e in r.education:
            left_parts = [e.degree, e.major]
            left = ", ".join([p for p in left_parts if p and p.strip()])
            right_parts = [e.university, e.year]
            right = " | ".join([p for p in right_parts if p and p.strip()])
            out.append(f"{left} — {right}")
        out.append("")

    if r.certifications:
        out.append("CERTIFICATIONS")
        out.append("")
        for c in r.certifications:
            out.append(f"- {c}")
        out.append("")

    return "\n".join(out).strip()


async def generate_optimized_resume_content(resume_text: str, job_description: str, analysis: Dict, byok_config: Optional[Dict] = None) -> Optional[Dict]:
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
You are a resume ENHANCER, not a summarizer. Your job is to EXPAND and IMPROVE the resume, NOT shorten it.

=== ABSOLUTE RULES - VIOLATION = FAILURE ===
1. EVERY job position in the original MUST appear in output (count them!)
2. EVERY bullet point MUST be preserved - you can ONLY add more, never remove
3. EVERY project MUST be included with ALL its details
4. The output MUST be LONGER than the input
5. Copy the EXACT job titles, company names, dates - do NOT paraphrase
6. Keep the original professional summary structure but enhance it with keywords

=== YOUR TASK ===
Take each bullet point and ENHANCE it by:
- Adding specific metrics/numbers where logical (e.g., "improved by X%", "reduced X hours")
- Weaving in relevant keywords from the job description
- Making the action verbs stronger
- BUT keeping the original meaning and all details intact

=== ORIGINAL RESUME (COPY ALL CONTENT - DO NOT SKIP ANY SECTION) ===
{resume_text}

=== TARGET JOB DESCRIPTION ===
{job_description}

=== KEYWORDS TO WEAVE INTO EXISTING BULLETS ===
Add naturally: {', '.join(missing_skills[:15] + keywords[:10])}

=== OUTPUT FORMAT (JSON) ===
Return ONLY valid JSON, no markdown:

{{
    "contactInfo": {{
        "name": "COPY EXACT NAME",
        "email": "COPY EXACT EMAIL",
        "phone": "COPY EXACT PHONE",
        "location": "COPY EXACT LOCATION",
        "linkedin": "COPY IF EXISTS",
        "website": "COPY IF EXISTS"
    }},
    "summary": "ENHANCE the original summary - keep same length or longer, add keywords naturally. Do NOT shorten.",
    "experience": [
        {{
            "title": "COPY EXACT TITLE",
            "company": "COPY EXACT COMPANY NAME",
            "location": "COPY EXACT LOCATION",
            "dates": "COPY EXACT DATES",
            "bullets": [
                "ENHANCED version of original bullet 1 - add metrics and keywords",
                "ENHANCED version of original bullet 2",
                "ENHANCED version of original bullet 3",
                "... INCLUDE EVERY ORIGINAL BULLET ...",
                "You may ADD 1-2 extra bullets per job if relevant to target role"
            ]
        }}
        // INCLUDE EVERY JOB FROM ORIGINAL - DO NOT SKIP ANY
    ],
    "projects": [
        {{
            "name": "COPY EXACT PROJECT NAME",
            "subtitle": "Brief description or tech stack",
            "bullets": [
                "COPY and enhance all project details",
                "Include the Impact section if present"
            ]
        }}
        // INCLUDE ALL PROJECTS
    ],
    "education": [
        {{
            "degree": "COPY EXACT DEGREE",
            "school": "COPY EXACT SCHOOL NAME",
            "location": "COPY IF EXISTS",
            "date": "COPY DATE"
        }}
    ],
    "skills": ["COPY ALL ORIGINAL SKILLS", "ADD relevant missing keywords at the end"]
}}

=== VERIFICATION CHECKLIST (You must pass all) ===
[ ] All job positions from original are included
[ ] All bullet points preserved and enhanced (not shortened!)
[ ] All projects included with full details
[ ] Education section complete
[ ] All skills preserved + new keywords added
[ ] Contact info complete with location
[ ] Output is LONGER than input

GENERATE THE ENHANCED RESUME JSON NOW:
"""

    try:
        # Use unified call with BYOK support
        response = await unified_api_call(prompt, byok_config=byok_config, max_tokens=8000, model="llama-3.1-8b-instant")
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


async def generate_cover_letter_content(resume_text: str, job_description: str, job_title: str, company: str, byok_config: Optional[Dict] = None) -> Optional[str]:
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
        response = await unified_api_call(prompt, byok_config=byok_config)
        return response
    except Exception as e:
        logger.error(f"Failed to generate cover letter: {e}")
        return None


async def extract_compliance_facts(resume_text: str, byok_config: Optional[Dict] = None) -> Optional[Dict]:
    """Stage 1: Extract verbatim facts from resume into a strict JSON schema"""
    # Truncate resume text to keep it manageable and avoid TPM limits
    truncated_resume = resume_text[:10000]
    
    prompt = f"""
SYSTEM:
You are a precision fact extractor. Output JSON ONLY. No prose.

USER:
Extract ONLY what is explicitly in the candidate resume below. Do NOT hallucinate or infer details.

[CANDIDATE_BASE_RESUME]
<<<
{truncated_resume}
>>>

Return JSON with this exact schema:
{{
  "name": "",
  "location": "",
  "email": "",
  "phone": "",
  "links": {{"linkedin":"", "github":"", "portfolio":""}},
  "summary_original": "",
  "employers": [{{"company":"","title":"","location":"","start":"","end":"","bullets":[] }}],
  "projects": [{{"name":"","bullets":[],"tools":[],"metrics":[] }}],
  "skills": {{"technical":[], "soft":[], "certifications":[]}},
  "metrics_explicit": []
}}

Rules:
- If a field is not explicitly present, use "" or [].
- summary_original: Extract the PROFESSIONAL SUMMARY verbatim if it exists.
- employers: List all work experience. Keep company, title, dates, and bullets exactly as written.
- skills: Group all technical and soft skills and certifications found.
"""
    try:
        # Stage 1: Fact extraction - Using high-speed 8B model for extraction (Step 1 Optimization)
        # 8B is perfect for extraction and significantly faster than larger models
        response_text = await unified_api_call(prompt, byok_config=byok_config, max_tokens=1500, model="llama-3.1-8b-instant")
        if not response_text:
            return {}
        
        json_text = clean_json_response(response_text)
        return json.loads(json_text)
    except Exception as e:
        logger.error(f"Fact extraction failed: {e}")
        return {}


async def generate_expert_documents(resume_text: str, job_description: str, user_info: Optional[Dict] = None, byok_config: Optional[Dict] = None) -> Optional[Dict[str, Any]]:
    """Generate ATS Resume and Detailed CV using the compliance-grade two-stage pipeline"""
    
    # Resolving model selection (Optimization)
    extraction_model = "llama-3.1-8b-instant"
    drafting_model = "llama-3.3-70b-versatile"
    
    # Stage 1: Extract Facts
    logger.info("Stage 1: Extracting compliance-grade facts")
    facts_json = await extract_compliance_facts(resume_text, byok_config=byok_config)
    
    if not facts_json:
        logger.error("Fact extraction returned empty results")
        return None

    # Resolve Header Precedence (Step 5)
    u = user_info or {}
    f = facts_json
    header_info = {
        "full_name": u.get("name") or f.get("name") or "Your Name",
        "city_state": u.get("location") or f.get("location") or "Location",
        "phone": u.get("phone") or f.get("phone") or "Phone Number",
        "email": u.get("email") or f.get("email") or "Email Address",
        "linkedin": f.get("links", {}).get("linkedin", ""),
        "portfolio": f.get("links", {}).get("portfolio", "")
    }

    # Prepare Resume and Cover Letter generation prompts (Optimization: Parallelization)
    
    # Schema for the Resume AI
    resume_schema_hint = {
        "alignment_highlights": ["List of 4 JD-candidate mapping bullets"],
        "resume_data": {
            "header": header_info,
            "target_title": "Optimized job title",
            "positioning_statement": "3-4 lines tailored summary",
            "core_skills": {
                "languages": [], "data_etl": [], "cloud": [], "databases": [], "devops_tools": [], "other": []
            },
            "experience": [
                {
                    "company": "@FACTS@", "job_title": "@FACTS@", "city_state_or_remote": "@FACTS@",
                    "start": "MMM YYYY", "end": "Present", "bullets": []
                }
            ],
            "projects": [{"name": "", "tech_stack": [], "link": "", "bullets": []}],
            "education": [{"degree": "", "major": "", "university": "", "year": ""}],
            "certifications": []
        }
    }

    resume_prompt = f"""
SYSTEM:
You are a Precision ATS Resume Architect. 
Your goal is to transform candidate facts into a high-impact, JD-mirrored structured JSON.

ABSOLUTE RULES:
1. Output ONLY valid JSON.
2. Use ONLY facts from [FACTS_JSON]. Do NOT invent dates or titles.
3. TAILOR AGGRESSIVELY: Rewrite 70%+ of bullets to mirror [JOB_DESCRIPTION] keywords.
4. Bullet Formula: [Action Verb] + [What you built/managed] + [Tech/Tools used] + [Measurable Impact].

[HEADER_INFO]
{json.dumps(header_info, indent=2)}

[JOB_DESCRIPTION]
{job_description}

[FACTS_JSON]
{json.dumps(facts_json, indent=2)}

Return JSON matching this structure:
{json.dumps(resume_schema_hint, indent=2)}
"""

    cover_letter_prompt = f"""
Write a 3-paragraph tailored cover letter for:
Candidate: {header_info['full_name']}
Target Job: {job_description[:1000]}

Base facts from Resume:
{json.dumps(facts_json, indent=2)}

Rules:
- Professional but modern tone.
- NO placeholders. Use actual company and role from JD.
- Keep it under 300 words.
- Return ONLY the cover letter text.
"""

    logger.info("Stage 2: Drafting documents (Parallel Execution)")
    
    # Parallelize Resume and Cover Letter generation
    resume_task = unified_api_call(resume_prompt, byok_config=byok_config, max_tokens=4000, model=drafting_model)
    cl_task = unified_api_call(cover_letter_prompt, byok_config=byok_config, max_tokens=1000, model=extraction_model) # CL is easier, use 8B
    
    results = await asyncio.gather(resume_task, cl_task, return_exceptions=True)
    resume_response, cl_response = results

    if isinstance(resume_response, Exception) or not resume_response:
        logger.error(f"Resume generation failed: {resume_response}")
        return None
        
    cl_text = cl_response if not isinstance(cl_response, Exception) and cl_response else "Failed to generate cover letter."

    try:
        # Clean and parse JSON for resume
        json_text = clean_json_response(resume_response)
        raw_output = json.loads(json_text)
        
        # Merge cover letter back into output for compatibility
        raw_output['cover_letter'] = cl_text
        
        # Validate with Pydantic
        # Extract the correct class for validation
        class ResumeOnlyOutput(BaseModel):
            alignment_highlights: List[str]
            resume_data: ResumeDataSchema

        validated_resume = ResumeOnlyOutput(**raw_output)
        
        # Step 4: Render the exact ATS template
        ats_resume_text = render_ats_resume_from_json(validated_resume.resume_data)
        
        return {
            "alignment_highlights": "\n".join([f"- {h}" for h in validated_resume.alignment_highlights]),
            "ats_resume": ats_resume_text,
            "detailed_cv": ats_resume_text,
            "cover_letter": cl_text,
            "resume_json": validated_resume.resume_data.model_dump()
        }

    except Exception as e:
        logger.error(f"Final assembly failed: {e}")
        return None

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
            
            # Handle subtitle or technologies
            subtitle = project.get("subtitle") or project.get("technologies")
            if subtitle:
                proj_header.add_run(f" — {subtitle}")
            proj_header.paragraph_format.space_after = Pt(2)
            
            if project.get("description"):
                desc_para = doc.add_paragraph(project["description"])
                desc_para.paragraph_format.space_after = Pt(4)
            
            # Handle bullets - could be list or single string
            bullets = project.get("bullets", [])
            if isinstance(bullets, str):
                bullets = [bullets]
            for bullet in bullets:
                if bullet and bullet.strip():
                    # Check if it's an "Impact:" section
                    if bullet.lower().startswith("impact:"):
                        impact_para = doc.add_paragraph()
                        impact_label = impact_para.add_run("Impact: ")
                        impact_label.bold = True
                        impact_para.add_run(bullet[7:].strip())
                    else:
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


def create_text_docx(text: str, title: str = "Document") -> io.BytesIO:
    """Create a Word document from raw text, preserving basic formatting"""
    doc = Document()
    
    # Set margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)
    
    # Split text into lines and add to document
    lines = text.strip().split('\n')
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            doc.add_paragraph()
            continue
            
        if line_stripped.startswith('===') and line_stripped.endswith('==='):
            # Section header
            p = doc.add_paragraph()
            run = p.add_run(line_stripped.replace('=', '').strip())
            run.bold = True
            run.font.size = Pt(16)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        elif line_stripped.isupper() and len(line_stripped) < 50:
            # Main sections like PROFESSIONAL EXPERIENCE
            p = doc.add_paragraph()
            run = p.add_run(line_stripped)
            run.bold = True
            run.font.size = Pt(12)
        else:
            doc.add_paragraph(line)
            
    # Save to BytesIO
    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)
    return file_stream

