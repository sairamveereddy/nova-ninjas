"""
Interview Prep Service - AI-powered mock interviews
Uses Groq for AI and MongoDB for storage (same DB as the rest of the app)
"""
import json
import os
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging

try:
    from groq import Groq
except ImportError:
    Groq = None
    print("Warning: groq module not found. Interview features will be disabled.")

from supabase_service import SupabaseService

logger = logging.getLogger(__name__)

# Initialize Groq client
if Groq:
    try:
        groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))
    except Exception as e:
        print(f"Failed to initialize Groq client: {e}")
        groq_client = None
else:
    groq_client = None


class InterviewPrompts:
    """Interview prompts for different stages"""
    
    INITIAL_QUESTION = """
    You are an expert interviewer for JobNinjas.ai. 
    TASK: Generate the FIRST mock interview question based on the candidate's Resume and the Job Description (JD).
    
    CANDIDATE PROFILE:
    {{profile}}
    
    JOB DESCRIPTION:
    {{jd}}
    
    CONSTRAINTS:
    1. Do NOT invent facts about the candidate.
    2. Start with a brief, friendly greeting as an AI Mock Interviewer.
    3. The first question should usually be a high-level "Tell me about yourself" or a specific "Why this role?" grounded in their experience.
    4. Keep the question concise.
    
    OUTPUT FORMAT:
    You must return a valid JSON object matching this schema:
    {
      "intro": "Brief welcome message",
      "question": "The actual question text",
      "intent": "motivation|role_fit",
      "hint": "What you're looking for in a good answer"
    }
    """
    
    NEXT_TURN = """
    You are an expert interviewer.
    CONTEXT:
    - User Identity: {{profile}}
    - Job Priorities: {{jd}}
    - Question History: {{history}}
    - Last Answer: {{lastAnswer}}
    
    TASK: Decide whether to ask a follow-up question or move to the next topic.
    LOGIC:
    1. If the last answer was vague, lacked metrics, or didn't follow the STAR structure, ask a targeted follow-up to "drill down".
    2. If the answer was sufficient, move to a new topic (Skill Drill-down, Behavioral, or Situational).
    3. Rotation Strategy: Motivation -> Project Deep Dive -> JD Skill -> Behavioral -> Situational.
    
    CONSTRAINTS:
    1. Reference specific claims from the last answer if asking a follow-up.
    2. Do NOT repeat questions.
    
    OUTPUT FORMAT:
    {
      "question": "The next question text",
      "intent": "follow_up|skill_drill|behavioral|situational",
      "hint": "What you're looking for"
    }
    """
    
    FINAL_REPORT = """
    You are an expert interview coach reviewing a completed mock interview.
    
    CANDIDATE PROFILE:
    {{profile}}
    
    JOB DESCRIPTION:
    {{jd}}
    
    FULL TRANSCRIPT:
    {{transcript}}
    
    TASK: Generate a comprehensive evaluation report.
    
    OUTPUT FORMAT:
    {
      "summary": "Overall performance summary (2-3 sentences)",
      "roleFitScore": 75,
      "strengths": ["strength1", "strength2", "strength3"],
      "gaps": ["gap1", "gap2"],
      "repetition": "Feedback on repeated themes or crutch phrases",
      "scores": {
        "communication": 80,
        "technical": 70,
        "behavioral": 75,
        "confidence": 80
      },
      "rewrittenAnswers": [
        {
          "question": "Original question",
          "originalAnswer": "What they said",
          "improvedAnswer": "How they should have answered"
        }
      ]
    }
    """


class AIService:
    """AI service using Groq"""
    
    @staticmethod
    def chat(prompt: str, json_mode: bool = True) -> str:
        """Call Groq chat API"""
        try:
            if not groq_client:
                raise ValueError("Groq client not initialized")
                
            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"} if json_mode else None
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"Groq chat failed: {e}")
            raise
    
    @staticmethod
    def transcribe_audio(audio_file) -> str:
        """Transcribe audio using Groq Whisper"""
        try:
            if not groq_client:
                raise ValueError("Groq client not initialized")

            transcription = groq_client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-large-v3",
                response_format="text"
            )
            return transcription
        except Exception as e:
            logger.error(f"Groq transcription failed: {e}")
            raise


