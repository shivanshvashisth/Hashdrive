import os

Upload_DIR = "uploads"
os.makedirs(Upload_DIR, exist_ok=True)

def save_file(filename: str, content:bytes)-> str:
    path = os.path.join(Upload_DIR, filename)
    with open(path, "wb") as f:
        f.write(content)
    return path