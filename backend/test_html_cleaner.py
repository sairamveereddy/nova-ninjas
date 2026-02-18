import re
import html

def sanitize_description(text: str) -> str:
    """
    Sanitize HTML but PRESERVE rich formatting (bullets, bold, paragraphs)
    COPY OF BACKEND IMPLEMENTATION
    """
    if not text:
        return ""
    
    # 0. Decode HTML entities first
    text = html.unescape(str(text))

    # 1. Remove dangerous tags
    text = re.sub(r'<(script|style|iframe|object|embed|applet)[^>]*>.*?</\1>', '', text, flags=re.IGNORECASE|re.DOTALL)
    
    # 2. Parse "Job Description" artifacts
    text = re.sub(r'(\n|^)Job\s*$', '', text, flags=re.MULTILINE|re.IGNORECASE)
    text = re.sub(r'(\n|^)Job Description\s*$', '', text, flags=re.MULTILINE|re.IGNORECASE)
    # Also remove "Job" if it's the last word of the text (or line)
    text = re.sub(r'\s+Job\s*$', '', text, flags=re.MULTILINE | re.IGNORECASE)

    allowed_tags = ['p', 'br', 'ul', 'ol', 'li', 'b', 'strong', 'i', 'em', 'h3', 'h4']
    
    # Simple tag stripper that preserves specific tags
    def strip_tags_preserve(html_text, preserve):
        # Regex to match a tag: </?([a-z0-9]+)[^>]*>
        def replace_tag(match):
            tag_name = match.group(1).lower()
            if tag_name in preserve:
                is_close = match.group(0).startswith('</')
                if is_close:
                    return f"</{tag_name}>"
                else:
                    return f"<{tag_name}>" # Strip attributes
            return "" # Strip tag
            
        return re.sub(r'</?([a-z0-9]+)[^>]*>', replace_tag, html_text, flags=re.IGNORECASE)

    clean = strip_tags_preserve(text, allowed_tags)
    
    # 4. Cleanup excessive whitespace
    clean = re.sub(r'\n\s*\n', '\n', clean) # Collapse multiple newlines if any
    clean = clean.strip()
    
    return clean

sample_html = """
<p><strong>About the Role:</strong></p>
<p>We are a dynamic and innovative medical device startup developing a point-of-care portable blood
coagulation testing device. Job
</p>
<h3>Summary:</h3>
<p>We are seeking a talented engineer...</p>
"""

print("--- ORIGINAL ---")
print(sample_html)
print("\n--- SANITIZED ---")
print(sanitize_description(sample_html))
