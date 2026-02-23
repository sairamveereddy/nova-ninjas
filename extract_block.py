with open("old_server.py", "r", encoding="utf-16le") as f:
    lines = f.readlines()

for i, line in enumerate(lines[120:160]):
    print(f"L{120+i+1}: {line.rstrip()}")
