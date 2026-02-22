import os
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
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
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        client = SupabaseService.get_client()
        if not client: return None
        
        try:
            response = client.table("profiles").select("*").eq("email", email).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching user by email: {e}")
            return None

    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("profiles").select("*").eq("id", user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching user by id: {e}")
            return None

    @staticmethod
    def create_profile(user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        client = SupabaseService.get_client()
        if not client: return None
        
        try:
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
            # Map MongoDB fields to SQL columns
            # This handles both db.users and db.profiles documents
            profile_data = {
                "id": str(user_dict.get("id") or user_dict.get("_id")),
                "email": user_dict.get("email"),
                "name": user_dict.get("name") or user_dict.get("fullName"),
                "role": user_dict.get("role", "customer"),
                "plan": user_dict.get("plan", "free"),
                "is_verified": user_dict.get("is_verified", False),
                "summary": user_dict.get("summary"),
                "resume_text": user_dict.get("resume_text") or user_dict.get("resumeText"),
                "latest_resume": user_dict.get("latest_resume"),
                "profile_picture": user_dict.get("profile_picture") or user_dict.get("picture")
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
            return None

    @staticmethod
    def insert_interview_session(session_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Insert a new interview session"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("interview_sessions").insert(session_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting interview session: {e}")
            return None

    @staticmethod
    def insert_interview_resume(resume_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Insert a new interview resume"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            response = client.table("interview_resumes").insert(resume_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting interview resume: {e}")
            return None

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
    def get_applications(user_id: str = None, user_email: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get job applications for a user from Supabase"""
        client = SupabaseService.get_client()
        if not client: return []
        try:
            query = client.table("applications").select("*, jobs(*)")
            if user_id:
                query = query.eq("user_id", user_id)
            elif user_email:
                # Need to lookup user_id if only email provided, or join on profiles
                profile = SupabaseService.get_user_by_email(user_email)
                if profile:
                    query = query.eq("user_id", profile["id"])
                else:
                    return []
            
            response = query.order("created_at", desc=True).limit(limit).execute()
            return response.data
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
    def get_saved_resumes(user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get saved resumes for a user from Supabase"""
        client = SupabaseService.get_client()
        if not client: return []
        try:
            response = client.table("saved_resumes").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
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
    def get_job_by_external_id(job_id: str) -> Optional[Dict[str, Any]]:
        """Get job by its external ID (e.g. adzuna_123)"""
        client = SupabaseService.get_client()
        if not client: return None
        try:
            # External ID is stored in 'job_id' column
            response = client.table("jobs").select("*").eq("job_id", job_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching job by ID: {e}")
            return None

    @staticmethod
    def _sanitize_job_data(job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Remove fields that don't exist in Supabase jobs table"""
        allowed_columns = {
            'id', 'job_id', 'title', 'company', 'description', 'location', 
            'source', 'job_type', 'salary', 'is_active', 'keywords', 
            'source_url', 'posted_at', 'created_at', 'categories'
        }
        
        # Map datePosted to posted_at if needed
        if 'datePosted' in job_data and 'posted_at' not in job_data:
            job_data['posted_at'] = job_data.pop('datePosted')
            
        # Map contract_type to job_type if needed
        if 'contract_type' in job_data and 'job_type' not in job_data:
            job_data['job_type'] = job_data.pop('contract_type')
            
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
    def get_admin_stats() -> Dict[str, Any]:
        """Get detailed statistics for admin dashboard from Supabase"""
        client = SupabaseService.get_client()
        if not client: return {}
        try:
            # 1. Total and New Users
            users_res = client.table("profiles").select("*", count="exact").limit(0).execute()
            total_users = users_res.count or 0
            
            yesterday = (datetime.utcnow() - timedelta(days=1)).isoformat()
            new_users_res = client.table("profiles").select("*", count="exact").gte("created_at", yesterday).limit(0).execute()
            new_users_24h = new_users_res.count or 0

            # 2. Resumes & Applications
            scans_res = client.table("scans").select("*", count="exact").limit(0).execute()
            total_resumes = scans_res.count or 0
            
            apps_res = client.table("applications").select("*", count="exact").limit(0).execute()
            total_applications = apps_res.count or 0

            # 3. Subscription Stats
            free_res = client.table("profiles").select("*", count="exact").in_("plan", ["free", "trial"]).limit(0).execute()
            pro_res = client.table("profiles").select("*", count="exact").in_("plan", ["pro", "unlimited"]).limit(0).execute()

            # 4. Interview Stats
            interviews_res = client.table("interview_sessions").select("*", count="exact").limit(0).execute()

            return {
                "total_users": total_users,
                "new_users_24h": new_users_24h,
                "total_resumes_tailored": total_resumes,
                "total_jobs_applied": total_applications,
                "total_interviews": interviews_res.count or 0,
                "subscription_stats": {
                    "free": free_res.count or 0,
                    "pro": pro_res.count or 0
                }
            }
        except Exception as e:
            logger.error(f"Error fetching admin stats from Supabase: {e}")
            return {}

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
        """Get all user profiles from Supabase"""
        client = SupabaseService.get_client()
        if not client: return []
        try:
            response = client.table("profiles").select("*").limit(limit).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching admin users: {e}")
            return []

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
