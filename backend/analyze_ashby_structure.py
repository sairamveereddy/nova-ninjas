from bs4 import BeautifulSoup

def analyze_structure():
    with open("ashby_dump.html", "r", encoding="utf-8") as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # 1. Find text "About the role" or "Description"
    keywords = ["About the role", "Description", "What we offer"]
    
    for kw in keywords:
        print(f"\n--- Searching for '{kw}' ---")
        elements = soup.find_all(string=lambda text: text and kw in text)
        for el in elements:
            parent = el.parent
            print(f"Found in tag: {parent.name}")
            if parent.name == "script":
                print("SCRIPT CONTENT SNIPPET:")
                print(parent.string[:500])
                print("...")
                print(parent.string[-500:])
    
    # 2. Dump all text to see flow
    with open("ashby_text.txt", "w", encoding="utf-8") as f:
        f.write(soup.get_text())
    print("\nDumped text to ashby_text.txt")

if __name__ == "__main__":
    analyze_structure()
