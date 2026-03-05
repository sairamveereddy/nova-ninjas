import os
import asyncio
import aiohttp
import logging
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

async def send_email_resend(to_email: str, subject: str, html_content: str, api_key: str, from_email: str):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
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
                    logger.error(f"Failed to send email to {to_email}: {result}")
                    return False
    except Exception as e:
        logger.error(f"Error sending email to {to_email}: {e}")
        return False

def get_welcome_html(name, frontend_url, verify_link, login_link, invite_link):
    blue_primary = "#2563eb"
    return f"""
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
                <p>Copyright © 2026 jobNinjas.io. All rights reserved.</p>
                <p>Fast. Accurate. Human-Powered & AI-Driven.</p>
            </div>
        </div>
    </div>
</body>
</html>
"""

async def resend_recent_signups():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    resend_api_key = os.environ.get("RESEND_API_KEY")
    from_email = "jobNinjas <hello@jobninjas.io>"
    frontend_url = "https://jobninjas.io"
    
    if not all([url, key, resend_api_key]):
        logger.error("Missing required environment variables.")
        return

    sb = create_client(url, key)
    
    # 24 hours ago
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    
    logger.info(f"Checking for unverified users created after {cutoff}...")
    
    # Fetch unverified users created in last 24h
    response = sb.table("profiles").select("*").gt("created_at", cutoff).eq("is_verified", False).execute()
    users = response.data
    
    logger.info(f"Found {len(users)} users to resend welcome email to.")
    
    success_count = 0
    for u in users:
        email = u.get("email")
        name = u.get("name") or "there"
        token = u.get("verification_token")
        referral_code = u.get("referral_code")
        
        verify_link = f"{frontend_url}/verify-email?token={token}&email={email}" if token else f"{frontend_url}/dashboard"
        login_link = f"{frontend_url}/login"
        invite_link = f"{frontend_url}/signup?ref={referral_code}" if referral_code else f"{frontend_url}/signup"
        
        html = get_welcome_html(name, frontend_url, verify_link, login_link, invite_link)
        subject = f"Welcome to jobNinjas, {name}! 🥷"
        
        if await send_email_resend(email, subject, html, resend_api_key, from_email):
            success_count += 1
            # Add a small delay to avoid rate limits
            await asyncio.sleep(0.5)
            
    logger.info(f"Successfully resent {success_count} / {len(users)} emails.")

if __name__ == "__main__":
    asyncio.run(resend_recent_signups())
