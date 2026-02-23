with open("server.py", "r", encoding="utf-8", errors="ignore") as f:
    for i, line in enumerate(f):
        if "db." in line and "mongodb" not in line.lower() and "@app.get" not in line.lower() and "@app.post" not in line.lower():
            # Filter to find actual usage of the db object
            if any(op in line for op in [".find(", ".insert_one(", ".update_one(", ".delete_one(", ".aggregate("]):
                print(f"Line {i+1}: {line.strip()}")
