import asyncio
from dodopayments import AsyncDodoPayments
import json

async def check_user_dodo_status(email):
    token = "VlSrQp7v8yEwy3UB.Lzvf3GZC-wqETu11N-S8paVhoWjfyJfUHmPVDi-6g8HrvTaC"
    dodo_client = AsyncDodoPayments(bearer_token=token)
    
    print(f"Checking Dodo customers for: {email}")
    try:
        customers = await dodo_client.customers.list(email=email)
        print(f"Found {len(customers.items)} customer records.")
        
        valid_customer = None
        
        for i, cust in enumerate(customers.items):
            # Check subscriptions for this customer
            try:
                subs = await dodo_client.subscriptions.list(customer_id=cust.customer_id)
                sub_count = len(subs.items)
                print(f"Record {i+1}: {cust.customer_id} - {sub_count} active/past subscriptions")
                if sub_count > 0:
                    valid_customer = cust
                    for sub in subs.items:
                        print(f"    Sub ID: {sub.subscription_id}, Status: {sub.status}, Plan: {sub.product_id}")
            except Exception as e:
                print(f"  Could not list subscriptions for {cust.customer_id}: {e}")

        if valid_customer:
            print(f"\nRecommended Customer ID: {valid_customer.customer_id}")
            portal = await dodo_client.customers.customer_portal.create(customer_id=valid_customer.customer_id)
            print(f"Valid Portal Link: {getattr(portal, 'link', getattr(portal, 'url', 'N/A'))}")
        else:
            print("\nNo customer with subscriptions found.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    email = "srkreddy452@gmail.com"
    asyncio.run(check_user_dodo_status(email))
