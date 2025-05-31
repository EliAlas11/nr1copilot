import re

def extract_video_id(url: str) -> str:
    """Extracts the YouTube video ID from a URL."""
    pattern = r"(?:v=|youtu\.be/|embed/|shorts/)([\w-]{11})"
    match = re.search(pattern, url)
    return match.group(1) if match else None
