with open("old_server.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "client =" in line or "db =" in line or "AsyncIOMotorClient" in line:
        print(f"Line {i+1}: {line.strip()}")
