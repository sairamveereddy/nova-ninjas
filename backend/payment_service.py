import stripe
import os
from fastapi import HTTPException
from typing import Optional
from dotenv import load_dotenv
from pathlib import Path

# Load .env file
load_dotenv(Path(__file__).parent / '.env')

# Initialize Stripe
stripe_secret_key = os.environ.get('STRIPE_SECRET_KEY')
if stripe_secret_key and not stripe_secret_key.startswith('sk_test_your'):
    stripe.api_key = stripe_secret_key
else:
    stripe.api_key = None  # Demo mode - no real Stripe calls

def get_price_ids():
    """Get price IDs from environment (called at runtime)"""
    return {
        'ai-yearly': os.environ.get('STRIPE_PRICE_YEARLY'),
        # Keep old ones for backward compatibility if needed, or remove them
        '1': os.environ.get('STRIPE_PRICE_STARTER'),
        '2': os.environ.get('STRIPE_PRICE_PRO'),
        '3': os.environ.get('STRIPE_PRICE_URGENT'),
    }

def create_checkout_session(
    plan_id: str,
    user_email: str,
    user_id: str,
    success_url: str,
    cancel_url: str
) -> dict:
    """
    Create a Stripe Checkout Session for subscription.
    
    Stripe Checkout automatically handles:
    - Credit/Debit cards
    - Apple Pay (if available on device)
    - Google Pay
    - Cash App Pay (US only)
    """
    
    # Check if Stripe is configured
    if not stripe.api_key:
        raise HTTPException(
            status_code=400, 
            detail="Stripe is not configured. Please add STRIPE_SECRET_KEY to backend/.env file. See /app/STRIPE_SETUP_GUIDE.md for instructions."
        )
    
    price_ids = get_price_ids()
    price_id = price_ids.get(str(plan_id))
    
    # Fallback to old IDs if frontend sends 1, 2, 3 (incase of cached clients)
    # But for new 'ai-yearly', it should match direct key.
    
    if not price_id:
        raise HTTPException(
            status_code=400, 
            detail=f"Stripe Price ID not configured for plan {plan_id}. Please add STRIPE_PRICE_YEARLY to backend/.env file."
        )
    
    try:
        # Create Stripe Checkout Session
        session_kwargs = {
            'customer_email': user_email,
            'client_reference_id': user_id,
            'payment_method_types': ['card'],
            'line_items': [
                {
                    'price': price_id,
                    'quantity': 1,
                }
            ],
            'mode': 'subscription',
            'success_url': success_url,
            'cancel_url': cancel_url,
            'metadata': {
                'user_id': user_id,
                'plan_id': plan_id,
            },
        }

        checkout_session = stripe.checkout.Session.create(**session_kwargs)
        
        return {
            'sessionId': checkout_session.id,
            'url': checkout_session.url,
            'status': 'created'
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

def verify_webhook_signature(payload: bytes, sig_header: str) -> dict:
    """
    Verify Stripe webhook signature and return event.
    """
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        return event
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

def create_customer_portal_session(customer_id: str, return_url: str) -> dict:
    """
    Create a Stripe Customer Portal session for managing subscription.
    Allows customers to:
    - Update payment method
    - View invoices
    - Cancel subscription
    """
    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return {'url': portal_session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
