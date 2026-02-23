with open("server.py", "r", encoding="utf-8", errors="ignore") as f:
    for i, line in enumerate(f):
        if "api_router.get" in line and "job" in line.lower():
            print(f"Line {i+1}: {line.strip()}")
