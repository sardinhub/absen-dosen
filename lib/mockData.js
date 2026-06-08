export const defaultUsers = [
  { id: "u1", email: "dosen1@triesakti.ac.id", password: "dosen", nama_lengkap: "Capt. Andi Wijaya, M.T.", nip: "NIP. 198504122010121001", role: "dosen", foto_profil: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100", no_rekening: "1234567890", nama_bank: "BCA", nama_pemilik_rek: "ANDI WIJAYA", no_wa: "081234567890" },
  { id: "u2", email: "dosen2@triesakti.ac.id", password: "dosen", nama_lengkap: "Dr. Rina Astuti, S.Si., M.Sc.", nip: "NIP. 199008232015042002", role: "dosen", foto_profil: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=100", no_rekening: "0987654321", nama_bank: "Mandiri", nama_pemilik_rek: "RINA ASTUTI", no_wa: "081987654321" },
  { id: "u3", email: "dosen3@triesakti.ac.id", password: "dosen", nama_lengkap: "Herman Susilo, S.T., M.M.", nip: "NIP. 197811052005011003", role: "dosen", foto_profil: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100", no_rekening: "1122334455", nama_bank: "BNI", nama_pemilik_rek: "HERMAN SUSILO", no_wa: "085566778899" },
  { id: "admin@triesakti.ac.id", email: "admin@triesakti.ac.id", password: "admin", nama_lengkap: "Admin Akademik Triesakti", nip: "NIP. 199201012018011001", role: "admin", foto_profil: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=100", no_wa: "" }
];

export const defaultMataKuliah = [
  { id: "mk1", kode_mk: "AV-101", nama_mk: "Introduction to Aviation & Airline Operations", sks: 3, semester: "1" },
  { id: "mk2", kode_mk: "AV-204", nama_mk: "Aviation Safety & Human Factors", sks: 3, semester: "3" },
  { id: "mk3", kode_mk: "AV-308", nama_mk: "Air Traffic Management Systems", sks: 4, semester: "5" },
  { id: "mk4", kode_mk: "AV-401", nama_mk: "Airline Flight Dispatch & Planning", sks: 3, semester: "7" }
];

export const defaultJadwal = [
  // Capt. Andi Wijaya
  { id: "j1", dosen_id: "u1", mk_id: "mk1", kelas: "Aero-A", hari: "Kamis", jam_mulai: "08:00", jam_selesai: "10:30", ruangan: "R. Cockpit 1" },
  { id: "j2", dosen_id: "u1", mk_id: "mk2", kelas: "Aero-B", hari: "Kamis", jam_mulai: "11:00", jam_selesai: "13:30", ruangan: "R. Simulator" },
  // Dr. Rina Astuti
  { id: "j3", dosen_id: "u2", mk_id: "mk3", kelas: "ATC-A", hari: "Kamis", jam_mulai: "08:30", jam_selesai: "11:50", ruangan: "Lab Tower" },
  { id: "j4", dosen_id: "u2", mk_id: "mk4", kelas: "ATC-B", hari: "Jumat", jam_mulai: "09:00", jam_selesai: "11:30", ruangan: "R. Briefing" },
  // Herman Susilo
  { id: "j5", dosen_id: "u3", mk_id: "mk1", kelas: "Aero-C", hari: "Senin", jam_mulai: "13:00", jam_selesai: "15:30", ruangan: "R. Cockpit 2" }
];

// Seed some initial attendance history
export const defaultKehadiran = [
  {
    id: "kh1",
    jadwal_id: "j1",
    dosen_id: "u1",
    tanggal: "2026-05-28", // Last Thursday
    pertemuan_ke: 10,
    materi: "Basic Flight Instruments & Cockpit Checks",
    foto_bukti: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&q=80&w=400",
    tanda_tangan: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'><path d='M 10 80 Q 52.5 10, 95 80 T 180 80' stroke='blue' fill='none'/></svg>",
    status: "hadir",
    waktu_absen: "2026-05-28T08:05:00Z",
    catatan: "Kelas berjalan kondusif, semua mahasiswa hadir."
  },
  {
    id: "kh2",
    jadwal_id: "j2",
    dosen_id: "u1",
    tanggal: "2026-05-28",
    pertemuan_ke: 10,
    materi: "Emergency Procedures Simulation - Engine Failure",
    foto_bukti: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=400",
    tanda_tangan: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'><path d='M 20 20 L 100 80 L 180 20' stroke='blue' fill='none'/></svg>",
    status: "hadir",
    waktu_absen: "2026-05-28T11:02:10Z",
    catatan: "Sesi simulator berhasil diselesaikan."
  },
  {
    id: "kh3",
    jadwal_id: "j3",
    dosen_id: "u2",
    tanggal: "2026-05-28",
    pertemuan_ke: 8,
    materi: "Radar Vectoring and Separation Standards",
    foto_bukti: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400",
    tanda_tangan: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'><path d='M 10 50 C 20 20, 40 20, 50 50 S 80 80, 100 50' stroke='purple' fill='none'/></svg>",
    status: "hadir",
    waktu_absen: "2026-05-28T08:35:12Z",
    catatan: "Praktikum di lab radar berjalan lancar."
  }
];

// Helper to initialize and retrieve database from localStorage
export function getLocalDB() {
  if (typeof window === "undefined") {
    return {
      users: defaultUsers,
      mataKuliah: defaultMataKuliah,
      jadwal: defaultJadwal,
      kehadiran: defaultKehadiran
    };
  }

  const getOrInit = (key, defaultVal) => {
    const val = localStorage.getItem(`sikad_${key}`);
    if (!val) {
      localStorage.setItem(`sikad_${key}`, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(val);
  };

  return {
    users: getOrInit("users", defaultUsers),
    mataKuliah: getOrInit("mataKuliah", defaultMataKuliah),
    jadwal: getOrInit("jadwal", defaultJadwal),
    kehadiran: getOrInit("kehadiran", defaultKehadiran)
  };
}

export function saveLocalDB(db) {
  if (typeof window === "undefined") return;
  localStorage.setItem("sikad_users", JSON.stringify(db.users));
  localStorage.setItem("sikad_mataKuliah", JSON.stringify(db.mataKuliah));
  localStorage.setItem("sikad_jadwal", JSON.stringify(db.jadwal));
  localStorage.setItem("sikad_kehadiran", JSON.stringify(db.kehadiran));
}
