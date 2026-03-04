import asyncio
from dodopayments import AsyncDodoPayments

async def test_lookup():
    print("Testing Dodo API for customer lookup")
    try:
        dodo_client = AsyncDodoPayments(bearer_token="VlSrQp7v8yEwy3UB.Lzvf3GZC-wqETu11N-S8paVhoWjfyJfUHmPVDi-6g8HrvTaC")
        
        email = "srkreddy452@gmail.com"
        
        # Test if we can fetch customers by email
        # The list method often supports query parameters
        try:
            customers = await dodo_client.customers.list(email=email)
            print(f"Num customers found: {len(customers.items)}")
            if customers.items:
               print(f"Customer Id: {customers.items[0].customer_id}")
        except Exception as filter_e:
            print(f"List with email kwarg failed: {filter_e}")
            customers = await dodo_client.customers.list()
            matched = [c for c in customers.items if c.email == email]
            print(f"Matched manually: {matched}")
             
    except Exception as overall_e:
        print(f"CRITICAL SDK ERROR: {overall_e}")

if __name__ == "__main__":
    asyncio.run(test_lookup())
