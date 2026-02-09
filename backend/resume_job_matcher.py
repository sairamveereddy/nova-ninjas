"""
Resume-Job Matching Service
Calculates relevance scores between user resumes and job postings
"""

import re
from typing import Dict, List, Set
import logging

logger = logging.getLogger(__name__)

# Common tech skills and keywords
TECH_KEYWORDS = {
    "languages": ["python", "javascript", "java", "c++", "c#", "ruby", "go", "rust", "swift", "kotlin", "typescript", "php", "scala", "r"],
    "frameworks": ["react", "angular", "vue", "django", "flask", "spring", "express", "fastapi", "rails", "laravel", ".net", "nextjs", "node"],
    "databases": ["sql", "mysql", "postgresql", "mongodb", "redis", "dynamodb", "cassandra", "oracle", "sqlite"],
    "cloud": ["aws", "azure", "gcp", "google cloud", "cloud", "kubernetes", "docker", "terraform", "ansible"],
    "ml_ai": ["machine learning", "deep learning", "ai", "artificial intelligence", "tensorflow", "pytorch", "scikit-learn", "nlp", "computer vision"],
    "tools": ["git", "jenkins", "ci/cd", "jira", "agile", "scrum", "rest api", "graphql", "microservices"],
}

def extract_keywords(text: str) -> Set[str]:
    """Extract relevant keywords from text"""
    if not text:
        return set()
    
    text_lower = text.lower()
    keywords = set()
    
    # Extract all tech keywords
    for category, terms in TECH_KEYWORDS.items():
        for term in terms:
            if term in text_lower:
                keywords.add(term)
    
    # Extract years of experience
    exp_match = re.search(r'(\d+)\+?\s*years?', text_lower)
    if exp_match:
        keywords.add(f"{exp_match.group(1)}_years")
    
    return keywords

def calculate_job_relevance(resume_text: str, job_title: str, job_description: str, company: str = "") -> int:
    """
    Calculate 0-100 relevance score between resume and job
    
    Args:
        resume_text: User's resume content
        job_title: Job title
        job_description: Job description
        company: Company name (optional)
    
    Returns:
        Match score (0-100)
    """
    if not resume_text or not job_description:
        return 0
    
    # Extract keywords from resume and job
    resume_keywords = extract_keywords(resume_text)
    job_keywords = extract_keywords(f"{job_title} {job_description}")
    
    if not job_keywords:
        return 50  # Default score if no keywords found
    
    # Calculate overlap
    matching_keywords = resume_keywords.intersection(job_keywords)
    
    # Calculate base score from keyword overlap
    if len(job_keywords) > 0:
        keyword_score = (len(matching_keywords) / len(job_keywords)) * 100
    else:
        keyword_score = 0
    
    # Bonus for title match
    title_bonus = 0
    resume_lower = resume_text.lower()
    title_lower = job_title.lower()
    
    # Extract key words from job title
    title_words = set(re.findall(r'\b\w{4,}\b', title_lower))
    if title_words:
        title_matches = sum(1 for word in title_words if word in resume_lower)
        title_bonus = min(20, (title_matches / len(title_words)) * 20)
    
    # Calculate final score
    final_score = min(99, int(keyword_score * 0.8 + title_bonus))
    
    return max(0, final_score)

def calculate_bulk_relevance(resume_text: str, jobs: List[Dict]) -> List[Dict]:
    """
    Calculate relevance scores for multiple jobs
    
    Args:
        resume_text: User's resume content
        jobs: List of job dictionaries
    
    Returns:
        Jobs with added 'matchScore' field, sorted by relevance
    """
    if not resume_text:
        # No resume, return jobs with default scores
        for job in jobs:
            job['matchScore'] = 0
        return jobs
    
    # Calculate score for each job
    for job in jobs:
        title = job.get('title', '') or job.get('jobTitle', '')
        description = job.get('description', '') or job.get('jobDescription', '')
        company = job.get('company', '') or job.get('companyName', '')
        
        score = calculate_job_relevance(resume_text, title, description, company)
        job['matchScore'] = score
    
    # Sort by match score (highest first)
    jobs.sort(key=lambda x: x.get('matchScore', 0), reverse=True)
    
    return jobs
