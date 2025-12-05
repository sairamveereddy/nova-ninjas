from fastapi import FastAPI, APIRouter, Request, Header, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiosmtplib
import aiohttp
from models import CheckoutRequest, SubscriptionData, WebhookEvent
from payment_service import create_checkout_session, verify_webhook_signature, create_customer_portal_session


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Setup logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSignup(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    plan: Optional[str] = None
    created_at: datetime

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.get("/test-email/{email}")
async def test_email_endpoint(email: str):
    """
    Test endpoint to debug email sending on Railway.
    """
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.zoho.com')
    smtp_port = int(os.environ.get('SMTP_PORT', 465))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    from_email = os.environ.get('FROM_EMAIL', smtp_user)
    
    # Log configuration (without password)
    logger.info(f"SMTP Config: host={smtp_host}, port={smtp_port}, user={smtp_user}, from={from_email}")
    
    if not smtp_user or not smtp_password:
        return {"success": False, "error": "SMTP credentials not configured", "smtp_user": smtp_user, "smtp_port": smtp_port}
    
    try:
        message = MIMEText(f"Test email from Railway at {datetime.now()}")
        message["Subject"] = "Test Email from Railway"
        message["From"] = from_email
        message["To"] = email
        
        await asyncio.wait_for(
            aiosmtplib.send(
                message,
                hostname=smtp_host,
                port=smtp_port,
                use_tls=True,
                username=smtp_user,
                password=smtp_password,
            ),
            timeout=15.0
        )
        return {"success": True, "message": f"Email sent to {email}", "smtp_host": smtp_host, "smtp_port": smtp_port}
    except asyncio.TimeoutError:
        return {"success": False, "error": "Email timed out after 15 seconds", "smtp_host": smtp_host, "smtp_port": smtp_port}
    except Exception as e:
        return {"success": False, "error": str(e), "smtp_host": smtp_host, "smtp_port": smtp_port}

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

# ============ EMAIL HELPER ============

async def send_waitlist_email(name: str, email: str):
    """
    Send a confirmation email to users who join the waitlist.
    """
    try:
        smtp_host = os.environ.get('SMTP_HOST', 'smtp.zoho.com')
        smtp_port = int(os.environ.get('SMTP_PORT', 465))
        smtp_user = os.environ.get('SMTP_USER')
        smtp_password = os.environ.get('SMTP_PASSWORD')
        from_email = os.environ.get('FROM_EMAIL', smtp_user)
        
        if not smtp_user or not smtp_password:
            logger.warning("SMTP credentials not configured, skipping email")
            return False
        
        # Create email message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Welcome to Nova Ninjas Waitlist! 🥷"
        message["From"] = from_email
        message["To"] = email
        
        # Plain text version
        text_content = f"""
Hi {name},

Thank you for joining the Nova Ninjas waitlist!

We're excited to have you on board. You've taken the first step toward transforming your job search.

What happens next:
- We'll review your application
- You'll receive priority access when we launch
- Our team will reach out with personalized onboarding

In the meantime, feel free to reply to this email if you have any questions.

Best regards,
The Nova Ninjas Team

Human-powered job applications for serious job seekers
        """
        
        # HTML version
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
            <h1>Welcome to Nova Ninjas!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{name}</strong>,</p>
            
            <p>Thank you for joining the Nova Ninjas waitlist! We're excited to have you on board.</p>
            
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
            
            <p>Best regards,<br><strong>The Nova Ninjas Team</strong></p>
        </div>
        <div class="footer">
            <p>Human-powered job applications for serious job seekers</p>
        </div>
    </div>
</body>
</html>
        """
        
        message.attach(MIMEText(text_content, "plain"))
        message.attach(MIMEText(html_content, "html"))
        
        # Send email
        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            use_tls=True,
            username=smtp_user,
            password=smtp_password,
        )
        
        logger.info(f"Waitlist confirmation email sent to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {email}: {str(e)}")
        return False

async def send_booking_email(name: str, email: str):
    """
    Send a confirmation email to users who book a call.
    """
    try:
        smtp_host = os.environ.get('SMTP_HOST', 'smtp.zoho.com')
        smtp_port = int(os.environ.get('SMTP_PORT', 465))
        smtp_user = os.environ.get('SMTP_USER')
        smtp_password = os.environ.get('SMTP_PASSWORD')
        from_email = os.environ.get('FROM_EMAIL', smtp_user)
        
        if not smtp_user or not smtp_password:
            logger.warning("SMTP credentials not configured, skipping email")
            return False
        
        # Create email message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Your Call with Nova Ninjas is Booked! 📞"
        message["From"] = from_email
        message["To"] = email
        
        # Plain text version
        text_content = f"""
Hi {name},

Thank you for booking a consultation call with Nova Ninjas!

We've received your request and our team will reach out to you within 24 hours to schedule your 15-minute call.

What to expect:
- A quick call to understand your job search needs
- Personalized recommendations for your situation
- Answers to any questions you have about our service

We're excited to help you land your dream job faster!

Best regards,
The Nova Ninjas Team

Human-powered job applications for serious job seekers
        """
        
        # HTML version
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
            <div class="emoji">📞</div>
            <h1>Your Call is Booked!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{name}</strong>,</p>
            
            <p>Thank you for booking a consultation call with Nova Ninjas!</p>
            
            <div class="highlight">
                <strong>What happens next:</strong>
                <ul>
                    <li>📱 Our team will contact you within 24 hours</li>
                    <li>📅 We'll schedule your 15-minute consultation</li>
                    <li>💬 You'll get personalized job search recommendations</li>
                </ul>
            </div>
            
            <p>We're excited to learn more about your career goals and show you how Nova Ninjas can help you land your dream job faster!</p>
            
            <p>If you have any questions, simply reply to this email.</p>
            
            <p>Best regards,<br><strong>The Nova Ninjas Team</strong></p>
        </div>
        <div class="footer">
            <p>Human-powered job applications for serious job seekers</p>
        </div>
    </div>
</body>
</html>
        """
        
        message.attach(MIMEText(text_content, "plain"))
        message.attach(MIMEText(html_content, "html"))
        
        # Send email
        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            use_tls=True,
            username=smtp_user,
            password=smtp_password,
        )
        
        logger.info(f"Call booking confirmation email sent to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send booking email to {email}: {str(e)}")
        return False

