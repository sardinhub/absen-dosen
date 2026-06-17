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
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
  return data;
}

async function findMissing() {
  console.log("Fetching data from Firebase...");
  const snapshot = await getDocs(collection(db, "tabel_user"));
  const firebaseIds = new Set();
  snapshot.forEach(doc => {
    firebaseIds.add(doc.id.toString());
  });

  console.log(`Found ${firebaseIds.size} users in Firebase.`);

  console.log("Reading CSV data...");
  const csvData = readCsvFile('Supabase Snippet Untitled query (tabel_user).csv');
  
  const dosenCsv = csvData.filter(row => row.role === 'dosen');
  console.log(`Found ${dosenCsv.length} dosen in CSV.`);

  const missing = [];
  for (const row of dosenCsv) {
    if (row.id && !firebaseIds.has(row.id.toString())) {
      missing.push(row);
    }
  }

  if (missing.length > 0) {
    console.log(`\nFound ${missing.length} dosen missing from Firebase:`);
    missing.forEach(d => console.log(`- ID: ${d.id}, Name: ${d.nama_lengkap || d.name || d.username || 'Unknown'}`));
  } else {
    console.log("\nAll dosen have been successfully migrated!");
  }
  process.exit(0);
}

findMissing().catch(console.error);
