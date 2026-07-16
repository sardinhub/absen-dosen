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
    const attSnap = await getDocs(collection(db, "tabel_kehadiran"));
    const attendance = attSnap.docs.map(d => d.data());
    console.log(`Total attendance: ${attendance.length}`);
    const pendingCount = attendance.filter(a => a.status === 'pending').length;
    console.log(`Pending attendance: ${pendingCount}`);
    
    const schedSnap = await getDocs(collection(db, "tabel_jadwal"));
    console.log(`Total schedules: ${schedSnap.docs.length}`);

    const userSnap = await getDocs(collection(db, "tabel_user"));
    const dosenCount = userSnap.docs.map(d => d.data()).filter(u => u.role === 'dosen').length;
    console.log(`Total dosen: ${dosenCount}`);
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
