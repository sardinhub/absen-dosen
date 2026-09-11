"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getCourses, getUsers } from "../../../lib/db";
import { translations } from "../../../lib/translations";

const FACILITY_LIST = [
  {
    id: "f1",
    name: "Boeing 737 Flight Simulator Room",
    category: "Simulator Penerbangan",
    description: "Ruang Cockpit Simulator canggih berstandar industri aviasi untuk latihan instrumen terbang dan prosedur penerbangan darurat.",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&q=80&w=600",
    location: "Gedung A, Lantai 2",
    status: "Tersedia"
  },
  {
    id: "f2",
    name: "Air Traffic Control (ATC) Radar Lab",
    category: "Simulasi Tower",
    description: "Laboratorium simulasi kontrol lalu lintas udara real-time dengan radar vectoring modern dan komunikasi air-to-ground.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600",
    location: "Gedung B, Lantai 3",
    status: "Tersedia"
  },
  {
    id: "f3",
    name: "Hanggar Pesawat & Aircraft Shop",
    category: "Praktikum Maintenance",
    description: "Hanggar praktikum pesawat dengan mesin turbofan asli, sistem avionik, serta peralatan perawatan struktur pesawat udara.",
    image: "https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&q=80&w=600",
    location: "Kawasan Hanggar Timur",
    status: "Tersedia"
  },
  {
    id: "f4",
    name: "Perpustakaan Aviasi & Digital Library",
    category: "Pusat Riset",
    description: "Koleksi ribuan manual aviasi ICAO/IATA, jurnal ilmiah penerbangan Internasional, serta akses e-library 24/7.",
    image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&q=80&w=600",
    location: "Gedung Utama, Lantai 1",
    status: "Tersedia"
  },
  {
    id: "f5",
    name: "Studio Aviation English & Briefing Room",
    category: "Laboratorium Bahasa",
    description: "Studio audio-visual terkini untuk mengasah fraseologi penerbangan ICAO serta ruang simulasi dispatch briefing.",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=600",
    location: "Gedung C, Lantai 2",
    status: "Tersedia"
  }
];

const CURRICULUM_DATA = [
  { kode_mk: "AV-101", nama_mk: "Introduction to Aviation & Airline Operations", sks: 3, semester: "Semester 1", desc: "Pengenalan komprehensif alur kerja maskapai penerbangan, regulasi aviasi, dan organisasi penerbangan sipil." },
  { kode_mk: "AV-102", nama_mk: "Aviation English Phraseology & Communication", sks: 2, semester: "Semester 1", desc: "Pelatihan komunikasi radio standar ICAO untuk keamanan penerbangan darat dan udara." },
  { kode_mk: "AV-103", nama_mk: "Aerodynamics & Flight Theory Fundamentals", sks: 3, semester: "Semester 1", desc: "Prinsip dasar gaya aerodinamika, stabilitas pesawat, dan mekanika penerbangan." },
  { kode_mk: "AV-201", nama_mk: "Aviation Safety & Human Factors", sks: 3, semester: "Semester 2", desc: "Analisis faktor manusia (Human Factors) dalam keselamatan penerbangan dan sistem SMS (Safety Management System)." },
  { kode_mk: "AV-202", nama_mk: "Aircraft Systems & Instrumentation", sks: 3, semester: "Semester 2", desc: "Studi sistem instrumen kokpit, kelistrikan, hidrolik, dan aviasi navigasi." },
  { kode_mk: "AV-203", nama_mk: "Air Traffic Management & Airspace Control", sks: 4, semester: "Semester 2", desc: "Pengenalan manajemen ruang udara, pemisahan pesawat, dan operasi tower kontrol lalu lintas udara." }
];

