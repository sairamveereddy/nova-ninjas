import re
import json

def extract_json():
    with open("ashby_dump.html", "r", encoding="utf-8") as f:
        html = f.read()
    
    # Regex to find window.__appData = {...}
    # We'll try to capture until the first script tag end or similar
    # But since it's valid JS, we can just look for the assignment
    
    pattern = re.compile(r'window\.__appData\s*=\s*({.+?});', re.DOTALL)
    match = pattern.search(html)
    
    if match:
        json_str = match.group(1)
        print(f"Found JSON string (len={len(json_str)})")
        try:
            data = json.loads(json_str)
            print("Successfully parsed JSON!")
            
            # Now let's find the description
            # We don't know the exact structure, so let's traverse or print keys
            # Likely in props -> pageProps -> job -> descriptionHtml
            
            print("Top keys:", data.keys())
            
            # Recursive search for 'descriptionHtml'
            def find_key(obj, key):
                if isinstance(obj, dict):
                    if key in obj:
                        return obj[key]
                    for k, v in obj.items():
                        res = find_key(v, key)
                        if res: return res
                elif isinstance(obj, list):
                    for item in obj:
                        res = find_key(item, key)
                        if res: return res
                return None
                
            desc = find_key(data, "descriptionHtml")
            if desc:
                print("\nFOUND descriptionHtml!")
                print("Length:", len(desc))
                print("Snippet:", desc[:200])
            else:
                print("descriptionHtml not found in JSON.")
                
            # Also check for plain 'description'
            desc_plain = find_key(data, "description")
            if desc_plain:
                print("\nFOUND description!")
                print("Snippet:", desc_plain[:200])

        except json.JSONDecodeError as e:
            print(f"JSON Decode Error: {e}")
            print("Snippet around failure:")
            # simplify debugging
    else:
        print("Pattern not found.")

if __name__ == "__main__":
    extract_json()
