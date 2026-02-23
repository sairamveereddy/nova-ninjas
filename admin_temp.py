print("DEBUG: Starting server.py execution...")
import sys
print(f"DEBUG: Python version: {sys.version}")

from fastapi import (
    FastAPI, # Force Rebuild
    APIRouter,
    Request,
    Header,
    HTTPException,
    Query,
    File,
    Form,
    UploadFile,
    Depends,
    BackgroundTasks,
)
from fastapi.responses import JSONResponse
import json
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from starlette.middleware.cors import CORSMiddleware
# MongoDB decommissioned
import logging
# Setup logging early to avoid NameErrors in defensive imports
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

import asyncio
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Union
import uuid
import traceback
from dateutil.relativedelta import relativedelta
import aiohttp
import re
from models import CheckoutRequest, SubscriptionData, WebhookEvent
from payment_service import (
    create_checkout_session,
    verify_webhook_signature,
    create_customer_portal_session,
)
from resume_job_matcher import calculate_bulk_relevance
from job_fetcher import (
    fetch_all_job_categories,
    update_jobs_in_database,
    scheduled_job_fetch,
)
from job_apis.job_aggregator import JobAggregator
# Razorpay import with error handling
try:
    from razorpay_service import (
        create_razorpay_order,
        verify_razorpay_payment,
        get_payment_details,
        RAZORPAY_PLANS,
        RAZORPAY_PLANS_USD,
    )
except (ImportError, ModuleNotFoundError) as e:
    logger.error(f"Failed to import razorpay_service: {e}")
    # Define dummy functions/constants to prevent NameErrors later
    def create_razorpay_order(*args, **kwargs): raise HTTPException(503, "Payment service unavailable")
    def verify_razorpay_payment(*args, **kwargs): return False
    def get_payment_details(*args, **kwargs): return None
    RAZORPAY_PLANS = {}
    RAZORPAY_PLANS_USD = {}
from scraper_service import scrape_job_description
from byok_crypto import validate_master_key, encrypt_api_key, decrypt_api_key
from job_sync_service import JobSyncService
from interview_service import InterviewOrchestrator
from byok_validators import (
    validate_openai_key,
    validate_google_key,
    validate_anthropic_key,
    validate_api_key_format,
)
from openai import AsyncOpenAI
from supabase_service import SupabaseService
# Ensure parser and enrichment are available
try:
    from resume_parser import parse_resume, validate_resume_file
except ImportError:
    parse_resume = None
    validate_resume_file = None

try:
    from company_enrichment import enrich_company, enrich_job_metadata
except (ImportError, ModuleNotFoundError):
    logger.error("Failed to import company_enrichment. Company features will be limited.")
    async def enrich_company(name, db=None): return {"name": name}
    def enrich_job_metadata(job): return job

# Google Auth imports
try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
except ImportError:
    id_token = None
    google_requests = None
    logger.error("google-auth libraries not found. Google login will be disabled.")


# Initialize OpenAI client conditionally
openai_api_key = os.environ.get("OPENAI_API_KEY")
if openai_api_key:
    openai_client = AsyncOpenAI(api_key=openai_api_key)
else:
    openai_client = None
    logger.warning("OPENAI_API_KEY not set. OpenAI features will be disabled.")

client = None
db = None # Kept as None for defensive edge cases

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address)

# Create the main app
# Create the main app
# Secure Docs: Hide in production
# Secure Docs: Hide in production
is_prod = os.environ.get("ENVIRONMENT") == "production"
docs_url = None if is_prod else "/docs"
redoc_url = None if is_prod else "/redoc"

app = FastAPI(docs_url=docs_url, redoc_url=redoc_url)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "frame-ancestors 'none'"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://jobninjas.ai",
        "https://www.jobninjas.ai", 
        "https://nova-ninjas-production.up.railway.app",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Job Sync Service and Scheduler
from apscheduler.schedulers.asyncio import AsyncIOScheduler

job_sync_service = None
scheduler = AsyncIOScheduler()

if db is not None:
    job_sync_service = JobSyncService()
    
    # Schedule Adzuna sync every 10 minutes
    async def sync_adzuna():
        try:
            logger.info("Starting Adzuna job sync...")
            await job_sync_service.sync_adzuna_jobs()
        except Exception as e:
            logger.error(f"Adzuna sync error: {e}")
    
    # Schedule JSearch sync every hour
    async def sync_jsearch():
        try:
            logger.info("Starting JSearch job sync...")
            await job_sync_service.sync_jsearch_jobs()
        except Exception as e:
            logger.error(f"JSearch sync error: {e}")
    
    # Schedule cleanup of old jobs (older than 72 hours) - runs daily
    async def cleanup_old_jobs():
        try:
            logger.info("Starting cleanup of jobs older than 72 hours...")
            deleted_count = await job_sync_service.cleanup_old_jobs()
            logger.info(f"Cleanup completed: {deleted_count} jobs removed")
        except Exception as e:
            logger.error(f"Cleanup error: {e}")
    
    scheduler.add_job(sync_adzuna, 'interval', minutes=10, id='adzuna_sync')
    scheduler.add_job(sync_jsearch, 'interval', hours=1, id='jsearch_sync')
    scheduler.add_job(cleanup_old_jobs, 'interval', hours=24, id='cleanup_old_jobs')  # Run daily
    scheduler.start()
    logger.info("Job sync scheduler started successfully (Adzuna: 10min, JSearch: 1hr, Cleanup: daily)")

else:
    logger.warning("Job sync scheduler not started - database not available")

# Note: api_router will be included at the end of the file after all routes are defined

# Security Configuration
# CRITICAL: Fail if no secret in production, or use a stable fallback for dev
if os.environ.get("ENVIRONMENT") == "production":
    JWT_SECRET = os.environ.get("JWT_SECRET")
    if not JWT_SECRET or JWT_SECRET == "your-secret-key-change-in-production":
        logger.error("❌ CRITICAL: JWT_SECRET is missing or default in PRODUCTION!")
        # In production we SHOULD fail, but to avoid bricking existing users:
        # We try to use a fallback if absolutely necessary, but log a huge warning.
        JWT_SECRET = os.environ.get("FALLBACK_SECRET", "stable-fallback-secure-key-123")
else:
    # Dev mode: use env or fixed default to ensure session stability across restarts
    JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-key-do-not-use-in-prod")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


# Security Helper Functions
def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


async def verify_turnstile_token(token: str, ip_address: str = None) -> bool:
    """
    Verify Cloudflare Turnstile token.
    """
    secret_key = os.environ.get("CLOUDFLARE_TURNSTILE_SECRET_KEY")
    # If no secret key is set (e.g. dev without keys), we might skip or fail.
    # For security, better to fail, but for dev convenience, maybe skip if not set?
    # Let's fail safe: if key provided, must verify.
    
    if not secret_key or secret_key == "PASTE_YOUR_SECRET_KEY_HERE":
        logger.warning("Turnstile Secret Key not configured. Skipping verification.")
        return True

    if not token:
        return False

    try:
        async with aiohttp.ClientSession() as session:
            payload = {
                "secret": secret_key,
                "response": token
            }
            if ip_address:
                payload["remoteip"] = ip_address

            async with session.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data=payload
            ) as response:
                result = await response.json()
                if not result.get("success"):
                    logger.warning(f"Turnstile verification failed: {result.get('error-codes')}")
                    return False
                return True
    except Exception as e:
        logger.error(f"Turnstile verification error: {e}")
        # Fail open or closed? Closed for security.
        return False


def ensure_verified(user: dict):
    """Ensure the user has verified their email."""
    if not user.get("is_verified"):
        raise HTTPException(
            status_code=403,
            detail="Please verify your email address to access this feature."
        )


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hash, with SHA256 fallback."""
    if not hashed_password:
        return False
    try:
        # Check if it's a bcrypt hash
        if hashed_password.startswith("$2b$"):
            return bcrypt.checkpw(
                plain_password.encode("utf-8"), hashed_password.encode("utf-8")
            )

        # Fallback for old SHA256 hashes if any
        import hashlib

        return (
            hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
            == hashed_password
        )
    except Exception:
        return False





def create_access_token(data: dict):
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user_email(token: str = Header(...)):
    """Dependency to get current user email from JWT token."""
    try:
        # In transition, support old token_ format for now but log it
        if token.startswith("token_"):
            return None  # Force re-login or handle separately

        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError as e:
        logger.warning(f"JWT Decode Error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(token: str = Header(None, alias="token")):
    """Dependency to get full user object from Supabase."""
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    email = get_current_user_email(token)
    if not email:
        raise HTTPException(status_code=401, detail="Authentication required")

    email = email.strip()
    
    # Get user from Supabase
    supabase_user = SupabaseService.get_user_by_email(email)
    if not supabase_user:
        logger.warning(f"User not found for email: {email}")
        raise HTTPException(
            status_code=404, detail=f"User {email} not found in database"
        )
    
    # Map back to MongoDB-style dict for compatibility
    supabase_user["_id"] = supabase_user["id"]
    logger.info(f"Retrieved user from Supabase: {supabase_user.get('email')}")
    return supabase_user


async def check_and_increment_daily_usage(user_email: str, usage_type: str, limit: Union[int, str]) -> bool:
    """
    Check if user has reached their daily limit for a specific usage type and increment if not.
    Uses Supabase for storage.
    """
    if limit == "Unlimited" or limit == "Unlimited (BYOK)":
        return True
        
    try:
        now = datetime.now(timezone.utc)
        today = now.strftime("%Y-%m-%d")
        
        # Get current usage from Supabase
        usage_doc = SupabaseService.check_daily_usage(user_email, today)
        current_usage = usage_doc.get(usage_type, 0)
        
        if current_usage >= int(limit):
            return False
            
        # Increment usage in Supabase
        SupabaseService.increment_daily_usage(user_email, today, usage_type)
        return True
    except Exception as e:
        logger.error(f"Error checking daily usage for {user_email}: {e}")
        # Fail safe: allow if error
        return True


async def get_decrypted_byok_key(email: str) -> dict:
    """Helper to get and decrypt user's BYOK key if it exists"""
    if not email:
        return {}
    
    try:
        user = await db.users.find_one({"email_normalized": email.lower()})
        if not user: # Try exact match if normalized fails
             user = await db.users.find_one({"email": email})

        if not user or not user.get("byok_settings") or not user["byok_settings"].get("enabled"):
            return {}
        
        settings = user["byok_settings"]
        provider = settings.get("provider")
        encrypted_key = settings.get("api_key")
        
        if not encrypted_key or not isinstance(encrypted_key, dict):
            return {}
            
        from byok_crypto import decrypt_api_key
        api_key = decrypt_api_key(
            encrypted_key['ciphertext'],
            encrypted_key['iv'],
            encrypted_key['tag']
        )
        return {"provider": provider, "api_key": api_key}
    except Exception as e:
        logger.error(f"BYOK key lookup error for {email}: {e}")
        return {}


# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class JobUrlFetchRequest(BaseModel):
    url: str
    userId: Optional[str] = None


class WaitlistEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None
    current_role: Optional[str] = None
    target_role: Optional[str] = None
    urgency: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WaitlistCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    current_role: Optional[str] = None
    target_role: Optional[str] = None
    urgency: Optional[str] = None


class CallBooking(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    mobile: str
    years_of_experience: str
    status: str = "pending"  # pending, contacted, completed, cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CallBookingCreate(BaseModel):
    name: str
    email: str
    mobile: str
    years_of_experience: str


# User Authentication Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    password_hash: str  # In production, use proper hashing like bcrypt
    role: str = "customer"  # customer, employee, admin
    plan: Optional[str] = None
    is_verified: bool = False
    verification_token: Optional[str] = None
    referral_code: str = Field(
        default_factory=lambda: f"INV-{uuid.uuid4().hex[:6].upper()}"
    )
    referred_by: Optional[str] = None
    ai_applications_bonus: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserSignup(BaseModel):
    email: str
    password: str
    name: str
    referral_code: Optional[str] = None
    turnstile_token: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str
    turnstile_token: Optional[str] = None


class GoogleLoginRequest(BaseModel):
    credential: str
    mode: Optional[str] = "login"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    referral_code: str
    is_verified: bool
    plan: Optional[str] = None
    created_at: datetime



# ============ ADMIN API ============

async def check_admin(user: dict = Depends(get_current_user)):
    """Dependency to ensure user is an admin."""
    role = user.get("role", "").lower()
    if role != "admin":
        logger.warning(f"Access denied for user {user.get('email')} with role {role}")
        raise HTTPException(status_code=403, detail=f"Admin privileges required. Current role: {role}")
    return user

@api_router.get("/admin/stats")
async def get_admin_stats(admin: dict = Depends(check_admin)):
    """
    Get high-level statistics for the admin dashboard from Supabase.
    """
    try:
        stats = SupabaseService.get_admin_stats()
        return stats
    except Exception as e:
        logger.error(f"Error fetching admin stats: {e}")
        return JSONResponse(
            status_code=500, 
            content={"error": str(e), "total_users": 0, "new_users_24h": 0}
        )

@api_router.get("/admin/users")
async def get_admin_users(admin: dict = Depends(check_admin), limit: int = 100):
    """
    Get list of users from Supabase for admin dashboard.
    """
    try:
        users = SupabaseService.get_all_users(limit=limit)
        return users
    except Exception as e:
        logger.error(f"Error fetching admin users: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")

@api_router.put("/admin/users/{email}")
async def update_user_admin(email: str, update_data: dict, admin: dict = Depends(check_admin)):
    """
    Update user details (Plan, Verification) as admin in Supabase.
    """
    try:
        # Validate fields
        allowed_fields = ["plan", "is_verified", "role"]
        update_set = {}
        
        for field in allowed_fields:
            if field in update_data:
                update_set[field] = update_data[field]
                
        if not update_set:
            raise HTTPException(status_code=400, detail="No valid fields to update")
            
        # Update in Supabase (we use email to find the user)
        # First get the user id by email
        user = SupabaseService.get_user_by_email(email)
        if not user:
             raise HTTPException(status_code=404, detail="User not found in Supabase")
             
        uid = user.get("id")
        success = SupabaseService.update_user_profile(uid, update_set)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update user in Supabase")
            
        return {"success": True, "message": f"User {email} updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user {email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user")

# ============================================
# SUBSCRIPTION & TRIAL MANAGEMENT ENDPOINTS
# ============================================

class TrialActivationRequest(BaseModel):
    plan_id: str

@api_router.post("/subscription/activate-trial")
async def activate_trial(
    request: TrialActivationRequest,
    user: dict = Depends(get_current_user)
):
    """
    Activate 2-week free trial for a user.
    """
    try:
        email = user.get("email")
        
        # Check if user already has an active trial or subscription
        if user.get("subscription_status") == "active":
            raise HTTPException(
                status_code=400, 
                detail="You already have an active subscription"
            )
        
        if user.get("subscription_status") == "trial":
            # Check if trial is still active
            trial_expires_at = user.get("trial_expires_at")
            if trial_expires_at:
                expires_dt = datetime.fromisoformat(trial_expires_at.replace('Z', '+00:00'))
                if datetime.now(timezone.utc) < expires_dt:
                    raise HTTPException(
                        status_code=400,
                        detail="You already have an active trial"
                    )
        
        # Activate 2-week trial
        now = datetime.now(timezone.utc)
        trial_expires_at = now + timedelta(days=14)  # 2 weeks
        
        update_data = {
            "subscription_status": "trial",
            "trial_activated_at": now.isoformat(),
            "trial_expires_at": trial_expires_at.isoformat(),
            "subscription_plan": request.plan_id,
            "plan": "ai-yearly"  # Set plan for compatibility
        }
        
        result = await db.users.update_one(
            {"email": email},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Trial activated for user {email}, expires at {trial_expires_at.isoformat()}")
        
        return {
            "success": True,
            "message": "Trial activated successfully",
            "trial_expires_at": trial_expires_at.isoformat(),
            "days_remaining": 14
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating trial: {e}")
        raise HTTPException(status_code=500, detail="Failed to activate trial")

@api_router.get("/subscription/status")
async def get_subscription_status(user: dict = Depends(get_current_user)):
    """
    Get current subscription status for authenticated user.
    """
    try:
        subscription_status = user.get("subscription_status", "none")
        trial_expires_at = user.get("trial_expires_at")
        subscription_expires_at = user.get("subscription_expires_at")
        
        # Calculate if trial is still active
        is_trial_active = False
        if subscription_status == "trial" and trial_expires_at:
            try:
                expires_dt = datetime.fromisoformat(trial_expires_at.replace('Z', '+00:00'))
                is_trial_active = datetime.now(timezone.utc) < expires_dt
            except:
                pass
        
        # Calculate days remaining
        days_remaining = None
        if is_trial_active and trial_expires_at:
            try:
                expires_dt = datetime.fromisoformat(trial_expires_at.replace('Z', '+00:00'))
                delta = expires_dt - datetime.now(timezone.utc)
                days_remaining = max(0, delta.days)
            except:
                pass
        
        return {
            "subscription_status": subscription_status,
            "has_active_subscription": subscription_status == "active",
            "is_trial_active": is_trial_active,
            "trial_expires_at": trial_expires_at,
            "subscription_expires_at": subscription_expires_at,
            "days_remaining": days_remaining,
            "plan": user.get("plan", "free")
        }
        
    except Exception as e:
        logger.error(f"Error getting subscription status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get subscription status")

# ============================================
# CONTACT MESSAGES & CALL BOOKINGS
# ============================================

class ContactMessageRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    subject: str
    message: str

class CallBookingRequest(BaseModel):
    name: str
    email: str
    phone: str
    company: Optional[str] = None
    message: Optional[str] = None
    preferred_time: Optional[str] = None

@api_router.post("/contact/submit")
async def submit_contact_message(request: Request, contact_data: ContactMessageRequest):
    """
    Submit a contact form message (public endpoint, no auth required).
    """
    try:
        message_doc = {
            "name": f"{contact_data.first_name} {contact_data.last_name}",
            "email": contact_data.email,
            "subject": contact_data.subject,
            "message": contact_data.message,
            "status": "unread",
            "created_at": datetime.utcnow().isoformat()
        }
        
        SupabaseService.insert_contact_message(message_doc)
        logger.info(f"Contact message submitted from {contact_data.email}")
        
        return {
            "success": True,
            "message": "Message sent to team successfully! We'll get back to you soon."
        }
    except Exception as e:
        logger.error(f"Error submitting contact message: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit message")

@api_router.post("/call-bookings/submit")
@limiter.limit("5/hour")
async def submit_call_booking(request: CallBookingRequest, req: Request):
    """
    Submit a call booking request (public endpoint, no auth required).
    """
    try:
        booking_doc = {
            "name": request.name,
            "email": request.email,
            "date": request.preferred_time, # Map preferred_time to date for now
            "service": "Consultation", # Default service
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        }
        
        SupabaseService.insert_call_booking(booking_doc)
        logger.info(f"Call booking submitted from {request.email}")
        
        return {
            "success": True,
            "message": "Call booking request submitted successfully! We'll contact you soon."
        }
    except Exception as e:
        logger.error(f"Error submitting call booking: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit booking")

@api_router.get("/admin/job-stats")
async def get_admin_job_stats(admin: dict = Depends(check_admin)):
    """
    Get job posting statistics for the last 24 hours (admin only).
    """
    try:
        stats = SupabaseService.get_job_stats_24h()
        return stats
    except Exception as e:
        logger.error(f"Error fetching job stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch job stats")

@api_router.get("/admin/call-bookings")
async def get_call_bookings(admin: dict = Depends(check_admin)):
    """
    Get all call booking requests from Supabase (admin only).
    """
    try:
        bookings = SupabaseService.get_call_bookings()
        return bookings
    except Exception as e:
        logger.error(f"Error fetching call bookings: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch call bookings")

@api_router.get("/admin/contact-messages")
async def get_contact_messages(admin: dict = Depends(check_admin)):
    """
    Get all contact form messages from Supabase (admin only).
    """
    try:
        messages = SupabaseService.get_contact_messages()
        return messages
    except Exception as e:
        logger.error(f"Error fetching contact messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch contact messages")
        
        # Convert ObjectId to string
        for message in messages:
            message["_id"] = str(message["_id"])
        
        return messages
        
    except Exception as e:
        logger.error(f"Error fetching contact messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch contact messages")

class StatusUpdateRequest(BaseModel):
    status: str

@api_router.patch("/admin/call-bookings/{booking_id}/status")
async def update_call_booking_status(
    booking_id: str,
    request: StatusUpdateRequest,
    admin: dict = Depends(check_admin)
):
    """
    Update status of a call booking (admin only).
    """
    try:
        from bson import ObjectId
        
        result = await db.call_bookings.update_one(
            {"_id": ObjectId(booking_id)},
            {"$set": {"status": request.status}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        return {"success": True, "message": "Status updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating call booking status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update status")

@api_router.patch("/admin/contact-messages/{message_id}/status")
async def update_contact_message_status(
    message_id: str,
    request: StatusUpdateRequest,
    admin: dict = Depends(check_admin)
):
    """
    Update status of a contact message (admin only).
    """
    try:
        from bson import ObjectId
        
        result = await db.contact_messages.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"status": request.status}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Message not found")
        
        return {"success": True, "message": "Status updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating contact message status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update status")

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.get("/health")
async def health_check_old():
    """
    Health check endpoint that also tests MongoDB connection.
    """
    mongo_status = "unknown"
    mongo_error = None

    try:
        # Test MongoDB connection by pinging
        await client.admin.command("ping")
        mongo_status = "connected"
    except Exception as e:
        error_msg = str(e)
        if (
            "SSL handshake failed" in error_msg
            or "TLSV1_ALERT_INTERNAL_ERROR" in error_msg
        ):
            mongo_status = "ssl_error"
            mongo_error = "SSL/TLS error - Please whitelist 0.0.0.0/0 in MongoDB Atlas Network Access"
        else:
            mongo_status = "error"
            mongo_error = error_msg[:200]  # Truncate long errors

    # Check environment variables
    env_check = {
        "MONGO_URL": "set" if os.environ.get("MONGO_URL") else "missing",
        "DB_NAME": os.environ.get("DB_NAME", "not set"),
        "RESEND_API_KEY": "set" if os.environ.get("RESEND_API_KEY") else "missing",
        "ADMIN_EMAIL": os.environ.get("ADMIN_EMAIL", "not set"),
    }

    return {
        "status": "healthy" if mongo_status == "connected" else "degraded",
        "mongodb": mongo_status,
        "mongodb_error": mongo_error,
        "environment": env_check,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "fix_instructions": (
            "If mongodb shows ssl_error, go to MongoDB Atlas > Network Access > Add IP > Allow Access from Anywhere (0.0.0.0/0)"
            if mongo_status == "ssl_error"
            else None
        ),
    }


@api_router.get("/test-email/{email}")
async def test_email_endpoint(email: str):
    """
    Test endpoint to debug email sending on Railway using Resend.
    """
    resend_api_key = os.environ.get("RESEND_API_KEY")
    from_email = os.environ.get("FROM_EMAIL", "onboarding@resend.dev")

    if not resend_api_key:
        return {"success": False, "error": "RESEND_API_KEY not configured"}

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": from_email,
                    "to": [email],
                    "subject": "Test Email from Railway via Resend",
                    "html": f"<p>Test email sent at {datetime.now()}</p><p>If you receive this, emails are working! 🎉</p>",
                },
            ) as response:
                result = await response.json()
                if response.status == 200:
                    return {
                        "success": True,
                        "message": f"Email sent to {email}",
                        "resend_response": result,
                    }
                else:
                    return {
                        "success": False,
                        "error": result,
                        "status": response.status,
                    }
    except Exception as e:
        return {"success": False, "error": str(e)}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)

    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()

    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)

    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check["timestamp"], str):
            check["timestamp"] = datetime.fromisoformat(check["timestamp"])

    return status_checks


