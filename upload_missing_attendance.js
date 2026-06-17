const { initializeApp, getApps, getApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { Jimp } = require('jimp');
const heicConvert = require('heic-convert');

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

const missingIds = ['kh_jdo1byakz', 'kh_1jx4neegh', 'kh_ueaflhkp5', 'kh_1ul86044z'];

async function compressBase64(base64Str) {
  if (!base64Str || !base64Str.includes('base64,')) return base64Str;
  
  try {
    const parts = base64Str.split(',');
    const header = parts[0];
    const data = parts[1];
    
    let buffer = Buffer.from(data, 'base64');
    
    if (header.includes('image/heic') || header.includes('image/heif')) {
      console.log("Converting HEIC to JPEG first...");
      buffer = await heicConvert({
        buffer: buffer,
        format: 'JPEG',
        quality: 1
      });
    }
    
    // Read with Jimp
    const image = await Jimp.read(buffer);
    
    // Resize to max 800px width/height while keeping aspect ratio
    image.scaleToFit({ w: 800, h: 800 });
    
    // Get compressed jpeg base64
    const compressedBuffer = await image.getBuffer('image/jpeg', { quality: 60 });
    const compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
    
    return compressedBase64;
  } catch (err) {
    console.error("Compression error:", err);
    return base64Str; // Return original if fails
  }
}

async function uploadMissing() {
  console.log("Reading CSV data...");
  const filePath = path.join(__dirname, 'Supabase Snippet Untitled query (tabel_kehadiran).csv');
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const csvData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });

  const missingRecords = csvData.filter(row => missingIds.includes(row.id));
  
  console.log(`Found ${missingRecords.length} records to process and upload.`);

  for (const m of missingRecords) {
    console.log(`\nProcessing record ID: ${m.id}`);
    
    // Cleanup undefined/null for Firestore
    const cleanRow = {};
    Object.keys(m).forEach(k => {
      if (m[k] !== undefined && m[k] !== null) {
        cleanRow[k] = m[k];
      }
    });

    // Compress images
    if (cleanRow.tanda_tangan) {
      console.log(`Compressing tanda_tangan (Original size: ${(cleanRow.tanda_tangan.length / 1024 / 1024).toFixed(2)} MB)...`);
      cleanRow.tanda_tangan = await compressBase64(cleanRow.tanda_tangan);
      console.log(`Compressed size: ${(cleanRow.tanda_tangan.length / 1024 / 1024).toFixed(2)} MB`);
    }

    if (cleanRow.foto_bukti) {
      console.log(`Compressing foto_bukti (Original size: ${(cleanRow.foto_bukti.length / 1024 / 1024).toFixed(2)} MB)...`);
      cleanRow.foto_bukti = await compressBase64(cleanRow.foto_bukti);
      console.log(`Compressed size: ${(cleanRow.foto_bukti.length / 1024 / 1024).toFixed(2)} MB`);
    }
    
    const finalSize = Buffer.byteLength(JSON.stringify(cleanRow), 'utf8');
    console.log(`Final document size: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);

    if (finalSize > 1000000) {
      console.error(`Document is still too large (>1MB). Skipping upload for ${m.id}`);
      continue;
    }

    try {
      await setDoc(doc(db, "tabel_kehadiran", m.id.toString()), cleanRow);
      console.log(`Successfully uploaded ${m.id}`);
    } catch (e) {
      console.error(`Failed to upload ${m.id}`, e);
    }
  }

  console.log("\nProcess completed.");
  process.exit(0);
}

uploadMissing().catch(console.error);
