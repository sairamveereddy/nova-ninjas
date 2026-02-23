with open("server.py", "r", encoding="utf-8", errors="ignore") as f:
    for i, line in enumerate(f):
        if "/auth/" in line.lower() or "def login" in line.lower():
            print(f"Line {i+1}: {line.strip()}")
