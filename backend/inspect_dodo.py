from dodopayments import AsyncDodoPayments
d = AsyncDodoPayments(bearer_token="dummy")

with open("dodo_methods.txt", "w") as f:
    f.write("DODO CLIENT:\n")
    f.write(", ".join(dir(d)) + "\n\n")
    
    for attr in dir(d):
        if not attr.startswith("_"):
            try:
                sub = getattr(d, attr)
                f.write(f"DODO CLIENT.{attr}:\n")
                f.write(", ".join(dir(sub)) + "\n\n")
            except Exception as e:
                 f.write(f"Error on {attr}: {e}\n\n")