export default function CasisDashboard() {
  const searchParams = useSearchParams();
  const activeTabFromUrl = searchParams.get("tab") || "profile";

  const [activeTab, setActiveTab] = useState(activeTabFromUrl);
  const [casisUser, setCasisUser] = useState(null);
  const [lang, setLang] = useState("id");
  const [lecturers, setLecturers] = useState([]);

  useEffect(() => {
    setActiveTab(activeTabFromUrl);
  }, [activeTabFromUrl]);

  useEffect(() => {
    const loggedIn = localStorage.getItem("sikad_logged_in_user");
    if (loggedIn) {
      try {
        const parsed = JSON.parse(loggedIn);
        setCasisUser(parsed);
      } catch (err) {
        console.error(err);
      }
    }
    const savedLang = localStorage.getItem("sikad_lang");
    if (savedLang) setLang(savedLang);

    // Fetch lecturers
    getUsers().then(users => {
      setLecturers(users.filter(u => u.role === "dosen"));
    }).catch(err => console.error(err));
  }, []);

  const t = translations[lang] || translations.id;

  if (!casisUser) return null;

  const isConverted = casisUser.status_konversi === "Terkonversi ke NIM";

  return (
    <div className="container" style={{ padding: "1.5rem 1rem" }}>
      {/* Header Greeting Banner */}
      <div className="glass-panel" style={{
        padding: "2rem 1.5rem", borderRadius: "20px", marginBottom: "1.5rem",
        background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(99, 102, 241, 0.08))",
        border: "1px solid rgba(14, 165, 233, 0.2)"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{
              width: "4.5rem", height: "4.5rem", borderRadius: "50%",
              background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.8rem", color: "#fff", fontWeight: 700,
              boxShadow: "0 8px 20px rgba(14, 165, 233, 0.3)"
            }}>
              {casisUser.nama_lengkap ? casisUser.nama_lengkap.charAt(0).toUpperCase() : "C"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span className="badge badge-success" style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}>
                  ✓ Uang Pangkal LUNAS
                </span>
                <span className="badge badge-primary" style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem", fontFamily: "monospace" }}>
                  NISS: {casisUser.niss || "NISS-2026-001"}
                </span>
              </div>
              <h2 style={{ fontSize: "1.6rem", margin: "0.3rem 0 0.1rem 0", color: "#f9fafb" }}>
                {lang === "id" ? "Selamat Datang," : "Welcome,"} <span className="gradient-text">{casisUser.nama_lengkap}</span>!
              </h2>
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.9rem" }}>
                Calon Siswa Triesakti Institute of Airlines Makassar — Jurusan <strong style={{ color: "#38bdf8" }}>{casisUser.jurusan || "Manajemen Penerbangan"}</strong>
              </p>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Status Alur Pendaftaran:</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: isConverted ? "#c084fc" : "#fbbf24", marginTop: "0.2rem" }}>
              {isConverted ? `🎓 NIM Resmi: ${casisUser.nim}` : "● Calon Siswa (CASIS) Aktif"}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", overflowX: "auto" }}>
        <button
          className={`btn ${activeTab === "profile" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("profile")}
          style={{ padding: "0.6rem 1.25rem", borderRadius: "10px", fontSize: "0.9rem" }}
        >
          👤 Data Diri CASIS
        </button>
        <button
          className={`btn ${activeTab === "matakuliah" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("matakuliah")}
          style={{ padding: "0.6rem 1.25rem", borderRadius: "10px", fontSize: "0.9rem" }}
        >
          📚 Informasi Mata Kuliah
        </button>
        <button
          className={`btn ${activeTab === "fasilitas" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("fasilitas")}
          style={{ padding: "0.6rem 1.25rem", borderRadius: "10px", fontSize: "0.9rem" }}
        >
          🏫 Fasilitas Kampus
        </button>
        <button
          className={`btn ${activeTab === "dosen" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("dosen")}
          style={{ padding: "0.6rem 1.25rem", borderRadius: "10px", fontSize: "0.9rem" }}
        >
          👨‍🏫 Dosen Pendamping
        </button>
      </div>

      {/* TAB 1: DATA DIRI CASIS */}
      {activeTab === "profile" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {/* Card Data Diri Detail */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "16px" }}>
            <h3 style={{ margin: "0 0 1.25rem 0", color: "#38bdf8", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.15rem" }}>
              📄 Informasi Profil Calon Siswa
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.6rem" }}>
                <span style={{ color: "#9ca3af", fontSize: "0.9rem" }}>Nomor NISS (Sementara):</span>
                <span style={{ fontWeight: 700, color: "#38bdf8", fontFamily: "monospace" }}>{casisUser.niss || "NISS-2026-001"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.6rem" }}>
                <span style={{ color: "#9ca3af", fontSize: "0.9rem" }}>Nama Lengkap Siswa:</span>
                <span style={{ fontWeight: 600, color: "#f9fafb" }}>{casisUser.nama_lengkap}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.6rem" }}>
                <span style={{ color: "#9ca3af", fontSize: "0.9rem" }}>Asal Sekolah:</span>
                <span style={{ fontWeight: 500, color: "#e5e7eb" }}>{casisUser.asal_sekolah || "SMA Negeri 1 Makassar"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.6rem" }}>
                <span style={{ color: "#9ca3af", fontSize: "0.9rem" }}>Jurusan Pilihan:</span>
                <span style={{ fontWeight: 600, color: "#818cf8" }}>{casisUser.jurusan || "Manajemen Penerbangan"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.6rem" }}>
                <span style={{ color: "#9ca3af", fontSize: "0.9rem" }}>Username Login:</span>
                <span style={{ fontWeight: 600, color: "#34d399" }}>{casisUser.username || casisUser.niss}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.6rem" }}>
                <span style={{ color: "#9ca3af", fontSize: "0.9rem" }}>Status Biaya Uang Pangkal:</span>
                <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>
                  ✓ TERBAYAR & LUNAS
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9ca3af", fontSize: "0.9rem" }}>Konversi NIM Asli:</span>
                {isConverted ? (
                  <span style={{ fontWeight: 700, color: "#c084fc" }}>✓ NIM: {casisUser.nim}</span>
                ) : (
                  <span style={{ color: "#fbbf24", fontSize: "0.85rem" }}>Tersedia Setelah Rangkaian Masuk Kampus</span>
                )}
              </div>
            </div>
          </div>

          {/* Timeline Tahapan Penerimaan */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "16px" }}>
            <h3 style={{ margin: "0 0 1.25rem 0", color: "#fbbf24", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.15rem" }}>
              🗺️ Alur Tahapan Calon Siswa (CASIS)
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>✓</div>
                <div>
                  <div style={{ fontWeight: 600, color: "#f9fafb", fontSize: "0.95rem" }}>1. Pendaftaran Calon Siswa</div>
                  <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Pengisian formulir biodata pendaftaran calon siswa penerbangan.</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>✓</div>
                <div>
                  <div style={{ fontWeight: 600, color: "#f9fafb", fontSize: "0.95rem" }}>2. Pembayaran Uang Pangkal</div>
                  <div style={{ fontSize: "0.8rem", color: "#34d399", fontWeight: 500 }}>Lunas — Bukti pembayaran terverifikasi oleh Administrasi Keuangan.</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>✓</div>
                <div>
                  <div style={{ fontWeight: 600, color: "#f9fafb", fontSize: "0.95rem" }}>3. Penerbitan Nomor Induk Siswa Sementara (NISS)</div>
                  <div style={{ fontSize: "0.8rem", color: "#38bdf8", fontWeight: 600 }}>NISS Aktif: {casisUser.niss} (Akun Login Siap Digunakan)</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: isConverted ? "#10b981" : "#0ea5e9", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
                  {isConverted ? "✓" : "4"}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: "#f9fafb", fontSize: "0.95rem" }}>4. Matrikulasi & Pembekalan Kampus</div>
                  <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Pengenalan dasar ilmu aviasi, fasilitas simulator, dan orientasi akademik.</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: isConverted ? "#10b981" : "rgba(255,255,255,0.1)", color: isConverted ? "#fff" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
                  {isConverted ? "✓" : "5"}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: isConverted ? "#c084fc" : "#9ca3af", fontSize: "0.95rem" }}>
                    5. Konversi NISS ke NIM Resmi
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                    {isConverted ? `Selamat! NISS Anda telah dikonversi menjadi NIM Resmi: ${casisUser.nim}` : "NISS akan otomatis dikonversi ke NIM resmi saat resmi masuk di kampus."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INFORMASI MATA KULIAH */}
      {activeTab === "matakuliah" && (
        <div>
          <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "16px", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#818cf8" }}>
              📚 Kurikulum & Mata Kuliah (Preview Calon Siswa)
            </h3>
            <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.88rem" }}>
              Berikut adalah daftar mata kuliah dasar dan keahlian penerbangan yang akan Anda pelajari selama masa pendidikan di jurusan <strong style={{ color: "#38bdf8" }}>{casisUser.jurusan || "Manajemen Penerbangan"}</strong>.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
            {CURRICULUM_DATA.map((mk, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: "1.25rem", borderRadius: "14px", borderLeft: "4px solid #6366f1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#38bdf8", background: "rgba(14, 165, 233, 0.12)", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                    {mk.kode_mk}
                  </span>
                  <span className="badge badge-secondary" style={{ fontSize: "0.75rem" }}>
                    {mk.sks} SKS • {mk.semester}
                  </span>
                </div>
                <h4 style={{ margin: "0.5rem 0", color: "#f9fafb", fontSize: "1.05rem" }}>
                  {mk.nama_mk}
                </h4>
                <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.85rem", lineHeight: "1.5" }}>
                  {mk.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FASILITAS KAMPUS */}
      {activeTab === "fasilitas" && (
        <div>
          <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "16px", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#38bdf8" }}>
              🏫 Fasilitas Unggulan Kampus Penerbangan
            </h3>
            <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.88rem" }}>
              Triesakti Institute of Airlines Makassar menyediakan fasilitas praktikum penerbangan modern yang dirancang untuk membentuk keahlian aviasi tingkat internasional.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {FACILITY_LIST.map((fac) => (
              <div key={fac.id} className="glass-panel" style={{ borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ height: "180px", position: "relative", overflow: "hidden" }}>
                  <img
                    src={fac.image}
                    alt={fac.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <span className="badge badge-primary" style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(6, 9, 19, 0.8)", backdropFilter: "blur(4px)" }}>
                    {fac.category}
                  </span>
                </div>

                <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <h4 style={{ margin: "0 0 0.5rem 0", color: "#f9fafb", fontSize: "1.1rem" }}>
                      {fac.name}
                    </h4>
                    <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.85rem", lineHeight: "1.5" }}>
                      {fac.description}
                    </p>
                  </div>

                  <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#6b7280" }}>
                    <span>📍 {fac.location}</span>
                    <span style={{ color: "#34d399", fontWeight: 600 }}>● {fac.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DOSEN PENDAMPING */}
      {activeTab === "dosen" && (
        <div>
          <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "16px", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#34d399" }}>
              👨‍🏫 Dosen & Instruktur Pendamping Perkuliahan
            </h3>
            <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.88rem" }}>
              Dosen dan instruktur profesional berpengalaman di dunia penerbangan sipil dan maskapai yang siap membimbing calon siswa selama pendidikan.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {lecturers.map((dosen) => (
              <div key={dosen.id} className="glass-panel" style={{ padding: "1.5rem", borderRadius: "16px", textAlign: "center" }}>
                <img
                  src={dosen.foto_profil || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"}
                  alt={dosen.nama_lengkap}
                  style={{ width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", margin: "0 auto 1rem auto", border: "3px solid #0ea5e9" }}
                />
                <h4 style={{ margin: "0 0 0.25rem 0", color: "#f9fafb", fontSize: "1.1rem" }}>
                  {dosen.nama_lengkap}
                </h4>
                <div style={{ fontSize: "0.8rem", color: "#38bdf8", fontFamily: "monospace", marginBottom: "0.5rem" }}>
                  {dosen.nip}
                </div>

                <div style={{ fontSize: "0.85rem", color: "#9ca3af", background: "rgba(255,255,255,0.03)", padding: "0.5rem", borderRadius: "8px", margin: "0.75rem 0" }}>
                  Dosen Pengajar & Instruktur Aviasi
                </div>

                <div style={{ fontSize: "0.8rem", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.828-1.424-5.15-3.746-6.574-6.574l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                  <span>{dosen.no_wa || "0812-3456-7890"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
