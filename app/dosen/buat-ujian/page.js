"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  getCourses, 
  getSchedules, 
  getExams, 
  saveExam, 
  deleteExam, 
  getExamResults 
} from "../../../lib/db";

// Generator for sample aviation & general exam questions (30, 40, 50 items)
function generateSampleQuestions(count = 30) {
  const numPg = Math.round(count * 0.7); // 70% Pilihan Ganda
  const numIsian = count - numPg;        // 30% Isian Singkat

  const samplePgList = [
    { pertanyaan: "Apa nama instrumen utama yang digunakan pilot untuk mengukur ketinggian pesawat dari permukaan laut?", opsi: { A: "Altimeter", B: "Airspeed Indicator", C: "Variometer", D: "Attitude Indicator", E: "Tachometer" }, kunci: "A" },
    { pertanyaan: "Gaya yang melawan gaya dorong (thrust) pada pesawat saat mengudara dinamakan gaya...", opsi: { A: "Lift", B: "Weight / Gravity", C: "Drag (Hambatan)", D: "Torque", E: "Pitch" }, kunci: "C" },
    { pertanyaan: "Bagian ekor pesawat yang berfungsi menjaga kestabilan arah horizontal (yaw) adalah...", opsi: { A: "Rudder", B: "Elevator", C: "Aileron", D: "Flap", E: "Spoiler" }, kunci: "A" },
    { pertanyaan: "Prinsip aerodinamika yang menjelaskan bahwa peningkatan kecepatan fluida menyebabkan penurunan tekanan adalah hukum...", opsi: { A: "Bernoulli", B: "Newton III", C: "Pascal", D: "Boyle", E: "Archimedes" }, kunci: "A" },
    { pertanyaan: "Kecepatan penerbangan yang diukur relatif terhadap udara sekitar disebut...", opsi: { A: "Groundspeed", B: "Indicated Airspeed (IAS)", C: "Calibrated Airspeed", D: "True Airspeed", E: "Mach Speed" }, kunci: "B" },
    { pertanyaan: "Fungsi utama dari komponen Flap pada sayap pesawat adalah untuk...", opsi: { A: "Menambah daya angkat saat lepas landas dan mendarat", B: "Meningkatkan kecepatan maksimum saat jelajah", C: "Mengurangi konsumsi bahan bakar", D: "Mengunci posisi roda pendaratan", E: "Mengontrol putaran gelombang radio" }, kunci: "A" },
    { pertanyaan: "Istilah untuk jalur penerbangan yang ditentukan di udara dinamakan...", opsi: { A: "Airway / Air Route", B: "Taxiway", C: "Runway", D: "Terminal Control Area", E: "Holding Pattern" }, kunci: "A" },
    { pertanyaan: "Lembaga internasional yang mengatur standar dan keselamatan penerbangan sipil dunia adalah...", opsi: { A: "ICAO", B: "IATA", C: "FAA", D: "BMKG", E: "EASA" }, kunci: "A" },
    { pertanyaan: "Komponen kontrol penerbangan di sayap yang mengatur gerakan perbankan (roll) adalah...", opsi: { A: "Aileron", B: "Elevator", C: "Rudder", D: "Trim Tab", E: "Slats" }, kunci: "A" },
    { pertanyaan: "Sudut antara garis kord sayap dan aliran udara bebas disebut...", opsi: { A: "Angle of Attack (AoA)", B: "Angle of Incidence", C: "Dihedral Angle", D: "Sweepback Angle", E: "Bank Angle" }, kunci: "A" },
    { pertanyaan: "Suatu kondisi ketika sayap kehilangan daya angkat secara tiba-tiba akibat AoA terlalu tinggi disebut...", opsi: { A: "Stall", B: "Spin", C: "Turbulence", D: "Windshear", E: "Overspeed" }, kunci: "A" },
    { pertanyaan: "Sistem navigasi berbasis satelit global yang paling umum digunakan adalah...", opsi: { A: "GPS", B: "VOR", C: "NDB", D: "ILS", E: "DME" }, kunci: "A" },
    { pertanyaan: "Sistem navigasi instrumen pendaratan presisi di bandara dinamakan...", opsi: { A: "ILS (Instrument Landing System)", B: "VOR", C: "Radar ATC", D: "TCAS", E: "GPWS" }, kunci: "A" },
    { pertanyaan: "Alat pengukur kecepatan pendakian atau penurunan pesawat (vertical speed) adalah...", opsi: { A: "VSI (Vertical Speed Indicator)", B: "Turn Coordinator", C: "HSI", D: "ASI", E: "Compass" }, kunci: "A" },
    { pertanyaan: "Fenomena perubahan arah dan kecepatan angin secara mendadak yang sangat berbahaya bagi penerbangan disebut...", opsi: { A: "Windshear", B: "Microburst", C: "Thermal", D: "Jet Stream", E: "Frontal Squall" }, kunci: "A" },
    { pertanyaan: "Kode transponder standar internasional untuk situasi darurat umum (emergency) adalah...", opsi: { A: "7700", B: "7600", C: "7500", D: "1200", E: "2000" }, kunci: "A" },
    { pertanyaan: "Kode transponder untuk indikasi pembajakan pesawat (hijack) adalah...", opsi: { A: "7500", B: "7600", C: "7700", D: "7000", E: "1000" }, kunci: "A" },
    { pertanyaan: "Kode transponder untuk kegagalan komunikasi radio (radio failure) adalah...", opsi: { A: "7600", B: "7500", C: "7700", D: "1200", E: "0000" }, kunci: "A" },
    { pertanyaan: "Batas kecepatan jelajah pesawat udara pada ketinggian rendah di bawah 10.000 feet biasanya adalah...", opsi: { A: "250 knots", B: "300 knots", C: "200 knots", D: "180 knots", E: "400 knots" }, kunci: "A" },
    { pertanyaan: "Suatu area udara di sekitar bandara tempat pesawat berkumpul sebelum mendarat dinamakan...", opsi: { A: "Holding Area / Pattern", B: "Approach Zone", C: "Touchdown Zone", D: "Apron", E: "Taxiway Zone" }, kunci: "A" },
    { pertanyaan: "Waktu standar dunia yang digunakan dalam seluruh dokumentasi penerbangan adalah...", opsi: { A: "UTC / Zulu Time", B: "GMT", C: "EST", D: "WITA", E: "LST" }, kunci: "A" },
    { pertanyaan: "Laporan cuaca rutin bandara penerbangan dirilis setiap jam dalam format...", opsi: { A: "METAR", B: "TAF", C: "SIGMET", D: "NOTAM", E: "AIRMET" }, kunci: "A" },
    { pertanyaan: "Pemberitahuan resmi kepada personel penerbangan mengenai kondisi fasilitas navigasi atau bahaya dipublikasikan melalui...", opsi: { A: "NOTAM (Notice to Airmen)", B: "METAR", C: "TAF", D: "AIC", E: "PIREP" }, kunci: "A" },
    { pertanyaan: "Alat pengukur arah kompas pada panel pesawat dinamakan...", opsi: { A: "Heading Indicator / Directional Gyro", B: "Turn Bank", C: "Altimeter", D: "Machmeter", E: "Chronometer" }, kunci: "A" },
    { pertanyaan: "Sistem yang memberikan peringatan dini jika pesawat terlalu dekat dengan daratan adalah...", opsi: { A: "GPWS / EGPWS", B: "TCAS", C: "ILS", D: "VHF", E: "ADF" }, kunci: "A" },
    { pertanyaan: "Sistem pencegah tabrakan antar pesawat di udara secara otomatis dinamakan...", opsi: { A: "TCAS (Traffic Collision Avoidance System)", B: "RADAR", C: "ADS-B", D: "GPWS", E: "DME" }, kunci: "A" },
    { pertanyaan: "Area parkir dan pelayanan beban pesawat di bandar udara disebut...", opsi: { A: "Apron", B: "Runway", C: "Taxiway", D: "Hangar", E: "Holding Bay" }, kunci: "A" },
    { pertanyaan: "Jalan penghubung antara apron dan landasan pacu (runway) adalah...", opsi: { A: "Taxiway", B: "Overrun", C: "Stopway", D: "Clearway", E: "Crosswind Bay" }, kunci: "A" },
    { pertanyaan: "Unit pengontrol udara di bandara yang memandu gerak pesawat di tanah (maneuvering area) dinamakan...", opsi: { A: "Ground Control", B: "Tower Control", C: "Approach Control", D: "Center Control", E: "Departure Control" }, kunci: "A" },
    { pertanyaan: "Gaya angkat utama (lift) pada sayap pesawat dihasilkan dari perbedaan...", opsi: { A: "Tekanan udara di atas dan di bawah sayap", B: "Suhu permukaan sayap", C: "Gesekan udara dengan bodi pesawat", D: "Kepadatan bahan bakar dalam sayap", E: "Kecepatan angin dari belakang" }, kunci: "A" },
    { pertanyaan: "Komponen instrumen yang mendeteksi tekanan statis dan tekanan dinamis udara pada pesawat adalah...", opsi: { A: "Pitot-Static System", B: "Gyroscopic System", C: "Vacuum Pump System", D: "Electrical Bus System", E: "Hydraulic System" }, kunci: "A" },
    { pertanyaan: "Gerakan berputar pesawat mengelilingi sumbu longitudinal disebut...", opsi: { A: "Roll", B: "Pitch", C: "Yaw", D: "Skid", E: "Slip" }, kunci: "A" },
    { pertanyaan: "Gerakan mengangguk (naik turunnya hidung pesawat) mengelilingi sumbu lateral disebut...", opsi: { A: "Pitch", B: "Roll", C: "Yaw", D: "Bank", E: "Trim" }, kunci: "A" },
    { pertanyaan: "Gerakan geleng ke kiri/kanan hidung pesawat mengelilingi sumbu vertikal disebut...", opsi: { A: "Yaw", B: "Pitch", C: "Roll", D: "Flap", E: "Stall" }, kunci: "A" },
    { pertanyaan: "Bahan bakar penerbangan berstandar aviasi untuk mesin jet umumnya jenis...", opsi: { A: "AVTUR (Jet A-1)", B: "AVGAS", C: "Biodiesel", D: "Kerosene Murni", E: "High Octane Gasoline" }, kunci: "A" }
  ];

  const sampleIsianList = [
    { pertanyaan: "Sebutkan nama instrumen yang berfungsi menunjukkan kecepatan penerbangan relatif terhadap udara sekitar!", kunci_jawaban: "Airspeed Indicator" },
    { pertanyaan: "Apa kepanjangan dari organisasi penerbangan sipil internasional ICAO?", kunci_jawaban: "International Civil Aviation Organization" },
    { pertanyaan: "Sebutkan istilah gaya angkat ke atas yang dihasilkan oleh sayap pesawat!", kunci_jawaban: "Lift" },
    { pertanyaan: "Apakah nama bagian permukaan kontrol penerbangan di ekor yang mengendalikan gerakan yaw?", kunci_jawaban: "Rudder" },
    { pertanyaan: "Sebutkan sistem pendaratan instrumen presisi yang menggunakan sinyal radio glideslope dan localizer!", kunci_jawaban: "ILS" },
    { pertanyaan: "Apakah nama bahan bakar khusus yang umum digunakan untuk mesin pesawat jet komersial?", kunci_jawaban: "Avtur" },
    { pertanyaan: "Tuliskan kode angka transponder darurat (emergency) internasional!", kunci_jawaban: "7700" },
    { pertanyaan: "Sebutkan istilah laporan prakiraan cuaca penerbangan bandara untuk periode 24-30 jam ke depan!", kunci_jawaban: "TAF" },
    { pertanyaan: "Sebutkan istilah area parkir tempat naik turun penumpang dan pengisian bahan bakar pesawat di bandara!", kunci_jawaban: "Apron" },
    { pertanyaan: "Apakah nama hukum fisika aerodinamika yang menyatakan tekanan fluida menurun jika kecepatannya meningkat?", kunci_jawaban: "Bernoulli" },
    { pertanyaan: "Sebutkan nama sistem navigasi satelit global penentu posisi pesawat!", kunci_jawaban: "GPS" },
    { pertanyaan: "Apakah istilah kondisi ketika sayap pesawat kehilangan daya angkat karena sudut serang terlalu besar?", kunci_jawaban: "Stall" },
    { pertanyaan: "Sebutkan nama permukaan kontrol pada sayap yang digunakan untuk mengatur gerakan roll (miring)!", kunci_jawaban: "Aileron" },
    { pertanyaan: "Sebutkan istilah jalur jalan penghubung antara apron dan runway di bandara!", kunci_jawaban: "Taxiway" },
    { pertanyaan: "Apakah nama laporan cuaca pengamatan rutin penerbangan di bandara yang diupdate tiap jam?", kunci_jawaban: "METAR" }
  ];

  const resultQuestions = [];

  // Populate PG questions
  for (let i = 0; i < numPg; i++) {
    const template = samplePgList[i % samplePgList.length];
    resultQuestions.push({
      id: i + 1,
      tipe: "pg",
      pertanyaan: template.pertanyaan,
      opsi: { ...template.opsi },
      kunci: template.kunci,
      bobot: 1
    });
  }

  // Populate Isian questions
  for (let j = 0; j < numIsian; j++) {
    const template = sampleIsianList[j % sampleIsianList.length];
    resultQuestions.push({
      id: numPg + j + 1,
      tipe: "isian",
      pertanyaan: template.pertanyaan,
      kunci_jawaban: template.kunci_jawaban,
      bobot: 1
    });
  }

  return resultQuestions;
}

