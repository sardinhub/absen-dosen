const { initializeApp, getApps, getApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

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

function readCsvFile(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filename} not found.`);
    return [];
  }
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
}

async function checkMissingAttendance() {
  console.log("Fetching attendance IDs from Firebase...");
  const snapshot = await getDocs(collection(db, "tabel_kehadiran"));
  const firebaseIds = new Set();
  snapshot.forEach(doc => firebaseIds.add(doc.id.toString()));

  console.log(`Found ${firebaseIds.size} attendance records in Firebase.`);

  console.log("Reading CSV data...");
  const csvData = readCsvFile('Supabase Snippet Untitled query (tabel_kehadiran).csv');
  console.log(`Found ${csvData.length} attendance records in CSV.`);

  const missing = [];
  for (const row of csvData) {
    if (row.id && !firebaseIds.has(row.id.toString())) {
      missing.push(row);
    }
  }

  console.log(`\nFound ${missing.length} missing attendance records.`);
  
  missing.forEach((m, i) => {
    // calculate approx size of the record
    const sizeBytes = Buffer.byteLength(JSON.stringify(m), 'utf8');
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
    
    // get signature prefix
    const sigPreview = m.tanda_tangan ? m.tanda_tangan.substring(0, 30) + '...' : 'null';
    
    console.log(`\n[Missing Record ${i+1}]`);
    console.log(`ID: ${m.id}`);
    console.log(`Dosen ID: ${m.dosen_id}`);
    console.log(`Jadwal ID: ${m.jadwal_id}`);
    console.log(`Pertemuan: ${m.pertemuan_ke}`);
    console.log(`Tanggal: ${m.tanggal}`);
    console.log(`Status: ${m.status}`);
    console.log(`Size in CSV: ${sizeMB} MB`);
  });

  process.exit(0);
}

checkMissingAttendance().catch(console.error);
