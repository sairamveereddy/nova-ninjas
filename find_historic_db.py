import subprocess

out = subprocess.check_output(["git", "show", "HEAD~20:backend/server.py"])
content = out.decode("utf-8", errors="ignore")

with open("db_lines.txt", "w", encoding="utf-8") as f:
    for i, line in enumerate(content.split("\n")):
        if "motor" in line.lower() or "client" in line.lower() or "db =" in line.lower():
            f.write(f"L{i+1}: {line.strip()}\n")
