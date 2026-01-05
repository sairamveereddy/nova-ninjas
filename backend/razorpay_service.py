"""
Razorpay Payment Service
Handles payment processing for Job Ninjas
"""

import razorpay
import os
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Razorpay Configuration
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')

# Initialize Razorpay client
client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    logger.info("Razorpay client initialized")
else:
    logger.warning("Razorpay credentials not configured")


# Plan pricing in INR (paise) - 1 INR = 100 paise
RAZORPAY_PLANS = {
    'ai-free': {
        'amount': 0,
        'currency': 'INR',
        'name': 'AI Ninja – Free',
        'description': 'Up to 5 AI-tailored applications'
    },
    'ai-pro': {
        'amount': 249900,  # ₹2,499 in paise (roughly $29.99)
        'currency': 'INR',
        'name': 'AI Ninja Pro',
        'description': 'Up to 200 AI-tailored applications per month'
    },
    'human-starter': {
        'amount': 399900,  # ₹3,999 in paise (roughly $50)
        'currency': 'INR',
        'name': 'Human Ninja - Starter Pack',
        'description': '25 manual applications by our team'
    },
    'human-growth': {
        'amount': 1599900,  # ₹15,999 in paise (roughly $199)
        'currency': 'INR',
        'name': 'Human Ninja - Growth Pack',
        'description': '100 manual applications by our team'
    },
    'human-scale': {
        'amount': 3199900,  # ₹31,999 in paise (roughly $399)
        'currency': 'INR',
        'name': 'Human Ninja - Scale Pack',
        'description': '250 manual applications by our team'
    }
}

# USD Plans (for international users)
RAZORPAY_PLANS_USD = {
    'ai-pro': {
        'amount': 2999,  # $29.99 in cents
        'currency': 'USD',
        'name': 'AI Ninja Pro',
        'description': 'Up to 200 AI-tailored applications per month'
    },
    'human-starter': {
        'amount': 5000,  # $50
        'currency': 'USD',
        'name': 'Human Ninja - Starter Pack',
        'description': '25 manual applications by our team'
    },
    'human-growth': {
        'amount': 19900,  # $199
        'currency': 'USD',
        'name': 'Human Ninja - Growth Pack',
        'description': '100 manual applications by our team'
    },
    'human-scale': {
        'amount': 39900,  # $399
        'currency': 'USD',
        'name': 'Human Ninja - Scale Pack',
        'description': '250 manual applications by our team'
    }
}


def create_razorpay_order(plan_id: str, user_email: str, currency: str = 'INR'):
    """
    Create a Razorpay order for payment
    
    Args:
        plan_id: The plan identifier (e.g., 'ai-pro', 'human-starter')
        user_email: Customer email
        currency: 'INR' or 'USD'
    
    Returns:
        Order details dict or None on error
    """
    if not client:
        logger.error("Razorpay client not initialized")
        return None
    
    # Get plan details based on currency
    plans = RAZORPAY_PLANS_USD if currency == 'USD' else RAZORPAY_PLANS
    
    if plan_id not in plans:
        logger.error(f"Invalid plan ID: {plan_id}")
        return None
    
    plan = plans[plan_id]
    
    if plan['amount'] == 0:
        logger.info("Free plan - no payment required")
        return {'free': True, 'plan_id': plan_id}
    
    try:
        order_data = {
            'amount': plan['amount'],
            'currency': plan['currency'] if currency != 'USD' else 'USD',
            'receipt': f"order_{plan_id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            'notes': {
                'plan_id': plan_id,
                'user_email': user_email,
                'plan_name': plan['name']
            }
        }
        
        order = client.order.create(data=order_data)
        logger.info(f"Razorpay order created: {order['id']}")
        
        return {
            'order_id': order['id'],
            'amount': order['amount'],
            'currency': order['currency'],
            'key_id': RAZORPAY_KEY_ID,
            'plan_name': plan['name'],
            'plan_description': plan['description']
        }
        
    except Exception as e:
        logger.error(f"Error creating Razorpay order: {e}")
        return None


def verify_razorpay_payment(order_id: str, payment_id: str, signature: str):
    """
    Verify Razorpay payment signature
    
    Args:
        order_id: Razorpay order ID
        payment_id: Razorpay payment ID
        signature: Razorpay signature
    
    Returns:
        True if valid, False otherwise
    """
    if not client:
        logger.error("Razorpay client not initialized")
        return False
    
    try:
        params = {
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        }
        
        client.utility.verify_payment_signature(params)
        logger.info(f"Payment verified: {payment_id}")
        return True
        
    except razorpay.errors.SignatureVerificationError as e:
        logger.error(f"Payment signature verification failed: {e}")
        return False
    except Exception as e:
        logger.error(f"Error verifying payment: {e}")
        return False


def get_payment_details(payment_id: str):
    """
    Get payment details from Razorpay
    
    Args:
        payment_id: Razorpay payment ID
    
    Returns:
        Payment details dict or None
    """
    if not client:
        return None
    
    try:
        payment = client.payment.fetch(payment_id)
        return payment
    except Exception as e:
        logger.error(f"Error fetching payment: {e}")
        return None


def create_refund(payment_id: str, amount: int = None):
    """
    Create a refund for a payment
    
    Args:
        payment_id: Razorpay payment ID
        amount: Amount to refund in paise (None for full refund)
    
    Returns:
        Refund details or None
    """
    if not client:
        return None
    
    try:
        refund_data = {'payment_id': payment_id}
        if amount:
            refund_data['amount'] = amount
        
        refund = client.payment.refund(payment_id, refund_data)
        logger.info(f"Refund created: {refund['id']}")
        return refund
    except Exception as e:
        logger.error(f"Error creating refund: {e}")
        return None

