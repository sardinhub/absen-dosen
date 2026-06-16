const { initializeApp, getApps, getApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Load env vars
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Use xlsx to read CSV easily
function readCsvFile(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filename} tidak ditemukan. Lewati...`);
    return [];
  }
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
  return data;
}

async function uploadToCollection(collectionName, data) {
  if (data.length === 0) return;
  console.log(`Mengupload ${data.length} baris ke tabel ${collectionName}...`);
  let count = 0;
  for (const row of data) {
    if (!row.id) {
      console.warn(`Baris tanpa ID ditemukan di ${collectionName}. Lewati...`, row);
      continue;
    }
    try {
      // Membersihkan null values dari xlsx reader jika diperlukan, tapi setDoc biasanya bisa handle
      const cleanRow = {};
      Object.keys(row).forEach(k => {
        if (row[k] !== undefined && row[k] !== null) {
          cleanRow[k] = row[k];
        }
      });
      await setDoc(doc(db, collectionName, row.id.toString()), cleanRow);
      count++;
    } catch (e) {
      console.error(`Gagal upload row ID: ${row.id}`, e);
    }
  }
  console.log(`Berhasil mengupload ${count} data ke ${collectionName}.\n`);
}

async function migrate() {
  console.log("Memulai proses migrasi ke Firebase...\n");

  const tables = [
    { file: 'Supabase Snippet Untitled query (tabel_user).csv', coll: 'tabel_user' },
    { file: 'Supabase Snippet Untitled query (tabel_matakuliah).csv', coll: 'tabel_matakuliah' },
    { file: 'Supabase Snippet Untitled query (tabel_jadwal).csv', coll: 'tabel_jadwal' },
    { file: 'Supabase Snippet Untitled query (tabel_kehadiran).csv', coll: 'tabel_kehadiran' }
  ];

  for (const t of tables) {
    const data = readCsvFile(t.file);
    await uploadToCollection(t.coll, data);
  }

  console.log("✅ Migrasi Selesai!");
  process.exit(0);
}

migrate();
