const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");
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

const missingUsers = [
  {
    id: "u13", email: "Stenly@triesaktigroup.id", password: "Stenly123", nama_lengkap: "STENLY MARSYELO", nip: "-", role: "dosen", foto_profil: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100", created_at: "2026-06-08 02:57:25.217409+00"
  },
  {
    id: "u14", email: "Ilham@triesaktigroup.id", password: "Ilham123", nama_lengkap: "ILHAM LATIEF", nip: "-", role: "dosen", foto_profil: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100", created_at: "2026-06-08 02:58:25.179395+00"
  },
  {
    id: "u15", email: "Wahyu@triesaktigroup.id", password: "Wahyu123", nama_lengkap: "WAHYU ARDIANSYAH", nip: "-", role: "dosen", foto_profil: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100", created_at: "2026-06-08 03:17:16.632843+00"
  },
  {
    id: "u16", email: "Subhan@triesaktigroup.id", password: "Subhan123", nama_lengkap: "MUHAMMAD SUBHAN", nip: "-", role: "dosen", foto_profil: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100", created_at: "2026-06-08 03:18:30.612673+00"
  },
  {
    id: "u17", email: "Budi@triesaktigroup.id", password: "Budi123", nama_lengkap: "BUDI SAMPO", nip: "-", role: "dosen", foto_profil: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100", created_at: "2026-06-08 03:19:31.314945+00"
  },
  {
    id: "u19", email: "Rizal@triesaktigroup.id", password: "Rizal123", nama_lengkap: "MUHAMMAD RIZAL", nip: "-", role: "dosen", foto_profil: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100", created_at: "2026-06-08 03:29:17.006647+00"
  },
  {
    id: "u20", email: "Asri@triesaktigroup.id", password: "Asri123", nama_lengkap: "ASRI BEDE", nip: "-", role: "dosen", foto_profil: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100", created_at: "2026-06-08 03:30:19.856873+00"
  },
  {
    id: "u21", email: "Nurman@triesaktigroup.id", password: "Nurman123", nama_lengkap: "ANDI NURMAN", nip: "-", role: "dosen", foto_profil: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100", created_at: "2026-06-08 03:31:16.835638+00"
  },
  {
    id: "u22", email: "Adnan@triesaktigroup.id", password: "Adnan123", nama_lengkap: "ADNAN RIFAI RACHMAN", nip: "-", role: "dosen", foto_profil: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100", created_at: "2026-06-08 03:47:56.978028+00"
  },
  {
    id: "u18", email: "Pika@triesaktigroup.id", password: "Pika123", nama_lengkap: "PIKA RIA NOVIANI", nip: "-", role: "dosen", foto_profil: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150", created_at: "2026-06-08 03:20:23.348713+00", nama_bank: "BCA", jenis_kelamin: "P"
  },
  {
    id: "u10", email: "Salma@triesaktigroup.id", password: "Salma123", nama_lengkap: "SITI SALMA", nip: "-", role: "dosen", foto_profil: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150", created_at: "2026-06-08 02:25:12.860327+00", no_rekening: "7265639881", nama_bank: "BSI", nama_pemilik_rek: "SITI SALMA", no_wa: "082271123944", jenis_kelamin: "P"
  }
];

async function insertMissing() {
  for (const u of missingUsers) {
    try {
      await setDoc(doc(db, "tabel_user", u.id), u);
      console.log(`Inserted ${u.nama_lengkap} (${u.id})`);
    } catch (e) {
      console.error(e);
    }
  }
  console.log("Done!");
}

insertMissing();
