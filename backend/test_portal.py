import asyncio
from dodopayments import AsyncDodoPayments

async def test_portal():
    print("Testing Dodo API for portal")
    try:
        dodo_client = AsyncDodoPayments(bearer_token="VlSrQp7v8yEwy3UB.Lzvf3GZC-wqETu11N-S8paVhoWjfyJfUHmPVDi-6g8HrvTaC")
        
        # Test customer from earlier: cus_0NZgvOx7rk4s85j7yBrKB
        customer_id = "cus_0NZgvOx7rk4s85j7yBrKB"
        
        portal = await dodo_client.customers.customer_portal.create(customer_id=customer_id)
        
        try:
            print(portal.model_dump())
        except Exception as e:
            print(portal.__dict__)
             
    except Exception as overall_e:
        print(f"CRITICAL SDK ERROR: {overall_e}")

if __name__ == "__main__":
    asyncio.run(test_portal())
