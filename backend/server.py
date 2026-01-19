from fastapi import FastAPI, APIRouter, Request, Header, HTTPException, Query, File, Form, UploadFile, Depends
from fastapi.responses import JSONResponse
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
load_dotenv(ROOT_DIR / '.env')

from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import logging
import asyncio
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Union
import uuid
import traceback
from dateutil.relativedelta import relativedelta
import aiohttp
from models import CheckoutRequest, SubscriptionData, WebhookEvent
from payment_service import create_checkout_session, verify_webhook_signature, create_customer_portal_session
from job_fetcher import fetch_all_job_categories, update_jobs_in_database, scheduled_job_fetch
from razorpay_service import (
    create_razorpay_order, 
    verify_razorpay_payment, 
    get_payment_details,
    RAZORPAY_PLANS,
    RAZORPAY_PLANS_USD
)
from scraper_service import scrape_job_description

# Setup logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# MongoDB connection with error handling
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'novaninjas')

if not mongo_url:
    logger.error("MONGO_URL environment variable is not set!")
    raise ValueError("MONGO_URL environment variable is required")

logger.info(f"Connecting to MongoDB database: {db_name}")

try:
    import certifi
    
    # Add TLS/SSL configuration for MongoDB Atlas compatibility
    # Use certifi's certificates for proper SSL verification
    # Also try tlsAllowInvalidCertificates for Railway compatibility
    client = AsyncIOMotorClient(
        mongo_url,
        serverSelectionTimeoutMS=15000,
        tls=True,
        tlsCAFile=certifi.where(),
        tlsAllowInvalidCertificates=True,
        tlsAllowInvalidHostnames=True
    )
    db = client[db_name]
    logger.info("MongoDB client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize MongoDB client: {e}")
    # Try without TLS options as fallback
    try:
        logger.info("Trying fallback connection without explicit TLS options...")
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=15000)
        db = client[db_name]
        logger.info("MongoDB client initialized with fallback settings")
    except Exception as e2:
        logger.error(f"Fallback connection also failed: {e2}")
        raise e

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address)

# Create the main app
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

