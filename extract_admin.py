import subprocess
import os

out = subprocess.check_output(["git", "show", "206e295^:backend/server.py"])
content = out.decode("utf-8", errors="ignore")

with open("admin_temp.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Saved old server to admin_temp.py")