class InterviewOrchestrator:
    """Manages interview flow using MongoDB as primary storage"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
    
    async def get_session(self) -> Optional[Dict[str, Any]]:
        """Get session from Supabase"""
        session = SupabaseService.get_interview_session(self.session_id)
        if not session:
            return None
        
        # Get resume from Supabase
        if session.get('resume_id'):
            resume = SupabaseService.get_interview_resume(session['resume_id'])
            session['resume'] = resume
        
        # Get turns from Supabase
        turns = SupabaseService.get_interview_turns(self.session_id)
        session['turns'] = turns
        
        return session


    async def generate_initial_question(self) -> Dict[str, Any]:
        """Generate the first interview question"""
        session = await self.get_session()
        if not session:
            raise ValueError(f"Session not found: {self.session_id}")
        
        # Resume text is stored directly in MongoDB session
        profile = (
            session.get('resume_text')
            or session.get('resume', {}).get('parsed_text', '')
            or ''
        )
        jd = session.get('job_description', '')
        role = session.get('role_title', '')
        if role:
            jd = f"Role: {role}\n\n{jd}"
        
        prompt = InterviewPrompts.INITIAL_QUESTION\
            .replace('{{profile}}', profile)\
            .replace('{{jd}}', jd)
        
        response = AIService.chat(prompt, json_mode=True)
        result = json.loads(response)
        
        # Save the turn in Supabase
        turn_data = {
            "session_id": self.session_id,
            "turn_number": 1,
            "question_text": result.get('question', ''),
            "answer_text": None,
            "created_at": datetime.utcnow().isoformat()
        }
        SupabaseService.insert_interview_turn(turn_data)

        # Update session progress
        SupabaseService.update_interview_session(self.session_id, {"question_count": 1})
        
        return result
    
    async def process_answer_and_get_next(self, answer_text: str) -> Dict[str, Any]:
        """Process answer and generate next question"""
        session = await self.get_session()
        if not session:
            raise ValueError(f"Session not found: {self.session_id}")
        
        turns = session.get('turns', [])
        # Determine the current turn number (the one being answered)
        current_turn_number = len(turns)
        target_questions = session.get('target_questions', 5)
        
        # Update last unanswered turn's answer in Supabase
        SupabaseService.update_interview_turn(self.session_id, current_turn_number, {"answer_text": answer_text})

        # Check if done
        if current_turn_number >= target_questions:
            SupabaseService.update_interview_session(self.session_id, {"status": "completed"})
            return {"status": "completed"}
        
        # Build profile & history
        profile = (
            session.get('resume_text')
            or session.get('resume', {}).get('parsed_text', '')
            or ''
        )
        jd = session.get('job_description', '')
        role = session.get('role_title', '')
        if role:
            jd = f"Role: {role}\n\n{jd}"
        
        # Build history including the current answer
        history_list = []
        for t in turns:
            q = t.get('question_text', '')
            a = t.get('answer_text', '')
            if t.get('turn_number') == current_turn_number:
                a = answer_text # Use the fresh answer
            if q:
                history_list.append(f"Q: {q}\nA: {a if a else '[No Answer]'}")
        
        history = "\n\n".join(history_list)
        logger.info(f"Submitting answer for session {self.session_id}, history length: {len(history)}")
        
        prompt = InterviewPrompts.NEXT_TURN\
            .replace('{{profile}}', profile)\
            .replace('{{jd}}', jd)\
            .replace('{{history}}', history)\
            .replace('{{lastAnswer}}', answer_text)
        
        logger.info(f"Calling AIService.chat for session {self.session_id}")
        response = AIService.chat(prompt, json_mode=True)
        logger.info(f"AIService response received for {self.session_id}: {response[:100]}...")
        result = json.loads(response)
        
        # Save next turn in Supabase
        next_turn_number = current_turn_number + 1
        next_turn = {
            "session_id": self.session_id,
            "turn_number": next_turn_number,
            "question_text": result.get('question', ''),
            "answer_text": None,
            "created_at": datetime.utcnow().isoformat()
        }
        SupabaseService.insert_interview_turn(next_turn)

        # Update session progress
        SupabaseService.update_interview_session(self.session_id, {"question_count": next_turn_number})
        
        return {"status": "active", **result}
    
    async def finalize_and_generate_report(self) -> Dict[str, Any]:
        """Finalize interview and generate evaluation report"""
        session = await self.get_session()
        if not session:
            raise ValueError(f"Session not found: {self.session_id}")
        
        profile = (
            session.get('resume_text')
            or session.get('resume', {}).get('parsed_text', '')
            or ''
        )
        turns = session.get('turns', [])
        jd = session.get('job_description', '')
        role = session.get('role_title', '')
        if role:
            jd = f"Role: {role}\n\n{jd}"
        
        transcript = "\n\n".join([
            f"Q: {t.get('question_text', '')}\nA: {t.get('answer_text', '')}"
            for t in turns if t.get('answer_text')
        ])
        
        prompt = InterviewPrompts.FINAL_REPORT\
            .replace('{{profile}}', profile)\
            .replace('{{jd}}', jd)\
            .replace('{{transcript}}', transcript)
        
        response = AIService.chat(prompt, json_mode=True)
        result = json.loads(response)
        
        # Save report and mark session completed in Supabase
        report_id = str(__import__('uuid').uuid4())
        report_data = {
            "id": report_id,
            "session_id": self.session_id,
            "summary": result.get('summary', ''),
            "strengths": result.get('strengths', []),
            "gaps": result.get('gaps', []),
            "repetition_feedback": result.get('repetition', ''),
            "scores": result.get('scores', {}),
            "rewritten_answers": result.get('rewrittenAnswers', []),
            "role_fit_score": result.get('roleFitScore', 0),
            "created_at": datetime.utcnow().isoformat()
        }
        SupabaseService.insert_evaluation_report(report_data)
        
        # Mark session completed in Supabase
        SupabaseService.update_interview_session(self.session_id, {
            "status": "completed",
            "report_id": report_id
        })

        
        result['id'] = report_id
        return result
