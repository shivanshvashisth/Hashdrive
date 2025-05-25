import hashlib

def get_file_hash(file_path: str) -> str:
    with open(file_path, "rb") as file:  
        data = file.read()  
    return hashlib.sha256(data).hexdigest()  
