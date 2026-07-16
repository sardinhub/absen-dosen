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

async function findAndi() {
  try {
    const snap = await getDocs(collection(db, "tabel_user"));
    const users = [];
    snap.forEach(d => users.push({ id: d.id, ...d.data() }));
    
    console.log("Total users:", users.length);
    const andi = users.filter(u => (u.nama_lengkap || '').toLowerCase().includes("andi"));
    console.log("Users with 'andi' in name:", andi);

  } catch(e) {
    console.error("Error:", e);
  }
}
findAndi();