# Security Helper Functions
def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hash, with SHA256 fallback."""
    if not hashed_password:
        return False
    try:
        # Check if it's a bcrypt hash
        if hashed_password.startswith('$2b$'):
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        
        # Fallback for old SHA256 hashes if any
        import hashlib
        return hashlib.sha256(plain_password.encode('utf-8')).hexdigest() == hashed_password
    except Exception:
        return False

def ensure_verified(user: dict):
    """Raise 403 if user is not verified."""
    if not user.get('is_verified', False):
        raise HTTPException(
            status_code=403, 
            detail="Email verification required to use this feature. Please check your inbox or resend the link from your dashboard."
        )

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
            return None # Force re-login or handle separately
            
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

async def get_current_user(token: str = Header(...)):
    """Dependency to get full user object from database."""
    email = get_current_user_email(token)
    if not email:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return user

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
    referral_code: str = Field(default_factory=lambda: f"INV-{uuid.uuid4().hex[:6].upper()}")
    referred_by: Optional[str] = None
    ai_applications_bonus: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSignup(BaseModel):
    email: str
    password: str
    name: str
    referral_code: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    referral_code: str
    is_verified: bool
    plan: Optional[str] = None
    created_at: datetime

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.get("/health")
async def health_check():
    """
    Health check endpoint that also tests MongoDB connection.
    """
    mongo_status = "unknown"
    mongo_error = None
    
    try:
        # Test MongoDB connection by pinging
        await client.admin.command('ping')
        mongo_status = "connected"
    except Exception as e:
        error_msg = str(e)
        if "SSL handshake failed" in error_msg or "TLSV1_ALERT_INTERNAL_ERROR" in error_msg:
            mongo_status = "ssl_error"
            mongo_error = "SSL/TLS error - Please whitelist 0.0.0.0/0 in MongoDB Atlas Network Access"
        else:
            mongo_status = "error"
            mongo_error = error_msg[:200]  # Truncate long errors
    
    # Check environment variables
    env_check = {
        "MONGO_URL": "set" if os.environ.get('MONGO_URL') else "missing",
        "DB_NAME": os.environ.get('DB_NAME', 'not set'),
        "RESEND_API_KEY": "set" if os.environ.get('RESEND_API_KEY') else "missing",
        "ADMIN_EMAIL": os.environ.get('ADMIN_EMAIL', 'not set')
    }
    
    return {
        "status": "healthy" if mongo_status == "connected" else "degraded",
        "mongodb": mongo_status,
        "mongodb_error": mongo_error,
        "environment": env_check,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "fix_instructions": "If mongodb shows ssl_error, go to MongoDB Atlas > Network Access > Add IP > Allow Access from Anywhere (0.0.0.0/0)" if mongo_status == "ssl_error" else None
    }

@api_router.get("/test-email/{email}")
async def test_email_endpoint(email: str):
    """
    Test endpoint to debug email sending on Railway using Resend.
    """
    resend_api_key = os.environ.get('RESEND_API_KEY')
    from_email = os.environ.get('FROM_EMAIL', 'onboarding@resend.dev')
    
    if not resend_api_key:
        return {"success": False, "error": "RESEND_API_KEY not configured"}
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": from_email,
                    "to": [email],
                    "subject": "Test Email from Railway via Resend",
                    "html": f"<p>Test email sent at {datetime.now()}</p><p>If you receive this, emails are working! 🎉</p>"
                }
            ) as response:
                result = await response.json()
                if response.status == 200:
                    return {"success": True, "message": f"Email sent to {email}", "resend_response": result}
                else:
                    return {"success": False, "error": result, "status": response.status}
    except Exception as e:
        return {"success": False, "error": str(e)}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# ============ EMAIL HELPER (RESEND) ============

async def send_email_resend(to_email: str, subject: str, html_content: str):
    """
    Send email using Resend API (HTTP-based, works on Railway).
    """
    resend_api_key = os.environ.get('RESEND_API_KEY')
    from_email = os.environ.get('FROM_EMAIL', 'jobNinjas.org <veereddy@jobninjas.org>')
    
    if not resend_api_key:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return False
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": from_email,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content
                }
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
    
    return await send_email_resend(email, "Welcome to jobNinjas Waitlist! 🥷", html_content)


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
    
    return await send_email_resend(email, "Your Call with jobNinjas.org is Booked! 📞", html_content)


async def send_welcome_email(name: str, email: str, token: str = None, referral_code: str = None):
    """
    Send a refined welcome email to new users who sign up.
    """
    frontend_url = os.environ.get('FRONTEND_URL', 'https://jobninjas.org')
    verify_link = f"{frontend_url}/verify-email?token={token}" if token else f"{frontend_url}/dashboard"
    login_link = f"{frontend_url}/login"
    invite_link = f"{frontend_url}/signup?ref={referral_code}" if referral_code else f"{frontend_url}/signup"
    
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
                <h2 class="section-title">Invite and earn</h2>
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
    
    return await send_email_resend(email, f"Welcome to jobNinjas, {name}! 🥷", html_content)


async def send_admin_booking_notification(booking):
    """
    Send notification to admin when someone books a call.
    """
    admin_email = os.environ.get('ADMIN_EMAIL', 'veereddy@jobninjas.org')
    
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
    
    return await send_email_resend(admin_email, f"🔔 New Call Booking: {booking.name}", html_content)

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/signup")
@limiter.limit("5/minute")
async def signup(user_data: UserSignup, request: Request):
    """
    Register a new user and send welcome email.
    """
    try:
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
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
            is_verified=False
        )
        
        # Save to database
        user_dict = user.model_dump()
        user_dict['created_at'] = user_dict['created_at'].isoformat()
        await db.users.insert_one(user_dict)
        logger.info(f"New user signed up: {user.email}")
        
        # Send welcome email in background (don't wait)
        try:
            asyncio.create_task(send_welcome_email(user.name, user.email, verification_token, user.referral_code))
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
                "plan": user.plan
            },
            "token": access_token
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in signup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")

@api_router.post("/auth/login")
@limiter.limit("5/minute")
async def login(credentials: UserLogin, request: Request):
    """
    Login user with email and password.
    """
    user = await db.users.find_one({
        "email": credentials.email
    })
    
    if not user or not verify_password(credentials.password, user.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Auto-upgrade legacy hashes to bcrypt
    if not user.get('password_hash', '').startswith('$2b$'):
        new_hash = hash_password(credentials.password)
        await db.users.update_one({"id": user['id']}, {"$set": {"password_hash": new_hash}})
        logger.info(f"Upgraded password hash for user: {credentials.email}")
    
    # Generate secure JWT access token
    access_token = create_access_token(data={"sub": user['email'], "id": user['id']})
    
    return {
        "success": True,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
            "role": user['role'],
            "plan": user.get('plan'),
            "is_verified": user.get('is_verified', False),
            "referral_code": user.get('referral_code')
        },
        "token": access_token
    }

@api_router.get("/auth/verify-email")
async def verify_email(token: str):
    """
    Verify user email using the token.
    """
    user = await db.users.find_one({"verification_token": token})
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    await db.users.update_one(
        {"id": user['id']},
        {"$set": {"is_verified": True}, "$unset": {"verification_token": ""}}
    )
    
    logger.info(f"User email verified: {user['email']}")
    
    return {"success": True, "message": "Email verified successfully"}

@api_router.post("/auth/resend-verification")
@limiter.limit("3/minute")
async def resend_verification(request: Request):
    """
    Resend verification email to the logged-in user.
    """
    try:
        # Get token from header
        token = request.headers.get('token')
        if not token:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        email = get_current_user_email(token)
        user = await db.users.find_one({"email": email})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if user.get('is_verified'):
            return {"success": True, "message": "Email is already verified"}
            
        # Generate new token or use existing one
        verification_token = user.get('verification_token')
        if not verification_token:
            verification_token = str(uuid.uuid4())
            await db.users.update_one(
                {"id": user['id']},
                {"$set": {"verification_token": verification_token}}
            )
            
        # Send email in background
        asyncio.create_task(send_welcome_email(user['name'], user['email'], verification_token, user.get('referral_code')))
        
        return {"success": True, "message": "Verification email resent"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resending verification: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to resend verification email")

@api_router.get("/auth/users")
async def get_all_users():
    """
    Get all registered users (admin endpoint).
    """
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return {"users": users, "count": len(users)}

# ============ PROFILE ENDPOINTS ============

@api_router.get("/profile/{email}")
async def get_profile(email: str):
    """
    Get user profile by email.
    """
    profile = await db.profiles.find_one({"email": email}, {"_id": 0})
    
    if not profile:
        return {"profile": None}
    
    return {"profile": profile}

@api_router.post("/profile")
async def save_profile(request: Request):
    """
    Save or update user profile.
    Handles multipart form data including file uploads.
    """
    form_data = await request.form()
    
    email = form_data.get('email')
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Build profile data
    profile_data = {
        "email": email,
        "fullName": form_data.get('fullName', ''),
        "phone": form_data.get('phone', ''),
        
        # Professional Info
        "yearsOfExperience": form_data.get('yearsOfExperience', ''),
        "currentRole": form_data.get('currentRole', ''),
        "targetRole": form_data.get('targetRole', ''),
        "expectedSalary": form_data.get('expectedSalary', ''),
        "preferredLocations": form_data.get('preferredLocations', ''),
        "remotePreference": form_data.get('remotePreference', ''),
        "preferredJobTypes": form_data.get('preferredJobTypes', ''),
        "noticePeriod": form_data.get('noticePeriod', ''),
        
        # Visa & Work Authorization
        "visaStatus": form_data.get('visaStatus', ''),
        "requiresSponsorship": form_data.get('requiresSponsorship', ''),
        "willingToRelocate": form_data.get('willingToRelocate', ''),
        
        # Job Portal Credentials (encrypted in production)
        "linkedinUrl": form_data.get('linkedinUrl', ''),
        "linkedinEmail": form_data.get('linkedinEmail', ''),
        "linkedinPassword": form_data.get('linkedinPassword', ''),
        "indeedEmail": form_data.get('indeedEmail', ''),
        "indeedPassword": form_data.get('indeedPassword', ''),
        
        # Gmail for job applications
        "gmailEmail": form_data.get('gmailEmail', ''),
        "gmailPassword": form_data.get('gmailPassword', ''),
        
        # Skills & Background
        "skills": form_data.get('skills', ''),
        "education": form_data.get('education', ''),
        "certifications": form_data.get('certifications', ''),
        "additionalNotes": form_data.get('additionalNotes', ''),
        
        # Metadata
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Handle resume file upload
    resume_file = form_data.get('resume')
    if resume_file and hasattr(resume_file, 'read'):
        # In production, upload to S3/GCS and store URL
        # For now, just store the filename
        profile_data['resumeFileName'] = resume_file.filename
        logger.info(f"Resume uploaded for {email}: {resume_file.filename}")
    
    # Upsert profile (update if exists, insert if not)
    result = await db.profiles.update_one(
        {"email": email},
        {"$set": profile_data},
        upsert=True
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
    doc['created_at'] = doc['created_at'].isoformat()
    
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
        if isinstance(entry.get('created_at'), str):
            entry['created_at'] = datetime.fromisoformat(entry['created_at'])
    
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
        doc['created_at'] = doc['created_at'].isoformat()
        
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

@api_router.get("/call-bookings", response_model=List[CallBooking])
async def get_call_bookings():
    """
    Get all call bookings (admin use).
    """
    bookings = await db.call_bookings.find({}, {"_id": 0}).to_list(1000)
    
    for booking in bookings:
        if isinstance(booking.get('created_at'), str):
            booking['created_at'] = datetime.fromisoformat(booking['created_at'])
    
    return bookings

@api_router.patch("/call-bookings/{booking_id}")
async def update_call_booking_status(booking_id: str, status: str):
    """
    Update call booking status (admin use).
    """
    result = await db.call_bookings.update_one(
        {'id': booking_id},
        {'$set': {'status': status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"message": "Booking status updated", "status": status}

# ============ GOOGLE SHEETS INTEGRATION ============

@api_router.get("/applications/{user_email}")
async def get_user_applications(user_email: str):
    """
    Fetch applications for a specific user from Google Sheets.
    Employees update the Google Sheet, and this endpoint reads from it.
    """
    try:
        sheet_id = os.environ.get('GOOGLE_SHEET_ID')
        api_key = os.environ.get('GOOGLE_API_KEY')
        
        if not sheet_id or not api_key:
            logger.warning("Google Sheets not configured, returning empty list")
            return {"applications": [], "stats": {"total": 0, "this_week": 0, "interviews": 0}}
        
        # Fetch data from Google Sheets (A to H columns)
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/Sheet1!A2:H1000?key={api_key}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status != 200:
                    logger.error(f"Google Sheets API error: {response.status}")
                    return {"applications": [], "stats": {"total": 0, "this_week": 0, "interviews": 0}}
                
                data = await response.json()
        
        rows = data.get('values', [])
        
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
                        "job_description": row[7] if len(row) > 7 else ""
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
                "hours_saved": total_count * 0.5  # Estimate 30 min saved per application
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching from Google Sheets: {str(e)}")
        return {"applications": [], "stats": {"total": 0, "this_week": 0, "interviews": 0}}

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
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        
        session_data = create_checkout_session(
            plan_id=request.plan_id,
            user_email=request.user_email,
            user_id=request.user_id,
            success_url=f"{frontend_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/payment/canceled"
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
    if not user or not user.get('referred_by'):
        return
    
    referrer_code = user['referred_by']
    referrer = await db.users.find_one({"referral_code": referrer_code})
    
    if referrer:
        # User gets 5 extra AI tailored applications for referral
        await db.users.update_one(
            {"id": referrer['id']},
            {"$inc": {"ai_applications_bonus": 5}}
        )
        logger.info(f"Granted 5 bonus apps to referrer {referrer['email']} for user {user['email']}")

@api_router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, stripe_signature: Optional[str] = Header(None)):
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
        webhook_event = WebhookEvent(
            event_type=event['type'],
            event_data=event['data']
        )
        await db.webhook_events.insert_one(webhook_event.model_dump())
        
        # Handle different event types
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            
            # Extract subscription data
            subscription_data = SubscriptionData(
                user_id=session.get('client_reference_id'),
                user_email=session.get('customer_email'),
                plan_id=session['metadata'].get('plan_id'),
                stripe_customer_id=session.get('customer'),
                stripe_subscription_id=session.get('subscription'),
                stripe_price_id=session['line_items']['data'][0]['price']['id'] if 'line_items' in session else '',
                status='active',
                current_period_end=datetime.fromtimestamp(session.get('expires_at', 0))
            )
            
            # Save to database
            await db.subscriptions.insert_one(subscription_data.model_dump())
            logger.info(f"Subscription created for user {subscription_data.user_id}")
            
            # Grant referral bonus if applicable
            await grant_referral_bonus(subscription_data.user_id)
        
        elif event['type'] == 'customer.subscription.updated':
            subscription = event['data']['object']
            
            # Update subscription status
            await db.subscriptions.update_one(
                {'stripe_subscription_id': subscription['id']},
                {'$set': {
                    'status': subscription['status'],
                    'current_period_end': datetime.fromtimestamp(subscription['current_period_end']),
                    'updated_at': datetime.utcnow()
                }}
            )
            logger.info(f"Subscription {subscription['id']} updated to {subscription['status']}")
        
        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data']['object']
            
            # Mark subscription as canceled
            await db.subscriptions.update_one(
                {'stripe_subscription_id': subscription['id']},
                {'$set': {
                    'status': 'canceled',
                    'updated_at': datetime.utcnow()
                }}
            )
            logger.info(f"Subscription {subscription['id']} canceled")
        
        elif event['type'] == 'invoice.payment_failed':
            invoice = event['data']['object']
            
            # Update subscription to past_due
            await db.subscriptions.update_one(
                {'stripe_subscription_id': invoice['subscription']},
                {'$set': {
                    'status': 'past_due',
                    'updated_at': datetime.utcnow()
                }}
            )
            logger.warning(f"Payment failed for subscription {invoice['subscription']}")
        
        # Mark event as processed
        await db.webhook_events.update_one(
            {'id': webhook_event.id},
            {'$set': {'processed': True}}
        )
        
        return JSONResponse(content={'status': 'success'})
        
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
        subscription = await db.subscriptions.find_one({'user_id': user_id})
        
        if not subscription:
            raise HTTPException(status_code=404, detail="No subscription found")
        
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        
        portal_data = create_customer_portal_session(
            customer_id=subscription['stripe_customer_id'],
            return_url=f"{frontend_url}/dashboard"
        )
        
        return portal_data
        
    except Exception as e:
        logger.error(f"Error creating portal session: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/subscription/{user_id}")
async def get_subscription(user_id: str):
    """Get user's current subscription."""
    subscription = await db.subscriptions.find_one({'user_id': user_id}, {'_id': 0})
    
    if not subscription:
        return {'status': 'none', 'message': 'No active subscription'}
    
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
        {"employee_email": employee_email, "status": "active"},
        {"_id": 0}
    ).to_list(1000)
    
    customer_emails = [a['customer_email'] for a in assignments]
    
    # Get customer details
    customers = []
    for email in customer_emails:
        user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
        profile = await db.profiles.find_one({"email": email}, {"_id": 0})
        
        # Get application count for this customer
        app_count = await db.job_applications.count_documents({"customer_email": email})
        
        if user:
            customers.append({
                "user": user,
                "profile": profile,
                "application_count": app_count
            })
    
    return {"customers": customers, "count": len(customers)}

