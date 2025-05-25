from web3 import Web3
import json
import os
from dotenv import load_dotenv

LOCAL_NODE = "http://127.0.0.1:8545"

w3 = Web3(Web3.HTTPProvider(LOCAL_NODE))

CONTRACT_ADDRESS = "CONTRACT ADDRESS"
PRIVATE_KEY = "ADDRESSE'S PRIVATE KEY"
ACCOUNT_ADDRESS = "YOUR ACCOUNT ADDRESSS"

with open("contracts/FileRegistry_abi.json", "r") as f:
    abi = json.load(f)
    

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=abi)

def record_metadata(filename:str,filehash:str)->str:
    nonce = w3.eth.get_transaction_count(ACCOUNT_ADDRESS)
    txn = contract.functions.uploadFile(filename,filehash).build_transaction({
        'from': ACCOUNT_ADDRESS,
        'nonce': nonce,
        'gas': 2000000,
        'gasPrice': w3.to_wei('2', 'gwei'),
    })
    
    signed_txn = w3.eth.account.sign_transaction(txn,private_key=PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
    return tx_hash.hex()

def get_total_files() -> int:
    return contract.functions.getTotalFiles().call()

def get_file_by_index(index: int):
    return contract.functions.getFile(index).call()

def get_total_files() -> int:
    return contract.functions.getTotalFiles().call()

def grant_download_permission(index: int, downloader: str) -> str:
    downloader_address = Web3.to_checksum_address(downloader)
    nonce = w3.eth.get_transaction_count(ACCOUNT_ADDRESS)
    txn = contract.functions.grantDownloadPermission(index, downloader_address).build_transaction({
        'from': ACCOUNT_ADDRESS,
        'nonce': nonce,
        'gas': 2000000,
        'gasPrice': w3.to_wei('2', 'gwei'),
    })
    
    signed_txn = w3.eth.account.sign_transaction(txn, private_key=PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
    return tx_hash.hex()

def can_download(index: int, downloader: str) -> bool:
    downloader_address = Web3.to_checksum_address(downloader)
    return contract.functions.canDownload(index, downloader_address).call()
