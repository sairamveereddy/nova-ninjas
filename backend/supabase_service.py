import os
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client

logger = logging.getLogger(__name__)

class SupabaseService:
    _instance: Optional[Client] = None

    @classmethod
    def get_client(cls) -> Client:
        """Initialize and return the Supabase client (Singleton)"""
        if cls._instance is None:
            url = os.environ.get("SUPABASE_URL", "").strip()
            key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
            
            if not url or not key:
                logger.warning("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in environment variables.")
                return None
            
            try:
                cls._instance = create_client(url, key)
                logger.info("✅ Supabase client initialized successfully.")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Supabase client: {e}")
                return None
        
        return cls._instance

    # --- CRUD Wrappers ---

    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        client = SupabaseService.get_client()
        if not client: return None
        
        try:
            response = client.table("profiles").select("*").eq("id", user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching user by ID: {e}")
            return None

    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:

        client = SupabaseService.get_client()
        if not client: return None
        
        try:
            # Case-insensitive lookup using ilike
            response = client.table("profiles").select("*").ilike("email", email).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching user by email: {e}")
            return None



    @staticmethod
    def create_profile(user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        client = SupabaseService.get_client()
        if not client: return None

        if 'email' in user_data:
            user_data['email'] = user_data['email'].lower().strip()
            
        try:
            # Ensure plan defaults and timestamps
            if 'plan' not in user_data:
                user_data['plan'] = 'free'
            
            # Explicitly log user data for debugging
            logger.info(f"Supabase SIGNUP attempt for: {user_data.get('email')}")
            
            response = client.table("profiles").insert(user_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating profile: {e}")
            return None

    @staticmethod
    def get_jobs(
        limit: int = 20, 
        offset: int = 0, 
        search: Optional[str] = None,
        job_type: Optional[str] = None,
        visa: bool = False,
        fresh_only: bool = True
    ) -> List[Dict[str, Any]]:
        client = SupabaseService.get_client()
        if not client: return []
        
        try:
            query = client.table("jobs").select("*")
            
            # Time filter: last 72 hours (optional)
            if fresh_only:
                cutoff = (datetime.utcnow() - timedelta(hours=72)).isoformat()
                query = query.gte("created_at", cutoff)

            # Search filter
            if search:
                query = query.or_(f"title.ilike.%{search}%,company.ilike.%{search}%,description.ilike.%{search}%")
            
            # Visa filter
            if visa:
                query = query.contains("categories", ["sponsoring"])
            
            # Type filter
            if job_type and job_type != "all":
                query = query.ilike("job_type", f"%{job_type}%")

            response = query\
                .order("created_at", desc=True)\
                .range(offset, offset + limit - 1)\
                .execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching jobs from Supabase: {e}")
            return []

    @staticmethod
    def get_jobs_count(
        search: Optional[str] = None,
        job_type: Optional[str] = None,
        visa: bool = False,
        fresh_only: bool = True
    ) -> int:
        client = SupabaseService.get_client()
        if not client: return 0
        
        try:
            query = client.table("jobs").select("*", count="exact")
            
            if fresh_only:
                cutoff = (datetime.utcnow() - timedelta(hours=72)).isoformat()
                query = query.gte("created_at", cutoff)

            if search:
                query = query.or_(f"title.ilike.%{search}%,company.ilike.%{search}%,description.ilike.%{search}%")
            if visa:
                query = query.contains("categories", ["sponsoring"])
            if job_type and job_type != "all":
                query = query.ilike("job_type", f"%{job_type}%")

            response = query.limit(0).execute()
            return response.count if response.count is not None else 0
        except Exception as e:
            logger.error(f"Error fetching jobs count from Supabase: {e}")
            return 0

    @staticmethod
    def sync_user_profile(user_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Sync MongoDB user/profile document to Supabase profiles table"""
        client = SupabaseService.get_client()
        if not client: return None
        
        try:
            # Extract nested Orion data if present
            person = user_dict.get("person", {})
            address = user_dict.get("address", {})
            
            # Map MongoDB fields to SQL columns
            # This handles both db.users and db.profiles documents
            profile_data = {
                "id": str(user_dict.get("id") or user_dict.get("_id")),
                "email": user_dict.get("email") or person.get("email"),
                "name": user_dict.get("name") or user_dict.get("fullName") or person.get("fullName"),
                "role": user_dict.get("role", "customer"),
                "plan": user_dict.get("plan", "free"),
                "is_verified": user_dict.get("is_verified", False),
                "summary": user_dict.get("summary") or user_dict.get("resume_summary"),
                "resume_text": user_dict.get("resume_text") or user_dict.get("resumeText"),
                "latest_resume": user_dict.get("latest_resume"),
                "profile_picture": user_dict.get("profile_picture") or user_dict.get("picture"),

                # Orion Boost: Detailed structured data
                "target_role": user_dict.get("target_role") or user_dict.get("targetRole") or user_dict.get("preferences", {}).get("target_role"),
                "phone": user_dict.get("phone") or person.get("phone"),
                "location": user_dict.get("location") or person.get("location") or f"{address.get('city', '')}, {address.get('state', '')}".strip(", "),
                "linkedin_url": user_dict.get("linkedin_url") or user_dict.get("linkedinUrl") or person.get("linkedinUrl"),
                "github_url": user_dict.get("github_url") or user_dict.get("githubUrl") or person.get("githubUrl"),
                "portfolio_url": user_dict.get("portfolio_url") or user_dict.get("portfolioUrl") or person.get("portfolioUrl"),

                "skills": user_dict.get("skills"),
                "education": user_dict.get("education"),
                "experience": user_dict.get("experience") or user_dict.get("employment_history"),
                "work_authorization": user_dict.get("work_authorization"),
                "preferences": user_dict.get("preferences"),

                # Orion Boost: Full nested profile and sensitive data
                "full_profile": user_dict if not user_dict.get("full_profile") else user_dict.get("full_profile"),
                "sensitive_data": user_dict.get("sensitive"),

                # Ensure created_at is explicitly stored for accurate admin stats
                "created_at": (
                    user_dict.get("created_at").isoformat()
                    if hasattr(user_dict.get("created_at"), "isoformat")
                    else (user_dict.get("created_at") or datetime.now(timezone.utc).isoformat())
                ),
            }
            
            # Clean up None values to avoid overwriting with null if unwanted
            filtered_data = {k: v for k, v in profile_data.items() if v is not None}
            if "email" not in filtered_data: return None

            # Use upsert (on conflict do update)
            response = client.table("profiles").upsert(filtered_data, on_conflict="email").execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error syncing profile to Supabase: {e}")
            return None

    @staticmethod
    def insert_application(app_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Insert a job application record into Supabase"""
        client = SupabaseService.get_client()
        if not client: return None
        
        try:
            # Find user_id
            user = SupabaseService.get_user_by_email(app_data.get("userEmail"))
            user_id = user.get("id") if user else None
            
            postgres_app = {
                "user_id": user_id,
                "status": app_data.get("status", "applied"),
                "notes": app_data.get("notes"),
                "created_at": app_data.get("dateApplied") or app_data.get("createdAt"),
                # Store extra info in metadata for now if schema isn't updated
                "metadata": {
                    "jobTitle": app_data.get("jobTitle"),
                    "company": app_data.get("company"),
                    "jobUrl": app_data.get("jobUrl"),
                    "userEmail": app_data.get("userEmail")
                }
            }
            
            response = client.table("applications").insert(postgres_app).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting application to Supabase: {e}")
            return None

    @staticmethod
    def get_user_applications(user_email: str) -> List[Dict[str, Any]]:
        """Get all applications for a user by email"""
        client = SupabaseService.get_client()
        if not client: return []
        
        try:
            user = SupabaseService.get_user_by_email(user_email)
            if not user: return []
            
            response = client.table("applications")\
                .select("*, jobs(title, company, url)")\
                .eq("user_id", user["id"])\
                .order("created_at", desc=True)\
                .execute()
                
            apps = []
            for a in response.data:
                job_info = a.get("jobs") or {}
                apps.append({
                    "_id": str(a["id"]),
                    "userEmail": user_email,
                    "jobTitle": job_info.get("title") or "Unknown Role",
                    "company": job_info.get("company") or "Unknown Company",
                    "jobUrl": job_info.get("url") or "",
                    "status": a.get("status"),
                    "notes": a.get("notes"),
                    "dateApplied": a.get("created_at")
                })
            return apps
        except Exception as e:
            logger.error(f"Error fetching applications: {e}")
            return []

    @staticmethod
    def insert_scan(scan_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Insert a resume scan record into Supabase"""
        client = SupabaseService.get_client()
        if not client: return None
        
        try:
            # First find user_id for the email
            user = SupabaseService.get_user_by_email(scan_data.get("userEmail"))
            user_id = user.get("id") if user else None
            
            # Map MongoDB fields to SQL columns/JSONB
            postgres_scan = {
                "user_id": user_id,
                "raw_text": scan_data.get("jobDescription"),
                "extracted_data": {
                    "jobTitle": scan_data.get("jobTitle"),
                    "company": scan_data.get("company"),
                    "analysis": scan_data.get("analysis"),
                    "matchScore": scan_data.get("matchScore"),
                    "userEmail": scan_data.get("userEmail") # Keep for parity
                },
                "created_at": scan_data.get("createdAt")
            }
            
            response = client.table("scans").insert(postgres_scan).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting scan to Supabase: {e}")
            return None

    @staticmethod
    def get_user_scans(user_email: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get scan history for a user by email"""
        client = SupabaseService.get_client()
        if not client: return []
        
        try:
            # Find user
            user = SupabaseService.get_user_by_email(user_email)
            if not user: return []
            
            response = client.table("scans")\
                .select("*")\
                .eq("user_id", user["id"])\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
                
            # Map back to MongoDB format for frontend
            scans = []
            for s in response.data:
                data = s.get("extracted_data") or {}
                scans.append({
                    "_id": str(s["id"]),
                    "userEmail": user_email,
                    "jobTitle": data.get("jobTitle"),
                    "company": data.get("company"),
                    "jobDescription": s.get("raw_text"),
                    "analysis": data.get("analysis"),
                    "matchScore": data.get("matchScore"),
                    "createdAt": s.get("created_at")
                })
            return scans
        except Exception as e:
            logger.error(f"Error fetching scans from Supabase: {e}")
            return []

    # --- INTERVIEW METHODS ---

    @staticmethod
    def get_interview_session(session_id: str) -> Optional[Dict[str, Any]]:
        """Get interview session by ID"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("interview_sessions").select("*").eq("id", session_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching interview session: {e}")
            raise

    @staticmethod
    def insert_interview_session(session_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Insert a new interview session"""
        client = SupabaseService.get_client()
        if not client:
            logger.error("insert_interview_session: Supabase client not available")
            return None
        try:
            response = client.table("interview_sessions").insert(session_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting interview session. Data: {session_data}. Error: {repr(e)}")
            raise

    @staticmethod
    def insert_interview_resume(resume_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Insert a new interview resume"""
        client = SupabaseService.get_client()
        if not client:
            logger.error("insert_interview_resume: Supabase client not available")
            return None
        try:
            response = client.table("interview_resumes").insert(resume_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting interview resume. Data keys: {list(resume_data.keys())}. Error: {repr(e)}")
            raise

    @staticmethod
    def get_interview_resume(resume_id: str) -> Optional[Dict[str, Any]]:
        """Get interview resume by ID"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("interview_resumes").select("*").eq("id", resume_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching interview resume: {e}")
            return None

    @staticmethod
    def update_interview_session(session_id: str, update_data: Dict[str, Any]) -> bool:
        """Update an interview session in Supabase"""
        client = SupabaseService.get_client()
        if not client: return False
        try:
            client.table("interview_sessions").update(update_data).eq("id", session_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating interview session: {e}")
            raise

    @staticmethod
    def get_interview_turns(session_id: str) -> List[Dict[str, Any]]:
        """Get all turns for an interview session from Supabase"""
        client = SupabaseService.get_client()
        if not client: return []
        try:
            response = client.table("interview_turns").select("*").eq("session_id", session_id).order("turn_number", desc=False).execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Error fetching interview turns: {e}")
            return []

    @staticmethod
    def insert_interview_turn(turn_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Insert a new interview turn into Supabase"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("interview_turns").insert(turn_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting interview turn: {e}")
            raise

    @staticmethod
    def update_interview_turn(session_id: str, turn_number: int, update_data: Dict[str, Any]) -> bool:
        """Update a specific interview turn's answer in Supabase"""
        client = SupabaseService.get_client()
        if not client: return False
        try:
            client.table("interview_turns").update(update_data).eq("session_id", session_id).eq("turn_number", turn_number).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating interview turn: {e}")
            raise

    @staticmethod
    def insert_evaluation_report(report_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Insert a new evaluation report into Supabase"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("evaluation_reports").insert(report_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting evaluation report: {e}")
            return None


    @staticmethod
    def get_applications(user_id: str = None, user_email: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get job applications for a user from Supabase"""
        client = SupabaseService.get_client()
        if not client: return []
        try:
            # Removed jobs(*) join because the table is currently unused for tracking 
            # and might not exist or be linked correctly. Pure applications fetch.
            query = client.table("applications").select("*")
            
            if user_id:
                query = query.eq("user_id", user_id)
            elif user_email:
                # Primary lookup for email-based tracking
                query = query.eq("user_email", user_email)
                
            response = query.order("created_at", desc=True).limit(limit).execute()
            apps = response.data or []
            
            # Map platform -> company if company is missing (for legacy rows)
            for app in apps:
                if not app.get("company") and app.get("platform"):
                    app["company"] = app["platform"]
                if not app.get("job_title") and app.get("role"):
                    app["job_title"] = app["role"]
                    
            return apps
        except Exception as e:
            logger.error(f"Error fetching applications: {e}")
            return []

    @staticmethod
    def create_application(app_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new job application in Supabase"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("applications").insert(app_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating application: {e}")
            return None

    @staticmethod
    def update_application(app_id: str, update_data: Dict[str, Any]) -> bool:
        """Update an application status or notes in Supabase"""
        client = SupabaseService.get_client()
        if not client: return False
        try:
            client.table("applications").update(update_data).eq("id", app_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating application: {e}")
            return False

    @staticmethod
    def delete_application(app_id: str) -> bool:
        """Delete an application from Supabase"""
        client = SupabaseService.get_client()
        if not client: return False
        try:
            client.table("applications").delete().eq("id", app_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting application: {e}")
            return False

    @staticmethod
    def get_scans(user_id: str = None, user_email: str = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Get resume scans for a user from Supabase"""
        client = SupabaseService.get_client()
        if not client: return []
        try:
            query = client.table("scans").select("*")
            if user_id:
                query = query.eq("user_id", user_id)
            elif user_email:
                query = query.eq("user_email", user_email)
            
            response = query.order("created_at", desc=True).limit(limit).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching scans: {e}")
            return []

    @staticmethod
    def create_scan(scan_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Save a new resume scan to Supabase"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("scans").insert(scan_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error saving scan: {e}")
            return None

    @staticmethod
    def get_scan_by_id(scan_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific scan by ID from Supabase"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("scans").select("*").eq("id", scan_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching scan by id: {e}")
            return None

    @staticmethod
    def check_daily_usage(email: str, date_str: str) -> Dict[str, Any]:
        """Get daily usage for a user on a specific date"""
        client = SupabaseService.get_client()
        if not client: return {"apps": 0, "autofills": 0}
        try:
            response = client.table("daily_usage").select("*").eq("email", email).eq("date", date_str).execute()
            if response.data:
                return response.data[0]
            
            # Create if not exists (lazy initialization)
            new_usage = {"email": email, "date": date_str, "apps": 0, "autofills": 0}
            res = client.table("daily_usage").insert(new_usage).execute()
            return res.data[0] if res.data else new_usage
        except Exception as e:
            logger.error(f"Error checking daily usage: {e}")
            return {"apps": 0, "autofills": 0}

    @staticmethod
    def increment_daily_usage(email: str, date_str: str, usage_type: str) -> bool:
        """Increment daily usage for a specific type (apps or autofills)"""
        client = SupabaseService.get_client()
        if not client: return False
        try:
            # We use a RPC or a manual update because Supabase JS/Python client doesn't 
            # support $inc directly like MongoDB. But for simple counters, we can fetch and update
            # or use a PostgreSQL function. Let's use fetch-and-update for simplicity here.
            current = SupabaseService.check_daily_usage(email, date_str)
            new_val = current.get(usage_type, 0) + 1
            
            client.table("daily_usage").update({usage_type: new_val}).eq("email", email).eq("date", date_str).execute()
            return True
        except Exception as e:
            logger.error(f"Error incrementing daily usage: {e}")
            return False

    @staticmethod
    def get_saved_resumes(identifier: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get saved resumes for a user from Supabase (by user_id or user_email)"""
        client = SupabaseService.get_client()
        if not client: return []
        try:
            # Determine if identifier is email or UUID
            column = "user_email" if "@" in identifier else "user_id"
            
            response = client.table("saved_resumes").select("*").eq(column, identifier).order("created_at", desc=True).limit(limit).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching saved resumes: {e}")
            return []

    @staticmethod
    def create_saved_resume(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Save a resume to the record library in Supabase"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("saved_resumes").insert(data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error saving resume to library: {e}")
            return None

    @staticmethod
    def count_saved_resumes(user_id: str, start_date: str = None) -> int:
        """Count resumes for a user, optionally since a specific date"""
        client = SupabaseService.get_client()
        if not client: return 0
        try:
            query = client.table("saved_resumes").select("*", count="exact").eq("user_id", user_id)
            if start_date:
                query = query.gte("created_at", start_date)
            
            response = query.limit(0).execute()
            return response.count or 0
        except Exception as e:
            logger.error(f"Error counting saved resumes: {e}")
            return 0

    @staticmethod
    def save_user_consent(consent_data: Dict[str, Any]) -> bool:
        """Save user marketing consent to Supabase"""
        client = SupabaseService.get_client()
        if not client: return False
        try:
            client.table("user_consents").upsert(consent_data, on_conflict="email,consent_type").execute()
            return True
        except Exception as e:
            logger.error(f"Error saving user consent: {e}")
            return False

    @staticmethod
    def save_tailored_resume(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Save a tailored resume text to Supabase"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("tailored_resumes").insert(data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error saving tailored resume: {e}")
            return None

    @staticmethod
    def get_tailored_resume(user_id: str, job_id: str) -> Optional[Dict[str, Any]]:
        """Get existing tailored resume for a specific job"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("tailored_resumes").select("*").eq("user_id", user_id).eq("job_id", job_id).order("created_at", desc=True).limit(1).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching tailored resume: {e}")
            return None

    @staticmethod
    def get_interview_turns(session_id: str) -> List[Dict[str, Any]]:
        """Get all turns for a session"""
        client = SupabaseService.get_client()
        if not client: return []
        try:
            response = client.table("interview_turns")\
                .select("*")\
                .eq("session_id", session_id)\
                .order("turn_number", desc=False)\
                .execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching interview turns: {e}")
            return []

    @staticmethod
    def insert_interview_turn(turn_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Insert a new interview turn"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("interview_turns").insert(turn_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting interview turn: {e}")
            return None

    @staticmethod
    def update_interview_turn(turn_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing interview turn"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("interview_turns").update(update_data).eq("id", turn_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating interview turn: {e}")
            return None

    @staticmethod
    def update_interview_session(session_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update interview session status or count"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("interview_sessions").update(update_data).eq("id", session_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating interview session: {e}")
            return None

    @staticmethod
    def insert_evaluation_report(report_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Insert evaluation report"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("evaluation_reports").insert(report_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting evaluation report: {e}")
            return None

    # --- JOB SYNC & MANAGEMENT ---

    @staticmethod
    def get_job_by_any_id(id_val: str) -> Optional[Dict[str, Any]]:
        """
        Get job by its ID (UUID) or its external job_id.
        """
        client = SupabaseService.get_client()
        if not client: return None
        try:
            # 1. Try to find by UUID (primary key)
            try:
                # Basic UUID format check to avoid unnecessary db errors
                import uuid
                uuid.UUID(id_val)
                response = client.table("jobs").select("*").eq("id", id_val).execute()
                if response.data:
                    return response.data[0]
            except ValueError:
                pass # Not a UUID, move to external ID

            # 2. Try by external ID (adzuna_123, etc)
            response = client.table("jobs").select("*").eq("job_id", id_val).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching job by any ID ({id_val}): {e}")
            return None

    @staticmethod
    def update_job(job_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a job record in Supabase"""
        client = SupabaseService.get_client()
        if not client: return False
        try:
            # First try by UUID
            try:
                import uuid
                uuid.UUID(job_id)
                client.table("jobs").update(update_data).eq("id", job_id).execute()
                return True
            except ValueError:
                # Try by external ID
                client.table("jobs").update(update_data).eq("job_id", job_id).execute()
                return True
        except Exception as e:
            logger.error(f"Error updating job {job_id}: {e}")
            return False

    @staticmethod
    def _sanitize_job_data(job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Remove fields that don't exist in Supabase jobs table"""
        allowed_columns = {
            'id', 'job_id', 'title', 'company', 'description', 'location', 
            'source', 'job_type', 'salary', 'is_active', 'keywords', 
            'source_url', 'posted_at', 'created_at', 'categories'
        }
        
        # Map URL fields to source_url
        url_val = job_data.get('url') or job_data.get('redirect_url') or job_data.get('sourceUrl')
        if url_val and not job_data.get('source_url'):
            job_data['source_url'] = url_val
            
        # Map datePosted to posted_at if needed
        if 'datePosted' in job_data and 'posted_at' not in job_data:
            job_data['posted_at'] = job_data.pop('datePosted')
            
        # Map workType/contract_type to job_type if needed
        work_val = job_data.get('workType') or job_data.get('contract_type')
        if work_val and 'job_type' not in job_data:
            job_data['job_type'] = work_val
            
        return {k: v for k, v in job_data.items() if k in allowed_columns}

    @staticmethod
    def upsert_job(job_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Upsert job data into Supabase using job_id for deduplication"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            sanitized_data = SupabaseService._sanitize_job_data(job_data)
            # We use 'job_id' (the external ID like adzuna_123) for conflict resolution
            response = client.table("jobs").upsert(sanitized_data, on_conflict="job_id").execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error upserting job: {e}")
            return None

    @staticmethod
    def upsert_jobs(jobs: List[Dict[str, Any]]) -> int:
        """Bulk upsert jobs into Supabase"""
        if not jobs: return 0
        client = SupabaseService.get_client()
        if not client: return 0
        
        try:
            # Supabase upsert handles lists
            # We use chunks to avoid payload size limits if many jobs
            chunk_size = 100
            count = 0
            for i in range(0, len(jobs), chunk_size):
                chunk = jobs[i : i + chunk_size]
                sanitized_chunk = [SupabaseService._sanitize_job_data(j) for j in chunk]
                response = client.table("jobs").upsert(sanitized_chunk, on_conflict="job_id").execute()
                count += len(response.data) if response.data else 0
            
            logger.info(f"💾 Successfully upserted {count} jobs to Supabase.")
            return count
        except Exception as e:
            logger.error(f"Error bulk upserting jobs: {e}")
            return 0

    @staticmethod
    def mark_jobs_inactive(sources: List[str]) -> bool:
        """Mark jobs from specific sources as inactive in Supabase"""
        if not sources: return False
        client = SupabaseService.get_client()
        if not client: return False
        try:
            client.table("jobs").update({"is_active": False}).in_("source", sources).execute()
            logger.info(f"Marked jobs from {sources} as inactive.")
            return True
        except Exception as e:
            logger.error(f"Error marking jobs inactive: {e}")
            return False

    @staticmethod
    def get_job_stats_24h() -> Dict[str, Any]:
        """Get statistics about jobs in Supabase"""
        client = SupabaseService.get_client()
        if not client: return {"error": "No client"}
        try:
            # Total active jobs
            res = client.table("jobs").select("id", count="exact").eq("is_active", True).execute()
            total = res.count if res.count is not None else 0
            
            # We'll return just total for now as grouped counts are expensive in client
            # But let's try to get counts for common sources
            by_source = {}
            for source in ["Adzuna", "JSearch", "USAJobs.gov"]:
                s_res = client.table("jobs").select("id", count="exact").eq("source", source).eq("is_active", True).execute()
                by_source[source] = s_res.count if s_res.count is not None else 0
                
            return {
                "total_jobs": total,
                "by_source": by_source,
                "by_work_type": {
                    "Remote": 0, # Placeholders
                    "Hybrid": 0,
                    "On-site": 0
                }
            }
        except Exception as e:
            logger.error(f"Error getting job stats: {e}")
            return {"error": str(e)}

    @staticmethod
    def update_job_sync_status(source: str, status_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update job sync status for a source"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            status_data["source"] = source
            status_data["updated_at"] = datetime.utcnow().isoformat()
            response = client.table("job_sync_status").upsert(status_data, on_conflict="source").execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating job sync status: {e}")
            return None

    @staticmethod
    def get_job_sync_status() -> List[Dict[str, Any]]:
        """Get all job sync statuses"""
        client = SupabaseService.get_client()
        if not client: return []
        try:
            response = client.table("job_sync_status").select("*").execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching job sync status: {e}")
            return []

    # --- ADMIN & COMMUNICATION ---

    @staticmethod
    def insert_contact_message(message_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Insert a new contact message"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("contact_messages").insert(message_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting contact message: {e}")
            return None

    @staticmethod
    def insert_call_booking(booking_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Insert a new call booking"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("call_bookings").insert(booking_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting call booking: {e}")
            return None

    @staticmethod
    def update_call_booking(booking_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a call booking record in Supabase"""
        client = SupabaseService.get_client()
        if not client: return False
        try:
            client.table("call_bookings").update(update_data).eq("id", booking_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating call booking: {e}")
            return False

    # get_admin_stats moved below (canonical version kept at end of file)

    @staticmethod
    def get_job_stats_summary() -> Dict[str, Any]:
        """Get total, fresh and US job stats for admin summary"""
        client = SupabaseService.get_client()
        if not client: return {"total": 0, "fresh": 0, "us": 0}
        try:
            # Total jobs
            total_res = client.table("jobs").select("*", count="exact").limit(0).execute()
            total = total_res.count or 0
            
            # Fresh jobs (72h)
            threshold = (datetime.utcnow() - timedelta(hours=72)).isoformat()
            fresh_res = client.table("jobs").select("*", count="exact").eq("is_active", True).gte("created_at", threshold).limit(0).execute()
            fresh = fresh_res.count or 0
            
            # US jobs
            us_res = client.table("jobs").select("*", count="exact").eq("country", "us").limit(0).execute()
            us = us_res.count or 0
            
            return {
                "total": total,
                "fresh": fresh,
                "us": us
            }
        except Exception as e:
            logger.error(f"Error fetching job stats summary: {e}")
            return {"total": 0, "fresh": 0, "us": 0}

    @staticmethod
    def get_job_stats_24h() -> Dict[str, Any]:
        """Get job posting stats for the last 24h"""
        client = SupabaseService.get_client()
        if not client: return {}
        try:
            cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat()
            total_res = client.table("jobs").select("*", count="exact").gte("created_at", cutoff).limit(0).execute()
            adzuna_res = client.table("jobs").select("*", count="exact").eq("source", "adzuna").gte("created_at", cutoff).limit(0).execute()
            jsearch_res = client.table("jobs").select("*", count="exact").eq("source", "jsearch").gte("created_at", cutoff).limit(0).execute()
            
            return {
                "total_24h": total_res.count or 0,
                "sources": {
                    "adzuna": adzuna_res.count or 0,
                    "jsearch": jsearch_res.count or 0
                }
            }
        except Exception as e:
            logger.error(f"Error fetching job stats: {e}")
            return {"total_24h": 0, "sources": {}}

    @staticmethod
    def get_call_bookings(limit: int = 1000) -> List[Dict[str, Any]]:
        """Get all call bookings from Supabase"""
        client = SupabaseService.get_client()
        if not client: return []
        try:
            response = client.table("call_bookings").select("*").order("created_at", desc=True).limit(limit).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching call bookings: {e}")
            return []

    @staticmethod
    def get_contact_messages(limit: int = 1000) -> List[Dict[str, Any]]:
        """Get all contact messages from Supabase"""
        client = SupabaseService.get_client()
        if not client: return []
        try:
            response = client.table("contact_messages").select("*").order("created_at", desc=True).limit(limit).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching contact messages: {e}")
            return []

    @staticmethod
    def create_contact_message(message_data: Dict[str, Any]) -> bool:
        """Save a contact message to Supabase"""
        client = SupabaseService.get_client()
        if not client: return False
        try:
            client.table("contact_messages").insert(message_data).execute()
            return True
        except Exception as e:
            logger.error(f"Error saving contact message: {e}")
            return False

    @staticmethod
    def get_all_users(limit: int = 100) -> List[Dict[str, Any]]:
        """Get all user profiles from Supabase, sorted newest first"""
        client = SupabaseService.get_client()
        if not client: return []
        try:
            response = (
                client.table("profiles")
                .select("*")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error fetching admin users: {repr(e)}")
            return []

    @staticmethod
    def get_admin_stats() -> Dict[str, Any]:
        """Compute high-level admin stats from Supabase tables for the React dashboard"""
        client = SupabaseService.get_client()
        if not client: return {}
        
        try:
            now = datetime.now(timezone.utc)
            twenty_four_hours_ago = (now - timedelta(hours=24)).isoformat()
            
            # --- Users ---
            all_users = client.table("profiles").select("id, created_at", count="exact").execute()
            total_users = all_users.count or 0
            new_users_24h = sum(1 for r in (all_users.data or []) if r.get("created_at") and r["created_at"] >= twenty_four_hours_ago)
            
            # --- Resumes ---
            resumes_all = client.table("saved_resumes").select("id", count="exact").execute()
            total_resumes = resumes_all.count or 0
            
            # --- Applications ---
            apps_all = client.table("applications").select("id", count="exact").execute()
            total_apps = apps_all.count or 0
            
            # Return flattened structure for AdminDashboard.jsx
            return {
                "total_users": total_users,
                "new_users_24h": new_users_24h,
                "total_resumes_tailored": total_resumes,
                "total_jobs_applied": total_apps
            }
        except Exception as e:
            logger.error(f"Error computing comprehensive admin stats: {e}")
            return {
                "total_users": 0,
                "new_users_24h": 0,
                "total_resumes_tailored": 0,
                "total_jobs_applied": 0
            }


    @staticmethod
    def update_user_profile(user_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a user profile in Supabase"""
        client = SupabaseService.get_client()
        if not client: return False
        try:
            client.table("profiles").update(update_data).eq("id", user_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating user profile: {e}")
            return False

    @staticmethod
    def update_contact_message(message_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a contact message record in Supabase"""
        client = SupabaseService.get_client()
        if not client: return False
        try:
            client.table("contact_messages").update(update_data).eq("id", message_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating contact message: {e}")
            return False

    # ----------------------------------------------------------------
    # AUTH HELPERS
    # ----------------------------------------------------------------

    @staticmethod
    def sign_up_user(user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new user profile in Supabase profiles table"""
        client = SupabaseService.get_client()
        if not client: return None
        if 'email' in user_data:
            user_data['email'] = user_data['email'].lower().strip()
            
        try:
            # Explicitly log user data for debugging
            logger.info(f"Supabase sign_up_user attempt for: {user_data.get('email')}")
            response = client.table("profiles").insert(user_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating user in Supabase: {repr(e)}")
            return None

    @staticmethod
    def get_user_by_verification_token(token: str) -> Optional[Dict[str, Any]]:
        """Find a user by their email verification token"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("profiles").select("*").eq("verification_token", token).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error finding user by verification token: {e}")
            return None

    @staticmethod
    def get_user_by_referral_code(referral_code: str) -> Optional[Dict[str, Any]]:
        """Find a user by their referral code"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("profiles").select("*").eq("referral_code", referral_code).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error finding user by referral code: {e}")
            return None

    @staticmethod
    def update_user_by_email(email: str, update_data: Dict[str, Any]) -> bool:
        """Update a user profile by email"""
        client = SupabaseService.get_client()
        if not client: return False
        try:
            client.table("profiles").update(update_data).eq("email", email).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating user by email: {e}")
            return False

    @staticmethod
    def delete_user(email: str) -> bool:
        """Delete a user profile by email"""
        client = SupabaseService.get_client()
        if not client: return False
        try:
            client.table("profiles").delete().eq("email", email).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            return False

    # ----------------------------------------------------------------
    # BYOK KEYS
    # ----------------------------------------------------------------

    @staticmethod
    def save_byok_key(user_email: str, provider: str, encrypted_key: Dict[str, Any]) -> bool:
        """Save or update a BYOK key in Supabase"""
        client = SupabaseService.get_client()
        if not client: return False
        try:
            from datetime import datetime
            data = {
                "user_email": user_email,
                "provider": provider,
                "encrypted_key": encrypted_key,
                "updated_at": datetime.utcnow().isoformat(),
            }
            client.table("byok_keys").upsert(data, on_conflict="user_email").execute()
            return True
        except Exception as e:
            logger.error(f"Error saving BYOK key: {e}")
            return False

    @staticmethod
    def get_byok_key(user_email: str) -> Optional[Dict[str, Any]]:
        """Get a user's BYOK key config from Supabase"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("byok_keys").select("*").eq("user_email", user_email).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching BYOK key: {e}")
            return None

    @staticmethod
    def delete_byok_key(user_email: str) -> bool:
        """Delete a user's BYOK key from Supabase"""
        client = SupabaseService.get_client()
        if not client: return False
        try:
            client.table("byok_keys").delete().eq("user_email", user_email).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting BYOK key: {e}")
            return False

    # ----------------------------------------------------------------
    # WAITLIST
    # ----------------------------------------------------------------

    @staticmethod
    def insert_waitlist(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Insert a waitlist entry in Supabase"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("waitlist").upsert(data, on_conflict="email").execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting waitlist entry: {e}")
            return None

    @staticmethod
    def get_waitlist(limit: int = 1000) -> List[Dict[str, Any]]:
        """Get all waitlist entries"""
        client = SupabaseService.get_client()
        if not client: return []
        try:
            response = client.table("waitlist").select("*").order("created_at", desc=True).limit(limit).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching waitlist: {e}")
            return []

    # ----------------------------------------------------------------
    # SUBSCRIPTIONS
    # ----------------------------------------------------------------

    @staticmethod
    def upsert_subscription(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Upsert a subscription record by user_email + provider_id"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            from datetime import datetime
            data["updated_at"] = datetime.utcnow().isoformat()
            response = client.table("subscriptions").upsert(data, on_conflict="user_email,provider_id").execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error upserting subscription: {e}")
            return None

    @staticmethod
    def get_subscription_by_user(user_email: str) -> Optional[Dict[str, Any]]:
        """Get the active subscription for a user"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = (
                client.table("subscriptions")
                .select("*")
                .eq("user_email", user_email)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching subscription: {e}")
            return None

    # ----------------------------------------------------------------
    # WEBHOOK EVENTS
    # ----------------------------------------------------------------

    @staticmethod
    def insert_webhook_event(event_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Record a webhook event in Supabase"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("webhook_events").insert(event_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting webhook event: {e}")
            return None

    # ----------------------------------------------------------------
    # PAYMENTS
    # ----------------------------------------------------------------

    @staticmethod
    def insert_payment(payment_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Record a payment in Supabase"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("payments").insert(payment_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting payment: {e}")
            return None

    @staticmethod
    def get_payments_by_user(user_email: str) -> List[Dict[str, Any]]:
        """Get payment history for a user"""
        client = SupabaseService.get_client()
        if not client: return []
        try:
            response = (
                client.table("payments")
                .select("*")
                .eq("user_email", user_email)
                .order("created_at", desc=True)
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error fetching payments: {e}")
            return []

    # ----------------------------------------------------------------
    # STATUS CHECKS
    # ----------------------------------------------------------------

    @staticmethod
    def insert_status_check(client_name: str) -> Optional[Dict[str, Any]]:
        """Insert a status check record"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("status_checks").insert({"client_name": client_name}).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting status check: {e}")
            return None

    @staticmethod
    def get_status_checks(limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent status checks"""
        client = SupabaseService.get_client()
        if not client: return []
        try:
            response = (
                client.table("status_checks")
                .select("*")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error fetching status checks: {e}")
            return []

    # ----------------------------------------------------------------
    # SAVED RESUMES — email-based lookup (supplement existing user_id version)
    # ----------------------------------------------------------------

    @staticmethod
    def get_saved_resumes_by_email(user_email: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get saved resumes by user email"""
        client = SupabaseService.get_client()
        if not client: return []
        try:
            response = (
                client.table("saved_resumes")
                .select("*")
                .eq("user_email", user_email)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error fetching saved resumes by email: {e}")
            return []

    @staticmethod
    def get_saved_resume_by_id(resume_id: str) -> Optional[Dict[str, Any]]:
        """Get a saved resume by its ID"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("saved_resumes").select("*").eq("id", resume_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching saved resume by id: {e}")
            return None

    @staticmethod
    def delete_saved_resume(resume_id: str, user_email: str) -> bool:
        """Delete a saved resume (verifies ownership by email)"""
        client = SupabaseService.get_client()
        if not client: return False
        try:
            client.table("saved_resumes").delete().eq("id", resume_id).eq("user_email", user_email).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting saved resume: {e}")
            return False
