"use client";

import { useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db as oldDb } from "../../../lib/firebase";

const COLLECTIONS = [
  'tabel_user',
  'tabel_matakuliah',
  'tabel_jadwal',
  'tabel_kehadiran',
  'tabel_siswa',
  'tabel_absensi_siswa',
  'tabel_penilaian',
  'tabel_materi'
];

export default function MigratePage() {
  const [status, setStatus] = useState("Menunggu aksi...");
  const [logs, setLogs] = useState([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [configStr, setConfigStr] = useState(`{
  "apiKey": "AIzaSyCLgcZZIU8SIh-N1jE0Gg7u57_J3Bqxqiw",
  "authDomain": "database-sikad.firebaseapp.com",
  "projectId": "database-sikad",
  "storageBucket": "database-sikad.firebasestorage.app",
  "messagingSenderId": "6720699709",
  "appId": "1:6720699709:web:a93ed88aa9575f7f4d1954"
}`);

  const appendLog = (msg) => {
    setLogs(prev => [...prev, msg]);
    console.log(msg);
  };

  const startMigration = async () => {
    setIsMigrating(true);
    setStatus("Memulai migrasi...");
    setLogs([]);
    
    try {
      const newConfig = JSON.parse(configStr);
      let newApp;
      const existingApps = getApps();
      const migrateApp = existingApps.find(app => app.name === "MigrationApp");
      if (migrateApp) {
        newApp = migrateApp;
      } else {
        newApp = initializeApp(newConfig, "MigrationApp");
      }
      
      const newDb = getFirestore(newApp);
      
      let totalDocsMigrated = 0;
      
      for (const colName of COLLECTIONS) {
        appendLog(`--- Membaca koleksi [${colName}] dari database LAMA... ---`);
        const colRef = collection(oldDb, colName);
        const snapshot = await getDocs(colRef);
        
        if (snapshot.empty) {
          appendLog(`Koleksi [${colName}] kosong, dilewati.`);
          continue;
        }
        
        appendLog(`Ditemukan ${snapshot.size} dokumen di [${colName}]. Memulai transfer...`);
        let count = 0;
        
        for (const document of snapshot.docs) {
          const data = document.data();
          const docId = document.id;
          
          try {
            const newDocRef = doc(newDb, colName, docId);
            await setDoc(newDocRef, data);
            count++;
          } catch (err) {
            appendLog(`❌ GAGAL memindahkan dokumen ${docId} di koleksi ${colName}: ${err.message}`);
          }
        }
        
        appendLog(`✅ Berhasil memindahkan ${count}/${snapshot.size} dokumen untuk koleksi [${colName}].`);
        totalDocsMigrated += count;
      }
      
      setStatus(`Migrasi selesai! Total ${totalDocsMigrated} dokumen berhasil dipindahkan.`);
      appendLog("🎉 SEMUA PROSES SELESAI! Silakan ubah isi file .env.local Anda dengan konfigurasi yang baru agar aplikasi sepenuhnya terhubung ke database baru.");
      
    } catch (error) {
      appendLog(`❌ Terjadi kesalahan kritis: ${error.message}`);
      setStatus("Migrasi terhenti karena error.");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto", color: "white" }}>
      <h2>Alat Migrasi Database Firebase</h2>
      <p style={{ color: "#9ca3af" }}>
        Halaman ini akan menyalin semua data dari database lama (yang tertanam di aplikasi) ke database baru yang Anda tentukan di bawah ini.
      </p>
      
      <div style={{ background: "#1f2937", padding: "1rem", borderRadius: "8px", marginTop: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>Konfigurasi Firebase Baru (JSON format):</label>
        <textarea 
          value={configStr}
          onChange={(e) => setConfigStr(e.target.value)}
          style={{ width: "100%", height: "200px", background: "#111827", color: "#34d399", padding: "1rem", borderRadius: "4px", border: "1px solid #374151", fontFamily: "monospace" }}
        />
      </div>
      
      <button 
        onClick={startMigration} 
        disabled={isMigrating}
        style={{
          marginTop: "1.5rem",
          padding: "0.75rem 2rem",
          background: isMigrating ? "#4b5563" : "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: isMigrating ? "not-allowed" : "pointer",
          fontWeight: "bold",
          fontSize: "1.1rem"
        }}
      >
        {isMigrating ? "Sedang Memigrasi..." : "Mulai Migrasi Data Sekarang"}
      </button>
      
      <div style={{ marginTop: "2rem", padding: "1rem", background: "#000", border: "1px solid #374151", borderRadius: "8px", minHeight: "200px", maxHeight: "400px", overflowY: "auto" }}>
        <h4 style={{ margin: "0 0 1rem 0", color: "#60a5fa" }}>Status: {status}</h4>
        {logs.map((log, idx) => (
          <div key={idx} style={{ fontFamily: "monospace", fontSize: "0.9rem", margin: "0.25rem 0", color: log.includes("❌") ? "#ef4444" : (log.includes("✅") ? "#10b981" : (log.includes("🎉") ? "#fbbf24" : "#d1d5db")) }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