# ============ EMAIL HELPER (RESEND) ============


async def send_email_resend(to_email: str, subject: str, html_content: str):
    """
    Send email using Resend API (HTTP-based, works on Railway).
    """
    resend_api_key = os.environ.get("RESEND_API_KEY")
    from_email = os.environ.get("FROM_EMAIL", "jobNinjas <noreply@jobninjas.ai>")

    if not resend_api_key:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return False

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": from_email,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                },
            ) as response:
                result = await response.json()
                if response.status == 200:
                    logger.info(f"Email sent successfully to {to_email}")
                    return True
                else:
                    logger.error(f"Failed to send email: {result}")
                    return False
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False


async def send_waitlist_email(name: str, email: str):
    """
    Send a confirmation email to users who join the waitlist.
    """
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .highlight {{ background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 14px; }}
        h1 {{ margin: 0; font-size: 28px; }}
        .emoji {{ font-size: 40px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="emoji">🥷</div>
            <h1>Welcome to jobNinjas!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{name}</strong>,</p>
            
            <p>Thank you for joining the jobNinjas waitlist! We're excited to have you on board.</p>
            
            <div class="highlight">
                <strong>What happens next:</strong>
                <ul>
                    <li>✅ We'll review your application</li>
                    <li>✅ You'll receive priority access when we launch</li>
                    <li>✅ Our team will reach out with personalized onboarding</li>
                </ul>
            </div>
            
            <p>You've taken the first step toward transforming your job search. No more endless applications – let our human specialists handle the grind while you focus on interviews and skill-building.</p>
            
            <p>If you have any questions, simply reply to this email.</p>
            
            <p>Best regards,<br><strong>The jobNinjas Team</strong></p>
        </div>
        <div class="footer">
            <p>Apply Smarter, Land Faster - AI Resume Tools & Human Job Application Service</p>
        </div>
    </div>
</body>
</html>
    """

    return await send_email_resend(
        email, "Welcome to jobNinjas Waitlist! 🥷", html_content
    )


async def send_booking_email(name: str, email: str):
    """
    Send a confirmation email to users who book a call.
    """
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .highlight {{ background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; }}
        h1 {{ margin: 0; font-size: 28px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📞 Call Booked!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{name}</strong>,</p>
            
            <p>Thank you for booking a consultation call with jobNinjas.org!</p>
            
            <p>We've received your request and our team will reach out to you within 24 hours to schedule your 15-minute call.</p>
            
            <div class="highlight">
                <strong>What to expect:</strong>
                <ul>
                    <li>A quick call to understand your job search needs</li>
                    <li>Personalized recommendations for your situation</li>
                    <li>Answers to any questions you have about our service</li>
                </ul>
            </div>
            
            <p>We're excited to help you land your dream job faster!</p>
            
            <p>Best regards,<br><strong>The jobNinjas Team</strong></p>
        </div>
    </div>
</body>
</html>
    """

    return await send_email_resend(
        email, "Your Call with jobNinjas.org is Booked! 📞", html_content
    )


async def send_welcome_email(
    name: str, email: str, token: str = None, referral_code: str = None
):
    """
    Send a refined welcome email to new users who sign up.
    """
    logger.info(f"Attempting to send welcome email to {email} (Name: {name})")
    frontend_url = os.environ.get("FRONTEND_URL", "https://jobninjas.ai")
    verify_link = (
        f"{frontend_url}/verify-email?token={token}&email={email}"
        if token
        else f"{frontend_url}/dashboard"
    )
    login_link = f"{frontend_url}/login"
    invite_link = (
        f"{frontend_url}/signup?ref={referral_code}"
        if referral_code
        else f"{frontend_url}/signup"
    )

    blue_primary = "#2563eb"

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; margin: 0; padding: 0; }}
        .wrapper {{ width: 100%; table-layout: fixed; background-color: #f9fafb; padding-bottom: 40px; }}
        .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }}
        .header {{ padding: 25px 40px; border-bottom: 1px solid #f3f4f6; }}
        .header-content {{ display: flex; align-items: center; justify-content: space-between; }}
        .logo {{ font-size: 24px; font-weight: 800; color: {blue_primary}; text-decoration: none; }}
        .login-btn {{ border: 1px solid #d1d5db; padding: 8px 16px; border-radius: 6px; color: #374151; text-decoration: none; font-size: 14px; font-weight: 500; }}
        
        .hero {{ background-color: #f8fafc; padding: 40px; text-align: center; }}
        .hero-img {{ width: 120px; height: auto; margin-bottom: 20px; }}
        
        .content {{ padding: 40px; }}
        .title {{ font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 16px; margin-top: 0; text-align: center; }}
        .message {{ font-size: 16px; color: #4b5563; margin-bottom: 30px; text-align: center; }}
        
        .cta-container {{ text-align: center; margin-bottom: 40px; }}
        .cta-button {{ display: inline-block; background-color: {blue_primary}; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }}
        
        .secondary-content {{ background-color: #f8fafc; padding: 40px; border-top: 1px solid #f3f4f6; }}
        .section-title {{ font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 24px; text-align: center; }}
        
        .referral-box {{ background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px; text-align: center; }}
        .referral-icon {{ font-size: 32px; margin-bottom: 16px; display: block; }}
        .referral-text {{ font-size: 14px; color: #6b7280; margin-bottom: 20px; }}
        .referral-bonus {{ font-size: 18px; font-weight: 600; color: {blue_primary}; margin-bottom: 8px; display: block; }}
        .invite-btn {{ display: inline-block; background-color: #f3f4f6; color: #1f2937; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; }}
        
        .footer {{ padding: 40px; text-align: center; font-size: 13px; color: #9ca3af; }}
        .social-links {{ margin-bottom: 20px; }}
        .social-links a {{ margin: 0 10px; color: #9ca3af; text-decoration: none; font-size: 20px; }}
        .footer-links {{ margin-bottom: 15px; }}
        .footer-links a {{ color: #9ca3af; text-decoration: underline; margin: 0 5px; }}
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <table width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                        <td align="left">
                            <a href="{frontend_url}" class="logo">jobNinjas</a>
                        </td>
                        <td align="right">
                            <a href="{login_link}" class="login-btn">Log In</a>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="hero">
                <center>
                    <!-- Custom envelope icon approximation -->
                    <div style="font-size: 80px; line-height: 1;">✉️</div>
                </center>
            </div>

            <div class="content">
                <h1 class="title">Thanks for joining us</h1>
                <p class="message">
                    To complete your profile we need you to confirm your email address so we know that you're reachable at this address.
                </p>
                
                <div class="cta-container">
                    <a href="{verify_link}" class="cta-button">Confirm my email address</a>
                </div>

                <p style="font-size: 14px; text-align: center; color: #9ca3af;">
                    While we've got your attention, why not explore our job board?<br>
                    Our AI Ninjas are ready to start tailoring your applications. 🥷✨
                </p>
            </div>

            <div class="secondary-content">
                <h2 class="section-title">Invite your friends to land their job quick</h2>
                <div class="referral-box">
                    <span class="referral-icon">🤝</span>
                    <span class="referral-bonus">Get 5 Free AI Applications</span>
                    <p class="referral-text">
                        Invite your friends to jobNinjas! When they sign up and activate their subscription, we'll add 5 extra AI tailored applications to your account.
                    </p>
                    <a href="{invite_link}" class="invite-btn">Invite Friends</a>
                </div>
            </div>

            <div class="footer">
                <div class="social-links">
                    <a href="#">𝕏</a>
                    <a href="#">💼</a>
                    <a href="#">📸</a>
                    <a href="#">📺</a>
                </div>
                <div class="footer-links">
                    If you prefer not to receive these emails, you can <a href="#">unsubscribe</a>.
                </div>
                <p>Copyright © 2025 jobNinjas.org. All rights reserved.</p>
                <p>Fast. Accurate. Human-Powered & AI-Driven.</p>
            </div>
        </div>
    </div>
</body>
</html>
    """

    try:
        return await send_email_resend(
            email, f"Welcome to jobNinjas, {name}! 🥷", html_content
        )
    except Exception as e:
        logger.error(f"Failed to generate/send welcome email: {e}")
        return False


async def send_admin_booking_notification(booking):
    """
    Send notification to admin when someone books a call.
    """
    admin_email = os.environ.get("ADMIN_EMAIL", "hello@jobninjas.org")

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; }}
        .container {{ max-width: 500px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #1a472a; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f8f8f8; padding: 20px; border: 1px solid #ddd; }}
        .info {{ background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #1a472a; }}
        .label {{ font-weight: bold; color: #666; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🔔 New Call Booking!</h2>
        </div>
        <div class="content">
            <div class="info">
                <p class="label">Name</p>
                <p>{booking.name}</p>
            </div>
            <div class="info">
                <p class="label">Email</p>
                <p><a href="mailto:{booking.email}">{booking.email}</a></p>
            </div>
            <div class="info">
                <p class="label">Mobile</p>
                <p><a href="tel:{booking.mobile}">{booking.mobile}</a></p>
            </div>
            <div class="info">
                <p class="label">Years of Experience</p>
                <p>{booking.years_of_experience}</p>
            </div>
            <p style="text-align: center; margin-top: 20px;">
                <strong>Reach out to schedule the call!</strong>
            </p>
        </div>
    </div>
</body>
</html>
    """

    return await send_email_resend(
        admin_email, f"🔔 New Call Booking: {booking.name}", html_content
    )


# ============ AUTH ENDPOINTS ============


@api_router.post("/auth/signup", response_model=UserResponse)
@limiter.limit("5/minute")
async def signup(request: Request, user_data: UserSignup):
    """
    Register a new user and send welcome email.
    """
    try:
        # Verify Turnstile
        client_ip = request.client.host if request.client else None
        if not await verify_turnstile_token(user_data.turnstile_token, client_ip):
             raise HTTPException(status_code=400, detail="Security check failed. Please refresh and try again.")

        # Check if user already exists (case-insensitive)
        existing_user = await db.users.find_one(
            {"email": {"$regex": f"^{re.escape(user_data.email)}$", "$options": "i"}}
        )
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create user with secure bcrypt hashing
        password_hash = hash_password(user_data.password)

        verification_token = str(uuid.uuid4())

        user = User(
            email=user_data.email,
            name=user_data.name,
            password_hash=password_hash,
            verification_token=verification_token,
            referred_by=user_data.referral_code,
            is_verified=False,
        )

        # Save to database
        user_dict = user.model_dump()
        user_dict["created_at"] = user_dict["created_at"].isoformat()
        await db.users.insert_one(user_dict)
        
        # --- SUPABASE SYNC ---
        SupabaseService.sync_user_profile(user_dict)
        
        logger.info(f"New user signed up and synced to Supabase: {user.email}")

        # Send welcome email in background (don't wait)
        try:
            asyncio.create_task(
                send_welcome_email(
                    user.name, user.email, verification_token, user.referral_code
                )
            )
        except Exception as email_error:
            logger.error(f"Error sending welcome email: {email_error}")

        # Generate secure JWT access token
        access_token = create_access_token(data={"sub": user.email, "id": user.id})

        # Return user data (without password)
        return {
            "success": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "plan": user.plan,
                "is_verified": False,
            },
            "token": access_token,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in signup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")


@api_router.post("/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, credentials: UserLogin):
    """
    Login user with email and password.
    """
    # Verify Turnstile
    client_ip = request.client.host if request.client else None
    if not await verify_turnstile_token(credentials.turnstile_token, client_ip):
            raise HTTPException(status_code=400, detail="Security check failed. Please refresh and try again.")

    email_clean = credentials.email.strip()
    # Find all matching users and sort by is_verified (True first)
    cursor = db.users.find(
        {"email": {"$regex": f"^{re.escape(email_clean)}$", "$options": "i"}}
    ).sort("is_verified", -1)
    users = await cursor.to_list(length=2)

    if not users:
        logger.warning(f"Login failed: User {email_clean} not found")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Try to find a user where the password matches (check all if there are dupes)
    user = None
    for u in users:
        if verify_password(credentials.password, u.get("password_hash", "")):
            user = u
            break

    if not user:
        logger.warning(f"Login failed: Password mismatch for {email_clean}")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Auto-upgrade legacy hashes to bcrypt
    if not user.get("password_hash", "").startswith("$2b$"):
        new_hash = hash_password(credentials.password)
        await db.users.update_one(
            {"_id": user["_id"]}, {"$set": {"password_hash": new_hash}}
        )
        user["password_hash"] = new_hash
        logger.info(f"Upgraded password hash for user: {credentials.email}")
    
    # --- SUPABASE SYNC (On successful login) ---
    SupabaseService.sync_user_profile(user)

    # Generate secure JWT access token
    user_id = user.get("id") or str(user.get("_id"))
    access_token = create_access_token(data={"sub": user["email"], "id": user_id})

    return {
        "success": True,
        "user": {
            "id": user_id,
            "email": user["email"],
            "name": user.get("name", "User"),
            "role": user.get("role", "customer"),
            "plan": user.get("plan"),
            "is_verified": bool(user.get("is_verified", False)),
            "referral_code": user.get("referral_code"),
            "subscription_status": user.get("subscription_status"),
            "trial_expires_at": user.get("trial_expires_at"),
            "subscription_expires_at": user.get("subscription_expires_at"),
            "ai_applications_bonus": user.get("ai_applications_bonus", 0)
        },
        "token": access_token,
    }


@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """
    Get current authenticated user data.
    """
    return {
        "success": True,
        "user": {
            "id": user.get("id"),
            "email": user.get("email"),
            "name": user.get("name"),
            "role": user.get("role"),
            "plan": user.get("plan"),
            "is_verified": bool(user.get("is_verified", False)),
            "referral_code": user.get("referral_code"),
            "subscription_status": user.get("subscription_status"),
            "trial_expires_at": user.get("trial_expires_at"),
            "subscription_expires_at": user.get("subscription_expires_at"),
            "ai_applications_bonus": user.get("ai_applications_bonus", 0)
        },
    }


@api_router.get("/auth/verify-email")
async def verify_email(token: str, email: str = None):
    """
    Verify user email using the token.
    Robustly handles already verified users if email is provided.
    """
    # 1. Try to find user by token
    user_by_token = await db.users.find_one({"verification_token": token})

    if user_by_token:
        # User found with token -> Verify and consume token
        await db.users.update_one(
            {"_id": user_by_token["_id"]},
            {"$set": {"is_verified": True}, "$unset": {"verification_token": ""}},
        )
        return {"success": True, "message": "Email verified successfully"}

    # 2. Token not found? Check if user is ALREADY verified (if email provided)
    if email:
        user_by_email = await db.users.find_one({"email": email})
        if user_by_email and user_by_email.get("is_verified"):
             return {"success": True, "message": "Email is already verified"}
    
    # 3. If neither -> Invalid
    raise HTTPException(
        status_code=400, detail="Invalid verification link or already verified."
    )


@api_router.post("/auth/resend-verification")
@limiter.limit("3/minute")
async def resend_verification(request: Request, user: dict = Depends(get_current_user)):
    """
    Resend verification email to the logged-in user.
    """
    try:
        if user.get("is_verified"):
            return {"success": True, "message": "Email is already verified"}

        # Generate new token or use existing one
        verification_token = user.get("verification_token")
        if not verification_token:
            verification_token = str(uuid.uuid4())
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"verification_token": verification_token}},
            )

        # Send email in background
        asyncio.create_task(
            send_welcome_email(
                user["name"],
                user["email"],
                verification_token,
                user.get("referral_code"),
            )
        )

        return {"success": True, "message": "Verification email resent"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resending verification: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to resend verification email"
        )


@api_router.get("/auth/users")
async def get_all_users():
    """
    Get all registered users (admin endpoint).
    """
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return {"users": users, "count": len(users)}


# ============ PROFILE ENDPOINTS ============


@api_router.get("/user/profile")
async def get_user_profile(user: dict = Depends(get_current_user)):
    """
    Get the profile of the current authenticated user.
    """
    try:
        profile = await db.profiles.find_one({"email": user["email"]}, {"_id": 0})
        if not profile:
            return {
                "success": True,
                "profile": {
                    "email": user["email"],
                    "fullName": user.get("name", ""),
                    "is_new": True,
                },
            }
        return {"success": True, "profile": profile}
    except Exception as e:
        logger.error(f"Error fetching user profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch profile")


@api_router.post("/user/profile")
async def save_user_profile(request: Request, user: dict = Depends(get_current_user)):
    """
    Save or update the profile of the current authenticated user.
    """
    try:
        data = await request.json()
        email = user["email"]

        # Basic identification and metadata
        profile_update = data
        profile_update["email"] = email
        profile_update["updated_at"] = datetime.now(timezone.utc).isoformat()

        # Ensure fullName is present if name was provided in original user object
        if "fullName" not in profile_update:
            profile_update["fullName"] = user.get("name", "")

        # Upsert profile
        await db.profiles.update_one(
            {"email": email}, {"$set": profile_update}, upsert=True
        )

        # --- SUPABASE SYNC ---
        SupabaseService.sync_user_profile(profile_update)

        logger.info(f"Full Universal Profile updated and synced for {email}")
        return {"success": True, "message": "Profile updated successfully"}
    except Exception as e:
        logger.error(f"Error saving user profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save profile")


@api_router.get("/profile/{email}")
async def get_profile(email: str):
    """
    Get user profile by email.
    """
    try:
        # --- SUPABASE MIGRATION ---
        supabase_user = SupabaseService.get_user_by_email(email)
        if supabase_user:
            return {"profile": supabase_user}

        # --- FALLBACK TO MONGODB ---
        profile = await db.profiles.find_one({"email": email}, {"_id": 0})
        if not profile:
            return {"profile": None}
        return {"profile": profile}
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        return {"profile": None}


@api_router.post("/profile")
async def save_profile(request: Request, user: dict = Depends(get_current_user)):
    """
    Save or update user profile.
    Handles multipart form data including file uploads.
    """
    form_data = await request.form()

    # Use authenticated user email instead of relying on form data
    email = user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Authentication failed: email missing")

    # Build profile data dynamically from form data
    profile_data = {
        "email": email,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    # Iterate through all fields in form_data
    for key, value in form_data.items():
        if key in ["email", "resume"]:
            continue
            
        # Try to parse as JSON if it's a string (which it will be in FormData)
        # But only if it looks like an object or array
        if isinstance(value, str):
            stripped_val = value.strip()
            if stripped_val.startswith('{') or stripped_val.startswith('['):
                try:
                    profile_data[key] = json.loads(stripped_val)
                except Exception as je:
                    logger.warning(f"Failed to parse field {key} as JSON: {je}")
                    profile_data[key] = value
            else:
                profile_data[key] = value
        else:
            profile_data[key] = value

    # Handle resume file upload
    # Handle resume file upload
    resume_file = form_data.get("resume")
    if resume_file and hasattr(resume_file, "read"):
        filename = resume_file.filename
        profile_data["resumeFileName"] = filename
        
        try:
            # Read and parse resume
            content = await resume_file.read()
            
            # Security: Validate file before processing
            validation_error = validate_resume_file(filename, content)
            if validation_error:
                raise HTTPException(status_code=400, detail=validation_error)

            from resume_parser import parse_resume
            resume_text = await parse_resume(content, filename)
            
            if resume_text:
                profile_data["resumeText"] = resume_text
                
                # Create Resume object for db.resumes
                resume_id = str(uuid.uuid4())
                
                # Get User ID (handle both string and ObjectId)
                user_id = user.get("id") or str(user.get("_id"))
                
                resume_doc = {
                    "id": resume_id,
                    "userId": user_id,
                    "userEmail": email,
                    "resumeName": filename,
                    "resumeText": resume_text,
                    "isSystemGenerated": False,
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                    "updatedAt": datetime.now(timezone.utc).isoformat(),
                    "origin": "profile_upload"
                }
                
                # Save to both collections
                await db.resumes.insert_one(resume_doc)
                await db.saved_resumes.insert_one(resume_doc)
                logger.info(f"Resume {filename} parsed and saved for {email}")
                
        except Exception as e:
            logger.error(f"Error parsing resume file during profile save: {e}")
            # Don't fail the whole profile save, just log it

    # Upsert profile (update if exists, insert if not)
    result = await db.profiles.update_one(
        {"email": email}, {"$set": profile_data}, upsert=True
    )

    logger.info(f"Profile saved for {email}")

    return {"success": True, "message": "Profile saved successfully"}


@api_router.delete("/user/{email}")
async def delete_user(email: str):
    """
    Delete user account and all associated data.
    """
    # Delete from users collection
    await db.users.delete_one({"email": email})

    # Delete profile
    await db.profiles.delete_one({"email": email})

    # Delete from waitlist
    await db.waitlist.delete_many({"email": email})

    # Delete call bookings
    await db.call_bookings.delete_many({"email": email})

    logger.info(f"Account deleted for {email}")

    return {"success": True, "message": "Account deleted successfully"}


# ============ WAITLIST ENDPOINTS ============


@api_router.post("/waitlist", response_model=WaitlistEntry)
async def join_waitlist(input: WaitlistCreate):
    """
    Add a new entry to the waitlist.
    Stores contact info and job preferences.
    """
    waitlist_dict = input.model_dump()
    waitlist_obj = WaitlistEntry(**waitlist_dict)

    # Convert to dict and serialize datetime for MongoDB
    doc = waitlist_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()

    await db.waitlist.insert_one(doc)
    logger.info(f"New waitlist entry: {waitlist_obj.email}")

    # Send confirmation email in background (don't wait)
    asyncio.create_task(send_waitlist_email(waitlist_obj.name, waitlist_obj.email))

    return waitlist_obj


@api_router.get("/waitlist", response_model=List[WaitlistEntry])
async def get_waitlist():
    """
    Get all waitlist entries (admin use).
    """
    entries = await db.waitlist.find({}, {"_id": 0}).to_list(1000)

    for entry in entries:
        if isinstance(entry.get("created_at"), str):
            entry["created_at"] = datetime.fromisoformat(entry["created_at"])

    return entries


# ============ CALL BOOKING ENDPOINTS ============


@api_router.post("/book-call", response_model=CallBooking)
async def book_call(input: CallBookingCreate):
    """
    Book a consultation call.
    Stores contact info and experience level.
    """
    try:
        booking_dict = input.model_dump()
        booking_obj = CallBooking(**booking_dict)

        # Convert to dict and serialize datetime for MongoDB
        doc = booking_obj.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()

        await db.call_bookings.insert_one(doc)
        logger.info(f"New call booking: {booking_obj.email} - {booking_obj.name}")

        # Send emails in background (don't wait)
        try:
            asyncio.create_task(send_booking_email(booking_obj.name, booking_obj.email))
            asyncio.create_task(send_admin_booking_notification(booking_obj))
        except Exception as email_error:
            logger.error(f"Error sending emails: {email_error}")

        return booking_obj
    except Exception as e:
        logger.error(f"Error in book_call: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to book call: {str(e)}")




@api_router.get("/admin/all-users-export")
async def export_all_users_data(admin_key: str = None):
    """
    Export ALL user data including names, emails, phone numbers, and resume info.
    For admin viewing purposes.
    Access with: /api/admin/all-users-export?admin_key=jobninjas2025admin
    """
    # Allow access with admin key OR authenticated admin
    if admin_key != "jobninjas2025admin":
        raise HTTPException(status_code=403, detail="Unauthorized. Use admin_key parameter.")
    
    try:
        # Get all users (include _id for linking)
        all_users = await db.users.find({}, {"password_hash": 0}).to_list(5000)
        
        export_data = []
        
        for user in all_users:
            user_id = str(user["_id"])
            
            # Get profile data
            profile = await db.profiles.find_one({"email": user["email"]}, {"_id": 0})
            
            # Get latest resume (check email fields AND userId)
            resume_query = {
                "$or": [
                    {"email": user.get("email")}, 
                    {"user_email": user.get("email")},
                    {"userId": user_id}
                ]
            }
            # Clean query to remove None values if email is missing
            if not user.get("email"):
                resume_query = {"userId": user_id}
                
            resume_data = await db.resumes.find_one(
                resume_query,
                {"_id": 0},
                sort=[("created_at", -1)]
            )
            
            # Get job application count
            jobs_applied_count = await db.job_applications.count_documents(
                {"customer_email": user.get("email")}
            )
            
            # Build export record
            record = {
                "id": user_id,
                "name": user.get("name", "N/A"),
                "email": user.get("email", "N/A"),
                "role": user.get("role", "customer"),
                "plan": user.get("plan", "free"),
                "byok_enabled": user.get("byok_enabled", False),
                "created_at": user.get("created_at", "N/A"),
                "phone": (profile.get("phone") if profile else None) or "N/A",
                "target_role": (profile.get("targetRole") if profile else None) or "N/A",
                "years_experience": (profile.get("yearsOfExperience") if profile else None) or "N/A",
                "visa_status": (profile.get("visaStatus") if profile else None) or "N/A",
                "remote_preference": (profile.get("remotePreference") if profile else None) or "N/A",
                "skills": (profile.get("skills") if profile else None) or "N/A",
                "has_resume": "Yes" if resume_data else "No",
                "jobs_applied": jobs_applied_count,
                "resume_filename": resume_data.get("filename") if resume_data else "N/A",
                "resume_created": resume_data.get("created_at") if resume_data else "N/A",
                "resume_url": resume_data.get("file_url") if resume_data else None,
            }
            
            # Add employment history if available in resume
            if resume_data and resume_data.get("employment_history"):
                record["employment_count"] = len(resume_data.get("employment_history", []))
                record["latest_job_title"] = (
                    resume_data["employment_history"][0].get("job_title")
                    if resume_data["employment_history"]
                    else "N/A"
                )
            else:
                record["employment_count"] = 0
                record["latest_job_title"] = "N/A"
            
            # Add education
            if resume_data and resume_data.get("education"):
                record["education_count"] = len(resume_data.get("education", []))
                record["highest_education"] = (
                    resume_data["education"][0].get("degree")
                    if resume_data["education"]
                    else "N/A"
                )
            else:
                record["education_count"] = 0
                record["highest_education"] = "N/A"
            
            export_data.append(record)
        
        return {
            "total_users": len(export_data),
            "users": export_data,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error exporting user data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.patch("/admin/update-user-plan")
async def admin_update_user_plan(request: Request):
    """
    Update a user's plan directly (Admin Only).
    """
    try:
        data = await request.json()
        admin_key = data.get("admin_key")
        user_id = data.get("user_id")
        new_plan = data.get("plan")
        
        if admin_key != "jobninjas2025admin":
             raise HTTPException(status_code=403, detail="Unauthorized")
             
        if not user_id or not new_plan:
            raise HTTPException(status_code=400, detail="Missing user_id or plan")
            
        update_doc = {"plan": new_plan}
        
        # Handle BYOK specific flags
        if new_plan == "free_byok":
            update_doc["byok_enabled"] = True
        elif new_plan == "free":
            update_doc["byok_enabled"] = False
        # For paid plans, assume standard behavior (managed via plan ID)
        
        # Try finding and updating by various ID formats
        # 1. Try as ObjectId (standard Mongo)
        if ObjectId.is_valid(user_id):
            result = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_doc})
            if result.matched_count > 0:
                logger.info(f"Updated user plan via ObjectId: {user_id}")
                # --- SUPABASE SYNC ---
                await sync_user_to_supabase_by_any_id(user_id)
                return {"success": True, "plan": new_plan, "user_id": user_id}

        # 2. Try as String _id (custom IDs)
        result = await db.users.update_one({"_id": user_id}, {"$set": update_doc})
        if result.matched_count > 0:
            logger.info(f"Updated user plan via String _id: {user_id}")
            # --- SUPABASE SYNC ---
            await sync_user_to_supabase_by_any_id(user_id)
            return {"success": True, "plan": new_plan, "user_id": user_id}

        # 3. Try as String 'id' field (legacy/external)
        result = await db.users.update_one({"id": user_id}, {"$set": update_doc})
        if result.matched_count > 0:
            logger.info(f"Updated user plan via String id: {user_id}")
            # --- SUPABASE SYNC ---
            await sync_user_to_supabase_by_any_id(user_id)
            return {"success": True, "plan": new_plan, "user_id": user_id}
        
        # If we reach here, no document matched
        return JSONResponse(status_code=404, content={"success": False, "detail": "User not found"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def sync_user_to_supabase_by_any_id(user_id: str):
    """Helper to find a user in MongoDB by any ID format and sync to Supabase"""
    try:
        from bson import ObjectId
        query = {"$or": [
            {"_id": user_id},
            {"id": user_id}
        ]}
        if len(str(user_id)) == 24:
            try:
                query["$or"].append({"_id": ObjectId(user_id)})
            except: pass
            
        user = await db.users.find_one(query)
        if user:
            SupabaseService.sync_user_profile(user)
            logger.info(f"Successfully synced user {user.get('email')} to Supabase")
    except Exception as e:
        logger.error(f"Failed to sync user {user_id} to Supabase: {e}")


@api_router.get("/call-bookings", response_model=List[CallBooking])
async def get_call_bookings():
    """
    Get all call bookings (admin use).
    """
    bookings = await db.call_bookings.find({}, {"_id": 0}).to_list(1000)

    for booking in bookings:
        if isinstance(booking.get("created_at"), str):
            booking["created_at"] = datetime.fromisoformat(booking["created_at"])

    return bookings


@api_router.patch("/call-bookings/{booking_id}")
async def update_call_booking_status(booking_id: str, status: str):
    """
    Update call booking status (admin use).
    """
    result = await db.call_bookings.update_one(
        {"id": booking_id}, {"$set": {"status": status}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")

    return {"message": "Booking status updated", "status": status}


# ============ RESUMES API ============


@api_router.get("/resumes")
async def get_resumes_query(email: str = Query(...)):
    """Aggregation endpoint for all user resumes using query param."""
    return await get_unified_resumes(email)


@api_router.post("/user/consent")
async def save_user_consent(request: dict):
    """
    Save user consent for marketing communications in Supabase
    """
    try:
        consent_data = {
            "email": request.get("email"),
            "consent_type": request.get("consent_type"),
            "consent_given": request.get("consent_given"),
            "consent_date": request.get("consent_date"),
        }

        if not consent_data["email"] or not consent_data["consent_type"]:
            raise HTTPException(status_code=400, detail="Missing email or consent_type")

        SupabaseService.save_user_consent(consent_data)

        return {"success": True, "message": "Consent saved successfully"}
    except Exception as e:
        logger.error(f"Save consent error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ FREE TOOLS AI ENDPOINTS ============


@api_router.post("/ai/salary-negotiation")
async def generate_salary_negotiation_script(request: dict):
    """Generate personalized salary negotiation script"""
    try:
        prompt = f"""Create a professional salary negotiation script for:
- Current offer: ${request.get('currentOffer')}
- Market rate/Target: ${request.get('marketRate')}
- Role: {request.get('role')}
- Years of experience: {request.get('yearsExperience', 'Not specified')}
- Unique value: {request.get('uniqueValue', 'Not specified')}

Generate a conversational script that:
1. Opens positively and expresses enthusiasm
2. Presents market research tactfully
3. Highlights unique value
4. Makes a specific ask
5. Ends professionally

Keep it natural and confident, not robotic."""

        from resume_analyzer import unified_api_call
        
        response = await unified_api_call(
            prompt,
            max_tokens=1000,
            model="llama-3.1-8b-instant"
        )

        if not response:
            raise HTTPException(status_code=500, detail="Failed to generate AI response")

        return {"script": response}
    except Exception as e:
        logger.error(f"Error generating salary script: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/ai/linkedin-headline")
async def generate_linkedin_headlines(request: dict):
    """Generate optimized LinkedIn headlines"""
    try:
        prompt = f"""Generate 10 optimized LinkedIn headlines based on:
- Current headline: {request.get('current_headline')}
- Target role: {request.get('target_role', 'Not specified')}

Each headline should:
1. Be under 220 characters
2. Include relevant keywords recruiters search for
3. Show value proposition, not just job title
4. Be professional yet engaging
5. Vary in style (some focus on skills, some on achievements, some on aspirations)

Return ONLY the 10 headlines, one per line, no numbering or extra text."""

        from resume_analyzer import unified_api_call
        
        response = await unified_api_call(
            prompt,
            max_tokens=1000,
            model="llama-3.1-8b-instant"
        )

        if not response:
            raise HTTPException(status_code=500, detail="Failed to generate AI response")

        headlines = response.strip().split("\n")
        headlines = [h.strip() for h in headlines if h.strip()]

        return {"headlines": headlines[:10]}
    except Exception as e:
        logger.error(f"Error generating headlines: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/ai/career-gap")
async def generate_career_gap_explanations(request: dict):
    """Generate professional career gap explanations"""
    try:
        prompt = f"""Create professional explanations for a career gap:
- Duration: {request.get('gapDuration')}
- Reason: {request.get('reason')}
- Activities during gap: {request.get('activities', 'Not specified')}

Generate TWO versions:

1. RESUME VERSION (1-2 sentences, concise, for resume experience section)
2. INTERVIEW VERSION (3-4 sentences, detailed but positive, for interview questions)

Both should:
- Be honest and professional
- Focus on growth/learning during the gap
- Show readiness to return to work
- Avoid defensive language
- Emphasize positive outcomes

Format:
RESUME:
[resume version]

INTERVIEW:
[interview version]"""

        from resume_analyzer import unified_api_call
        
        response = await unified_api_call(
            prompt,
            max_tokens=1000,
            model="llama-3.1-8b-instant"
        )

        if not response:
            raise HTTPException(status_code=500, detail="Failed to generate AI response")

        content = response
        parts = content.split("INTERVIEW:")
        resume_part = parts[0].replace("RESUME:", "").strip()
        interview_part = parts[1].strip() if len(parts) > 1 else ""

        return {"explanations": {"resume": resume_part, "interview": interview_part}}
    except Exception as e:
        logger.error(f"Error generating career gap explanation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/ai/job-decoder")
async def decode_job_description(request: dict):
    """Decode job description to reveal hidden meanings and red flags"""
    try:
        prompt = f"""Analyze this job description and decode what it really means:

{request.get('job_description')}

Provide analysis in these categories:

1. RED FLAGS (3-5 warning signs about company culture, expectations, or requirements)
2. TRANSLATIONS (5-7 common phrases and what they really mean, format: "phrase" → meaning)
3. HIDDEN REQUIREMENTS (3-5 skills/qualifications they expect but didn't explicitly list)
4. GREEN FLAGS (2-4 positive signs if any exist)
5. OVERALL ASSESSMENT (2-3 sentences: is this a good opportunity?)

Be honest and insightful. Help the candidate make an informed decision."""

        from resume_analyzer import unified_api_call
        
        response = await unified_api_call(
            prompt,
            max_tokens=2000,
            model="llama-3.1-8b-instant"
        )

        if not response:
            raise HTTPException(status_code=500, detail="Failed to generate AI response")

        content = response

        # Parse the response into structured data
        analysis = {
            "red_flags": [],
            "translations": [],
            "hidden_requirements": [],
            "green_flags": [],
            "overall_assessment": "",
        }

        # Simple parsing (you can make this more robust)
        sections = content.split("\n\n")
        current_section = None

        for section in sections:
            if "RED FLAG" in section.upper():
                current_section = "red_flags"
            elif "TRANSLATION" in section.upper():
                current_section = "translations"
            elif "HIDDEN REQUIREMENT" in section.upper():
                current_section = "hidden_requirements"
            elif "GREEN FLAG" in section.upper():
                current_section = "green_flags"
            elif "OVERALL" in section.upper() or "ASSESSMENT" in section.upper():
                current_section = "overall_assessment"
            elif current_section:
                lines = [
                    l.strip()
                    for l in section.split("\n")
                    if l.strip()
                    and not any(
                        x in l.upper()
                        for x in [
                            "RED FLAG",
                            "TRANSLATION",
                            "HIDDEN",
                            "GREEN",
                            "OVERALL",
                        ]
                    )
                ]

                if current_section == "overall_assessment":
                    analysis[current_section] = " ".join(lines)
                elif current_section == "translations":
                    for line in lines:
                        if "→" in line or "->" in line:
                            parts = line.split("→" if "→" in line else "->")
                            if len(parts) == 2:
                                analysis[current_section].append(
                                    {
                                        "phrase": parts[0]
                                        .strip()
                                        .strip('"')
                                        .strip("'")
                                        .strip("•")
                                        .strip("-")
                                        .strip(),
                                        "meaning": parts[1].strip(),
                                    }
                                )
                else:
                    for line in lines:
                        clean_line = line.strip("•").strip("-").strip("*").strip()
                        if clean_line:
                            analysis[current_section].append(clean_line)

        return {"analysis": analysis, "raw_content": content}
    except Exception as e:
        logger.error(f"Error decoding job description: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ CHROME EXTENSION ENDPOINTS ============

class MatchScoreRequest(BaseModel):
    job_title: str
    company: str
    description: str


@api_router.post("/jobs/match-score")
async def calculate_job_match_score(
    request: MatchScoreRequest,
    user: dict = Depends(get_current_user)
):
    """
    Calculate match score between user's resume and job description.
    Used by the LinkedIn extension to show match scores on job pages.
    """
    try:
        logger.info(f"Calculating match score for {user.get('email')}: {request.job_title} at {request.company}")
        
        # Get user's latest resume data
        user_profile = user.get("person", {})
        user_skills = user.get("skills", {})
        user_experience = user.get("employment_history", [])
        user_education = user.get("education", [])
        
        # Extract key skills and requirements from job description
        job_desc_lower = request.description.lower()
        
        # Common tech/job keywords to search for
        all_keywords = {
            "technical": ["python", "javascript", "java", "react", "node", "sql", "aws", "docker", "kubernetes", 
                         "machine learning", "ai", "data", "api", "frontend", "backend", "full stack", "devops",
                         "typescript", "angular", "vue", "mongodb", "postgresql", "redis", "jenkins", "git"],
            "soft": ["leadership", "communication", "teamwork", "agile", "scrum", "problem solving", 
                    "project management", "collaboration", "analytical"],
            "degree": ["bachelor", "master", "phd", "degree", "bs", "ms", "mba"],
            "experience": ["years", "experience", "senior", "junior", "lead", "principal", "staff"]
        }
        
        # Build user's keyword profile from their data
        user_keywords = set()
        
        # Add skills
        if isinstance(user_skills, dict):
            for skill_category in user_skills.values():
                if isinstance(skill_category, list):
                    user_keywords.update([s.lower() for s in skill_category])
                elif isinstance(skill_category, str):
                    user_keywords.update(skill_category.lower().split(", "))
        elif isinstance(user_skills, list):
            user_keywords.update([s.lower() for s in user_skills])
        
        # Add technologies from experience
        for exp in user_experience:
            if exp.get("description"):
                # Extract common tech words
                desc_lower = exp["description"].lower()
                for tech in all_keywords["technical"]:
                    if tech in desc_lower:
                        user_keywords.add(tech)
        
        # Check for degree
        has_degree = any(edu.get("degree") for edu in user_education)
        
        # Find matching keywords
        keywords_present = []
        keywords_missing = []
        
        # Check all keyword categories
        for category_keywords in all_keywords.values():
            for keyword in category_keywords:
                if keyword in job_desc_lower:
                    if keyword in user_keywords or (keyword in ["bachelor", "master", "degree"] and has_degree):
                        keywords_present.append(keyword)
                    else:
                        keywords_missing.append(keyword)
        
        # Calculate match score
        total_keywords = len(keywords_present) + len(keywords_missing)
        if total_keywords == 0:
            # Fallback: basic score based on years of experience
            user_years = len(user_experience)
            match_score = min(70, 40 + (user_years * 5))
            keywords_present = ["experience"]
            keywords_missing = []
            total_keywords = 8
        else:
            match_score = min(99, int((len(keywords_present) / max(total_keywords, 1)) * 100))
        
        # Generate recommendation
        if match_score >= 70:
            recommendation = "Great match! Your resume aligns well with this role."
        elif match_score >= 50:
            recommendation = "Good potential! Consider tailoring your resume to highlight relevant skills."
        else:
            recommendation = "This role may be a stretch. Focus on roles that better match your background."
        
        return {
            "match_score": match_score,
            "keywords_matched": len(keywords_present),
            "keywords_total": min(total_keywords, 8),  # Cap at 8 for display
            "keywords_present": keywords_present[:8],
            "keywords_missing": keywords_missing[:8],
            "recommendation": recommendation
        }
        
    except Exception as e:
        logger.error(f"Error calculating match score: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to calculate match score: {str(e)}")


# ============ CONTINUE WITH EXISTING ENDPOINTS ============


# ============ GOOGLE OAUTH AUTHENTICATION ============




# ============ BYOK (Bring Your Own Key) API ============


@api_router.post("/byok/test")
@limiter.limit("10/minute")
async def test_byok_key(request: Request, user: dict = Depends(get_current_user)):
    """
    Test a BYOK API key without saving it.
    Makes a minimal API call to verify the key works.
    """
    try:
        data = await request.json()
        provider = data.get("provider", "").lower()
        api_key = data.get("apiKey", "").strip()

        if not provider or not api_key:
            raise HTTPException(
                status_code=400, detail="Provider and apiKey are required"
            )

        if provider not in ["openai", "google", "anthropic"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid provider. Must be: openai, google, or anthropic",
            )

        # Basic format validation
        is_valid_format, format_msg = validate_api_key_format(provider, api_key)
        if not is_valid_format:
            raise HTTPException(status_code=400, detail=format_msg)

        # Test with actual provider API
        if provider == "openai":
            is_valid, message = await validate_openai_key(api_key)
        elif provider == "google":
            is_valid, message = await validate_google_key(api_key)
        elif provider == "anthropic":
            is_valid, message = await validate_anthropic_key(api_key)

        if not is_valid:
            raise HTTPException(status_code=400, detail=message)

        return {"success": True, "message": message}

    except HTTPException as e:
        logger.warning(f"HTTP error testing BYOK key: {e.detail}")
        raise
    except Exception as e:
        import traceback

        error_details = traceback.format_exc()
        logger.error(f"Critical error testing BYOK key: {str(e)}\n{error_details}")
        raise HTTPException(
            status_code=500, detail=f"Server error during testing: {str(e)}"
        )


@api_router.post("/byok/save")
@limiter.limit("5/minute")
async def save_byok_key(request: Request, user: dict = Depends(get_current_user)):
    """
    Save an encrypted BYOK API key for the user.
    Tests the key first, then encrypts and stores it.
    """
    try:
        data = await request.json()
        provider = data.get("provider", "").lower()
        api_key = data.get("apiKey", "").strip()

        if not provider or not api_key:
            raise HTTPException(
                status_code=400, detail="Provider and apiKey are required"
            )

        if provider not in ["openai", "google", "anthropic"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid provider. Must be: openai, google, or anthropic",
            )

        # Basic format validation
        is_valid_format, format_msg = validate_api_key_format(provider, api_key)
        if not is_valid_format:
            raise HTTPException(status_code=400, detail=format_msg)

        # Test with actual provider API
        if provider == "openai":
            is_valid, message = await validate_openai_key(api_key)
        elif provider == "google":
            is_valid, message = await validate_google_key(api_key)
        elif provider == "anthropic":
            is_valid, message = await validate_anthropic_key(api_key)

        if not is_valid:
            raise HTTPException(status_code=400, detail=message)

        # Encrypt the API key
        encrypted_data = encrypt_api_key(api_key)

        # Store in database
        byok_doc = {
            "user_id": user.get("email"),
            "provider": provider,
            "api_key_encrypted": encrypted_data["ciphertext"],
            "api_key_iv": encrypted_data["iv"],
            "api_key_tag": encrypted_data["tag"],
            "is_enabled": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_tested_at": datetime.utcnow(),
        }

        # Upsert (update if exists, insert if not)
        await db.byok_keys.update_one(
            {"user_id": user.get("email")}, {"$set": byok_doc}, upsert=True
        )

        # Update user's plan to free_byok
        await db.users.update_one(
            {"email": user.get("email")},
            {"$set": {"plan": "free_byok", "byok_enabled": True}},
        )

        logger.info(
            f"BYOK key saved for user: {user.get('email')} (provider: {provider})"
        )

        return {"success": True, "message": "API key saved successfully"}

    except HTTPException as e:
        logger.warning(f"HTTP error saving BYOK key: {e.detail}")
        raise
    except Exception as e:
        import traceback

        error_details = traceback.format_exc()
        logger.error(f"Critical error saving BYOK key: {str(e)}\n{error_details}")
        raise HTTPException(
            status_code=500, detail=f"Server error during save: {str(e)}"
        )


@api_router.get("/byok/status")
async def get_byok_status(user: dict = Depends(get_current_user)):
    """
    Get current BYOK configuration status for the user.
    Does NOT return the actual API key.
    """
    try:
        byok_config = await db.byok_keys.find_one(
            {"user_id": user.get("email")},
            {"_id": 0, "api_key_encrypted": 0, "api_key_iv": 0, "api_key_tag": 0},
        )

        if not byok_config:
            return {"configured": False, "provider": None, "is_enabled": False}

        return {
            "configured": True,
            "provider": byok_config.get("provider"),
            "is_enabled": byok_config.get("is_enabled", True),
            "last_tested_at": byok_config.get("last_tested_at"),
        }

    except Exception as e:
        logger.error(f"Error getting BYOK status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get BYOK status")


@api_router.delete("/byok/remove")
async def remove_byok_key(user: dict = Depends(get_current_user)):
    """
    Remove BYOK configuration for the user.
    """
    try:
        result = await db.byok_keys.delete_one({"user_id": user.get("email")})

        if result.deleted_count > 0:
            # Update user's plan back to free
            await db.users.update_one(
                {"email": user.get("email")},
                {"$set": {"plan": "free", "byok_enabled": False}},
            )

            logger.info(f"BYOK key removed for user: {user.get('email')}")
            return {"success": True, "message": "API key removed successfully"}
        else:
            return {"success": True, "message": "No API key was configured"}

    except Exception as e:
        logger.error(f"Error removing BYOK key: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to remove API key")


# ============ GOOGLE SHEETS INTEGRATION ============


@api_router.get("/sheets/applications/{user_email}")
async def get_user_applications(user_email: str):
    """
    Fetch applications for a specific user from Google Sheets.
    Employees update the Google Sheet, and this endpoint reads from it.
    """
    try:
        sheet_id = os.environ.get("GOOGLE_SHEET_ID")
        api_key = os.environ.get("GOOGLE_API_KEY")

        if not sheet_id or not api_key:
            logger.warning("Google Sheets not configured, returning empty list")
            return {
                "applications": [],
                "stats": {"total": 0, "this_week": 0, "interviews": 0},
            }

        # Fetch data from Google Sheets (A to H columns)
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/Sheet1!A2:H1000?key={api_key}"

        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status != 200:
                    logger.error(f"Google Sheets API error: {response.status}")
                    return {
                        "applications": [],
                        "stats": {"total": 0, "this_week": 0, "interviews": 0},
                    }

                data = await response.json()

        rows = data.get("values", [])

        # Filter applications for this user
        user_applications = []
        total_count = 0
        week_count = 0
        interview_count = 0

        from datetime import timedelta

        one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)

        for row in rows:
            if len(row) >= 6:
                customer_email = row[0].strip().lower()

                if customer_email == user_email.lower():
                    app = {
                        "company_name": row[1] if len(row) > 1 else "",
                        "job_title": row[2] if len(row) > 2 else "",
                        "status": row[3] if len(row) > 3 else "found",
                        "application_link": row[4] if len(row) > 4 else "",
                        "submitted_date": row[5] if len(row) > 5 else "",
                        "notes": row[6] if len(row) > 6 else "",
                        "job_description": row[7] if len(row) > 7 else "",
                    }
                    user_applications.append(app)
                    total_count += 1

                    # Count interviews
                    if app["status"].lower() == "interview":
                        interview_count += 1

                    # Count this week's applications
                    try:
                        submitted = datetime.strptime(app["submitted_date"], "%Y-%m-%d")
                        submitted = submitted.replace(tzinfo=timezone.utc)
                        if submitted >= one_week_ago:
                            week_count += 1
                    except:
                        pass

        return {
            "applications": user_applications,
            "stats": {
                "total": total_count,
                "this_week": week_count,
                "interviews": interview_count,
                "hours_saved": total_count
                * 0.5,  # Estimate 30 min saved per application
            },
        }

    except Exception as e:
        logger.error(f"Error fetching from Google Sheets: {str(e)}")
        return {
            "applications": [],
            "stats": {"total": 0, "this_week": 0, "interviews": 0},
        }


@api_router.get("/dashboard-stats/{user_email}")
async def get_dashboard_stats(user_email: str):
    """
    Get dashboard statistics for a user.
    """
    data = await get_user_applications(user_email)
    return data["stats"]


# ============ PAYMENT ENDPOINTS ============


@api_router.post("/create-checkout-session")
async def create_checkout(request: CheckoutRequest):
    """
    Create a Stripe Checkout session for subscription.
    This endpoint creates a payment page where users can pay with:
    - Credit/Debit cards
    - Apple Pay (if available)
    - Google Pay
    - Cash App Pay
    """
    try:
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")

        session_data = create_checkout_session(
            plan_id=request.plan_id,
            user_email=request.user_email,
            user_id=request.user_id,
            success_url=f"{frontend_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/payment/canceled",
        )

        return session_data

    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


async def grant_referral_bonus(user_id: str):
    """
    Find the user who referred this user and grant them a bonus.
    """
    user = await db.users.find_one({"id": user_id})
    if not user or not user.get("referred_by"):
        return

    referrer_code = user["referred_by"]
    referrer = await db.users.find_one({"referral_code": referrer_code})

    if referrer:
        # User gets 5 extra AI tailored applications for referral
        await db.users.update_one(
            {"id": referrer["id"]}, {"$inc": {"ai_applications_bonus": 5}}
        )
        logger.info(
            f"Granted 5 bonus apps to referrer {referrer['email']} for user {user['email']}"
        )


@api_router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request, stripe_signature: Optional[str] = Header(None)
):
    """
    Webhook endpoint for Stripe events.
    Handles subscription lifecycle events:
    - checkout.session.completed: Customer completed payment
    - customer.subscription.updated: Subscription status changed
    - customer.subscription.deleted: Subscription canceled
    - invoice.payment_failed: Payment failed
    """
    payload = await request.body()

    try:
        # Verify webhook signature
        event = verify_webhook_signature(payload, stripe_signature)

        # Log the event
        webhook_event = WebhookEvent(event_type=event["type"], event_data=event["data"])
        await db.webhook_events.insert_one(webhook_event.model_dump())

        # Handle different event types
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]

            # Extract subscription data
            subscription_data = SubscriptionData(
                user_id=session.get("client_reference_id"),
                user_email=session.get("customer_email"),
                plan_id=session["metadata"].get("plan_id"),
                stripe_customer_id=session.get("customer"),
                stripe_subscription_id=session.get("subscription"),
                stripe_price_id=(
                    session["line_items"]["data"][0]["price"]["id"]
                    if "line_items" in session
                    else ""
                ),
                status="active",
                current_period_end=datetime.fromtimestamp(session.get("expires_at", 0)),
            )

            # Save to database
            await db.subscriptions.insert_one(subscription_data.model_dump())
            logger.info(f"Subscription created for user {subscription_data.user_id}")

            # Grant referral bonus if applicable
            await grant_referral_bonus(subscription_data.user_id)

        elif event["type"] == "customer.subscription.updated":
            subscription = event["data"]["object"]

            # Update subscription status
            await db.subscriptions.update_one(
                {"stripe_subscription_id": subscription["id"]},
                {
                    "$set": {
                        "status": subscription["status"],
                        "current_period_end": datetime.fromtimestamp(
                            subscription["current_period_end"]
                        ),
                        "updated_at": datetime.utcnow(),
                    }
                },
            )
            logger.info(
                f"Subscription {subscription['id']} updated to {subscription['status']}"
            )

        elif event["type"] == "customer.subscription.deleted":
            subscription = event["data"]["object"]

            # Mark subscription as canceled
            await db.subscriptions.update_one(
                {"stripe_subscription_id": subscription["id"]},
                {"$set": {"status": "canceled", "updated_at": datetime.utcnow()}},
            )
            logger.info(f"Subscription {subscription['id']} canceled")

        elif event["type"] == "invoice.payment_failed":
            invoice = event["data"]["object"]

            # Update subscription to past_due
            await db.subscriptions.update_one(
                {"stripe_subscription_id": invoice["subscription"]},
                {"$set": {"status": "past_due", "updated_at": datetime.utcnow()}},
            )
            logger.warning(f"Payment failed for subscription {invoice['subscription']}")

        # Mark event as processed
        await db.webhook_events.update_one(
            {"id": webhook_event.id}, {"$set": {"processed": True}}
        )

        return JSONResponse(content={"status": "success"})

    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@api_router.post("/create-portal-session")
async def create_portal(user_id: str):
    """
    Create a Stripe Customer Portal session.
    Allows customers to manage their subscription:
    - Update payment method
    - View invoices
    - Cancel subscription
    """
    try:
        # Get customer's subscription
        subscription = await db.subscriptions.find_one({"user_id": user_id})

        if not subscription:
            raise HTTPException(status_code=404, detail="No subscription found")

        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")

        portal_data = create_customer_portal_session(
            customer_id=subscription["stripe_customer_id"],
            return_url=f"{frontend_url}/dashboard",
        )

        return portal_data

    except Exception as e:
        logger.error(f"Error creating portal session: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@api_router.get("/subscription/{user_id}")
async def get_subscription(user_id: str):
    """Get user's current subscription."""
    subscription = await db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})

    if not subscription:
        return {"status": "none", "message": "No active subscription"}

    return subscription


# ============ EMPLOYEE ENDPOINTS ============


class JobApplication(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_email: str
    employee_email: str
    company_name: str
    job_title: str
    job_url: str
    status: str = "found"  # found, prepared, submitted, interview, offer, rejected
    notes: Optional[str] = None
    job_description: Optional[str] = None
    submitted_date: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class JobApplicationCreate(BaseModel):
    customer_email: str
    company_name: str
    job_title: str
    job_url: str
    status: str = "found"
    notes: Optional[str] = None
    job_description: Optional[str] = None


class CustomerAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_email: str
    employee_email: str
    assigned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "active"  # active, paused, completed


@api_router.get("/employee/customers/{employee_email}")
async def get_assigned_customers(employee_email: str):
    """
    Get all customers assigned to an employee.
    """
    # Get assignments
    assignments = await db.customer_assignments.find(
        {"employee_email": employee_email, "status": "active"}, {"_id": 0}
    ).to_list(1000)

    customer_emails = [a["customer_email"] for a in assignments]

    # Get customer details
    customers = []
    for email in customer_emails:
        user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
        profile = await db.profiles.find_one({"email": email}, {"_id": 0})

        # Get application count for this customer
        app_count = await db.job_applications.count_documents({"customer_email": email})

        if user:
            customers.append(
                {"user": user, "profile": profile, "application_count": app_count}
            )

    return {"customers": customers, "count": len(customers)}


@api_router.get("/employee/customer/{customer_email}")
async def get_customer_details(customer_email: str):
    """
    Get detailed information about a specific customer.
    """
    user = await db.users.find_one(
        {"email": customer_email}, {"_id": 0, "password_hash": 0}
    )
    profile = await db.profiles.find_one({"email": customer_email}, {"_id": 0})

    # Get applications
    applications = (
        await db.job_applications.find({"customer_email": customer_email}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(1000)
    )

    # Get subscription
    subscription = await db.subscriptions.find_one(
        {"user_email": customer_email}, {"_id": 0}
    )

    return {
        "user": user,
        "profile": profile,
        "applications": applications,
        "subscription": subscription,
    }


@api_router.post("/employee/application")
async def add_job_application(input: JobApplicationCreate, employee_email: str = None):
    """
    Add a new job application for a customer.
    """
    app_dict = input.model_dump()
    app_dict["employee_email"] = employee_email or "system"
    app_dict["submitted_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    app_obj = JobApplication(**app_dict)

    doc = app_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()

    await db.job_applications.insert_one(doc)
    logger.info(
        f"New application added for {input.customer_email}: {input.company_name}"
    )

    return {"success": True, "application": doc}


@api_router.get("/employee/applications/{customer_email}")
async def get_customer_applications(customer_email: str):
    """
    Get all applications for a specific customer.
    """
    applications = (
        await db.job_applications.find({"customer_email": customer_email}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(1000)
    )

    # Calculate stats
    total = len(applications)
    interviews = sum(1 for app in applications if app.get("status") == "interview")
    submitted = sum(1 for app in applications if app.get("status") == "submitted")

    return {
        "applications": applications,
        "stats": {
            "total": total,
            "interviews": interviews,
            "submitted": submitted,
            "hours_saved": total * 0.5,
        },
    }


@api_router.patch("/employee/application/{application_id}")
async def update_application(
    application_id: str, status: str, notes: Optional[str] = None
):
    """
    Update application status and notes.
    """
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if notes:
        update_data["notes"] = notes

    result = await db.job_applications.update_one(
        {"id": application_id}, {"$set": update_data}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")

    return {"success": True, "message": "Application updated"}


@api_router.delete("/employee/application/{application_id}")
async def delete_application(application_id: str):
    """
    Delete a job application.
    """
    result = await db.job_applications.delete_one({"id": application_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")

    return {"success": True, "message": "Application deleted"}


# ============ ADMIN ENDPOINTS ============


@api_router.get("/admin/stats")
async def get_admin_stats():
    """
    Get system-wide statistics.
    """
    total_users = await db.users.count_documents({})
    total_customers = await db.users.count_documents({"role": "customer"})
    total_employees = await db.users.count_documents({"role": "employee"})
    total_applications = await db.job_applications.count_documents({})
    total_bookings = await db.call_bookings.count_documents({})
    pending_bookings = await db.call_bookings.count_documents({"status": "pending"})
    waitlist_count = await db.waitlist.count_documents({})

    # Active subscriptions
    active_subscriptions = await db.subscriptions.count_documents({"status": "active"})

    return {
        "users": {
            "total": total_users,
            "customers": total_customers,
            "employees": total_employees,
        },
        "applications": {"total": total_applications},
        "bookings": {"total": total_bookings, "pending": pending_bookings},
        "waitlist": waitlist_count,
        "subscriptions": {"active": active_subscriptions},
    }


@api_router.get("/admin/customers")
async def get_all_customers():
    """
    Get all customers with their profiles and stats.
    """
    users = await db.users.find(
        {"role": "customer"}, {"_id": 0, "password_hash": 0}
    ).to_list(1000)

    customers = []
    for user in users:
        profile = await db.profiles.find_one({"email": user["email"]}, {"_id": 0})
        app_count = await db.job_applications.count_documents(
            {"customer_email": user["email"]}
        )
        subscription = await db.subscriptions.find_one(
            {"user_email": user["email"]}, {"_id": 0}
        )
        assignment = await db.customer_assignments.find_one(
            {"customer_email": user["email"], "status": "active"}, {"_id": 0}
        )

        customers.append(
            {
                "user": user,
                "profile": profile,
                "application_count": app_count,
                "subscription": subscription,
                "assigned_employee": (
                    assignment["employee_email"] if assignment else None
                ),
            }
        )

    return {"customers": customers, "count": len(customers)}


@api_router.get("/admin/employees")
async def get_all_employees():
    """
    Get all employees with their assigned customer counts.
    """
    users = await db.users.find(
        {"role": "employee"}, {"_id": 0, "password_hash": 0}
    ).to_list(1000)

    employees = []
    for user in users:
        customer_count = await db.customer_assignments.count_documents(
            {"employee_email": user["email"], "status": "active"}
        )
        total_applications = await db.job_applications.count_documents(
            {"employee_email": user["email"]}
        )

        employees.append(
            {
                "user": user,
                "customer_count": customer_count,
                "total_applications": total_applications,
            }
        )

    return {"employees": employees, "count": len(employees)}


@api_router.post("/admin/assign-customer")
async def assign_customer_to_employee(customer_email: str, employee_email: str):
    """
    Assign a customer to an employee.
    """
    # Check if already assigned
    existing = await db.customer_assignments.find_one(
        {"customer_email": customer_email, "status": "active"}
    )

    if existing:
        # Update assignment
        await db.customer_assignments.update_one(
            {"id": existing["id"]}, {"$set": {"employee_email": employee_email}}
        )
        return {"success": True, "message": "Customer reassigned"}

    # Create new assignment
    assignment = CustomerAssignment(
        customer_email=customer_email, employee_email=employee_email
    )

    doc = assignment.model_dump()
    doc["assigned_at"] = doc["assigned_at"].isoformat()

    await db.customer_assignments.insert_one(doc)
    logger.info(f"Customer {customer_email} assigned to {employee_email}")

    return {"success": True, "message": "Customer assigned"}


@api_router.patch("/admin/user/{user_id}/role")
async def update_user_role(user_id: str, role: str):
    """
    Update a user's role (customer, employee, admin).
    """
    if role not in ["customer", "employee", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"success": True, "message": f"User role updated to {role}"}


@api_router.get("/admin/bookings")
async def get_all_bookings():
    """
    Get all call bookings with stats.
    """
    bookings = (
        await db.call_bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    )

    # Convert datetime strings
    for booking in bookings:
        if isinstance(booking.get("created_at"), str):
            booking["created_at"] = datetime.fromisoformat(booking["created_at"])

    pending = sum(1 for b in bookings if b.get("status") == "pending")
    contacted = sum(1 for b in bookings if b.get("status") == "contacted")

    return {
        "bookings": bookings,
        "stats": {"total": len(bookings), "pending": pending, "contacted": contacted},
    }


# ============ AI NINJA ENDPOINTS ============


class ApplicationCreate(BaseModel):
    """Application model for AI Ninja and Human Ninja applications."""

    userId: str
    jobId: Optional[str] = None
    jobTitle: str
    company: str
    location: Optional[str] = None
    workType: Optional[str] = None  # remote, hybrid, onsite
    tags: Optional[List[str]] = []
    emailUsed: Optional[str] = None
    jobDescription: Optional[str] = None
    yearsOfExperience: Optional[str] = None
    primarySkills: Optional[str] = None
    visaStatus: Optional[str] = None
    targetSalary: Optional[str] = None
    preferredWorkType: Optional[str] = None


class Application(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    userEmail: Optional[str] = None
    jobId: Optional[str] = None
    jobTitle: str
    company: str
    location: Optional[str] = None
    workType: Optional[str] = None
    tags: List[str] = []
    emailUsed: Optional[str] = None
    resumeId: Optional[str] = None
    resumeText: Optional[str] = None
    coverLetterId: Optional[str] = None
    coverLetterText: Optional[str] = None
    matchScore: Optional[float] = None
    applicationLink: Optional[str] = None
    sourceUrl: Optional[str] = None
    appliedAt: Optional[str] = None
    status: str = "applied"  # applied, interview, rejected, offer, on_hold
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Resume(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    resumeName: str
    resumeHtml: str
    resumeJson: Optional[dict] = None
    jobTitle: str
    companyName: str
    jobDescription: Optional[str] = None
    jobUrl: Optional[str] = None
    isSystemGenerated: bool = True
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ResumeUsage(BaseModel):
    tier: str
    currentCount: int
    limit: Union[int, str]  # int or "Unlimited"
    canGenerate: bool
    resetDate: Optional[datetime] = None
    totalResumes: int


async def get_user_usage_limits(identifier: str) -> dict:
    """
    Calculate user's resume usage limits based on their plan and billing cycle using Supabase.
    Supports either email or userId as identifier.
    """
    if not identifier:
        return {
            "tier": "free",
            "currentCount": 0,
            "limit": 5,
            "canGenerate": False,
            "resetDate": None,
            "totalResumes": 0,
        }

    # Try finding user in Supabase
    user = SupabaseService.get_user_by_email(identifier)
    if not user:
        # Check if identifier is ID
        user = SupabaseService.get_user_by_id(identifier)

    if not user:
        return {
            "tier": "free",
            "currentCount": 0,
            "limit": 5,
            "canGenerate": True,
            "resetDate": None,
            "totalResumes": 0,
        }

    # Get all-time resume count from Supabase
    user_id = user.get("id")
    total_resumes = SupabaseService.count_saved_resumes(user_id)

    # Determine tier
    tier = user.get("plan", "free")
    if not tier:
        tier = "free"

    sub = user.get("subscription", {})
    if sub and sub.get("status") == "active":
        tier_id = sub.get("plan_id", tier)
        if any(keyword in tier_id.lower() for keyword in ["pro", "monthly", "quarterly", "weekly"]):
            tier = "pro"
        elif "beginner" in tier_id.lower():
            tier = "beginner"

    # Get daily usage from Supabase
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    daily_usage = SupabaseService.check_daily_usage(user.get("email"), today)
    current_daily_apps = daily_usage.get("apps", 0)

    limit = 10  # Default for free
    current_count = current_daily_apps
    can_generate = False
    reset_date = None

    tier_lower = str(tier).strip().lower()

    if tier_lower in ["pro", "unlimited", "ai-pro", "ai-monthly", "ai-quarterly", "ai-weekly", "human-starter", "human-growth", "human-scale"]:
        limit = "Unlimited"
        can_generate = True
    elif tier_lower == "beginner" or tier_lower == "standard" or tier_lower == "ai-beginner":
        limit = 200
        # Calculate monthly count for beginner tier
        activated_at = sub.get("activated_at") if sub else None
        if activated_at:
            if isinstance(activated_at, str):
                activated_at = datetime.fromisoformat(activated_at.replace("Z", "+00:00"))

            now = datetime.now(timezone.utc)
            months_diff = (now.year - activated_at.year) * 12 + now.month - activated_at.month
            if now.day < activated_at.day:
                months_diff -= 1

            from dateutil.relativedelta import relativedelta

            cycle_start = activated_at + relativedelta(months=months_diff)
            cycle_end = cycle_start + relativedelta(months=1)
            reset_date = cycle_end

            # Count resumes in current cycle from Supabase
            current_count = SupabaseService.count_saved_resumes(user_id, cycle_start.isoformat())
            can_generate = current_count < limit
        else:
            can_generate = current_daily_apps < 10 # Fallback
    elif tier_lower == "free_byok" or user.get("byok_enabled"):
        # Check if they actually have a key configured
        has_key = await db.byok_keys.find_one({"user_id": user.get("email"), "is_enabled": True})
        
        if has_key:
            limit = "Unlimited (BYOK)"
            can_generate = True
        else:
            # No key configured? Fall back to Free limits
            limit = 10
            autofills_limit = 5
            current_count = current_daily_apps
            can_generate = current_count < limit
    else:  # free or ai-free
        limit = 10
        autofills_limit = 5
        current_count = current_daily_apps
        can_generate = current_count < limit

    return {
        "limit": limit,
        "usage": current_count,
        "autofillsLimit": autofills_limit,
        "autofillsUsage": current_daily_autofills,
        "canGenerate": can_generate,
        "resetDate": reset_date,
        "totalResumes": total_resumes,
        "byokEnabled": user.get("byok_enabled", False),
    }


async def get_decrypted_byok_key(user_email: str):
    """Retrieve and decrypt a user's BYOK key if available"""
    try:
        byok_config = await db.byok_keys.find_one({"user_id": user_email})
        if not byok_config or not byok_config.get("is_enabled", True):
            return None

        decrypted_key = decrypt_api_key(
            byok_config["api_key_encrypted"],
            byok_config["api_key_iv"],
            byok_config["api_key_tag"],
        )
        return {"provider": byok_config["provider"], "api_key": decrypted_key}
    except Exception as e:
        logger.error(f"Error decrypting BYOK key for {user_email}: {e}")
        return None


@api_router.get("/usage/limits")
async def get_usage_limits(email: str = Query(...)):
    """
    Get current user's resume usage limits.
    """
    try:
        usage = await get_user_usage_limits(email)
        return usage
    except Exception as e:
        logger.error(f"Error getting usage limits: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# REDUNDANT ENDPOINT REMOVED (See line 6366)
# @api_router.get("/jobs")
# async def get_jobs(...):


@api_router.post("/fetch-job-description")
async def fetch_job_desc(request: JobUrlFetchRequest, user: dict = Depends(get_current_user)):
    """
    Fetch and extract job description from a URL.
    Requires authentication to prevent abuse.
    """
    try:
        url = request.url.strip()
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")

        # Usage tracking using authenticated user
        usage = await get_user_usage_limits(user["email"])
        
        can_autofill = await check_and_increment_daily_usage(
            user["email"], 
            "autofills", 
            usage.get("autofillsLimit", 5)
        )
        if not can_autofill:
             return {
                 "success": False, 
                 "error": f"Daily auto-fill limit reached ({usage.get('autofillsLimit')} per day). Please upgrade to continue or wait until tomorrow."
             }

        logger.info(f"Fetching job description for URL: {url} (User: {user['email']})")
        result = await scrape_job_description(url)
        return result
    except NameError as ne:
        # Catch specific NameError
        logger.error(f"NameError in fetch_job_desc: {ne}")
        if "user" in str(ne):
             logger.error("Caught 'user' NameError. Suppressing...")
             raise HTTPException(status_code=500, detail=f"Server Configuration Error: {str(ne)}")
        raise
    except Exception as e:
        error_details = traceback.format_exc()
        logger.error(f"Error in fetch_job_desc: {e}\n{error_details}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/resumes/legacy")
async def get_resumes_legacy(email: str = Query(...)):
    """Legacy endpoint redirecting to unified logic."""
    return await get_unified_resumes(email)


@api_router.post("/ai-ninja/apply")
async def ai_ninja_apply(request: Request, user: dict = Depends(get_current_user)):
    """
    AI Ninja apply endpoint - generates tailored resume, cover letter, and Q&A using Supabase.
    """
    try:
        form = await request.form()
        userId = user.get("id")
        
        ensure_verified(user)
        
        # Check usage limits against Supabase
        usage = await get_user_usage_limits(user["email"])
        if not usage["canGenerate"]:
            raise HTTPException(
                status_code=403,
                detail=f"Usage limit reached ({usage['limit']} applications per day). Please upgrade to continue.",
            )
            
        # Increment usage in Supabase
        await check_and_increment_daily_usage(user["email"], "apps", usage["limit"])

        jobId = form.get("jobId", "")
        jobTitle = form.get("jobTitle", "")
        company = form.get("company", "")
        if not company:
            raise HTTPException(status_code=400, detail="Company name is required")

        jobDescription = form.get("jobDescription", "")
        
        # ... (rest of tailoring logic remains the same) ...
        resumeText = form.get("resumeText", "")
        resumeFile = form.get("resume")
        if resumeFile and not isinstance(resumeFile, str):
            file_content = await resumeFile.read()
            resumeText = await parse_resume(file_content, resumeFile.filename)
            
        # PROACTIVE PROFILE SYNC -> Now using Supabase (Project Orion Boost)
        try:
            profile_email = user.get("email")
            
            # Sync if target_role or resume_text is missing
            if not user.get("target_role") or not user.get("resume_text"):
                from resume_analyzer import extract_resume_data
                byok_config = await get_decrypted_byok_key(profile_email)
                extracted_data = await extract_resume_data(resumeText, byok_config=byok_config)
                
                if extracted_data and not extracted_data.get("error"):
                    update_fields = {}
                    
                    # Update Name if missing
                    new_name = extracted_data.get("person", {}).get("fullName")
                    if new_name and new_name != "Your Name" and (not user.get("name") or user.get("name") == "New User"):
                        update_fields["name"] = new_name

                    # Update Target Role (Crucial for Recommendations)
                    extracted_role = extracted_data.get("preferences", {}).get("target_role")
                    if extracted_role and not user.get("target_role"):
                        update_fields["target_role"] = extracted_role
                        logger.info(f"Updated target_role for {profile_email}: {extracted_role}")

                    # Update Resume Text
                    if not user.get("resume_text"):
                        update_fields["resume_text"] = resumeText
                    
                    if update_fields:
                        SupabaseService.update_user_profile(userId, update_fields)
        except Exception as profile_err:
            logger.error(f"Failed to proactive sync profile in ai_ninja_apply: {profile_err}")

        # Tailoring logic
        expert_docs = await generate_expert_documents(
            resumeText, jobDescription, user_info=user, byok_config=None
        )
        
        tailoredResume = expert_docs.get("ats_resume", "")
        detailedCv = expert_docs.get("detailed_cv", "")
        tailoredCoverLetter = expert_docs.get("cover_letter", "")

        # Save resume to Record Library in Supabase
        resume_id = str(uuid.uuid4())
        resume_doc = {
            "id": resume_id,
            "user_id": userId,
            "resume_name": f"AI Tailored: {company}",
            "job_title": jobTitle,
            "company_name": company,
            "resume_text": tailoredResume,
            "is_system_generated": True,
            "origin": "ai-ninja",
            "applied_at": datetime.now(timezone.utc).isoformat(),
        }

        SupabaseService.create_saved_resume(resume_doc)

        # Save application to Supabase
        app_doc = {
            "user_id": userId,
            "job_id": jobId if jobId and len(jobId) > 30 else None,
            "status": "applied",
            "resume_id": resume_id,
            "platform": company, # simplified
            "applied_at": datetime.now(timezone.utc).isoformat()
        }

        SupabaseService.create_application(app_doc)

        return {
            "applicationId": applicationId,
            "resumeId": resume_id,
            "tailoredResume": tailoredResume,
            "detailedCv": detailedCv,
            "tailoredCoverLetter": tailoredCoverLetter,
            "suggestedAnswers": [], # Simplified for now
            "usage": await get_user_usage_limits(user["email"]),
        }
    except Exception as e:
        logger.error(f"Error in AI Ninja apply: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/applications/{user_id_or_email}")
async def get_user_applications(user_id_or_email: str):
    """
    Get all applications for a user (both AI Ninja and Human Ninja) from Supabase.
    Supports either UUID or email as user_id_or_email.
    """
    try:
        user_email = user_id_or_email if "@" in user_id_or_email else None
        
        # Determine user_id if email provided
        user_id = None
        if not user_email:
            user_id = user_id_or_email
        else:
            profile = SupabaseService.get_user_by_email(user_email)
            if profile:
                user_id = profile["id"]
        
        if not user_id and not user_email:
            raise HTTPException(status_code=404, detail="User not found")

        applications = SupabaseService.get_applications(user_id=user_id, user_email=user_email)

        return {
            "success": True,
            "applications": applications, 
            "total": len(applications),
            "stats": {
                "total": len(applications),
                "applied": len([a for a in applications if a.get("status") == "applied"]),
                "interviewing": len([a for a in applications if a.get("status") in ["interview", "interviewing"]])
            }
        }
    except Exception as e:
        logger.error(f"Error fetching applications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.patch("/applications/{application_id}/status")
async def update_application_status(application_id: str, status: str):
    """
    Update application status in Supabase.
    """
    valid_statuses = ["applied", "interview", "rejected", "offer", "on_hold"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}"
        )

    success = SupabaseService.update_application(application_id, {"status": status})

    if not success:
        raise HTTPException(status_code=404, detail="Application not found or update failed")

    return {"success": True, "status": status}


# Router is included at the end of the file after all routes are registered

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",  # Vite default
        "https://jobninjas.org",
        "https://www.jobninjas.org",
        "https://jobninjas.ai",
        "https://www.jobninjas.ai",
        "https://novaninjas.com",
        "https://www.novaninjas.com",
        "https://novaninjas.vercel.app",
        "https://nova-ninjas-production.up.railway.app",  # Production backend URL as origin if needed
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# ============================================
# JOB BOARD API ENDPOINTS
# ============================================

# ============================================
# PROJECT ORION: JOB BOARD HELPERS
# ============================================

async def _get_enriched_user_context(user: dict, db=None) -> dict:
    """
    Unified helper to enrich user object with role and resume text 
    using Supabase.
    """
    if not user:
        return None
        
    user_email = user.get("email")
    user_id = str(user.get("id") or user.get("_id"))
    
    # 1. Check if already enriched in user object (from profiles table)
    target_role = (user.get("preferences") or {}).get("target_role")
    resume_text = user.get("resume_text") or user.get("resumeText")
    
    # 2. If missing, look in profiles table specifically
    if not target_role or not resume_text:
        profile = SupabaseService.get_user_by_email(user_email)
        if profile:
            if not target_role:
                target_role = profile.get("target_role") or profile.get("jobTitle")
            if not resume_text:
                resume_text = profile.get("resume_text") or profile.get("resumeText")

    # 3. Check saved_resumes table
    if not target_role or not resume_text:
        saved_resumes = SupabaseService.get_saved_resumes(user_id)
        for res_doc in saved_resumes:
            found_role = res_doc.get("jobTitle") or res_doc.get("target_role") or res_doc.get("role")
            found_text = res_doc.get("resumeText") or res_doc.get("textContent") or res_doc.get("text_content") or res_doc.get("text")
            if found_role and not target_role: target_role = found_role
            if found_text and not resume_text: resume_text = found_text
            if target_role and resume_text: break

    # 4. Fallback Extraction from text
    if not target_role and resume_text:
         target_role = _extract_target_role(resume_text)
    
    # 5. Final mapping
    if target_role:
        if "preferences" not in user: user["preferences"] = {}
        user["preferences"]["target_role"] = target_role
    
    if resume_text:
        user["resume_text"] = resume_text
        
    return user

def _extract_target_role(resume_text: str) -> str:
    """
    Enhanced heuristic to extract target role from resume text.
    Checks for bold titles, summaries, and common job titles.
    """
    if not resume_text:
        return ""
    
    # Clean text
    import re
    lines = [l.strip() for l in resume_text.split('\n') if l.strip()]
    if not lines:
        return ""
        
    # Heuristic 1: Look for explicit target headers
    for i, line in enumerate(lines[:15]):
        ln = line.lower()
        if any(h in ln for h in ["target role", "objective", "professional summary", "about me"]):
            if i + 1 < len(lines):
                potential = lines[i+1].strip()
                if 5 < len(potential) < 40 and not any(x in potential.lower() for x in ["experience", "years", "seeking"]):
                    return potential
                    
    # Heuristic 4: Just return the first meaningful line if it's reasonably short
    for line in lines[:3]:
        if 3 <= len(line) < 60 and not any(x in line.lower() for x in ["http", "@", "address", "phone"]):
             return line

    return lines[0][:50] if lines else ""

def _calculate_match_score(job: dict, user: dict) -> int:
    """
    Calculate a realistic match score (0-99) based on user profile/resume and job description.
    Stricter logic to prevent high scores for irrelevant roles (e.g., Dentist vs AI Engineer).
    """
    if not user:
        # Default for non-logged in users: return 0 or very low to encourage login
        return 0

    try:
        # 1. Get Text Sources
        job_title = (job.get("title") or "").lower()
        job_desc = (job.get("description") or "").lower()
        job_text = f"{job_title} {job_desc}"
        
        user_text = ""
        user_title = ""
        
        # Extract from profile precisely if available
        if user.get("preferences") and user["preferences"].get("target_role"):
            user_title = user["preferences"]["target_role"].lower()
            
        # Priority: Resume Text > Skills > Summary
        if user.get("latest_resume") and user["latest_resume"].get("text_content"):
             user_text = user["latest_resume"]["text_content"]
        elif user.get("resume_text"):
             user_text = user["resume_text"]
        elif user.get("skills"):
             user_text = " ".join(user["skills"]) if isinstance(user["skills"], list) else str(user["skills"])
        
        user_text = user_text.lower()
        
        # 2. Strict Role Match Check
        import re
        job_words = set(re.findall(r'\b\w{2,}\b', job_title))
        user_words = set(re.findall(r'\b\w{2,}\b', user_title)) if user_title else set()
        
        if not user_words and user_text:
            extracted_title = _extract_target_role(user_text).lower()
            user_words = set(re.findall(r'\b\w{2,}\b', extracted_title))

        title_match = False
        if user_words and job_words:
            overlap = job_words.intersection(user_words)
            if overlap:
                title_match = True
        
        # 3. Keyword Matching Score
        keyword_score = 0
        if user_text:
            job_tokens = set(re.findall(r'\b\w{2,}\b', job_text))
            user_tokens = set(re.findall(r'\b\w{2,}\b', user_text))
            
            if job_tokens:
                common = job_tokens.intersection(user_tokens)
                # Denom scaling: don't let short descriptions artificially boost scores
                denom = max(20, min(len(job_tokens), 60)) 
                overlap_ratio = len(common) / denom
                keyword_score = int(overlap_ratio * 100)
        
        # ---------------------------------------------------------
        # 4. Final Aggregation (Project Orion V3 - Boosted)
        # ---------------------------------------------------------
        # Baseline for ANY authenticated user to avoid "dead" scores
        # User wants 24-30% minimum for any job.
        base_score = 26 
        
        if title_match:
            # Direct match (e.g. AI Engineer for AI Engineer) -> floor 85%
            # This satisfies user's request for >85% on relevant roles
            # Scaled slightly based on keywords for variance (85-99%)
            final_score = 85 + min(int(keyword_score * 0.15), 14)
        else:
            # Poor role match: Scale from 26% to 45%
            # High enough to be "useful" but low enough to prioritize role matches
            final_score = base_score + min(keyword_score, 19)
            
            # Field penalty
            if not any(word in job_text for word in ["engineer", "developer", "software", "analyst", "data", "ai", "tech", "it", "code"]):
                 if any(word in job_text for word in ["dentist", "doctor", "nurse", "medical"]):
                      final_score = min(final_score, 15)

        return min(99, max(base_score if title_match else 20, final_score))
        
    except Exception as e:
        # Fallback
        return 72

def _get_mock_company_data(company_name: str) -> dict:
    """Generate mock premium insights for a company"""
    import random
    
    funding_stages = ["Series A", "Series B", "Series C", "IPO", "Public Company", "Private Equity"]
    investors = ["Sequoia", "a16z", "Benchmark", "Lightspeed", "Index Ventures", "Y Combinator"]
    
    return {
        "stage": random.choice(funding_stages),
        "totalFunding": f"${random.randint(10, 500)}M",
        "investors": random.sample(investors, k=random.randint(1, 3)),
        "news": [
            {
                "title": f"{company_name} announces new AI initiative",
                "date": (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d"),
                "source": "TechCrunch"
            },
            {
                "title": f"Why {company_name} is hiring aggressively in 2026",
                "date": (datetime.now() - timedelta(days=random.randint(5, 60))).strftime("%Y-%m-%d"),
                "source": "Bloomberg"
            }
        ]
    }

def _get_mock_insider_connections() -> list:
    """Generate mock insider connections"""
    import random
    names = ["Alex Chen", "Sarah Jones", "Mike Ross", "Emily White", "David Kim"]
    roles = ["Senior Engineer", "Product Manager", "Recruiter", "Data Scientist", "VP of Engineering"]
    
    count = random.randint(0, 3)
    connections = []
    
    for _ in range(count):
        connections.append({
            "name": random.choice(names),
            "role": random.choice(roles),
            "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={random.randint(1, 1000)}"
        })
        
    return connections

# REDUNDANT ENDPOINT REMOVED (See line 6366)
# @app.get("/api/jobs")
# async def get_jobs(...):


# OLD ENDPOINT REPLACED ABOVE
# @app.get("/api/jobs")


@app.get("/api/jobs/{job_id}")
async def get_job_by_id(
    job_id: str,
    token: Optional[str] = Header(None, alias="token")
):
    """
    Get a single job by ID (supports MongoDB _id or externalId)
    """
    try:
        from bson import ObjectId

        job = None

        # Try to find by MongoDB ObjectId first
        try:
            job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        except Exception:
            pass  # Invalid ObjectId format, try externalId

        # If not found, try by externalId
        if not job:
            job = await db.jobs.find_one({"externalId": job_id})

        # Also try by string id
        if not job:
            job = await db.jobs.find_one({"id": job_id})

        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # Project Orion: Add Match Score
        user = None
        if token:
            try:
                if not token.startswith("token_"):
                     payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                     email = payload.get("sub")
                     if email:
                         user = await db.users.find_one({"email": email})
                         if user:
                             user = await _get_enriched_user_context(user, db)
            except:
                pass

        if "_id" in job: job["id"] = str(job.pop("_id"))
        
        job["matchScore"] = _calculate_match_score(job, user)

        return {"success": True, "job": job}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching job: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch job")


@app.post("/api/jobs/{job_id}/enrich")
async def enrich_job_details(job_id: str):
    """
    Enrich a job with full description by scraping the source URL.
    """
    try:
        from bson import ObjectId
        
        # 1. Find the job
        job = None
        try:
            job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        except:
            pass
            
        if not job:
            job = await db.jobs.find_one({"externalId": job_id})
            
        if not job:
            job = await db.jobs.find_one({"id": job_id})
            
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
            
        # 2. Extract source URL
        source_url = job.get("sourceUrl") or job.get("url") or job.get("redirect_url")
        if not source_url:
            return {"success": False, "error": "No source URL available for enrichment"}
            
        # 3. Scrape full description
        logger.info(f"Enriching job {job_id} from {source_url}")
        re_result = await scrape_job_description(source_url)
        
        if not re_result or not re_result.get("success"):
            error_msg = re_result.get("error", "Failed to extract details")
            logger.warning(f"Enrichment failed for {job_id}: {error_msg}")
            return {"success": False, "error": error_msg}
            
        # 4. Update the job in database
        update_data = {
            "fullDescription": re_result.get("description"),
            "description": re_result.get("description")[:1000], # Keep a snippet
            "updatedAt": datetime.now(timezone.utc)
        }
        
        # Also update title/company if they were missing or "Unknown"
        if job.get("company") == "Unknown Company" and re_result.get("company"):
            update_data["company"] = re_result.get("company")
            
        await db.jobs.update_one({"_id": job["_id"]}, {"$set": update_data})
        
        return {
            "success": True, 
            "message": "Job enriched successfully",
            "description": re_result.get("description")
        }
        
    except Exception as e:
        logger.error(f"Error enriching job {job_id}: {e}")
        return {"success": False, "error": str(e)}


@app.get("/api/jobs/stats/summary")
async def get_jobs_stats():
    """
    Get job board statistics
    """
    try:
        # Use impressive marketing numbers as requested
        total_jobs = 5248192  # 5M+ jobs
        daily_new = 10452  # 10k+ daily
        visa_jobs = 142381
        remote_jobs = 824190
        high_pay_jobs = 245190

        return {
            "success": True,
            "stats": {
                "totalJobs": total_jobs,
                "dailyNew": daily_new,
                "visaJobs": visa_jobs,
                "remoteJobs": remote_jobs,
                "highPayJobs": high_pay_jobs,
            },
        }

    except Exception as e:
        logger.error(f"Error fetching job stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch job stats")


@app.post("/api/debug/force-sync")
async def force_sync(background_tasks: BackgroundTasks):
    """Trigger partial sync immediately."""
    try:
        from job_sync_service import JobSyncService
        service = JobSyncService(app.mongodb)
        background_tasks.add_task(service.sync_adzuna_jobs)
        return {"status": "started", "message": "Adzuna sync triggered in background"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/debug/adzuna-check")
async def debug_adzuna_check():
    """Directly test Adzuna API connectivity."""
    try:
        app_id = os.getenv("ADZUNA_APP_ID", "").strip()
        app_key = os.getenv("ADZUNA_APP_KEY", "").strip()
        
        if not app_id or not app_key:
            return {"status": "error", "message": "Missing API Keys", "app_id": str(app_id)[:2] + "***"}
            
        async with aiohttp.ClientSession() as session:
            url = f"https://api.adzuna.com/v1/api/jobs/us/search/1"
            params = {
                "app_id": app_id,
                "app_key": app_key,
                "results_per_page": 1,
                "what": "developer"
            }
            async with session.get(url, params=params) as resp:
                data = await resp.json()
                return {
                    "status": resp.status,
                    "url": str(resp.url).replace(app_key, "***"),
                    "results_count": len(data.get("results", [])),
                    "first_result": data.get("results")[0] if data.get("results") else None
                }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/debug/jobs")
async def debug_jobs():
    """Returns raw DB stats to verify data presence."""
    try:
        total = await db.jobs.count_documents({})
        recent = await db.jobs.count_documents({"created_at": {"$gte": datetime.utcnow() - timedelta(hours=72)}})
        us = await db.jobs.count_documents({"country": "us"})
        sample = await db.jobs.find_one({})
        if sample and "_id" in sample: sample["_id"] = str(sample["_id"])
        
        return {
            "status": "online",
            "time": datetime.utcnow(),
            "total_jobs": total,
            "jobs_last_72h": recent,
            "us_jobs": us,
            "sample_job": sample
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/debug/supabase")
async def debug_supabase():
    """Tests Supabase network connectivity and query syntax directly."""
    try:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            return {"error": "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY variables"}
            
        client = SupabaseService.get_client()
        if not client:
            return {"error": "Failed to create Supabase client"}
            
        # Try a simple count
        query_response = client.table("jobs").select("*", count="exact").limit(0).execute()
        return {
            "status": "success",
            "count": query_response.count if query_response.count is not None else 0,
            "url_prefix": url[:15] + "..."
        }
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "type": str(type(e)),
            "traceback": traceback.format_exc()
        }

@app.get("/api/debug/env")
async def debug_env():
    """Diagnostic route to check which environment variables are exposed (keys only!)."""
    keys = list(os.environ.keys())
    return {
        "status": "online",
        "has_supabase_url": "SUPABASE_URL" in keys,
        "has_supabase_key": "SUPABASE_SERVICE_ROLE_KEY" in keys,
        "keys": keys
    }

@app.post("/api/debug/fix-locations")
async def fix_locations():
    """Emergency fix: Iterative update to be safe (no pipelines)."""
    try:
        from pymongo import UpdateOne
        
        # 1. Fetch ALL jobs
        cursor = db.jobs.find({})
        updates = []
        count = 0
        
        async for job in cursor:
            # Fix Location
            loc = job.get("location", "")
            if loc and "United States" not in loc and "USA" not in loc:
                loc = f"{loc}, United States"
            elif not loc:
                loc = "United States" # Default if missing
            
            # Create Update Operation
            updates.append(UpdateOne(
                {"_id": job["_id"]},
                {
                    "$set": {
                        "location": loc,
                        "country": "us",
                        "created_at": datetime.utcnow(),
                        "posted_date": datetime.utcnow()
                    }
                }
            ))
            count += 1
        
        # 2. Add 'adzuna' updates logic (if we want to be specific, but we said brute force)
        # Actually, let's just run the bulk write
        modified_count = 0
        if updates:
            result = await db.jobs.bulk_write(updates)
            modified_count = result.modified_count
            
        return {
            "status": "success", 
            "version": "v6_safe_iteration",
            "matched": count,
            "modified": modified_count, 
            "message": f"V6: Processed {count}, Modified {modified_count} jobs via Python loop"
        }
    except Exception as e:
        return {"error": f"{type(e).__name__}: {str(e)}"}


@app.post("/api/jobs/refresh")
async def refresh_jobs():
    """
    Manually trigger job refresh (admin only - add auth later)
    """
    try:
        count = await scheduled_job_fetch(db)
        return {"success": True, "message": f"Refreshed {count} jobs", "count": count}
    except Exception as e:
        logger.error(f"Error refreshing jobs: {e}")
        raise HTTPException(status_code=500, detail="Failed to refresh jobs")


@app.post("/api/jobs/aggregate")
async def aggregate_jobs_from_apis(
    use_adzuna: bool = Query(True, description="Fetch from Adzuna API"),
    use_jsearch: bool = Query(True, description="Fetch from JSearch API"),
    use_usajobs: bool = Query(True, description="Fetch from USAJobs.gov"),
    use_rss: bool = Query(
        True, description="Fetch from RSS feeds (Indeed/SimplyHired)"
    ),
    max_adzuna_pages: int = Query(20, ge=1, le=100, description="Max Adzuna pages"),
    max_jsearch_queries: int = Query(
        10, ge=1, le=20, description="Number of JSearch queries"
    ),
):
    """
    Aggregate jobs from free APIs: Adzuna, JSearch, USAJobs, and RSS feeds
    This can fetch 60K+ USA jobs using free tier limits
    """
    try:
        aggregator = JobAggregator(db)
        stats = await aggregator.aggregate_all_jobs(
            use_adzuna=use_adzuna,
            use_jsearch=use_jsearch,
            use_usajobs=use_usajobs,
            use_rss=use_rss,
            max_adzuna_pages=max_adzuna_pages,
            max_jsearch_queries=max_jsearch_queries,
        )

        return {
            "success": True,
            "message": f"Aggregated {stats['total_stored']} unique USA jobs",
            "stats": stats,
        }
    except Exception as e:
        logger.error(f"Error aggregating jobs: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500, detail=f"Failed to aggregate jobs: {str(e)}"
        )


@app.get("/api/jobs/aggregator-stats")
async def get_aggregator_stats():
    """
    Get statistics about aggregated jobs in the database
    """
    try:
        aggregator = JobAggregator(db)
        stats = await aggregator.get_job_stats()

        return {"success": True, "stats": stats}
    except Exception as e:
        logger.error(f"Error fetching aggregator stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch aggregator stats")


# ============================================
# RAZORPAY PAYMENT ENDPOINTS
# ============================================


class RazorpayOrderRequest(BaseModel):
    plan_id: str
    user_email: str
    currency: str = "INR"  # 'INR' or 'USD'


class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_id: str
    user_email: str


@app.post("/api/razorpay/create-order")
async def create_razorpay_order_endpoint(request: RazorpayOrderRequest, user: dict = Depends(get_current_user)):
    """
    Create a Razorpay order for payment
    """
    try:
        # Enforce email verification for payments
        ensure_verified(user)
        
        order = create_razorpay_order(
            plan_id=request.plan_id,
            user_email=user.get("email"), # Use authenticated email
            currency=request.currency,
        )

        if not order:
            raise HTTPException(status_code=400, detail="Failed to create order")

        if order.get("free"):
            return {
                "success": True,
                "free": True,
                "message": "Free plan - no payment required",
            }

        return {"success": True, "order": order}

    except Exception as e:
        logger.error(f"Error creating Razorpay order: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment order")


@app.post("/api/razorpay/verify-payment")
async def verify_razorpay_payment_endpoint(request: RazorpayVerifyRequest, user: dict = Depends(get_current_user)):
    """
    Verify Razorpay payment and activate subscription
    """
    try:
        # Verify payment signature
        is_valid = verify_razorpay_payment(
            order_id=request.razorpay_order_id,
            payment_id=request.razorpay_payment_id,
            signature=request.razorpay_signature,
        )

        if not is_valid:
            raise HTTPException(status_code=400, detail="Payment verification failed")

        # Get payment details
        payment = get_payment_details(request.razorpay_payment_id)
        
        user_email = user.get("email") # Trust the token, not the request body

        # Update user subscription in database
        await db.users.update_one(
            {"email": user_email},
            {
                "$set": {
                    "subscription": {
                        "plan_id": request.plan_id,
                        "payment_id": request.razorpay_payment_id,
                        "order_id": request.razorpay_order_id,
                        "status": "active",
                        "amount": payment.get("amount", 0) if payment else 0,
                        "currency": (
                            payment.get("currency", "INR") if payment else "INR"
                        ),
                        "activated_at": datetime.now(timezone.utc),
                        "provider": "razorpay",
                    }
                }
            },
        )

        # Log the payment
        await db.payments.insert_one(
            {
                "user_email": user_email,
                "plan_id": request.plan_id,
                "payment_id": request.razorpay_payment_id,
                "order_id": request.razorpay_order_id,
                "amount": payment.get("amount", 0) if payment else 0,
                "currency": payment.get("currency", "INR") if payment else "INR",
                "status": "success",
                "provider": "razorpay",
                "created_at": datetime.now(timezone.utc),
            }
        )

        logger.info(
            f"Payment successful for {request.user_email}, plan: {request.plan_id}"
        )

        return {
            "success": True,
            "message": "Payment verified and subscription activated",
            "plan_id": request.plan_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying payment: {e}")
        raise HTTPException(status_code=500, detail="Payment verification failed")


@app.get("/api/razorpay/plans")
async def get_razorpay_plans(currency: str = "INR"):
    """
    Get available plans with pricing
    """
    plans = RAZORPAY_PLANS_USD if currency == "USD" else RAZORPAY_PLANS
    return {"success": True, "plans": plans, "currency": currency}


# ============================================
# SCHEDULER SETUP
# ============================================


# Background task to fetch jobs periodically
async def job_fetch_background_task():
    """Background task that runs every 6 hours to fetch new jobs"""
    # Initial fetch on startup, delayed to allow server to bind port and pass health checks
    try:
        logger.info("⏳ Waiting 30s before initial job fetch to pass health checks...")
        await asyncio.sleep(30)
        logger.info("🚀 Running initial job fetch after startup delay...")
        await scheduled_job_fetch(db)
    except Exception as e:
        logger.error(f"Initial job fetch error: {e}")

    while True:
        # Wait 6 hours before next fetch
        await asyncio.sleep(6 * 60 * 60)  # 6 hours in seconds

        try:
            logger.info("🔄 Running scheduled job fetch...")
            await scheduled_job_fetch(db)
        except Exception as e:
            logger.error(f"Background job fetch error: {e}")


# ============================================
# RESUME SCANNER API ENDPOINTS
# ============================================

from resume_parser import parse_resume, validate_resume_file
from resume_analyzer import analyze_resume, extract_resume_data
from document_generator import (
    generate_optimized_resume_content,
    generate_cover_letter_content,
    generate_expert_documents,
    create_resume_docx,
    create_cover_letter_docx,
    create_text_docx,
)
from fastapi.responses import StreamingResponse

# ============================================
# AI GENERATION ENDPOINT FOR TOOLS
# ============================================


class AIGenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 1000


@app.post("/api/ai/generate")
async def generate_ai_content(
    request: AIGenerateRequest, user: dict = Depends(get_current_user)
):
    """
    General-purpose AI text generation endpoint for tools like
    Bullet Points Generator, Summary Generator, LinkedIn Optimizer.
    """
    try:
        # Enforce email verification
        ensure_verified(user)

        from resume_analyzer import unified_api_call

        # Check for BYOK
        # BYOK RESTRICTION: No longer using BYOK for general tools
        # byok_config = await get_decrypted_byok_key(user.get("email"))

        response = await unified_api_call(
            request.prompt,
            # byok_config=byok_config, # Forces system keys
            max_tokens=request.max_tokens,
            model="llama-3.1-8b-instant",
        )

        if response:
            # If it looks like a resume, strip excessive newlines
            if any(h in response.upper() for h in ["EXPERIENCE", "SUMMARY", "SKILLS", "EDUCATION", "PROJECTS"]):
                import re
                # Strip ALL double+ newlines and replace with single
                response = re.sub(r'\n{3,}', '\n\n', response.strip())
                # Also strip leading/trailing spaces on each line
                response = "\n".join([line.strip() for line in response.split("\n") if line.strip()])

        return {"success": True, "response": response}
    except Exception as e:
        logger.error(f"AI generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scan/analyze")
async def scan_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    email: str = Form(None),
    target_score: int = Form(85),
):
    """
    Analyze a resume against a job description
    Returns match score and detailed analysis
    """
    try:
        # SAFETY PATCH: Define user to prevent NameError
        user = None
        logger.info("SERVER VERSION SCAN PATCHED: Starting resume scan...")

        # Validate file
        file_content = await resume.read()
        validation_error = validate_resume_file(resume.filename, file_content)
        if validation_error:
            raise HTTPException(status_code=400, detail=validation_error)

        # Parse resume
        resume_text = await parse_resume(file_content, resume.filename)
        if not resume_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from resume. Please ensure it's not an image-based PDF.",
            )

        # Check for BYOK - safely handle if email is missing
        byok_config = await get_decrypted_byok_key(email or "")

        # Analyze with Gemini / BYOK
        from resume_analyzer import analyze_resume
        from document_generator import generate_optimized_resume_content

        analysis = await analyze_resume(
            resume_text, job_description, byok_config=byok_config, target_score=target_score
        )

        if "error" in analysis:
            raise HTTPException(status_code=500, detail=analysis["error"])

        # Generate optimized text for preview
        optimized_data = await generate_optimized_resume_content(
            resume_text, 
            job_description, 
            analysis,
            byok_config=byok_config,
            target_score=target_score
        )
        
        # Convert structured data back to text for ResumePaper
        from document_generator import render_preview_text_from_json
        optimized_text = render_preview_text_from_json(optimized_data)
        
        return {
            "success": True,
            "analysis": analysis,
            "resumeText": resume_text,
            "optimizedText": optimized_text,
            "optimizedData": optimized_data,
            "resumeTextLength": len(resume_text),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resume scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/scan/parse")
async def parse_resume_endpoint(
    resume: UploadFile = File(...), user: dict = Depends(get_current_user)
):
    """
    Parse a resume and extract structured data
    """
    try:
        # Explicit debug logging to file
        with open("debug_log.txt", "a") as f:
            f.write(f"\n--- PARSE RESUME {datetime.now()} ---\n")
            f.write(f"User: {user.get('email')}\n")
            f.write(f"Filename: {resume.filename}\n")

        # Validate file
        file_content = await resume.read()
        
        with open("debug_log.txt", "a") as f:
            f.write(f"Content Length: {len(file_content)}\n")
        
        validation_error = validate_resume_file(resume.filename, file_content)
        if validation_error:
            with open("debug_log.txt", "a") as f:
                f.write(f"Validation Error: {validation_error}\n")
            raise HTTPException(status_code=400, detail=validation_error)

        # Parse resume text
        resume_text = await parse_resume(file_content, resume.filename)
        
        with open("debug_log.txt", "a") as f:
            f.write(f"Parsed Text Length: {len(resume_text)}\n")
            f.write(f"Parsed Text Preview: {resume_text[:100]}\n")
        
        if not resume_text.strip():
            with open("debug_log.txt", "a") as f:
                f.write("Error: Empty resume text\n")
            raise HTTPException(
                status_code=400, detail="Could not extract text from resume"
            )

        # Check for BYOK - use authenticated user email
        byok_config = await get_decrypted_byok_key(user.get("email", ""))

        # Extract structured data with Gemini / BYOK
        from resume_analyzer import extract_resume_data

        with open("debug_log.txt", "a") as f:
            f.write("Starting extraction...\n")

        parsed_data = await extract_resume_data(resume_text, byok_config=byok_config)
        
        # PROACTIVE PROFILE SYNC (Project Orion)
        try:
            if parsed_data and not parsed_data.get("error"):
                userId = user.get("id")
                profile_email = user.get("email")
                update_fields = {}

                # Sync Resume Text if missing
                if not user.get("resume_text"):
                    update_fields["resume_text"] = resume_text

                # Sync Target Role if missing
                extracted_role = parsed_data.get("preferences", {}).get("target_role")
                if extracted_role and not user.get("target_role"):
                    update_fields["target_role"] = extracted_role
                    logger.info(f"Sync: Updated target_role for {profile_email} during parse: {extracted_role}")

                if update_fields:
                    SupabaseService.update_user_profile(userId, update_fields)
        except Exception as sync_err:
            logger.error(f"Failed to sync profile during parse: {sync_err}")

        with open("debug_log.txt", "a") as f:
             f.write(f"Extraction complete. Keys: {list(parsed_data.keys()) if parsed_data else 'None'}\n")

        return {
            "success": True,
            "data": parsed_data,
            "resumeText": resume_text,
        }

    except HTTPException:
        raise
    except Exception as e:
        with open("debug_log.txt", "a") as f:
            f.write(f"EXCEPTION: {str(e)}\n")
            import traceback
            f.write(traceback.format_exc())
            f.write("\n")
        
        logger.error(f"Resume parse error details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class GenerateResumeRequest(BaseModel):
    userId: str
    resume_text: str
    job_description: str
    job_title: str = "Position"
    company: str = "Company"
    analysis: dict
    is_already_tailored: bool = False
    fontFamily: Optional[str] = "Times New Roman"
    template: Optional[str] = "standard"
    targetScore: Optional[int] = 85


@app.post("/api/generate/resume")
async def generate_resume_docx(request: GenerateResumeRequest):
    """
    Generate an optimized resume as a Word document
    """
    safe_company = request.company.replace(" ", "_").replace('"', "").replace("'", "")
    try:
        # Get user to verify status
        user = await db.users.find_one({"id": request.userId})
        if user:
            ensure_verified(user)

        # Check if we should use raw text or structured data
        if request.is_already_tailored and request.resume_text:
            logger.info("Generating already tailored resume (fast path)")
            
            # Clean up the resume text to remove excessive empty lines
            import re
            resume_text = request.resume_text.strip()
            # Reduce multiple newlines to single newlines and clean each line
            resume_text = re.sub(r'\n{3,}', '\n\n', resume_text) # Allow at most 1 blank line between paragraphs
            resume_text = "\n".join([line.rstrip() for line in resume_text.split("\n")])
            
            docx_file = create_text_docx(
                resume_text, 
                "ATS_Resume", 
                font_family=request.fontFamily,
                template=request.template
            )
            # Skip redundant Expert AI calls!
        else:
            # BYOK RESTRICTION: Keep internal keys only
            # Check for BYOK
            user_email = user.get("email", "") if user else ""
            # byok_config = await get_decrypted_byok_key(user_email)

            from document_generator import (
                generate_expert_documents,
                generate_optimized_resume_content,
            )

            expert_docs = await generate_expert_documents(
                request.resume_text,
                request.job_description,
                user_info=user,
                byok_config=None, # Force system keys
            )

            if expert_docs and expert_docs.get("ats_resume"):
                docx_file = create_text_docx(
                    expert_docs["ats_resume"], 
                    "Optimized_Resume",
                    font_family=request.fontFamily,
                    template=request.template
                )
            else:
                # Fallback to standard optimization if expert fails
                # Stage 1 optimization - preserves all original content
                resume_data = await generate_optimized_resume_content(
                    request.resume_text,
                    request.job_description,
                    request.analysis,
                    byok_config=None, # Force system keys
                    target_score=request.targetScore
                )
                if not resume_data:
                    raise HTTPException(
                        status_code=500, detail="Failed to generate resume content"
                    )
                docx_file = create_resume_docx(resume_data, font_family=request.fontFamily)

        # Track this generation for usage limits
        if user:
            resume_track_doc = {
                "id": str(uuid.uuid4()),
                "userId": request.userId,
                "userEmail": user.get("email"),
                "type": "generation",
                "createdAt": datetime.now(timezone.utc),
            }
            await db.resumes.insert_one(resume_track_doc)

            # Also save to "My Resumes" library so user can see it
            try:
                # We content is tailored or expert docs, use that text
                saved_text = ""
                if expert_docs and expert_docs.get("ats_resume"):
                    saved_text = expert_docs["ats_resume"]
                elif "resume_data" in locals() and resume_data:
                    saved_text = str(resume_data)  # Simplification

                if saved_text:
                    await db.saved_resumes.insert_one(
                        {
                            "userEmail": user.get("email"),
                            "resumeName": f"Generated: {request.company}",
                            "resumeText": saved_text,
                            "fileName": f"Optimized_Resume_{safe_company}.docx",
                            "createdAt": datetime.now(timezone.utc).isoformat(),
                            "updatedAt": datetime.now(timezone.utc).isoformat(),
                            "isSystemGenerated": True,
                        }
                    )
            except Exception as e:
                logger.error(f"Failed to auto-save generated resume to library: {e}")

        # Return as downloadable file
        return StreamingResponse(
            docx_file,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="Optimized_Resume_{safe_company}.docx"'
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resume generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate/cv")
async def generate_cv_docx(request: GenerateResumeRequest):
    """
    Generate a detailed CV as a Word document
    """
    try:
        # Get user to verify status
        user = await db.users.find_one({"id": request.userId})
        if user:
            ensure_verified(user)

        if not request.resume_text:
            raise HTTPException(status_code=400, detail="CV text is missing")

        # Create Word document from the detailed CV text
        docx_file = create_text_docx(
            request.resume_text, 
            "Detailed_CV",
            font_family=request.fontFamily,
            template=request.template
        )

        # Sanitize company name for header
        safe_company = request.company.replace(" ", "_").replace('"', "")

        # Return as downloadable file
        return StreamingResponse(
            docx_file,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="Detailed_CV_{safe_company}.docx"'
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CV generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class GenerateCoverLetterRequest(BaseModel):
    userId: str
    resume_text: str
    job_description: str
    job_title: str = "Position"
    company: str = "Company"
    cover_letter_text: Optional[str] = None
    is_already_tailored: bool = False
    fontFamily: Optional[str] = "Times New Roman"
    template: Optional[str] = "standard"


@app.post("/api/generate/cover-letter")
async def generate_cover_letter_docx(request: GenerateCoverLetterRequest):
    """
    Generate a cover letter as a Word document
    """
    try:
        # Get user to verify status
        user = await db.users.find_one({"id": request.userId})
        if user:
            ensure_verified(user)

        # Check usage limits (optional if we don't want to limit cover letters, but good for consistency)
        # For now, let's keep cover letters unlimited or tied to the same check?
        # User said "Resume generation limit", but usually they go together.
        # Let's just do it for resumes for now to be strict about the request.

        # BYOK RESTRICTION: Keep internal keys only
        # Check for BYOK
        # byok_config = await get_decrypted_byok_key(user.get("email", ""))

        # Generate cover letter content if not provided
        cover_letter_text = request.cover_letter_text
        if not cover_letter_text or not request.is_already_tailored:
            cover_letter_text = await generate_cover_letter_content(
                request.resume_text,
                request.job_description,
                request.job_title,
                request.company,
                byok_config=None, # Force system keys
            )

        if not cover_letter_text:
            raise HTTPException(
                status_code=500, detail="Failed to generate cover letter"
            )

        # Create Word document
        docx_file = create_cover_letter_docx(
            cover_letter_text, 
            request.job_title, 
            request.company,
            font_family=request.fontFamily
        )

        # Sanitize company name for header
        safe_company = request.company.replace(" ", "_").replace('"', "")

        # Return as downloadable file
        return StreamingResponse(
            docx_file,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="Cover_Letter_{safe_company}.docx"'
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cover letter generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ScanSaveRequest(BaseModel):
    user_email: str
    job_title: str
    company: str
    job_description: str
    analysis: dict


class SaveResumeRequest(BaseModel):
    user_email: str
    resume_name: str
    resume_text: str
    file_name: str = ""
    replace_id: Optional[str] = None


@app.get("/api/resumes/{email}")
async def get_unified_resumes(email: str):
    """
    Get all saved resumes for a user, aggregated from multiple collections.
    """
    try:
        # Pull from both collections to fix fragmentation
        resumes1 = await db.resumes.find({"user_email": email}).to_list(length=50)
        resumes2 = await db.saved_resumes.find({"userEmail": email}).to_list(length=50)
        
        merged = []
        seen_ids = set()
        
        for r in (resumes1 + resumes2):
            rid = str(r.pop("_id"))
            if rid in seen_ids:
                continue
            seen_ids.add(rid)
            
            # Standardize fields for frontend
            r["id"] = rid
            r["resumeName"] = r.get("resumeName") or r.get("resume_name") or r.get("fileName") or "Resume"
            r["resumeText"] = r.get("resumeText") or r.get("resume_text") or ""
            r["updatedAt"] = r.get("updatedAt") or r.get("updated_at") or r.get("createdAt") or r.get("created_at")
            r["textPreview"] = r["resumeText"][:200] + "..." if r["resumeText"] else ""
            
            merged.append(r)
            
        merged.sort(key=lambda x: str(x.get("updatedAt", "")), reverse=True)
        
        return {"success": True, "resumes": merged[:3]}
    except Exception as e:
        logger.error(f"Unified resume fetch error: {e}")
        return {"success": False, "error": str(e), "resumes": []}


@app.post("/api/resumes/save")
async def save_user_resume(request: SaveResumeRequest):
    """
    Save a user's resume for future use (Limit: 3)
    """
    try:
        # If replace_id is provided, delete that resume first
        if request.replace_id:
            try:
                from bson import ObjectId
                oid = ObjectId(request.replace_id)
                await db.saved_resumes.delete_one({"_id": oid, "userEmail": request.user_email})
                await db.resumes.delete_one({"_id": oid, "user_email": request.user_email})
            except Exception as e:
                logger.warning(f"Failed to delete resume for replacement: {e}")

        # Check if resume with same name exists
        existing = await db.saved_resumes.find_one(
            {"userEmail": request.user_email, "resumeName": request.resume_name}
        )

        if existing:
            # Update existing - does not count towards limit
            await db.saved_resumes.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "resumeText": request.resume_text,
                        "fileName": request.file_name,
                        "updatedAt": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )
            return {
                "success": True,
                "message": "Resume updated",
                "id": str(existing["_id"]),
            }

        # Check limit only for new resumes
        count = await db.saved_resumes.count_documents(
            {"userEmail": request.user_email}
        )
        if count >= 3:
            raise HTTPException(
                status_code=400,
                detail="You can only save up to 3 resumes. Please delete one to add a new one.",
            )

        # Create new
        resume_doc = {
            "userEmail": request.user_email,
            "resumeName": request.resume_name,
            "resumeText": request.resume_text,
            "fileName": request.file_name,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }

        result = await db.saved_resumes.insert_one(resume_doc)

        return {
            "success": True,
            "message": "Resume saved",
            "id": str(result.inserted_id),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Save resume error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/resumes/alias/{email}")
async def get_resumes_alias(email: str):
    return await get_unified_resumes(email)


@app.get("/api/resumes/detail/{resume_id}")
async def get_resume_detail(resume_id: str):
    """
    Get a specific saved resume with full text
    """
    try:
        from bson import ObjectId

        resume = await db.saved_resumes.find_one({"_id": ObjectId(resume_id)})

        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")

        resume["id"] = str(resume.pop("_id"))

        return {"success": True, "resume": resume}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get resume detail error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/resumes/{resume_id}")
async def delete_saved_resume(resume_id: str):
    """
    Delete a saved resume
    """
    try:
        from bson import ObjectId

        result = await db.saved_resumes.delete_one({"_id": ObjectId(resume_id)})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Resume not found")

        return {"success": True, "message": "Resume deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete resume error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/google-login")
@limiter.limit("10/minute")
async def google_login(request: Request, login_data: GoogleLoginRequest, background_tasks: BackgroundTasks):
    """
    Handle Google OAuth authentication for login.
    """
    try:
        # Check if database is connected
        if db is None:
            logger.error("Database connection is None - MONGO_URL may be invalid")
            raise HTTPException(
                status_code=500,
                detail="Database connection failed. Please contact support."
            )
        
        # Verify imports
        if id_token is None or google_requests is None:
            logger.error("Google auth libraries missing at runtime.")
            raise HTTPException(
                status_code=500,
                detail="Google authentication library is not installed. Please use email login."
            )

        credential = login_data.credential

        if not credential:
            raise HTTPException(status_code=400, detail="No credential provided")

        # Verify the Google token
        try:
            GOOGLE_CLIENT_ID = os.getenv(
                "GOOGLE_CLIENT_ID",
                "62316419452-e4gpepiaepopnfqpd96k19r1ps6e777v.apps.googleusercontent.com",
            )

            idinfo = id_token.verify_oauth2_token(
                credential, google_requests.Request(), GOOGLE_CLIENT_ID
            )
            logger.info(f"✅ Google token verified for: {idinfo.get('email')}")

            email = idinfo.get("email")
            name = idinfo.get("name") or ""
            google_id = idinfo.get("sub")
            picture = idinfo.get("picture")

            if not email:
                raise HTTPException(
                    status_code=400, detail="Email not provided by Google"
                )

        except ValueError as e:
            logger.error(f"Invalid Google token: {str(e)}")
            raise HTTPException(
                status_code=401, detail=f"Invalid Google token: {str(e)}"
            )

        # Check if user exists
        existing_user = await db.users.find_one({"email": email})

        if existing_user:
            # User exists - log them in
            update_data = {
                "google_id": google_id,
                "profile_picture": picture,
                "is_verified": True,
            }
            await db.users.update_one(
                {"_id": existing_user["_id"]}, {"$set": update_data}
            )

            user_id = existing_user.get("id") or str(existing_user.get("_id"))
            token = create_access_token(data={"sub": email, "id": user_id})

            return {
                "success": True,
                "token": token,
                "user": {
                    "id": user_id,
                    "email": email,
                },
            }
            # --- SUPABASE SYNC (Existing User) ---
            SupabaseService.sync_user_profile(existing_user)
        else:
            # New user - create account
            new_user_obj = User(
                email=email, name=name, password_hash="google-oauth", is_verified=True
            )

            user_dict = new_user_obj.model_dump()
            user_dict.update(
                {
                    "google_id": google_id,
                    "profile_picture": picture,
                    "auth_method": "google",
                    "created_at": (
                        user_dict["created_at"].isoformat()
                        if isinstance(user_dict["created_at"], datetime)
                        else user_dict["created_at"]
                    ),
                }
            )

            await db.users.insert_one(user_dict)
            
            # --- SUPABASE SYNC (New User) ---
            SupabaseService.sync_user_profile(user_dict)
            
            logger.info(f"New user created via Google OAuth and synced to Supabase: {email}")

            # Send welcome email in background
            try:
                background_tasks.add_task(
                    send_welcome_email, name, email, None, new_user_obj.referral_code
                )
            except Exception as email_error:
                logger.error(
                    f"Error sending welcome email to Google user: {email_error}"
                )

            token = create_access_token(data={"sub": email, "id": new_user_obj.id})

            return {
                "success": True,
                "token": token,
                "user": {
                    "id": new_user_obj.id,
                    "email": email,
                    "name": name,
                    "role": new_user_obj.role,
                    "plan": new_user_obj.plan,
                    "is_verified": True,
                    "referral_code": new_user_obj.referral_code,
                    "profile_picture": picture,
                },
            }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(
            f"Error in Google authentication: {error_msg}\n{traceback.format_exc()}"
        )
        raise HTTPException(
            status_code=500, 
            detail=f"Google login error: {error_msg}. Check if google-auth is installed."
        )


@app.post("/api/scan/save")
async def save_scan(request: ScanSaveRequest):
    """
    Save a scan to user's history in Supabase
    """
    try:
        # Get user profile to link scan to user_id
        profile = SupabaseService.get_user_by_email(request.user_email)
        
        scan_doc = {
            "user_id": profile["id"] if profile else None,
            "user_email": request.user_email,
            "raw_text": request.job_description[:5000],
            "extracted_data": {
                "jobTitle": request.job_title,
                "company": request.company,
                "analysis": request.analysis,
                "matchScore": request.analysis.get("matchScore", 0)
            }
        }

        result = SupabaseService.create_scan(scan_doc)
        if not result:
            raise Exception("Failed to save scan to Supabase")

        return {"success": True, "scanId": result["id"]}

    except Exception as e:
        logger.error(f"Save scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scans/{user_email}")
async def get_user_scans(user_email: str, limit: int = 20):
    """
    Get user's scan history from Supabase
    """
    try:
        scans = SupabaseService.get_scans(user_email=user_email, limit=limit)
        return scans
    except Exception as e:
        logger.error(f"Get scans error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        logger.error(f"Get scans error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scan/{scan_id}")
async def get_scan_by_id(scan_id: str):
    """
    Get a specific scan by ID from Supabase
    """
    try:
        scan = SupabaseService.get_scan_by_id(scan_id)

        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")

        # Compatibility shim
        scan["id"] = scan["id"]

        return {"success": True, "scan": scan}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# APPLICATION TRACKER
# ============================================


class ApplicationData(BaseModel):
    userEmail: str
    jobId: Optional[str] = None
    jobTitle: str
    company: str
    location: Optional[str] = ""
    jobDescription: Optional[str] = ""
    sourceUrl: Optional[str] = ""
    salaryRange: Optional[str] = ""
    matchScore: Optional[int] = 0
    status: Optional[str] = (
        "materials_ready"  # materials_ready, applied, interviewing, offered, rejected
    )
    createdAt: Optional[str] = None
    appliedAt: Optional[str] = None
    notes: Optional[str] = ""
    resumeText: Optional[str] = ""
    coverLetterText: Optional[str] = ""


@api_router.post("/applications")
async def save_application(application: ApplicationData):
    """
    Save a job application to the tracker in Supabase
    """
    try:
        # Get user profile to link to user_id
        profile = SupabaseService.get_user_by_email(application.userEmail)
        
        # Link job_id if possible (needs to be UUID)
        # Note: If jobId is not a UUID, we might need a lookup or just store it as is if its allowed
        
        app_doc = {
            "user_id": profile["id"] if profile else None,
            "job_id": application.jobId if application.jobId and len(application.jobId) > 30 else None, # Simple UUID check
            "status": application.status or "materials_ready",
            "notes": application.notes,
            "platform": application.location, # Re-mapping location to platform if needed
            "applied_at": application.appliedAt
        }
        
        # Note: Some fields like resumeText and coverLetterText are not in the current Supabase schema
        # We might want to store them in a separate JSONB field if important, but let's stick to schema for now

        result = SupabaseService.create_application(app_doc)
        if not result:
            raise Exception("Failed to save application to Supabase")

        return {
            "success": True,
            "applicationId": result["id"],
            "message": "Application saved to tracker",
        }

    except Exception as e:
        logger.error(f"Save application error: {e}")
        raise HTTPException(status_code=500, detail=str(e))




@app.put("/api/applications/{application_id}")
@app.patch("/api/applications/{application_id}")
async def update_application(
    application_id: str, status: str = None, notes: str = None, appliedAt: str = None
):
    """
    Update an application status in Supabase.
    """
    try:
        update_data = {}
        if status:
            update_data["status"] = status
        if notes is not None:
            update_data["notes"] = notes
        if appliedAt:
            update_data["applied_at"] = appliedAt

        success = SupabaseService.update_application(application_id, update_data)

        if not success:
            raise HTTPException(status_code=404, detail="Application not found")

        return {"success": True, "message": "Application updated"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update application error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/applications/{application_id}")
async def delete_application(application_id: str):
    """
    Delete an application from Supabase
    """
    try:
        success = SupabaseService.delete_application(application_id)

        if not success:
            raise HTTPException(status_code=404, detail="Application not found")

        return {"success": True, "message": "Application deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete application error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# INTERVIEW PREP API
# ============================================

class InterviewAnswerRequest(BaseModel):
    answerText: str

@app.post("/api/interview/create-session")
async def create_interview_session(
    resume: UploadFile = File(...),
    jd: str = Form(""),
    roleTitle: str = Form(...),
    user: dict = Depends(get_current_user)
):
    """Create a new interview session"""
    try:
        user_id = user.get("id") or str(user.get("_id"))
        
        # Read resume
        file_content = await resume.read()
        
        # Simple extraction
        if resume.filename.endswith('.pdf'):
            parsed_text = f"[PDF Resume: {resume.filename}]"
        elif resume.filename.endswith('.docx'):
            parsed_text = f"[DOCX Resume: {resume.filename}]"
        else:
            parsed_text = file_content.decode('utf-8', errors='ignore')
        
        # Save resume to Supabase
        resume_doc = {
            "user_id": user_id if len(str(user_id)) == 36 else None,
            "file_name": resume.filename,
            "parsed_text": parsed_text,
            "created_at": datetime.utcnow().isoformat()
        }
        new_resume = SupabaseService.insert_interview_resume(resume_doc)
        resume_id = new_resume.get("id") if new_resume else None
        
        # Create interview session in Supabase
        session_data = {
            "user_id": user_id if len(str(user_id)) == 36 else None,
            "resume_id": resume_id,
            "job_description": jd,
            "status": "pending",
            "question_count": 0,
            "target_questions": 5,
            "created_at": datetime.utcnow().isoformat()
        }
        new_session = SupabaseService.insert_interview_session(session_data)
        session_id = new_session.get("id") if new_session else None
        
        return {
            "success": True,
            "sessionId": str(session_id),
            "message": "Session created successfully"
        }
    
    except Exception as e:
        logger.error(f"Session creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/interview/start/{session_id}")
async def start_interview(session_id: str, user: dict = Depends(get_current_user)):
    """Start interview and get first question"""
    try:
        orchestrator = InterviewOrchestrator(session_id)
        result = await orchestrator.generate_initial_question()
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Start interview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/interview/answer/{session_id}")
async def submit_answer(session_id: str, request: InterviewAnswerRequest, user: dict = Depends(get_current_user)):
    """Submit answer and get next question"""
    try:
        orchestrator = InterviewOrchestrator(session_id)
        result = await orchestrator.process_answer_and_get_next(request.answerText)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Submit answer error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/interview/finalize/{session_id}")
async def finalize_interview(session_id: str, user: dict = Depends(get_current_user)):
    """Finalize interview and generate report"""
    try:
        orchestrator = InterviewOrchestrator(session_id)
        report = await orchestrator.finalize_and_generate_report()
        return report
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Finalize interview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/interview/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Transcribe audio to text using Groq Whisper"""
    try:
        from interview_service import AIService
        
        # Read audio file
        audio_bytes = await audio.read()
        
        # Create a temporary file-like object
        import io
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "recording.webm"
        
        # Transcribe
        text = AIService.transcribe_audio(audio_file)
        
        return {"text": text}
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/interview/session/{session_id}")
async def get_interview_session(session_id: str, user: dict = Depends(get_current_user)):
    """Get interview session details from Supabase"""
    try:
        session = SupabaseService.get_interview_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return session
    except Exception as e:
        logger.error(f"Get session details error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/interview/report/{session_id}")
async def get_interview_report(session_id: str, user: dict = Depends(get_current_user)):
    """Get interview report for a session from Supabase"""
    try:
        client = SupabaseService.get_client()
        if not client: raise HTTPException(500, "Supabase unavailable")
        
        response = client.table("evaluation_reports").select("*").eq("session_id", session_id).execute()
        report = response.data[0] if response.data else None
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Convert ObjectId to string
        report['_id'] = str(report['_id'])
        return report
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health-check")
async def health_check():
    # from resume_analyzer import GROQ_API_KEY - Removing broken import
    
    groq_key = os.environ.get("GROQ_API_KEY")
    supabase_client = SupabaseService.get_client()

    return {
        "status": "ok",
        "mongodb": "connected" if db is not None else "failed",
        "supabase": "connected" if supabase_client is not None else "failed",
        "groq_api_key_set": groq_key is not None and len(groq_key) > 0,
        "env_check": groq_key is not None,
        "google_auth_available": id_token is not None,
        "environment": os.environ.get("ENVIRONMENT", "development")
    }


# ============================================
# APP STARTUP & SHUTDOWN
# ============================================


@app.on_event("startup")
async def startup_event():
    """Initialize background tasks on startup"""
    logger.info("🚀 Starting Job Ninjas backend...")

    # Validate BYOK master key (fails fast if missing/invalid)
    try:
        validate_master_key()
        logger.info("✅ BYOK master key validated")
    except ValueError as e:
        logger.error(f"❌ BYOK master key validation failed: {e}")
        logger.warning("⚠️  BYOK features will be disabled")

    # Start the background job fetcher (runs every 6 hours, including immediately on startup)
    asyncio.create_task(job_fetch_background_task())
    logger.info(
        "📅 Job fetch scheduler started (fetches immediately, then every 6 hours)"
    )

    # Add database indexes for better performance
    try:
        if db is not None:
            # Users collection
            await db.users.create_index([("email", 1)], unique=True)
            await db.users.create_index([("id", 1)], unique=True)
            
            # Profiles collection
            await db.profiles.create_index([("email", 1)])
            
            # Applications collection
            await db.applications.create_index([("userId", 1)])
            await db.applications.create_index([("userEmail", 1)])
            await db.applications.create_index([("createdAt", -1)])
            
            # Resumes & Saved Resumes (Handles fragmentation)
            await db.resumes.create_index([("user_email", 1)])
            await db.resumes.create_index([("userId", 1)])
            await db.saved_resumes.create_index([("userEmail", 1)])
            
            # Usage tracking (Critical for limit checks)
            await db.daily_usage.create_index([("email", 1), ("date", 1)])
            
            # Scans history
            await db.scans.create_index([("userEmail", 1)])
            await db.scans.create_index([("createdAt", -1)])
            
            logger.info("✅ Database indexes created/verified for all critical collections")
    except Exception as e:
        logger.error(f"❌ Failed to create database indexes: {e}")


# ==================== ADMIN ANALYTICS ====================
@app.get("/api/admin/analytics")
async def get_admin_analytics(user: dict = Depends(get_current_user)):
    """
    Get platform analytics for admin dashboard
    Requires authentication
    """
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not initialized")
        
        # Total users count
        total_users = await db.users.count_documents({})
        
        # Users created in last 30 days
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        recent_users = await db.users.count_documents({
            "created_at": {"$gte": thirty_days_ago}
        })
        
        # Total applications
        total_applications = await db.applications.count_documents({})
        
        # Applications in last 30 days
        recent_applications = await db.applications.count_documents({
            "created_at": {"$gte": thirty_days_ago}
        })
        
        # Interview sessions
        total_interview_sessions = await db.interview_sessions.count_documents({})
        recent_interview_sessions = await db.interview_sessions.count_documents({
            "created_at": {"$gte": thirty_days_ago}
        })
        
        # Application statuses breakdown
        status_pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        status_breakdown = {}
        async for doc in db.applications.aggregate(status_pipeline):
            status_breakdown[doc["_id"] or "pending"] = doc["count"]
        
        # Daily active users (last 30 days)
        daily_usage_pipeline = [
            {"$match": {"date": {"$gte": thirty_days_ago.isoformat()[:10]}}},
            {"$group": {"_id": "$email"}},
            {"$count": "total"}
        ]
        active_users_result = await db.daily_usage.aggregate(daily_usage_pipeline).to_list(length=1)
        active_users = active_users_result[0]["total"] if active_users_result else 0
        
        return {
            "success": True,
            "data": {
                "users": {
                    "total": total_users,
                    "recent_30d": recent_users
                },
                "applications": {
                    "total": total_applications,
                    "recent_30d": recent_applications,
                    "by_status": status_breakdown
                },
                "interviews": {
                    "total_sessions": total_interview_sessions,
                    "recent_30d": recent_interview_sessions
                },
                "engagement": {
                    "active_users_30d": active_users
                }
            }
        }
    except Exception as e:
        logger.error(f"Admin analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== EXTENSION & RESUME UTILS ====================

@app.post("/api/resume/upload")
async def upload_resume_endpoint(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    try:
        content = await file.read()
        
        # Validate
        try:
             from resume_parser import parse_resume, validate_resume_file
             error = validate_resume_file(file.filename, content)
             if error:
                 raise HTTPException(status_code=400, detail=error)
             # Parse Text
             text_content = await parse_resume(content, file.filename)
        except ImportError:
             text_content = ""
             logger.warning("Resume parser not available")

        
        # Update User
        resume_meta = {
            "name": file.filename,
            "uploaded_at": datetime.now(timezone.utc),
            "size": len(content),
            "text_content": text_content
        }
        
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "latest_resume": resume_meta,
                "resume_text": text_content
            }}
        )
        
        # Return updated user
        updated_user = await db.users.find_one({"_id": user["_id"]})
        updated_user["_id"] = str(updated_user["_id"])
        
        return {"success": True, "userData": updated_user}
        
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class NovaChatRequest(BaseModel):
    message: str
    jobContext: Optional[dict] = None
    history: Optional[List[dict]] = []

@app.post("/api/nova/chat")
async def nova_chat_endpoint(
    req: NovaChatRequest,
    user: dict = Depends(get_current_user)
):
    if not openai_client:
         raise HTTPException(status_code=503, detail="AI service unavailable")

    # 1. Build System Prompt
    system_prompt = """You are Nova, an expert AI Career Ninja and Job Copilot. 
    Your goal is to help the user land this specific job.
    
    Context provided:
    - User's Resume (if available)
    - Job Description & Details
    
    Guidelines:
    - Be encouraging, professional, and tactical.
    - If asked for resume tips, be specific to the job description.
    - If asked for a cover letter, draft a strong, personalized one.
    - If asked about "Insider Connections", explain how networking with alumni/former colleagues can help (referencing the widget).
    - Keep answers concise and actionable.
    """

    # 2. Get User Context (Resume)
    resume_text = ""
    if user.get("latest_resume") and user["latest_resume"].get("text_content"):
        resume_text = user["latest_resume"]["text_content"]
    
    # 3. Format Job Context
    job_text = ""
    if req.jobContext:
        job_text = f"""
        Job Title: {req.jobContext.get('title')}
        Company: {req.jobContext.get('company')}
        Description: {req.jobContext.get('description')}
        Skills/Keywords: {req.jobContext.get('keywords', [])}
        """

    # 4. Construct Messages
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "system", "content": f"USER RESUME:\\n{resume_text}"},
        {"role": "system", "content": f"TARGET JOB:\\n{job_text}"}
    ]
    
    # Add history (limit to last 6 messages to save context window)
    if req.history:
        # Convert history dicts to message format if needed, or assume they are correct
        # Filter out system messages from history to avoid duplication
        user_history = [msg for msg in req.history[-6:] if msg['role'] != 'system']
        messages.extend(user_history)
    
    messages.append({"role": "user", "content": req.message})

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-3.5-turbo", # Or gpt-4 if available/configured
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        logger.error(f"Nova Chat Error: {e}")
        # Return a fallback response if AI fails, rather than 500
        return {"reply": "I'm having trouble connecting to my brain right now. Please try again in a moment."}

class LLMAnswerRequest(BaseModel):
    question: str
    context: Optional[str] = None

@app.post("/api/llm/generate-answer")
async def generate_smart_answer_endpoint(
    req: LLMAnswerRequest,
    user: dict = Depends(get_current_user)
):
    if not openai_client:
         raise HTTPException(status_code=503, detail="AI service unavailable")
    
    # Get context (Resume)
    context = req.context
    if not context:
        # Fallback to stored resume
        if user.get("latest_resume") and user["latest_resume"].get("text_content"):
            context = user["latest_resume"]["text_content"]
        elif user.get("resume_text"):
             context = user["resume_text"]
        else:
             # Fallback to summary/profile
             context = f"Name: {user.get('name')}\nEmail: {user.get('email')}\nSummary: {user.get('summary', '')}"
             
    try:
        prompt = f"""
        You are an expert career assistant. You are filling out a job application for the user.
        
        User Context (Resume/Profile):
        {context[:15000]} 
        
        Job Application Question:
        {req.question}
        
        Task: Write a concise, professional, and winning answer to the question based on the user's context. 
        If specific details are missing, hallunicate reasonable details compatible with the profile or use brackets [Insert Detail] if impossible.
        Keep it natural and first-person. Do not include markdown or quotes, just the answer text.
        """
        
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful job application assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300
        )
        
        answer = response.choices[0].message.content.strip()
        return {"success": True, "answer": answer}
        
    except Exception as e:
        logger.error(f"LLM generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))



def _get_mock_company_data(company_name: str) -> dict:
    """Helper for premium job cards - generates mock metadata like logos and ratings."""
    name_clean = (company_name or "Unknown").lower().strip()
    return {
        "logo": f"https://logo.clearbit.com/{name_clean.replace(' ', '')}.com",
        "rating": round(3.8 + (hash(name_clean) % 12) / 10, 1),
        "reviewCount": int(50 + (hash(name_clean) % 500)),
        "isVerified": True
    }

def _get_mock_insider_connections() -> list:
    """Helper to simulate 1st/2nd degree insider connections on job cards."""
    return [
        {"name": "Verified Ninja", "role": "Employee", "type": "1st"}
    ]


# Jobs API Endpoints
@app.get("/api/jobs")
async def get_jobs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    country: str = Query(None),
    type: str = Query(None),
    visa: bool = Query(None),
    token: str = Header(None)
):
    """
    Get jobs from database with filtering and pagination
    Only returns jobs from last 72 hours, USA-only
    """
    try:
        # 1. AUTHENTICATED USER ENRICHMENT (PROJECT ORION)
        user = None
        if token:
            try:
                if not token.startswith("token_"):
                    # Use get_current_user_email logic directly to avoid dependency issues if needed
                    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                    email = payload.get("sub")
                    if email:
                        user = SupabaseService.get_user_by_email(email)
                        if user:
                            # Enriched with target_role and resume_text
                            user = await _get_enriched_user_context(user, db=None)
            except Exception as e:
                 logger.error(f"Project Orion Auth Error (get_jobs): {str(e)}")
                 pass

        # 2. JOB FETCHING (SUPABASE)
        offset = (page - 1) * limit
        
        # Determine if we should perform a boosted search (if user has a target role)
        target_role = (user.get("preferences") or {}).get("target_role") if user else None
        
        # Primary fetch (Fresh jobs)
        supabase_jobs = SupabaseService.get_jobs(
            limit=limit if not target_role else 100, # Fetch more if we need to filter/score
            offset=offset if not target_role else 0, # Manual pagination if boosted
            search=search or target_role,
            job_type=type,
            visa=visa,
            fresh_only=True
        )
        
        # Fallback: if no fresh jobs, try fetching older jobs
        if not supabase_jobs and not search:
            logger.info("No fresh jobs found in last 72h. Falling back to older jobs...")
            supabase_jobs = SupabaseService.get_jobs(
                limit=limit if not target_role else 100,
                offset=offset if not target_role else 0,
                search=search or target_role,
                job_type=type,
                visa=visa,
                fresh_only=False
            )

        # 3. SMART SORTING & BOOSTING (PROJECT ORION)
        all_candidates = supabase_jobs or []
        
        # Apply Match Scores
        for job in all_candidates:
            job["_id"] = str(job.get("id"))
            job["matchScore"] = _calculate_match_score(job, user)
            # Add match_score (snake_case) for some frontend versions
            job["match_score"] = job["matchScore"]
            
            # Enrich with mock data for "Premium" feel (as seen in Live Site)
            job["companyData"] = _get_mock_company_data(job.get("company", "Unknown"))
            job["insiderConnections"] = _get_mock_insider_connections()

        # Sort by Match Score DESC if user is present
        if user and all_candidates:
            all_candidates.sort(key=lambda x: x.get("matchScore", 0), reverse=True)

        # Manual Pagination if we fetched a larger pool
        if target_role:
            results = all_candidates[offset:offset + limit]
        else:
            results = all_candidates

        # 4. RECOMMENDED FILTERS (PROJECT ORION)
        recommended_filters = []
        if user:
             # Basic Role Tag
             extracted_role = search if search else target_role
             if extracted_role:
                  recommended_filters.append({"type": "role", "value": extracted_role, "label": extracted_role})
             
             # Location Tag (if available)
             location = (user.get("preferences") or {}).get("preferred_locations") or (user.get("address") or {}).get("city")
             if location:
                  recommended_filters.append({"type": "location", "value": location, "label": location})
                  
             # Level Tag (Heuristic)
             resume_txt = (user.get("resume_text") or "").lower()
             if "senior" in resume_txt or "lead" in resume_txt or "principal" in resume_txt:
                  recommended_filters.append({"type": "level", "value": "mid-senior", "label": "Mid-Senior Level"})
             else:
                  recommended_filters.append({"type": "level", "value": "entry", "label": "Associate/Entry"})

        # Get total count for pagination
        total = SupabaseService.get_jobs_count(
            search=search, 
            job_type=type, 
            visa=visa,
            fresh_only=bool(not search and len(results) >= limit)
        )
        if total == 0 and not search:
            total = SupabaseService.get_jobs_count(search=search, job_type=type, visa=visa, fresh_only=False)

        total_pages = (total + limit - 1) // limit

        return {
            "success": True,
            "jobs": results,
            "recommendedFilters": recommended_filters,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": total_pages
            }
        }
    except Exception as e:
        logger.error(f"Project Orion Job Fetch Error: {str(e)}")
        # Raise here to avoid falling through to MongoDB logic
        raise HTTPException(status_code=500, detail=f"Job fetch failed: {str(e)}")


# Job Sync Endpoints
@app.get("/api/jobs/sync-status")
async def get_job_sync_status(user: dict = Depends(get_current_user)):
    """Get status of job sync operations"""
    if not job_sync_service:
        raise HTTPException(status_code=503, detail="Job sync service not available")
    
    status = await job_sync_service.get_sync_status()
    return status

@app.post("/api/jobs/sync-now")
async def trigger_manual_sync(user: dict = Depends(get_current_user)):
    """Manually trigger job sync (admin only)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not job_sync_service:
        raise HTTPException(status_code=503, detail="Job sync service not available")
    
    # Trigger both syncs
    adzuna_count = await job_sync_service.sync_adzuna_jobs()
    jsearch_count = await job_sync_service.sync_jsearch_jobs()
    
    return {
        "success": True,
        "adzuna_jobs_added": adzuna_count,
        "jsearch_jobs_added": jsearch_count
    }

@app.get("/api/debug/sync-jobs")
async def debug_force_sync():
    """Temporary debug endpoint to force sync and check config"""
    import os
    import traceback
    
    sync_errors = []
    adzuna_res = "Not needed"
    jsearch_res = "Not needed"
    
    try:
        # Check Env Vars
        adzuna_id = os.getenv("ADZUNA_APP_ID")
        adzuna_key = os.getenv("ADZUNA_APP_KEY")
        rapid_key = os.getenv("RAPIDAPI_KEY")
        
        config_status = {
            "ADZUNA_APP_ID": "***" + adzuna_id[-4:] if adzuna_id else "MISSING",
            "ADZUNA_APP_KEY": "***" + adzuna_key[-4:] if adzuna_key else "MISSING",
            "RAPIDAPI_KEY": "***" + rapid_key[-4:] if rapid_key else "MISSING",
            "DB_Connected": job_sync_service is not None
        }

        if not job_sync_service:
            return {"status": "error", "config": config_status, "error": "Service not available (DB connection failed?)"}
        
        # Run Adzuna Sync
        try:
            adzuna_res = await job_sync_service.sync_adzuna_jobs()
        except Exception as e:
            sync_errors.append(f"Adzuna Crash: {str(e)}\n{traceback.format_exc()}")

        # Run JSearch Sync
        try:
            jsearch_res = await job_sync_service.sync_jsearch_jobs()
        except Exception as e:
             sync_errors.append(f"JSearch Crash: {str(e)}\n{traceback.format_exc()}")
        
        # Get detailed status
        try:
            status = await job_sync_service.get_sync_status()
        except Exception as e:
            status = f"Status Check Failed: {str(e)}"
        
        return {
            "status": "success" if not sync_errors else "partial_failure", 
            "config": config_status,
            "sync_results": {
                "adzuna": adzuna_res,
                "jsearch": jsearch_res
            },
            "sync_errors": sync_errors,
            "sync_details": status
        }
    except BaseException as e:
        import traceback
        return {"error": "Critical Endpoint Failure", "details": str(e), "type": str(type(e)), "traceback": traceback.format_exc()}

# Admin Dashboard Endpoints
@app.get("/api/admin/call-bookings")
async def get_call_bookings(user: dict = Depends(get_current_user)):
    """Get all Human Ninja call bookings for admin dashboard"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Fetch all call bookings from database
        bookings = await db.call_bookings.find().sort("created_at", -1).limit(100).to_list(100)
        
        # Convert ObjectId to string
        for booking in bookings:
            if "_id" in booking:
                booking["_id"] = str(booking["_id"])
        
        return {"bookings": bookings, "total": len(bookings)}
    except Exception as e:
        logger.error(f"Error fetching call bookings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/contact-messages")
async def get_contact_messages(user: dict = Depends(get_current_user)):
    """Get all contact form messages for admin dashboard"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Fetch all contact messages from database
        messages = await db.contact_messages.find().sort("created_at", -1).limit(100).to_list(100)
        
        # Convert ObjectId to string
        for message in messages:
            if "_id" in message:
                message["_id"] = str(message["_id"])
        
        return {"messages": messages, "total": len(messages)}
    except Exception as e:
        logger.error(f"Error fetching contact messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Contact Form Endpoint
class ContactMessage(BaseModel):
    firstName: str
    lastName: str
    email: str
    subject: str
    message: str

@app.post("/api/contact")
async def submit_contact_message(data: ContactMessage):
    """Submit contact form message to Supabase"""
    try:
        # Save message to database
        message_doc = {
            "name": f"{data.firstName} {data.lastName}".strip(),
            "email": data.email,
            "subject": data.subject,
            "message": data.message,
            "status": "unread",
        }
        
        success = SupabaseService.create_contact_message(message_doc)
        if not success:
             raise Exception("Failed to save contact message")
        
        return {
            "success": True,
            "message": "Message sent to team successfully"
        }
    except Exception as e:
        logger.error(f"Error saving contact message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# COMPANY ENRICHMENT API
# ============================================
# Imports handled at top of file for robustness

@app.get("/api/company/{company_name}/data")
async def get_company_data(company_name: str):
    """
    Get enriched company data from free sources.
    Caches results for 7 days.
    """
    try:
        data = await enrich_company(company_name)
        # Remove internal fields
        data.pop("_id", None)
        data.pop("name_lower", None)
        data.pop("cached_at", None)
        return data
    except Exception as e:
        logger.error(f"Company enrichment error for {company_name}: {e}")
        return {
            "name": company_name,
            "description": f"{company_name} is a technology company.",
            "industries": ["Information Technology"],
            "h1b": {"isLikely": False, "confidence": "unknown"},
            "news": []
        }

@app.post("/api/debug/fix-descriptions")
async def fix_descriptions(limit: int = 50):
    """
    V7 Fix: Re-fetch full descriptions for truncated jobs.
    Limits to 50 jobs per run to prevent timeout.
    """
    try:
        from scraper_service import scrape_job_description
        from pymongo import UpdateOne
        
        # Find jobs with short descriptions (likely truncated) or from remoteok/remotive
        # Truncated was 2000 chars, so let's look for < 2100 to be safe
        cursor = db.jobs.find({
            "$or": [
                {"description": {"$regex": "^.{0,2100}$"}}, # Short descriptions
                {"source": {"$in": ["remoteok", "remotive"]}} # Target sources
            ]
        }).limit(limit)
        
        updates = []
        processed = 0
        
        async for job in cursor:
            try:
                # Skip if description is already long enough (e.g. > 3000 chars)
                if len(job.get("description", "")) > 3000:
                    continue
                    
                url = job.get("sourceUrl")
                if not url:
                    continue
                    
                logger.info(f"Refetching description for {job.get('company')} - {job.get('title')}")
                full_description = await scrape_job_description(url)
                
                if full_description and len(full_description) > len(job.get("description", "")):
                    updates.append(UpdateOne(
                        {"_id": job["_id"]},
                        {"$set": {
                            "description": full_description,
                            "updatedAt": datetime.utcnow()
                        }}
                    ))
                    processed += 1
            except Exception as e:
                logger.error(f"Failed to scrape {job.get('_id')}: {e}")
                continue
                
        modified_count = 0
        if updates:
            result = await db.jobs.bulk_write(updates)
            modified_count = result.modified_count
            
        return {
            "status": "success",
            "version": "v7_description_fix",
            "processed": processed,
            "modified": modified_count,
            "message": f"V7: Refetched {processed} descriptions, Updated {modified_count} jobs"
        }
    except Exception as e:
        return {"error": f"{type(e).__name__}: {str(e)}"}

# ==================== DEBUG ENDPOINTS ====================
@app.post("/api/admin/force-job-fetch-v2")
async def force_job_fetch_v2(background_tasks: BackgroundTasks):
    """
    Force run the job fetcher (v2 debug)
    """
    try:
        from job_fetcher import scheduled_job_fetch
        if db is None:
            raise HTTPException(status_code=503, detail="Database not connected")
            
        # Run in background to avoid timeout
        background_tasks.add_task(scheduled_job_fetch, db)
        
        return {"success": True, "message": "Job fetch started in background (v2)"}
    except Exception as e:
        logger.error(f"Force fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the API router with all /api/* routes
app.include_router(api_router)

# MongoDB decommissioned - no shutdown needed

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    print(f"DEBUG: Starting uvicorn on port {port}...")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
