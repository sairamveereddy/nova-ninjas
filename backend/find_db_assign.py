with open("server.py", "r", encoding="utf-8", errors="ignore") as f:
    for i, line in enumerate(f):
        if "db =" in line and "if" not in line and "==" not in line:
            print(f"Line {i+1}: {line.strip()}")
