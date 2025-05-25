import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { BrowserProvider, Contract } from "ethers";
import FileRegistryABI from "./FileRegistry_abi.json";
import "./App.css";

const CONTRACT_ADDRESS = "Your contract address";
const API = "http://localhost:8000";

function App() {
  const [account, setAccount] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [token, setToken] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const wallet = await signer.getAddress();

      try {
        // taking nonce for signature
        const nonceRes = await axios.get(`${API}/auth/nonce/${wallet}`);
        const signature = await signer.signMessage(nonceRes.data.nonce);

        // Verify the signature
        const verifyRes = await axios.post(`${API}/auth/verify`, {
          wallet,
          signature,
        });

        if (verifyRes.data.success) {
          setAccount(wallet);
          setToken(verifyRes.data.token); // store token for future checking
        } else {
          alert("Signature verification failed.");
        }
      } catch (error) {
        console.error("Error during authentication:", error);
        alert("Error during authentication. Please try again.");
      }
    } else {
      alert("Please install MetaMask.");
    }
  };

  const handleFileChange = (e) => {
    setFileToUpload(e.target.files[0]);
  };

  const uploadFile = async () => {
    if (!fileToUpload || !account)
      return alert("Select a file & connect wallet");

    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      const res = await axios.post(`${API}/upload/`, formData);
      const { file_hash } = res.data;

      // Call smart contract from metamask with user's wallet
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, FileRegistryABI, signer);
      const tx = await contract.uploadFile(fileToUpload.name, file_hash);
      await tx.wait();
      alert("File uploaded and recorded on blockchain!");
      fetchFiles();
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed");
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${API}/files/`);
      setFiles(res.data.files || []);
    } catch (err) {
      console.error("Failed to fetch files");
    }
  };

  const handleDownload = async (index) => {
    try {
      const response = await axios.get(`${API}/download/${index}`, {
        responseType: "blob",
        headers: { wallet: account },
      });

      // HTTP error
      if (response.status !== 200) {
        throw new Error(response.data?.detail);
      }

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = files[index].filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      if (error.response?.data instanceof Blob) {
        const errorText = await error.response.data.text();
        try {
          const errorJson = JSON.parse(errorText);
          alert(errorJson.detail || "Download failed");
        } catch {
          alert("Download failed");
        }
      } else {
        alert(error.response?.data?.detail || "Download failed");
      }
    }
  };
  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFileToUpload(e.dataTransfer.files[0]);
      setStatus("");
    }
  };

  return (
    <div className="container">
      <div className="header">HashDrive: Decentralized File Storage</div>
      <div className="wallet-status">
        {account ? (
          <>
            Connected as: <b>{account.slice(0, 10)}...</b>
          </>
        ) : (
          <button className="upload-btn" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </div>

      <div
        className={`upload-area${dragOver ? " dragover" : ""}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        style={{ cursor: "pointer" }}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        {fileToUpload ? (
          <div>
            <b>{fileToUpload.name}</b>
            <button
              className="upload-btn"
              style={{ marginLeft: 18 }}
              onClick={uploadFile}
            >
              Upload
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "1.1rem", color: "#4a4e69" }}>
              Drag & drop file here or{" "}
              <span style={{ textDecoration: "underline" }}>browse</span>
            </div>
            <div
              style={{ fontSize: "0.95rem", marginTop: 8, color: "#9a8c98" }}
            >
              Supported: any file type
            </div>
          </div>
        )}
      </div>

      <div className="status-message">{status}</div>

      <table className="file-table">
        <thead>
          <tr>
            <th>Index</th>
            <th>Filename</th>
            <th>Hash</th>
            <th>Uploader</th>
            <th>Download</th>
          </tr>
        </thead>
        <tbody>
          {files.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", color: "#b5179e" }}>
                No files available
              </td>
            </tr>
          ) : (
            files.map((file) => (
              <tr key={file.index}>
                <td>{file.index}</td>
                <td>{file.filename}</td>
                <td>{file.filehash.slice(0, 10)}...</td>
                <td>{file.uploader.slice(0, 10)}...</td>
                <td>
                  <button
                    className="download-btn"
                    onClick={() => handleDownload(file.index)}
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;