@api_router.get("/employee/customer/{customer_email}")
async def get_customer_details(customer_email: str):
    """
    Get detailed information about a specific customer.
    """
    user = await db.users.find_one({"email": customer_email}, {"_id": 0, "password_hash": 0})
    profile = await db.profiles.find_one({"email": customer_email}, {"_id": 0})
    
    # Get applications
    applications = await db.job_applications.find(
        {"customer_email": customer_email},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Get subscription
    subscription = await db.subscriptions.find_one(
        {"user_email": customer_email},
        {"_id": 0}
    )
    
    return {
        "user": user,
        "profile": profile,
        "applications": applications,
        "subscription": subscription
    }

@api_router.post("/employee/application")
async def add_job_application(input: JobApplicationCreate, employee_email: str = None):
    """
    Add a new job application for a customer.
    """
    app_dict = input.model_dump()
    app_dict['employee_email'] = employee_email or "system"
    app_dict['submitted_date'] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    app_obj = JobApplication(**app_dict)
    
    doc = app_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.job_applications.insert_one(doc)
    logger.info(f"New application added for {input.customer_email}: {input.company_name}")
    
    return {"success": True, "application": doc}

@api_router.get("/employee/applications/{customer_email}")
async def get_customer_applications(customer_email: str):
    """
    Get all applications for a specific customer.
    """
    applications = await db.job_applications.find(
        {"customer_email": customer_email},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Calculate stats
    total = len(applications)
    interviews = sum(1 for app in applications if app.get('status') == 'interview')
    submitted = sum(1 for app in applications if app.get('status') == 'submitted')
    
    return {
        "applications": applications,
        "stats": {
            "total": total,
            "interviews": interviews,
            "submitted": submitted,
            "hours_saved": total * 0.5
        }
    }

@api_router.patch("/employee/application/{application_id}")
async def update_application(application_id: str, status: str, notes: Optional[str] = None):
    """
    Update application status and notes.
    """
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if notes:
        update_data["notes"] = notes
    
    result = await db.job_applications.update_one(
        {"id": application_id},
        {"$set": update_data}
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
            "employees": total_employees
        },
        "applications": {
            "total": total_applications
        },
        "bookings": {
            "total": total_bookings,
            "pending": pending_bookings
        },
        "waitlist": waitlist_count,
        "subscriptions": {
            "active": active_subscriptions
        }
    }

@api_router.get("/admin/customers")
async def get_all_customers():
    """
    Get all customers with their profiles and stats.
    """
    users = await db.users.find(
        {"role": "customer"},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    
    customers = []
    for user in users:
        profile = await db.profiles.find_one({"email": user['email']}, {"_id": 0})
        app_count = await db.job_applications.count_documents({"customer_email": user['email']})
        subscription = await db.subscriptions.find_one({"user_email": user['email']}, {"_id": 0})
        assignment = await db.customer_assignments.find_one(
            {"customer_email": user['email'], "status": "active"},
            {"_id": 0}
        )
        
        customers.append({
            "user": user,
            "profile": profile,
            "application_count": app_count,
            "subscription": subscription,
            "assigned_employee": assignment['employee_email'] if assignment else None
        })
    
    return {"customers": customers, "count": len(customers)}

@api_router.get("/admin/employees")
async def get_all_employees():
    """
    Get all employees with their assigned customer counts.
    """
    users = await db.users.find(
        {"role": "employee"},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    
    employees = []
    for user in users:
        customer_count = await db.customer_assignments.count_documents({
            "employee_email": user['email'],
            "status": "active"
        })
        total_applications = await db.job_applications.count_documents({
            "employee_email": user['email']
        })
        
        employees.append({
            "user": user,
            "customer_count": customer_count,
            "total_applications": total_applications
        })
    
    return {"employees": employees, "count": len(employees)}

@api_router.post("/admin/assign-customer")
async def assign_customer_to_employee(customer_email: str, employee_email: str):
    """
    Assign a customer to an employee.
    """
    # Check if already assigned
    existing = await db.customer_assignments.find_one({
        "customer_email": customer_email,
        "status": "active"
    })
    
    if existing:
        # Update assignment
        await db.customer_assignments.update_one(
            {"id": existing['id']},
            {"$set": {"employee_email": employee_email}}
        )
        return {"success": True, "message": "Customer reassigned"}
    
    # Create new assignment
    assignment = CustomerAssignment(
        customer_email=customer_email,
        employee_email=employee_email
    )
    
    doc = assignment.model_dump()
    doc['assigned_at'] = doc['assigned_at'].isoformat()
    
    await db.customer_assignments.insert_one(doc)
    logger.info(f"Customer {customer_email} assigned to {employee_email}")
    
    return {"success": True, "message": "Customer assigned"}

@api_router.patch("/admin/user/{user_id}/role")
async def update_user_role(user_id: str, role: str):
    """
    Update a user's role (customer, employee, admin).
    """
    if role not in ['customer', 'employee', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": role}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": f"User role updated to {role}"}

@api_router.get("/admin/bookings")
async def get_all_bookings():
    """
    Get all call bookings with stats.
    """
    bookings = await db.call_bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Convert datetime strings
    for booking in bookings:
        if isinstance(booking.get('created_at'), str):
            booking['created_at'] = datetime.fromisoformat(booking['created_at'])
    
    pending = sum(1 for b in bookings if b.get('status') == 'pending')
    contacted = sum(1 for b in bookings if b.get('status') == 'contacted')
    
    return {
        "bookings": bookings,
        "stats": {
            "total": len(bookings),
            "pending": pending,
            "contacted": contacted
        }
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
    jobId: Optional[str] = None
    jobTitle: str
    company: str
    location: Optional[str] = None
    workType: Optional[str] = None
    tags: List[str] = []
    emailUsed: Optional[str] = None
    resumeId: Optional[str] = None
    coverLetterId: Optional[str] = None
    applicationLink: Optional[str] = None
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

class AIApplyResponse(BaseModel):
    applicationId: str
    tailoredResume: str
    tailoredCoverLetter: str
    suggestedAnswers: List[dict]

async def get_user_usage_limits(identifier: str) -> dict:
    """
    Calculate user's resume usage limits based on their plan and billing cycle.
    Supports either email or userId as identifier.
    """
    if not identifier:
        return {
            "tier": "free",
            "currentCount": 0,
            "limit": 5,
            "canGenerate": False,
            "resetDate": None,
            "totalResumes": 0
        }

    # Try finding by email first, then by id
    user = await db.users.find_one({
        "$or": [
            {"email": identifier},
            {"id": identifier}
        ]
    })
    
    if not user:
        return {
            "tier": "free",
            "currentCount": 0,
            "limit": 5,
            "canGenerate": True,
            "resetDate": None,
            "totalResumes": 0
        }
    
    # Get all-time resume count
    user_id = user.get('id') or user.get('_id')
    total_resumes = await db.resumes.count_documents({"userId": str(user_id)})
    
    # Determine tier
    tier = user.get('plan', 'free')
    if not tier: tier = 'free'
    
    # Simple check for subscription field which might be more accurate if present
    sub = user.get('subscription', {})
    if sub and sub.get('status') == 'active':
        tier_id = sub.get('plan_id', tier)
        if 'pro' in tier_id.lower():
            tier = 'pro'
        elif 'beginner' in tier_id.lower():
            tier = 'beginner'

    # Hardcoded limits for now as per user instruction
    # Free: 5 total
    # Beginner: 200 per month
    # Pro: Unlimited
    
    limit = 5
    current_count = total_resumes
    can_generate = False
    reset_date = None
    
    if str(tier).strip().lower() == 'pro':
        limit = "Unlimited"
        can_generate = True
        current_count = total_resumes 
    elif tier == 'beginner':
        limit = 200
        # Calculate monthly count based on billing cycle
        activated_at = sub.get('activated_at')
        if isinstance(activated_at, str):
            activated_at = datetime.fromisoformat(activated_at.replace('Z', '+00:00'))
        
        if activated_at:
            # Find the start of the current billing cycle
            now = datetime.now(timezone.utc)
            months_diff = (now.year - activated_at.year) * 12 + now.month - activated_at.month
            if now.day < activated_at.day:
                months_diff -= 1
            
            # Start of current cycle
            from dateutil.relativedelta import relativedelta
            cycle_start = activated_at + relativedelta(months=months_diff)
            cycle_end = cycle_start + relativedelta(months=1)
            reset_date = cycle_end
            
            current_count = await db.resumes.count_documents({
                "userId": user['id'],
                "createdAt": {"$gte": cycle_start}
            })
        else:
            # Fallback to total if no activation date
            current_count = total_resumes
            
        can_generate = current_count < limit
    else: # free
        limit = 5
        can_generate = total_resumes < limit
        
    return {
        "tier": tier,
        "currentCount": current_count,
        "limit": limit,
        "canGenerate": can_generate,
        "resetDate": reset_date,
        "totalResumes": total_resumes
    }

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

@api_router.post("/fetch-job-description")
async def fetch_job_desc(request: JobUrlFetchRequest):
    """
    Fetch and extract job description from a URL.
    """
    try:
        url = request.url.strip()
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")
        
        result = await scrape_job_description(url)
        return result
    except Exception as e:
        error_details = traceback.format_exc()
        logger.error(f"Error in fetch_job_desc: {e}\n{error_details}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/resumes")
async def get_resumes(email: str = Query(...)):
    """
    Get all resumes for the user from saved_resumes.
    """
    try:
        resumes = await db.saved_resumes.find(
            {"userEmail": email}
        ).sort("updatedAt", -1).to_list(10)
        
        for resume in resumes:
            resume["id"] = str(resume.pop("_id"))
            resume["textPreview"] = resume.get("resumeText", "")[:200] + "..."
        
        return {
            "success": True,
            "resumes": resumes
        }
    except Exception as e:
        logger.error(f"Error getting resumes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai-ninja/apply")
async def ai_ninja_apply(request: Request):
    """
    AI Ninja apply endpoint - generates tailored resume, cover letter, and Q&A.
    Accepts multipart form data with resume file.
    """
    try:
        form = await request.form()
        
        userId = form.get('userId')
        if not userId or userId == 'guest':
            raise HTTPException(status_code=401, detail="Authentication required to use AI Ninja")
            
        # Get user to verify tier and usage
        user = await db.users.find_one({"id": userId})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Enforce email verification
        ensure_verified(user)
            
        # Check usage limits
        usage = await get_user_usage_limits(user['email'])
        if not usage['canGenerate']:
            raise HTTPException(
                status_code=403, 
                detail=f"Usage limit reached ({usage['limit']} resumes). Please upgrade to continue."
            )

        jobId = form.get('jobId', '')
        jobTitle = form.get('jobTitle', '')
        company = form.get('company', '')
        if not company:
            raise HTTPException(status_code=400, detail="Company name is required")
            
        jobDescription = form.get('jobDescription', '')
        jobUrl = form.get('jobUrl', '')
        yearsOfExperience = form.get('yearsOfExperience', '')
        primarySkills = form.get('primarySkills', '')
        visaStatus = form.get('visaStatus', '')
        targetSalary = form.get('targetSalary', '')
        preferredWorkType = form.get('preferredWorkType', '')
        
        # Get resume file if uploaded or text provided
        resumeFile = form.get('resume')
        resumeText = form.get('resumeText', '')
        
        if resumeFile and not isinstance(resumeFile, str):
            from resume_parser import parse_resume
            file_content = await resumeFile.read()
            resumeText = await parse_resume(file_content, resumeFile.filename)
        elif not resumeText and resumeFile:
            resumeText = str(resumeFile)
            
        if not resumeText:
            raise HTTPException(status_code=400, detail="Resume content is missing. Please upload a resume.")
            
        # Generate application ID
        applicationId = str(uuid.uuid4())
        
        # Call Expert AI Ninja for tailored documents with HARD TIMEOUT
        logger.info(f"Generating expert documents for {company} - {jobTitle}")
        expert_docs = None
        try:
            # 30 second hard timeout to prevent infinite spinning
            async with asyncio.timeout(30):
                expert_docs = await generate_expert_documents(resumeText, jobDescription)
        except asyncio.TimeoutError:
            logger.warning(f"Expert AI generation timed out after 30s for {company}")
            expert_docs = None
        except Exception as e:
            logger.error(f"Expert AI generation failed: {e}")
            expert_docs = None
        
        if not expert_docs or "ats_resume" not in expert_docs:
            logger.warning("Expert AI failed or timed out - using immediate fallback")
            # Immediate fallback - give user SOMETHING right now
            tailoredResume = f"""RESUME - {jobTitle}

PROFESSIONAL CANDIDATE

SUMMARY
Experienced professional seeking the {jobTitle} position at {company}. 
Background demonstrates relevant expertise and qualifications for this role.

ORIGINAL RESUME TEXT:
{resumeText[:3000]}

---
(Note: AI was temporarily busy. Your original resume content is preserved above. 
Edit as needed or try generating again later.)
"""
            detailedCv = tailoredResume
            tailoredCoverLetter = f"""Dear Hiring Manager,

I am writing to express my strong interest in the {jobTitle} position at {company}.

My background and experience make me a strong candidate for this role. I am confident that my skills and dedication would be a valuable addition to your team.

I would welcome the opportunity to discuss how my qualifications align with your needs.

Sincerely,
[Your Name]

---
(Note: AI was temporarily busy. Please personalize this letter with your specific achievements.)
"""
        else:
            tailoredResume = expert_docs.get("ats_resume", "")
            detailedCv = expert_docs.get("detailed_cv", "")
            tailoredCoverLetter = expert_docs.get("cover_letter", "")
            # If cover letter is missing from expert_docs, try to generate it
            if not tailoredCoverLetter:
                try:
                    async with asyncio.timeout(15):
                        tailoredCoverLetter = await generate_cover_letter_content(
                            resumeText, jobDescription, jobTitle, company
                        )
                except:
                    tailoredCoverLetter = None
        
        if not tailoredCoverLetter:
            tailoredCoverLetter = f"Dear Hiring Manager,\n\nI am excited to apply for the {jobTitle} at {company}..."
        
        suggestedAnswers = [
            {
                "question": "Why are you interested in this role?",
                "answer": f"I'm drawn to the {jobTitle} role at {company} because it perfectly aligns with my professional background and career goals. The opportunity to work on innovative solutions while contributing to a dynamic team is exactly what I'm looking for."
            },
            {
                "question": "Why do you want to work at this company?",
                "answer": f"{company} stands out for its reputation for innovation and commitment to excellence. The company's focus on impactful work and collaborative culture makes it an ideal environment where I can contribute meaningfully."
            }
        ]
        
        # No longer auto-saving every tailored resume to db.resumes to enforce 3-resume limit
        # await db.resumes.insert_one(resume_doc)
        
        # Save application to database
        application = Application(
            id=applicationId,
            userId=userId,
            jobId=jobId,
            jobTitle=jobTitle,
            company=company,
            workType=preferredWorkType,
            resumeId=resume_id,
            status="applied"
        )
        
        doc = application.model_dump()
        doc['createdAt'] = doc['createdAt'].isoformat()
        doc['updatedAt'] = doc['updatedAt'].isoformat()
        
        await db.applications.insert_one(doc)
        
        logger.info(f"AI Ninja application and resume created: {applicationId} for {jobTitle} at {company}")
        
        # Get updated usage
        new_usage = await get_user_usage_limits(user['email'])
        
        return {
            "applicationId": applicationId,
            "resumeId": resume_id,
            "tailoredResume": tailoredResume,
            "detailedCv": detailedCv,
            "tailoredCoverLetter": tailoredCoverLetter,
            "suggestedAnswers": suggestedAnswers,
            "usage": new_usage
        }
        
    except Exception as e:
        logger.error(f"Error in AI Ninja apply: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/applications/{user_id}")
async def get_user_applications(user_id: str):
    """
    Get all applications for a user (both AI Ninja and Human Ninja).
    Supports either UUID or email as user_id.
    """
    try:
        # Check if user_id is an email or UUID
        query = {"userId": user_id}
        if "@" in user_id:
            user = await db.users.find_one({"email": user_id})
            if user:
                query = {"userId": user['id']}
        
        applications = await db.applications.find(
            query,
            {"_id": 0}
        ).sort("createdAt", -1).to_list(1000)
        
        # Convert datetime strings
        for app in applications:
            if isinstance(app.get('createdAt'), str):
                try:
                    app['createdAt'] = datetime.fromisoformat(app['createdAt'].replace('Z', '+00:00'))
                except: pass
            if isinstance(app.get('updatedAt'), str):
                try:
                    app['updatedAt'] = datetime.fromisoformat(app['updatedAt'].replace('Z', '+00:00'))
                except: pass
        
        return {
            "applications": applications,
            "total": len(applications)
        }
    except Exception as e:
        logger.error(f"Error fetching applications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.patch("/applications/{application_id}/status")
async def update_application_status(application_id: str, status: str):
    """
    Update application status.
    """
    valid_statuses = ['applied', 'interview', 'rejected', 'offer', 'on_hold']
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.applications.update_one(
        {"id": application_id},
        {"$set": {"status": status, "updatedAt": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {"success": True, "status": status}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "http://localhost:3000",
        "https://jobninjas.org",
        "https://www.jobninjas.org",
        "https://novaninjas.vercel.app" # Backup for Vercel
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

# ============================================
# JOB BOARD API ENDPOINTS
# ============================================

@app.get("/api/jobs")
async def get_jobs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    type: Optional[str] = Query(None),  # remote, hybrid, onsite
    visa: Optional[bool] = Query(None),  # visa-sponsoring jobs
    high_pay: Optional[bool] = Query(None),  # high-paying jobs
):
    """
    Get paginated job listings with filters
    """
    try:
        # Build query - show all jobs (active check removed for now)
        query = {}
        
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"company": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        if type:
            query["type"] = type
        
        if visa:
            query["visaTags"] = {"$in": ["visa-sponsoring"]}
        
        if high_pay:
            query["highPay"] = True
        
        # Get total count
        total = await db.jobs.count_documents(query)
        
        # Get paginated results
        skip = (page - 1) * limit
        cursor = db.jobs.find(query).sort("createdAt", -1).skip(skip).limit(limit)
        jobs = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string and ensure id field exists
        for job in jobs:
            if "_id" in job:
                job["id"] = str(job.pop("_id"))
            elif "externalId" in job and "id" not in job:
                job["id"] = job["externalId"]
        
        return {
            "success": True,
            "jobs": jobs,
            "total": total,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching jobs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch jobs")


@app.get("/api/jobs/{job_id}")
async def get_job_by_id(job_id: str):
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
        
        job["id"] = str(job.pop("_id"))
        
        return {"success": True, "job": job}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching job: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch job")


@app.get("/api/jobs/stats/summary")
async def get_jobs_stats():
    """
    Get job board statistics
    """
    try:
        # Use impressive marketing numbers as requested
        total_jobs = 5248192 # 5M+ jobs
        daily_new = 10452     # 10k+ daily
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
                "highPayJobs": high_pay_jobs
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching job stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch job stats")


@app.post("/api/jobs/refresh")
async def refresh_jobs():
    """
    Manually trigger job refresh (admin only - add auth later)
    """
    try:
        count = await scheduled_job_fetch(db)
        return {
            "success": True,
            "message": f"Refreshed {count} jobs",
            "count": count
        }
    except Exception as e:
        logger.error(f"Error refreshing jobs: {e}")
        raise HTTPException(status_code=500, detail="Failed to refresh jobs")


# ============================================
# RAZORPAY PAYMENT ENDPOINTS
# ============================================

class RazorpayOrderRequest(BaseModel):
    plan_id: str
    user_email: str
    currency: str = 'INR'  # 'INR' or 'USD'

class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_id: str
    user_email: str


@app.post("/api/razorpay/create-order")
async def create_razorpay_order_endpoint(request: RazorpayOrderRequest):
    """
    Create a Razorpay order for payment
    """
    try:
        order = create_razorpay_order(
            plan_id=request.plan_id,
            user_email=request.user_email,
            currency=request.currency
        )
        
        if not order:
            raise HTTPException(status_code=400, detail="Failed to create order")
        
        if order.get('free'):
            return {
                "success": True,
                "free": True,
                "message": "Free plan - no payment required"
            }
        
        return {
            "success": True,
            "order": order
        }
        
    except Exception as e:
        logger.error(f"Error creating Razorpay order: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment order")


@app.post("/api/razorpay/verify-payment")
async def verify_razorpay_payment_endpoint(request: RazorpayVerifyRequest):
    """
    Verify Razorpay payment and activate subscription
    """
    try:
        # Verify payment signature
        is_valid = verify_razorpay_payment(
            order_id=request.razorpay_order_id,
            payment_id=request.razorpay_payment_id,
            signature=request.razorpay_signature
        )
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Payment verification failed")
        
        # Get payment details
        payment = get_payment_details(request.razorpay_payment_id)
        
        # Update user subscription in database
        await db.users.update_one(
            {"email": request.user_email},
            {
                "$set": {
                    "subscription": {
                        "plan_id": request.plan_id,
                        "payment_id": request.razorpay_payment_id,
                        "order_id": request.razorpay_order_id,
                        "status": "active",
                        "amount": payment.get('amount', 0) if payment else 0,
                        "currency": payment.get('currency', 'INR') if payment else 'INR',
                        "activated_at": datetime.now(timezone.utc),
                        "provider": "razorpay"
                    }
                }
            }
        )
        
        # Log the payment
        await db.payments.insert_one({
            "user_email": request.user_email,
            "plan_id": request.plan_id,
            "payment_id": request.razorpay_payment_id,
            "order_id": request.razorpay_order_id,
            "amount": payment.get('amount', 0) if payment else 0,
            "currency": payment.get('currency', 'INR') if payment else 'INR',
            "status": "success",
            "provider": "razorpay",
            "created_at": datetime.now(timezone.utc)
        })
        
        logger.info(f"Payment successful for {request.user_email}, plan: {request.plan_id}")
        
        return {
            "success": True,
            "message": "Payment verified and subscription activated",
            "plan_id": request.plan_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying payment: {e}")
        raise HTTPException(status_code=500, detail="Payment verification failed")


@app.get("/api/razorpay/plans")
async def get_razorpay_plans(currency: str = 'INR'):
    """
    Get available plans with pricing
    """
    plans = RAZORPAY_PLANS_USD if currency == 'USD' else RAZORPAY_PLANS
    return {
        "success": True,
        "plans": plans,
        "currency": currency
    }


# ============================================
# SCHEDULER SETUP
# ============================================

# Background task to fetch jobs periodically
async def job_fetch_background_task():
    """Background task that runs every 6 hours to fetch new jobs"""
    # Initial fetch on startup
    try:
        logger.info("🚀 Running initial job fetch on startup...")
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
    create_text_docx
)
from fastapi.responses import StreamingResponse

# ============================================
# AI GENERATION ENDPOINT FOR TOOLS
# ============================================

class AIGenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 1000

@app.post("/api/ai/generate")
async def generate_ai_content(request: AIGenerateRequest, user: dict = Depends(get_current_user)):
    """
    General-purpose AI text generation endpoint for tools like
    Bullet Points Generator, Summary Generator, LinkedIn Optimizer.
    """
    try:
        # Enforce email verification
        ensure_verified(user)
        
        from resume_analyzer import call_groq_api
        
        response = await call_groq_api(
            request.prompt, 
            max_tokens=request.max_tokens,
            model="llama-3.1-8b-instant"
        )
        
        if not response:
            raise HTTPException(status_code=500, detail="AI generation failed")
        
        return {
            "success": True,
            "response": response
        }
    except Exception as e:
        logger.error(f"AI generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scan/analyze")
async def scan_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(...)
):
    """
    Analyze a resume against a job description
    Returns match score and detailed analysis
    """
    try:
        # Validate file
        file_content = await resume.read()
        validation_error = validate_resume_file(resume.filename, len(file_content))
        if validation_error:
            raise HTTPException(status_code=400, detail=validation_error)
        
        # Parse resume
        resume_text = await parse_resume(file_content, resume.filename)
        if not resume_text.strip():
            raise HTTPException(
                status_code=400, 
                detail="Could not extract text from resume. Please ensure it's not an image-based PDF."
            )
        
        # Analyze with Gemini
        analysis = await analyze_resume(resume_text, job_description)
        
        if "error" in analysis:
            raise HTTPException(status_code=500, detail=analysis["error"])
        
        return {
            "success": True,
            "analysis": analysis,
            "resumeText": resume_text,  # Return for document generation
            "resumeTextLength": len(resume_text)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resume scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scan/parse")
async def parse_resume_endpoint(
    resume: UploadFile = File(...)
):
    """
    Parse a resume and extract structured data
    """
    try:
        # Validate file
        file_content = await resume.read()
        validation_error = validate_resume_file(resume.filename, len(file_content))
        if validation_error:
            raise HTTPException(status_code=400, detail=validation_error)
        
        # Parse resume text
        resume_text = await parse_resume(file_content, resume.filename)
        if not resume_text.strip():
            raise HTTPException(
                status_code=400, 
                detail="Could not extract text from resume"
            )
        
        # Extract structured data with Gemini
        parsed_data = await extract_resume_data(resume_text)
        
        return {
            "success": True,
            "data": parsed_data,
            "resumeText": resume_text  # Changed from rawText to match frontend
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resume parse error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class GenerateResumeRequest(BaseModel):
    userId: str
    resume_text: str
    job_description: str
    job_title: str = "Position"
    company: str = "Company"
    analysis: dict
    is_already_tailored: bool = False


@app.post("/api/generate/resume")
async def generate_resume_docx(request: GenerateResumeRequest):
    """
    Generate an optimized resume as a Word document
    """
    try:
        # Get user to verify status
        user = await db.users.find_one({"id": request.userId})
        if user:
            ensure_verified(user)
        
        # Check if we should use raw text or structured data
        if hasattr(request, 'resume_text') and not request.resume_text.startswith('{') and request.is_already_tailored:
            # It's raw text from Expert AI that is already tailored
            docx_file = create_text_docx(request.resume_text, "ATS_Resume")
        elif not request.resume_text.startswith('{'):
            # It's raw text that NEEDS tailoring - use the high-quality expert pipeline
            # This is the flow for Resume Scanner and One-Click Optimize
            expert_docs = await generate_expert_documents(request.resume_text, request.job_description)
            
            if expert_docs and expert_docs.get('ats_resume'):
                docx_file = create_text_docx(expert_docs['ats_resume'], "Optimized_Resume")
            else:
                # Fallback to standard optimization if expert fails
                resume_data = await generate_optimized_resume_content(
                    request.resume_text,
                    request.job_description,
                    request.analysis
                )
                if not resume_data:
                    raise HTTPException(status_code=500, detail="Failed to generate resume content")
                docx_file = create_resume_docx(resume_data)
        else:
            # Generate optimized content from structured data (original flow)
            resume_data = await generate_optimized_resume_content(
                request.resume_text,
                request.job_description,
                request.analysis
            )
            
            if not resume_data:
                raise HTTPException(status_code=500, detail="Failed to generate resume content")
            
            # Create Word document
            docx_file = create_resume_docx(resume_data)
        
        # Sanitize company name for header
        safe_company = request.company.replace(' ', '_').replace('"', '')
        
        # Return as downloadable file
        return StreamingResponse(
            docx_file,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="Optimized_Resume_{safe_company}.docx"'
            }
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
        docx_file = create_text_docx(request.resume_text, "Detailed_CV")
        
        # Sanitize company name for header
        safe_company = request.company.replace(' ', '_').replace('"', '')
        
        # Return as downloadable file
        return StreamingResponse(
            docx_file,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="Detailed_CV_{safe_company}.docx"'
            }
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
        
        # Generate cover letter content
        cover_letter_text = await generate_cover_letter_content(
            request.resume_text,
            request.job_description,
            request.job_title,
            request.company
        )
        
        if not cover_letter_text:
            raise HTTPException(status_code=500, detail="Failed to generate cover letter")
        
        # Create Word document
        docx_file = create_cover_letter_docx(cover_letter_text, request.job_title, request.company)
        
        # Sanitize company name for header
        safe_company = request.company.replace(' ', '_').replace('"', '')
        
        # Return as downloadable file
        return StreamingResponse(
            docx_file,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="Cover_Letter_{safe_company}.docx"'
            }
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


@app.post("/api/resumes/save")
async def save_user_resume(request: SaveResumeRequest):
    """
    Save a user's resume for future use (Limit: 3)
    """
    try:
        # Check if resume with same name exists
        existing = await db.saved_resumes.find_one({
            "userEmail": request.user_email,
            "resumeName": request.resume_name
        })
        
        if existing:
            # Update existing - does not count towards limit
            await db.saved_resumes.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "resumeText": request.resume_text,
                    "fileName": request.file_name,
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {"success": True, "message": "Resume updated", "id": str(existing["_id"])}
        
        # Check limit only for new resumes
        count = await db.saved_resumes.count_documents({"userEmail": request.user_email})
        if count >= 3:
             raise HTTPException(status_code=400, detail="You can only save up to 3 resumes. Please delete one to add a new one.")

        # Create new
        resume_doc = {
            "userEmail": request.user_email,
            "resumeName": request.resume_name,
            "resumeText": request.resume_text,
            "fileName": request.file_name,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db.saved_resumes.insert_one(resume_doc)
        
        return {
            "success": True,
            "message": "Resume saved",
            "id": str(result.inserted_id)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Save resume error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/resumes/{user_email}")
async def get_user_resumes(user_email: str):
    """
    Get all saved resumes for a user
    """
    try:
        resumes = await db.saved_resumes.find(
            {"userEmail": user_email}
        ).sort("updatedAt", -1).to_list(length=20)
        
        for resume in resumes:
            resume["id"] = str(resume.pop("_id"))
            # Keep resumeText so frontend can use it when selected
            resume["textPreview"] = resume.get("resumeText", "")[:200] + "..."
        
        return {
            "success": True,
            "resumes": resumes
        }
        
    except Exception as e:
        logger.error(f"Get resumes error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        
        return {
            "success": True,
            "resume": resume
        }
        
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


@app.post("/api/scan/save")
async def save_scan(request: ScanSaveRequest):
    """
    Save a scan to user's history
    """
    try:
        scan_doc = {
            "userEmail": request.user_email,
            "jobTitle": request.job_title,
            "company": request.company,
            "jobDescription": request.job_description[:5000],  # Limit size
            "analysis": request.analysis,
            "matchScore": request.analysis.get("matchScore", 0),
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db.scans.insert_one(scan_doc)
        
        return {
            "success": True,
            "scanId": str(result.inserted_id)
        }
        
    except Exception as e:
        logger.error(f"Save scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scans/{user_email}")
async def get_user_scans(user_email: str, limit: int = 20):
    """
    Get user's scan history
    """
    try:
        scans = await db.scans.find(
            {"userEmail": user_email}
        ).sort("createdAt", -1).limit(limit).to_list(length=limit)
        
        for scan in scans:
            scan["id"] = str(scan.pop("_id"))
        
        return {
            "success": True,
            "scans": scans
        }
        
    except Exception as e:
        logger.error(f"Get scans error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scan/{scan_id}")
async def get_scan_by_id(scan_id: str):
    """
    Get a specific scan by ID
    """
    try:
        from bson import ObjectId
        
        scan = await db.scans.find_one({"_id": ObjectId(scan_id)})
        
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        
        scan["id"] = str(scan.pop("_id"))
        
        return {
            "success": True,
            "scan": scan
        }
        
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
    status: Optional[str] = "materials_ready"  # materials_ready, applied, interviewing, offered, rejected
    createdAt: Optional[str] = None
    appliedAt: Optional[str] = None
    notes: Optional[str] = ""

@app.post("/api/applications")
async def save_application(application: ApplicationData):
    """
    Save a job application to the tracker
    """
    try:
        app_doc = {
            "userEmail": application.userEmail,
            "jobId": application.jobId,
            "jobTitle": application.jobTitle,
            "company": application.company,
            "location": application.location,
            "jobDescription": application.jobDescription[:5000] if application.jobDescription else "",
            "sourceUrl": application.sourceUrl,
            "salaryRange": application.salaryRange,
            "matchScore": application.matchScore,
            "status": application.status,
            "createdAt": application.createdAt or datetime.now(timezone.utc).isoformat(),
            "appliedAt": application.appliedAt,
            "notes": application.notes,
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db.applications.insert_one(app_doc)
        
        return {
            "success": True,
            "applicationId": str(result.inserted_id),
            "message": "Application saved to tracker"
        }
        
    except Exception as e:
        logger.error(f"Save application error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/applications/{user_email}")
async def get_user_applications(user_email: str, status: Optional[str] = None, limit: int = 50):
    """
    Get all applications for a user
    """
    try:
        query = {"userEmail": user_email}
        if status:
            query["status"] = status
        
        applications = await db.applications.find(query).sort("createdAt", -1).limit(limit).to_list(length=limit)
        
        for app in applications:
            app["id"] = str(app.pop("_id"))
        
        # Get stats
        total = await db.applications.count_documents({"userEmail": user_email})
        applied = await db.applications.count_documents({"userEmail": user_email, "status": "applied"})
        interviewing = await db.applications.count_documents({"userEmail": user_email, "status": "interviewing"})
        
        return {
            "success": True,
            "applications": applications,
            "stats": {
                "total": total,
                "applied": applied,
                "interviewing": interviewing
            }
        }
        
    except Exception as e:
        logger.error(f"Get applications error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/applications/{application_id}")
async def update_application(application_id: str, status: str = None, notes: str = None, appliedAt: str = None):
    """
    Update an application status
    """
    try:
        from bson import ObjectId
        
        update_data = {"updatedAt": datetime.now(timezone.utc).isoformat()}
        if status:
            update_data["status"] = status
        if notes is not None:
            update_data["notes"] = notes
        if appliedAt:
            update_data["appliedAt"] = appliedAt
        
        result = await db.applications.update_one(
            {"_id": ObjectId(application_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Application not found")
        
        return {
            "success": True,
            "message": "Application updated"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update application error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/applications/{application_id}")
async def delete_application(application_id: str):
    """
    Delete an application
    """
    try:
        from bson import ObjectId
        
        result = await db.applications.delete_one({"_id": ObjectId(application_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Application not found")
        
        return {
            "success": True,
            "message": "Application deleted"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete application error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health-check")
async def health_check():
    from resume_analyzer import GROQ_API_KEY
    return {
        "status": "ok",
        "mongodb": "connected" if db is not None else "failed",
        "groq_api_key_set": GROQ_API_KEY is not None and len(GROQ_API_KEY) > 0,
        "env_check": os.environ.get('GROQ_API_KEY') is not None
    }

# ============================================
# APP STARTUP & SHUTDOWN
# ============================================

@app.on_event("startup")
async def startup_event():
    """Initialize background tasks on startup"""
    logger.info("🚀 Starting Job Ninjas backend...")
    
    # Start the background job fetcher (runs every 6 hours, including immediately on startup)
    asyncio.create_task(job_fetch_background_task())
    logger.info("📅 Job fetch scheduler started (fetches immediately, then every 6 hours)")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()