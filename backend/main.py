from fastapi import FastAPI, File, UploadFile, HTTPException, Header
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from storage import save_file
from blockchain import record_metadata, get_total_files, get_file_by_index, can_download
from utils import get_file_hash
from eth_account.messages import encode_defunct
from eth_account import Account

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload/")
async def upload(file: UploadFile = File(...)):
    content = await file.read()
    file_path = save_file(file.filename, content)
    file_hash = get_file_hash(file_path)
    return {
        "filename": file.filename,
        "file_hash": file_hash
    }


@app.get("/files/total")
def total_files():
    total = get_total_files()
    return {"total_files": total}


@app.get("/files/")
def list_files():
    try:
        total = get_total_files()
        files = []
        for i in range(total):
            filename, filehash, uploader = get_file_by_index(i)
            files.append({
                "index": i,
                "filename": filename,
                "filehash": filehash,
                "uploader": uploader
            })
        return {"files": files}
    except Exception as e:
        return {"error": str(e)}


@app.get("/download/{index}")
def download_file(index: int, wallet: str = Header(None, alias="wallet")):
    try:
        filename, expected_hash, uploader = get_file_by_index(index)
        file_path = os.path.join("uploads", filename)
        if not wallet:
            raise HTTPException(status_code=400, detail="Wallet address missing")
        if not can_download(index, wallet):
            raise HTTPException(status_code=403, detail="Unauthorized user trying to download")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        actual_hash = get_file_hash(file_path)
        if actual_hash != expected_hash:
            raise HTTPException(status_code=400, detail="File hash mismatch")
        return FileResponse(file_path, media_type="application/octet-stream", filename=filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


nonces = {}

@app.get("/auth/nonce/{wallet}")
def get_nonce(wallet: str):
    nonce = os.urandom(8).hex()
    nonces[wallet.lower()] = nonce
    return {"nonce": nonce}

@app.post("/auth/verify/")
def verify_signature(data: dict):
    wallet = data.get("wallet", "").lower()
    signature = data.get("signature")
    if wallet not in nonces:
        raise HTTPException(status_code=400, detail="Unknown wallet")
    message = encode_defunct(text=nonces[wallet])
    recovered = Account.recover_message(message, signature=signature)
    if recovered.lower() != wallet:
        raise HTTPException(status_code=401, detail="Signature invalid")
    return {"success": True, "wallet": wallet}
