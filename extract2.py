with open("temp_server.py", "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()

with open("db_block.txt", "w", encoding="utf-8") as out:
    for i, line in enumerate(lines[130:165]):
        out.write(f"L{130+i}:{line}")
