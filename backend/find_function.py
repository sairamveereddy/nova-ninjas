import os

search_str = "def scheduled_job_fetch"
root_dir = "."

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for i, line in enumerate(f):
                        if search_str in line:
                            print(f"FOUND in {path}:{i+1}")
                            print(line.strip())
            except Exception as e:
                pass
