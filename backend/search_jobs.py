with open("server.py", "r", encoding="utf-16le", errors="ignore") as f:
    for i, line in enumerate(f):
        if "api_router.get(\"/jobs" in line or "def get_jobs" in line:
            print(f"Line {i+1}: {line.strip()}")
