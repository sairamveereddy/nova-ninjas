import os
from dodopayments import DodoPayments
client = DodoPayments(bearer_token="VlSrQp7v8yEwy3UB.Lzvf3GZC-wqETu11N-S8paVhoWjfyJfUHmPVDi-6g8HrvTaC")

plans = [
    {"name": "AI Ninja Pro Yearly", "price": 4900, "description": "25 Daily Resumes. 35 Daily Autofills."},
    {"name": "AI Ninja Pro Plus Yearly", "price": 6900, "description": "35 Daily Resumes. 50 Daily Autofills."},
    {"name": "AI Ninja Pro Max Yearly", "price": 8900, "description": "55 Daily Resumes. 80 Daily Autofills."},
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
                "payment_frequency_interval": "Year",
                "subscription_period_count": 1,
                "subscription_period_interval": "Year",
                "purchasing_power_parity": False,
                "trial_period_days": 0
            },
            tax_category="digital_products"
        )
        print(f"Created {plan['name']}, product_id={product.product_id}")
    except Exception as e:
        print(f"Error creating {plan['name']}: {repr(e)}")
