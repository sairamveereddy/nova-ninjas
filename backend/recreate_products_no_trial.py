import os
from dodopayments import DodoPayments
client = DodoPayments(bearer_token="VlSrQp7v8yEwy3UB.Lzvf3GZC-wqETu11N-S8paVhoWjfyJfUHmPVDi-6g8HrvTaC")

plans = [
    {"name": "AI Ninja Monthly (No Trial)", "price": 900, "description": "15 Daily Resumes. 20 Daily Autofills.", "interval": "Month"},
    {"name": "AI Ninja Pro Yearly (No Trial)", "price": 4900, "description": "25 Daily Resumes. 35 Daily Autofills.", "interval": "Year"},
    {"name": "AI Ninja Pro Plus Yearly (No Trial)", "price": 6900, "description": "35 Daily Resumes. 50 Daily Autofills.", "interval": "Year"},
    {"name": "AI Ninja Pro Max Yearly (No Trial)", "price": 8900, "description": "55 Daily Resumes. 80 Daily Autofills.", "interval": "Year"},
]

for plan in plans:
    try:
        product = client.products.create(
            name=plan["name"],
            description=plan["description"],
            price={
                "type": "recurring_price",
                "currency": "USD",
                "price": plan["price"],
                "discount": 0,
                "payment_frequency_count": 1,
                "payment_frequency_interval": plan["interval"],
                "subscription_period_count": 1,
                "subscription_period_interval": plan["interval"],
                "purchasing_power_parity": False
                # intentionally omitting trial_period_days entirely
            },
            tax_category="digital_products"
        )
        print(f"Created {plan['name']}, product_id={product.product_id}")
    except Exception as e:
        print(f"Error creating {plan['name']}: {repr(e)}")