async def send_welcome_email(name: str, email: str):
    """
    Send a welcome email to new users who sign up.
    """
    try:
        smtp_host = os.environ.get('SMTP_HOST', 'smtp.zoho.com')
        smtp_port = int(os.environ.get('SMTP_PORT', 465))
        smtp_user = os.environ.get('SMTP_USER')
        smtp_password = os.environ.get('SMTP_PASSWORD')
        from_email = os.environ.get('FROM_EMAIL', smtp_user)
        
        if not smtp_user or not smtp_password:
            logger.warning("SMTP credentials not configured, skipping welcome email")
            return False
        
        # Create email message
        message = MIMEMultipart("alternative")
        message["Subject"] = f"Welcome to Nova Ninjas, {name}! 🥷"
        message["From"] = from_email
        message["To"] = email
        
        # Plain text version
        text_content = f"""
Hi {name},

Welcome to Nova Ninjas! 🎉

Thank you for signing up. We're thrilled to have you join our community of job seekers who are taking their career to the next level.

What Nova Ninjas Does For You:
• Your dedicated Job Ninja applies to jobs on your behalf
• AI-powered application tailoring for maximum impact
• Real-time tracking dashboard to monitor progress
• Human specialists, not bots - every application is reviewed personally

Ready to Get Started?
1. Log in to your dashboard
2. Complete your profile
3. Choose a plan that fits your needs
4. Let your Ninja handle the job application grind!

If you have any questions, just reply to this email - we're here to help.

Best regards,
The Nova Ninjas Team

Your Personal Job Ninja - Fast, Accurate, Human.
        """
        
        # HTML version
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }}
        .feature {{ background: #f8faf9; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #2d5a3d; }}
        .cta-button {{ display: inline-block; background: #2d5a3d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
        .footer {{ background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Nova Ninjas! 🥷</h1>
            <p>Your Job Search Just Got a Ninja</p>
        </div>
        <div class="content">
            <h2>Hi {name},</h2>
            <p>Thank you for signing up! We're thrilled to have you join our community of job seekers who are taking their career to the next level.</p>
            
            <h3>What Nova Ninjas Does For You:</h3>
            <div class="feature">✅ Your dedicated Job Ninja applies to jobs on your behalf</div>
            <div class="feature">✅ AI-powered application tailoring for maximum impact</div>
            <div class="feature">✅ Real-time tracking dashboard to monitor progress</div>
            <div class="feature">✅ Human specialists, not bots - every application is reviewed personally</div>
            
            <h3>Ready to Get Started?</h3>
            <ol>
                <li>Log in to your dashboard</li>
                <li>Complete your profile</li>
                <li>Choose a plan that fits your needs</li>
                <li>Let your Ninja handle the job application grind!</li>
            </ol>
            
            <center>
                <a href="https://novaninjas.com/dashboard" class="cta-button">Go to Dashboard →</a>
            </center>
            
            <p>If you have any questions, just reply to this email - we're here to help.</p>
            
            <p>Best regards,<br><strong>The Nova Ninjas Team</strong></p>
        </div>
        <div class="footer">
            <p>Your Personal Job Ninja - Fast, Accurate, Human.</p>
            <p>© 2025 Nova Ninjas. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        """
        
        message.attach(MIMEText(text_content, "plain"))
        message.attach(MIMEText(html_content, "html"))
        
        # Send email with timeout (10 seconds max)
        await asyncio.wait_for(
            aiosmtplib.send(
                message,
                hostname=smtp_host,
                port=smtp_port,
                use_tls=True,
                username=smtp_user,
                password=smtp_password,
            ),
            timeout=10.0
        )
        
        logger.info(f"Welcome email sent to {email}")
        return True
        
    except asyncio.TimeoutError:
        logger.error(f"Timeout sending welcome email to {email}")
        return False
    except Exception as e:
        logger.error(f"Failed to send welcome email to {email}: {str(e)}")
        return False

async def send_admin_booking_notification(booking):
    """
    Send notification to admin when someone books a call.
    """
    try:
        smtp_host = os.environ.get('SMTP_HOST', 'smtp.zoho.com')
        smtp_port = int(os.environ.get('SMTP_PORT', 465))
        smtp_user = os.environ.get('SMTP_USER')
        smtp_password = os.environ.get('SMTP_PASSWORD')
        from_email = os.environ.get('FROM_EMAIL', smtp_user)
        admin_email = os.environ.get('ADMIN_EMAIL', from_email)
        
        if not smtp_user or not smtp_password:
            logger.warning("SMTP credentials not configured, skipping admin notification")
            return False
        
        message = MIMEMultipart("alternative")
        message["Subject"] = f"🔔 New Call Booking: {booking.name}"
        message["From"] = from_email
        message["To"] = admin_email
        
        text_content = f"""
New 15-Minute Call Booking!

Name: {booking.name}
Email: {booking.email}
Mobile: {booking.mobile}
Experience: {booking.years_of_experience}
Booked At: {booking.created_at}

Log in to your dashboard to view all bookings.
        """
        
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
        
        message.attach(MIMEText(text_content, "plain"))
        message.attach(MIMEText(html_content, "html"))
        
        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            use_tls=True,
            username=smtp_user,
            password=smtp_password,
        )
        
        logger.info(f"Admin notification sent for booking: {booking.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send admin notification: {str(e)}")
        return False

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/signup")
async def signup(user_data: UserSignup):
    """
    Register a new user and send welcome email.
    """
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user (in production, hash the password with bcrypt)
    import hashlib
    password_hash = hashlib.sha256(user_data.password.encode()).hexdigest()
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=password_hash
    )
    
    # Save to database
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    await db.users.insert_one(user_dict)
    
    # Send welcome email in background (don't wait)
    asyncio.create_task(send_welcome_email(user.name, user.email))
    
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
        "token": f"token_{user.id}"  # In production, use JWT
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """
    Login user with email and password.
    """
    import hashlib
    password_hash = hashlib.sha256(credentials.password.encode()).hexdigest()
    
    user = await db.users.find_one({
        "email": credentials.email,
        "password_hash": password_hash
    })
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return {
        "success": True,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
            "role": user['role'],
            "plan": user.get('plan')
        },
        "token": f"token_{user['id']}"  # In production, use JWT
    }

@api_router.get("/auth/users")
async def get_all_users():
    """
    Get all registered users (admin endpoint).
    """
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return {"users": users, "count": len(users)}

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
    booking_dict = input.model_dump()
    booking_obj = CallBooking(**booking_dict)
    
    # Convert to dict and serialize datetime for MongoDB
    doc = booking_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.call_bookings.insert_one(doc)
    logger.info(f"New call booking: {booking_obj.email} - {booking_obj.name}")
    
    # Send emails in background (don't wait)
    asyncio.create_task(send_booking_email(booking_obj.name, booking_obj.email))
    asyncio.create_task(send_admin_booking_notification(booking_obj))
    
    return booking_obj

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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()