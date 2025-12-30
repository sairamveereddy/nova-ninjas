import stripe

# Your Stripe Secret Key
stripe.api_key = "sk_test_51SSKzgR2orqlbOj0CG6W9QCrv8BOYFsElterukF06X6l9ltzA1ayKX2sPXqdybe1B6dIhdpAzMdl9HKbQqVSgucz00lSd9iygS"

# Create Products and Prices
products = [
    {
        "name": "Starter Plan",
        "description": "400 Ninja-powered applications per month. Your dedicated Job Ninja.",
        "price": 39900,  # $399.00 in cents
    },
    {
        "name": "Pro Plan", 
        "description": "500 Ninja-powered applications per month. Senior dedicated Job Ninja.",
        "price": 49900,  # $499.00 in cents
    },
    {
        "name": "Urgent Plan",
        "description": "600 Ninja-powered applications per month. Elite Job Ninja with 24/7 service.",
        "price": 59900,  # $599.00 in cents
    },
]

print("Creating Stripe Products and Prices...\n")

price_ids = []

for i, prod in enumerate(products, 1):
    # Create Product
    product = stripe.Product.create(
        name=prod["name"],
        description=prod["description"],
    )
    print(f"✅ Created Product: {prod['name']} (ID: {product.id})")
    
    # Create Price (monthly recurring)
    price = stripe.Price.create(
        product=product.id,
        unit_amount=prod["price"],
        currency="usd",
        recurring={"interval": "month"},
    )
    print(f"   Created Price: ${prod['price']/100}/month (ID: {price.id})")
    price_ids.append(price.id)
    print()

print("=" * 50)
print("\n🎉 All products created! Add these to your .env file:\n")
print(f"STRIPE_PRICE_STARTER={price_ids[0]}")
print(f"STRIPE_PRICE_PRO={price_ids[1]}")
print(f"STRIPE_PRICE_URGENT={price_ids[2]}")
print("\n" + "=" * 50)