export default function DosenBuatUjianPage() {
  const [dosen, setDosen] = useState(null);
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showDetailResultModal, setShowDetailResultModal] = useState(false);

  const [selectedExamForResults, setSelectedExamForResults] = useState(null);
  const [examResultsList, setExamResultsList] = useState([]);
  const [selectedSingleResult, setSelectedSingleResult] = useState(null);

  // Exam Form State
  const [examForm, setExamForm] = useState({
    id: "",
    judul: "",
    mk_id: "",
    mk_nama: "",
    kelas: "Semua",
    durasi_menit: 90,
    kkm: 70,
    waktu_mulai: "",
    waktu_selesai: "",
    status: "published", // draft, published, closed
    total_soal: 30,
    soal: []
  });

  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  // Initial load
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem("sikad_logged_in_user");
      if (!userStr) {
        window.location.href = "/login";
        return;
      }
      const user = JSON.parse(userStr);
      if (user.role !== "dosen") {
        window.location.href = "/login";
        return;
      }
      setDosen(user);

      const [rawCourses, rawExams] = await Promise.all([
        getCourses(),
        getExams(user.id)
      ]);

      setCourses(rawCourses);
      setExams(rawExams);
    } catch (err) {
      console.error("Gagal memuat data ujian dosen:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle open creation modal
  const handleOpenCreateModal = () => {
    const defaultTotal = 30;
    const initialSoal = generateSampleQuestions(defaultTotal);

    const now = new Date();
    const startTime = now.toISOString().slice(0, 16);
    const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16); // 1 week default

    const firstCourse = courses[0] || {};

    setExamForm({
      id: "",
      judul: "Ujian Tengah Semester - Aviation System",
      mk_id: firstCourse.id || "",
      mk_nama: firstCourse.nama_mk || "",
      kelas: "Semua",
      durasi_menit: 90,
      kkm: 70,
      waktu_mulai: startTime,
      waktu_selesai: endTime,
      status: "published",
      total_soal: defaultTotal,
      soal: initialSoal
    });
    setActiveQuestionIdx(0);
    setShowFormModal(true);
  };

  // Handle open edit modal
  const handleOpenEditModal = (exam) => {
    setExamForm({
      id: exam.id,
      judul: exam.judul,
      mk_id: exam.mk_id,
      mk_nama: exam.mk_nama,
      kelas: exam.kelas || "Semua",
      durasi_menit: exam.durasi_menit || 90,
      kkm: exam.kkm || 70,
      waktu_mulai: exam.waktu_mulai ? exam.waktu_mulai.slice(0, 16) : "",
      waktu_selesai: exam.waktu_selesai ? exam.waktu_selesai.slice(0, 16) : "",
      status: exam.status || "published",
      total_soal: exam.soal ? exam.soal.length : 30,
      soal: exam.soal || generateSampleQuestions(30)
    });
    setActiveQuestionIdx(0);
    setShowFormModal(true);
  };

  // Auto-generate questions preset (30, 40, 50)
  const handleGenerateQuestions = (count) => {
    const newQuestions = generateSampleQuestions(count);
    setExamForm(prev => ({
      ...prev,
      total_soal: count,
      soal: newQuestions
    }));
    setActiveQuestionIdx(0);
  };

  // Update specific question field
  const handleUpdateQuestion = (index, updatedField) => {
    setExamForm(prev => {
      const updatedSoal = [...prev.soal];
      updatedSoal[index] = { ...updatedSoal[index], ...updatedField };
      return { ...prev, soal: updatedSoal };
    });
  };

  // Save exam to database
  const handleSaveExamSubmit = async (e) => {
    e.preventDefault();
    if (!examForm.judul.trim()) {
      alert("Judul ujian tidak boleh kosong.");
      return;
    }

    try {
      const courseObj = courses.find(c => c.id === examForm.mk_id);
      const payload = {
        ...examForm,
        dosen_id: dosen.id,
        dosen_nama: dosen.nama_lengkap,
        mk_nama: courseObj ? courseObj.nama_mk : examForm.mk_nama,
        total_soal: examForm.soal.length,
        soal_pg_count: examForm.soal.filter(q => q.tipe === "pg").length,
        soal_isian_count: examForm.soal.filter(q => q.tipe === "isian").length
      };

      await saveExam(payload);
      alert("Ujian berhasil disimpan!");
      setShowFormModal(false);
      loadData();
    } catch (err) {
      console.error("Gagal menyimpan ujian:", err);
      alert("Terjadi kesalahan saat menyimpan ujian.");
    }
  };

  // Delete exam
  const handleDeleteExam = async (id) => {
    if (confirm("Apakah Anda yakin ingin menghapus ujian ini beserta seluruh bank soalnya?")) {
      try {
        await deleteExam(id);
        alert("Ujian telah dihapus.");
        loadData();
      } catch (err) {
        console.error("Gagal menghapus ujian:", err);
      }
    }
  };

  // Open Results Recap
  const handleOpenResults = async (exam) => {
    setSelectedExamForResults(exam);
    try {
      const results = await getExamResults(exam.id);
      setExamResultsList(results);
      setShowResultsModal(true);
    } catch (err) {
      console.error("Gagal memuat rekap nilai:", err);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "var(--text-secondary)" }}>Memuat Portal Ujian Dosen...</p>
      </div>
    );
  }

  const currentQuestion = examForm.soal[activeQuestionIdx] || {};
  const pgCount = examForm.soal.filter(q => q.tipe === "pg").length;
  const isianCount = examForm.soal.filter(q => q.tipe === "isian").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "1150px", margin: "0 auto" }}>
      
      {/* ── Page Header Banner ── */}
      <div className="glass-panel" style={{ padding: "1.75rem 2rem", background: "linear-gradient(135deg, rgba(147,51,234,0.12) 0%, rgba(59,130,246,0.06) 100%)", borderColor: "rgba(147,51,234,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.25rem", color: "#f3e8ff" }}>
              📝 Portal Pembuat Ujian Dosen (CBT)
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Kelola Ujian Online dengan Kombinasi <strong style={{ color: "#60a5fa" }}>70% Pilihan Ganda</strong> & <strong style={{ color: "#f59e0b" }}>30% Isian Singkat</strong> (30-50 Soal) dan Evaluasi Auto-Scoring.
            </p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleOpenCreateModal} 
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.25rem", background: "linear-gradient(135deg, #8b5cf6, #3b82f6)", border: "none" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Buat Ujian Baru</span>
          </button>
        </div>
      </div>

      {/* ── Exam Cards Grid ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>📋 Daftar Ujian Diterbitkan ({exams.length})</h3>
        
        {exams.length === 0 ? (
          <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
            Belum ada ujian yang dibuat. Klik tombol <strong>"Buat Ujian Baru"</strong> di atas untuk memulai.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.25rem" }}>
            {exams.map(exam => {
              const numPg = exam.soal ? exam.soal.filter(q => q.tipe === "pg").length : 0;
              const numIsian = exam.soal ? exam.soal.filter(q => q.tipe === "isian").length : 0;
              const isPublished = exam.status === "published";

              return (
                <div key={exam.id} className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <span className={`badge ${isPublished ? "badge-success" : "badge-warning"}`} style={{ fontSize: "0.75rem" }}>
                        {isPublished ? "PUBLISHED (AKTIF)" : "DRAFT"}
                      </span>
                      <span className="badge badge-secondary" style={{ fontSize: "0.75rem" }}>
                        Kelas: {exam.kelas || "Semua"}
                      </span>
                    </div>

                    <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>{exam.judul}</h4>
                    
                    <div style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 600, marginBottom: "0.75rem" }}>
                      📚 {exam.mk_nama}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)", background: "rgba(0,0,0,0.25)", padding: "0.75rem", borderRadius: "8px" }}>
                      <div>⏱️ Durasi: <strong style={{ color: "#fff" }}>{exam.durasi_menit} Menit</strong></div>
                      <div>🎯 KKM: <strong style={{ color: "#10b981" }}>{exam.kkm || 70}</strong></div>
                      <div>🧩 Total Soal: <strong style={{ color: "#60a5fa" }}>{exam.total_soal || (numPg + numIsian)} Soal</strong></div>
                      <div>📊 Komposisi: <strong style={{ color: "#f59e0b" }}>{numPg} PG / {numIsian} Isian</strong></div>
                    </div>
                  </div>

                  <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => handleOpenResults(exam)}
                      style={{ flex: 1, fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}
                    >
                      📊 Rekap Nilai
                    </button>
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={() => handleOpenEditModal(exam)}
                      style={{ flex: 1, fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}
                    >
                      ✏️ Edit Soal
                    </button>
                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => handleDeleteExam(exam.id)}
                      style={{ padding: "0.4rem 0.6rem" }}
                      title="Hapus Ujian"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL 1: FORM BUAT / EDIT UJIAN & BANK SOAL ── */}
      {showFormModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="glass-panel animate-fade-in" style={{ width: "100%", maxWidth: "1000px", maxHeight: "92vh", overflowY: "auto", background: "#0a0e1a", border: "1px solid rgba(147,51,234,0.3)", padding: "1.5rem" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--primary)" }}>
                  {examForm.id ? "✏️ Edit Bank Soal & Pengaturan Ujian" : "➕ Buat Paket Ujian Kombinasi (30-50 Soal)"}
                </h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Konfigurasi Ujian Online & Komposisi otomatis 70% Pilihan Ganda + 30% Isian Singkat
                </p>
              </div>
              <button onClick={() => setShowFormModal(false)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
            </div>

            <form onSubmit={handleSaveExamSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              
              {/* Form Metadata Section */}
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--border-color)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Judul Ujian</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={examForm.judul} 
                    onChange={e => setExamForm({ ...examForm, judul: e.target.value })} 
                    placeholder="Contoh: Ujian Tengah Semester - sistem Navigasi Udara"
                    required 
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Mata Kuliah</label>
                  <select 
                    className="form-control" 
                    value={examForm.mk_id} 
                    onChange={e => {
                      const sel = courses.find(c => c.id === e.target.value);
                      setExamForm({ ...examForm, mk_id: e.target.value, mk_nama: sel ? sel.nama_mk : "" });
                    }}
                    required
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.kode_mk} - {c.nama_mk}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Target Kelas</label>
                  <select 
                    className="form-control" 
                    value={examForm.kelas} 
                    onChange={e => setExamForm({ ...examForm, kelas: e.target.value })}
                  >
                    <option value="Semua">Semua Kelas</option>
                    <option value="Aero-A">Aero-A</option>
                    <option value="Aero-B">Aero-B</option>
                    <option value="Aero-C">Aero-C</option>
                    <option value="ATC-A">ATC-A</option>
                    <option value="ATC-B">ATC-B</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Durasi (Menit)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={examForm.durasi_menit} 
                    onChange={e => setExamForm({ ...examForm, durasi_menit: parseInt(e.target.value, 10) || 60 })} 
                    min={10} max={300} 
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>KKM (Batas Lulus)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={examForm.kkm} 
                    onChange={e => setExamForm({ ...examForm, kkm: parseInt(e.target.value, 10) || 70 })} 
                    min={0} max={100} 
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Status Publikasi</label>
                  <select 
                    className="form-control" 
                    value={examForm.status} 
                    onChange={e => setExamForm({ ...examForm, status: e.target.value })}
                  >
                    <option value="published">Published (Siswa Dapat Mengakses)</option>
                    <option value="draft">Draft (Disimpan Sementara)</option>
                  </select>
                </div>
              </div>

              {/* Generator & Composition Bar */}
              <div className="glass-panel" style={{ padding: "1rem 1.25rem", background: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#60a5fa" }}>
                    📊 Komposisi Saat Ini: {examForm.soal.length} Soal total ({pgCount} PG - 70% & {isianCount} Isian Singkat - 30%)
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Pilih preset jumlah soal di samping untuk auto-generate draf instan
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleGenerateQuestions(30)}>
                    ⚡ Preset 30 Soal (21 PG + 9 Isian)
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleGenerateQuestions(40)}>
                    ⚡ Preset 40 Soal (28 PG + 12 Isian)
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleGenerateQuestions(50)}>
                    ⚡ Preset 50 Soal (35 PG + 15 Isian)
                  </button>
                </div>
              </div>

              {/* Item Navigator Grid */}
              <div>
                <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>
                  Pilih Nomor Soal Untuk Diedit (1 - {examForm.soal.length}):
                </label>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", maxHeight: "120px", overflowY: "auto", padding: "0.5rem", background: "rgba(0,0,0,0.3)", borderRadius: "8px" }}>
                  {examForm.soal.map((q, idx) => {
                    const isActive = idx === activeQuestionIdx;
                    const isPg = q.tipe === "pg";
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveQuestionIdx(idx)}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          border: isActive ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.1)",
                          background: isActive 
                            ? "#2563eb" 
                            : (isPg ? "rgba(59,130,246,0.15)" : "rgba(245,158,11,0.18)"),
                          color: isActive ? "#fff" : (isPg ? "#60a5fa" : "#fbbf24"),
                          cursor: "pointer"
                        }}
                        title={`Soal #${idx + 1} (${isPg ? "PG" : "Isian"})`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question Editor Card */}
              {currentQuestion && (
                <div style={{ background: "rgba(255,255,255,0.02)", padding: "1.25rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)" }}>Soal No. {activeQuestionIdx + 1}</span>
                      <span className={`badge ${currentQuestion.tipe === "pg" ? "badge-secondary" : "badge-warning"}`} style={{ fontSize: "0.75rem" }}>
                        {currentQuestion.tipe === "pg" ? "Pilihan Ganda (70%)" : "Isian Singkat (30%)"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div>
                        <label style={{ fontSize: "0.75rem", color: "#9ca3af", marginRight: "0.4rem" }}>Tipe:</label>
                        <select 
                          className="form-control" 
                          style={{ display: "inline-block", width: "auto", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                          value={currentQuestion.tipe}
                          onChange={e => handleUpdateQuestion(activeQuestionIdx, { tipe: e.target.value })}
                        >
                          <option value="pg">Pilihan Ganda</option>
                          <option value="isian">Isian Singkat</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Pertanyaan Text Area */}
                  <div style={{ marginBottom: "1rem" }}>
                    <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Teks Pertanyaan</label>
                    <textarea 
                      className="form-control" 
                      rows={3}
                      value={currentQuestion.pertanyaan || ""}
                      onChange={e => handleUpdateQuestion(activeQuestionIdx, { pertanyaan: e.target.value })}
                      placeholder="Masukkan pertanyaan soal di sini..."
                      required
                    />
                  </div>

                  {/* PG Options & Answer Key */}
                  {currentQuestion.tipe === "pg" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px" }}>
                      <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600, color: "#60a5fa" }}>
                        Opsi Pilihan Ganda & Kunci Jawaban Benar:
                      </label>

                      {["A", "B", "C", "D", "E"].map(optKey => (
                        <div key={optKey} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <input 
                            type="radio" 
                            name={`kunci_${activeQuestionIdx}`}
                            checked={currentQuestion.kunci === optKey}
                            onChange={() => handleUpdateQuestion(activeQuestionIdx, { kunci: optKey })}
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                            title="Tandai sebagai kunci jawaban benar"
                          />
                          <span style={{ fontWeight: 800, width: "20px", color: currentQuestion.kunci === optKey ? "#10b981" : "inherit" }}>
                            {optKey}.
                          </span>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ flex: 1, borderColor: currentQuestion.kunci === optKey ? "#10b981" : undefined }}
                            value={(currentQuestion.opsi && currentQuestion.opsi[optKey]) || ""}
                            onChange={e => {
                              const newOpsi = { ...(currentQuestion.opsi || {}), [optKey]: e.target.value };
                              handleUpdateQuestion(activeQuestionIdx, { opsi: newOpsi });
                            }}
                            placeholder={`Opsi ${optKey}`}
                          />
                          {currentQuestion.kunci === optKey && (
                            <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>Kunci Benar</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Isian Singkat Key Field */
                    <div style={{ background: "rgba(245,158,11,0.06)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.2)" }}>
                      <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fbbf24" }}>
                        Kunci Jawaban Teks / Kata Kunci Isian Singkat:
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={currentQuestion.kunci_jawaban || ""}
                        onChange={e => handleUpdateQuestion(activeQuestionIdx, { kunci_jawaban: e.target.value })}
                        placeholder="Contoh: Airspeed Indicator (Pencocokan teks tidak sensitif kapitalisasi)"
                      />
                      <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        💡 Sistem auto-scoring akan membandingkan jawaban teks siswa secara fleksibel (mengabaikan spasi berlebih & tanda baca).
                      </p>
                    </div>
                  )}

                  {/* Navigation step buttons */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm" 
                      disabled={activeQuestionIdx === 0}
                      onClick={() => setActiveQuestionIdx(prev => prev - 1)}
                    >
                      ⬅️ Soal Sebelumnya
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm" 
                      disabled={activeQuestionIdx === examForm.soal.length - 1}
                      onClick={() => setActiveQuestionIdx(prev => prev + 1)}
                    >
                      Soal Berikutnya ➡️
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ padding: "0.6rem 1.5rem" }}>
                  💾 Simpan Seluruh Bank Soal & Ujian
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: REKAP HASIL NILAI UJIAN SISWA ── */}
      {showResultsModal && selectedExamForResults && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="glass-panel animate-fade-in" style={{ width: "100%", maxWidth: "900px", maxHeight: "90vh", overflowY: "auto", background: "#0a0e1a", border: "1px solid rgba(59,130,246,0.3)", padding: "1.5rem" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--primary)" }}>
                  📊 Rekap Nilai Ujian Siswa
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {selectedExamForResults.judul} | Kelas: {selectedExamForResults.kelas || "Semua"} | KKM: {selectedExamForResults.kkm || 70}
                </p>
              </div>
              <button onClick={() => setShowResultsModal(false)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
            </div>

            {examResultsList.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                Belum ada siswa yang menyelesaikan atau mengirimkan ujian ini.
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>NIM</th>
                      <th>Nama Mahasiswa</th>
                      <th>Kelas</th>
                      <th style={{ textAlign: "center" }}>Skor PG (70%)</th>
                      <th style={{ textAlign: "center" }}>Skor Isian (30%)</th>
                      <th style={{ textAlign: "center" }}>Nilai Akhir</th>
                      <th style={{ textAlign: "center" }}>Status KKM</th>
                      <th style={{ textAlign: "center" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examResultsList.map(res => {
                      const isPass = res.nilai_akhir >= (selectedExamForResults.kkm || 70);
                      return (
                        <tr key={res.id}>
                          <td style={{ fontWeight: "bold" }}>{res.siswa_nim}</td>
                          <td>{res.siswa_nama}</td>
                          <td>{res.kelas}</td>
                          <td style={{ textAlign: "center", color: "#60a5fa" }}>{res.nilai_pg || 0}%</td>
                          <td style={{ textAlign: "center", color: "#fbbf24" }}>{res.nilai_isian || 0}%</td>
                          <td style={{ textAlign: "center", fontWeight: 800, fontSize: "1.05rem", color: isPass ? "#10b981" : "#ef4444" }}>
                            {res.nilai_akhir}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={`badge ${isPass ? "badge-success" : "badge-danger"}`} style={{ fontSize: "0.75rem" }}>
                              {isPass ? "LULUS" : "TIDAK LULUS"}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                              onClick={() => {
                                setSelectedSingleResult(res);
                                setShowDetailResultModal(true);
                              }}
                            >
                              🔍 Audit Jawaban
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <button className="btn btn-secondary" onClick={() => setShowResultsModal(false)}>Tutup</button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL 3: AUDIT DETAIL JAWABAN SISWA ── */}
      {showDetailResultModal && selectedSingleResult && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="glass-panel animate-fade-in" style={{ width: "100%", maxWidth: "800px", maxHeight: "88vh", overflowY: "auto", background: "#0a0e1a", padding: "1.5rem" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem", marginBottom: "1rem" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)" }}>
                  🔍 Audit Rincian Jawaban: {selectedSingleResult.siswa_nama} ({selectedSingleResult.siswa_nim})
                </h4>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Nilai Akhir: <strong style={{ color: "#10b981" }}>{selectedSingleResult.nilai_akhir} / 100</strong>
                </p>
              </div>
              <button onClick={() => setShowDetailResultModal(false)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {(selectedSingleResult.detail_scoring || []).map((det, idx) => (
                <div key={idx} style={{ background: "rgba(255,255,255,0.02)", padding: "0.85rem 1rem", borderRadius: "8px", borderLeft: `4px solid ${det.is_correct ? "#10b981" : "#ef4444"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    <span>Soal #{idx + 1} ({det.tipe === "pg" ? "PG" : "Isian Singkat"})</span>
                    <span style={{ color: det.is_correct ? "#10b981" : "#ef4444" }}>
                      {det.is_correct ? "BENAR (+1)" : "SALAH (0)"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", marginBottom: "0.4rem" }}>{det.pertanyaan}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Jawaban Siswa: <strong style={{ color: det.is_correct ? "#10b981" : "#f87171" }}>{det.jawaban_siswa || "(Kosong)"}</strong> | 
                    Kunci Benar: <strong style={{ color: "#60a5fa" }}>{Array.isArray(det.kunci_jawaban) ? det.kunci_jawaban.join(", ") : det.kunci_jawaban}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button className="btn btn-secondary" onClick={() => setShowDetailResultModal(false)}>Tutup Audit</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
