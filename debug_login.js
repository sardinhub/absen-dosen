const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    // Check schedule structure
    const schedSnap = await getDocs(collection(db, "tabel_jadwal"));
    const schedules = [];
    schedSnap.forEach(d => schedules.push({ id: d.id, ...d.data() }));
    console.log("Sample schedule:", JSON.stringify(schedules[0], null, 2));
    console.log("tanggal type:", typeof schedules[0]?.tanggal, "value:", schedules[0]?.tanggal);
    console.log("hari type:", typeof schedules[0]?.hari, "value:", schedules[0]?.hari);
    
    // Check attendance structure
    const attSnap = await getDocs(collection(db, "tabel_kehadiran"));
    const attendance = [];
    attSnap.forEach(d => attendance.push({ id: d.id, ...d.data() }));
    console.log("\nSample attendance:", JSON.stringify(attendance[0], null, 2));
    console.log("waktu_absen type:", typeof attendance[0]?.waktu_absen);
  } catch(e) {
    console.error("Error:", e);
  }
}

test();

