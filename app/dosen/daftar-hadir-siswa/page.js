"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getSchedules,
  getCourses,
  getStudents,
  getStudentAttendanceByJadwal,
  saveStudentAttendance,
} from "../../../lib/db";
import { translations } from "../../../lib/translations";

// ─── Status options ───────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "hadir",  labelId: "Hadir",  labelEn: "Present",   color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)"  },
  { value: "izin",   labelId: "Izin",   labelEn: "Permitted", color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)"  },
  { value: "sakit",  labelId: "Sakit",  labelEn: "Sick",      color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)"  },
  { value: "alpha",  labelId: "Alfa",   labelEn: "Absent",    color: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.3)"   },
];

function getStatusStyle(value) {
  return STATUS_OPTIONS.find((s) => s.value === value) || STATUS_OPTIONS[0];
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isStudentInKelas(student, kelasName) {
  if (!kelasName) return false;
  const sKelas = (student.kelas || "").toString().trim().toUpperCase();
  const kName = (kelasName || "").toString().trim().toUpperCase();

  if (sKelas === kName) return true;

  // Handle generic merged classes like "AV08-FA10" or "AV08 - FA10"
  if (kName.includes("-")) {
    const parts = kName.split("-").map(p => p.trim());
    if (parts.includes(sKelas)) return true;
  }

  // Also support specific exact match fallback for AV08-FA10 if needed
  if (kName.replace(/\s+/g, "") === "AV08-FA10") {
    return sKelas === "AV08" || sKelas === "FA10" || sKelas === "AV08-FA10";
  }

  return false;
}

function isStudentInAnySelectedKelas(student, selectedKelasArray) {
  return selectedKelasArray.some(k => isStudentInKelas(student, k));
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DaftarHadirSiswa() {
  const [lang, setLang] = useState("id");
  const [user, setUser] = useState(null);

  // Data
  const [allSchedules, setAllSchedules] = useState([]);
  const [courses, setCourses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);

  // UI State
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [step, setStep] = useState("select-class"); // "select-class" | "fill-attendance"

  // Class selection (checklist) — list of kelas strings ticked
  const [selectedKelas, setSelectedKelas] = useState([]);

  // Attendance data: { [studentId]: status }
  const [statusMap, setStatusMap] = useState({});

  // Which jadwal to link per kelas (jadwal on selectedDate for that kelas)
  const [jadwalForKelas, setJadwalForKelas] = useState({}); // { kelas: jadwal }

  // Existing submitted records (to allow re-edit)
  const [existingRecords, setExistingRecords] = useState({}); // { jadwalId: record }

  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [loading, setLoading] = useState(true);

  // ─── Load data ──────────────────────────────────────────────────────────────
  const syncData = useCallback(async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
    const loggedInUserStr = localStorage.getItem("sikad_logged_in_user");
    if (!loggedInUserStr) return;
    const loggedInUser = JSON.parse(loggedInUserStr);
    setUser(loggedInUser);

    setLoading(true);
    try {
      const [rawSchedules, rawCourses, rawStudents] = await Promise.all([
        getSchedules(),
        getCourses(),
        getStudents(),
      ]);

      // Filter schedules belonging to this dosen
      const mySchedules = rawSchedules
        .filter((j) => j.dosen_id === loggedInUser.id)
        .map((j) => {
          const mk = rawCourses.find((m) => m.id === j.mk_id);
          return { ...j, mk_nama: mk?.nama_mk, mk_kode: mk?.kode_mk };
        });

      setAllSchedules(mySchedules);
      setCourses(rawCourses);
      setAllStudents(rawStudents);
    } catch (err) {
      console.error("Error loading daftar hadir siswa data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncData();
    window.addEventListener("storage", syncData);
    return () => window.removeEventListener("storage", syncData);
  }, [syncData]);

  // ─── Derived: schedules on selectedDate ─────────────────────────────────────
  const dayNamesId = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const selectedDayId = selectedDate
    ? dayNamesId[new Date(selectedDate).getDay()]
    : "";

  // Schedules matching selectedDate (by tanggal or hari)
  const schedulesOnDate = allSchedules.filter((j) => {
    if (j.tanggal) return j.tanggal.startsWith(selectedDate);
    return (j.hari || "").toLowerCase() === selectedDayId.toLowerCase();
  });

  // Pilihan kelas dinamis (hanya kelas yang ada jadwal di hari yang dipilih)
  const allMyKelas = [...new Set(schedulesOnDate.map((j) => j.kelas).filter(Boolean))].sort();

  // ─── When user proceeds to fill attendance ──────────────────────────────────
  const handleProceed = async () => {
    if (selectedKelas.length === 0) return;

    // Build jadwalForKelas: find the schedule on selectedDate for each kelas
    const jfk = {};
    selectedKelas.forEach((k) => {
      const jadwal = schedulesOnDate.find((j) => j.kelas === k) || null;
      jfk[k] = jadwal;
    });
    setJadwalForKelas(jfk);

    // Load students for selected classes and init statusMap
    const studentsInKelas = allStudents.filter((s) => isStudentInAnySelectedKelas(s, selectedKelas));
    const initMap = {};
    studentsInKelas.forEach((s) => { initMap[s.id] = "hadir"; });

    // Load existing records and merge
    const existing = {};
    await Promise.all(
      Object.values(jfk).map(async (jadwal) => {
        if (!jadwal) return;
        const recs = await getStudentAttendanceByJadwal(jadwal.id, selectedDate);
        if (recs.length > 0) {
          existing[jadwal.id] = recs[0];
          (recs[0].siswa || []).forEach((s) => {
            initMap[s.siswa_id] = s.status;
          });
        }
      })
    );
    setExistingRecords(existing);
    setStatusMap(initMap);
    setSubmitDone(false);
    setStep("fill-attendance");
  };

  // ─── Set all status ─────────────────────────────────────────────────────────
  const handleSetAll = (status, kelasFilter = null) => {
    const studentsInKelas = allStudents.filter((s) =>
      kelasFilter ? isStudentInKelas(s, kelasFilter) : isStudentInAnySelectedKelas(s, selectedKelas)
    );
    setStatusMap((prev) => {
      const next = { ...prev };
      studentsInKelas.forEach((s) => { next[s.id] = status; });
      return next;
    });
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!confirm(lang === "id" ? "Simpan absensi siswa untuk semua kelas terpilih?" : "Save attendance for all selected classes?")) return;
    setSubmitting(true);
    try {
      const loggedInUser = JSON.parse(localStorage.getItem("sikad_logged_in_user"));

      for (const kelas of selectedKelas) {
        const jadwal = jadwalForKelas[kelas];
        const studentsInKelas = allStudents.filter((s) => isStudentInKelas(s, kelas));
        const siswaList = studentsInKelas.map((s) => ({
          siswa_id: s.id,
          nim: s.nim,
          nama: s.nama_lengkap,
          status: statusMap[s.id] || "hadir",
        }));

        const jadwalId = jadwal?.id || `manual_${kelas}_${selectedDate}`;
        const existingRec = jadwal ? existingRecords[jadwal.id] : null;
        const recordId = existingRec?.id || `absen_siswa_${Math.random().toString(36).substr(2,9)}`;

        const mk = jadwal ? courses.find((m) => m.id === jadwal.mk_id) : null;

        const record = {
          id: recordId,
          jadwal_id: jadwalId,
          dosen_id: loggedInUser.id,
          kelas,
          tanggal: selectedDate,
          mk_id: mk?.id || jadwal?.mk_id || null,
          mk_nama: mk?.nama_mk || jadwal?.mk_nama || null,
          pertemuan_ke: jadwal?.pertemuan_ke || null,
          siswa: siswaList,
          updated_at: new Date().toISOString(),
        };

        await saveStudentAttendance(record);
      }

      setSubmitDone(true);
    } catch (err) {
      console.error(err);
      alert(lang === "id" ? "Gagal menyimpan absensi!" : "Failed to save attendance!");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "var(--text-secondary)" }}>
          {lang === "id" ? "Memuat data..." : "Loading data..."}
        </p>
      </div>
    );
  }

  const t = translations[lang];

  // Students currently selected
  const studentsShown = allStudents.filter((s) => isStudentInAnySelectedKelas(s, selectedKelas));

  // Summary counts for shown students
  const summary = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = studentsShown.filter((st) => statusMap[st.id] === s.value).length;
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "900px", margin: "0 auto" }}>

      {/* ── Page Header ── */}
      <div
        className="glass-panel"
        style={{
          padding: "1.5rem 2rem",
          background: "linear-gradient(135deg, rgba(16,185,129,0.07) 0%, rgba(59,130,246,0.05) 100%)",
          borderColor: "rgba(16,185,129,0.2)",
        }}
      >
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.3rem" }}>
          📋 {t.studentAttendanceList}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          {lang === "id"
            ? "Pilih tanggal dan kelas untuk mengisi daftar hadir siswa"
            : "Select a date and class(es) to fill student attendance"}
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          STEP 1 — Pilih Tanggal & Kelas
      ───────────────────────────────────────────────────────────── */}
      {step === "select-class" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Date picker */}
          <div className="glass-panel" style={{ padding: "1.25rem 1.5rem" }}>
            <label className="form-label" style={{ display: "block", marginBottom: "0.6rem", fontWeight: 600 }}>
              📅 {lang === "id" ? "Pilih Tanggal" : "Select Date"}
            </label>
            <input
              type="date"
              className="form-control"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setSelectedKelas([]); }}
              style={{ background: "#0b0f19", color: "white", maxWidth: "220px" }}
            />
            {selectedDate && (
              <p style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                {new Date(selectedDate).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                {" · "}
                <span style={{ color: schedulesOnDate.length > 0 ? "#10b981" : "var(--text-muted)" }}>
                  {schedulesOnDate.length > 0
                    ? `${schedulesOnDate.length} ${lang === "id" ? "jadwal ditemukan" : "schedule(s) found"}`
                    : (lang === "id" ? "Tidak ada jadwal, absensi manual" : "No schedule, manual entry")}
                </span>
              </p>
            )}
          </div>

          {/* Jadwal hari ini (info) */}
          {schedulesOnDate.length > 0 && (
            <div className="glass-panel" style={{ padding: "1rem 1.5rem" }}>
              <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.6rem" }}>
                {lang === "id" ? "Jadwal pada tanggal ini:" : "Schedules on this date:"}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {schedulesOnDate.map((j) => (
                  <span
                    key={j.id}
                    style={{
                      background: "rgba(59,130,246,0.1)", color: "var(--primary)",
                      border: "1px solid rgba(59,130,246,0.25)", padding: "0.3rem 0.75rem",
                      borderRadius: "20px", fontSize: "0.78rem", fontWeight: 600,
                    }}
                  >
                    {j.kelas} — {j.mk_nama} ({j.jam_mulai}–{j.jam_selesai})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Checklist kelas */}
          <div className="glass-panel" style={{ padding: "1.25rem 1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                {lang === "id" ? "Pilih Kelas" : "Select Class(es)"}
                <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "0.8rem", marginLeft: "0.5rem" }}>
                  ({lang === "id" ? "bisa lebih dari 1" : "multiple allowed"})
                </span>
              </p>
              {selectedKelas.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: "0.75rem", padding: "0.3rem 0.7rem" }}
                  onClick={() => setSelectedKelas([])}
                >
                  {lang === "id" ? "Batal Semua" : "Deselect All"}
                </button>
              )}
            </div>

            {allMyKelas.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                {lang === "id" ? "Tidak ada kelas ditemukan dari jadwal Anda." : "No classes found in your schedules."}
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
                {allMyKelas.map((k) => {
                  const isChecked = selectedKelas.includes(k);
                  const studentCount = allStudents.filter((s) => isStudentInKelas(s, k)).length;
                  const hasScheduleToday = schedulesOnDate.some((j) => j.kelas === k);
                  const jadwal = schedulesOnDate.find((j) => j.kelas === k);

                  return (
                    <div
                      key={k}
                      onClick={() => {
                        setSelectedKelas((prev) =>
                          prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
                        );
                      }}
                      style={{
                        padding: "1rem 1.25rem",
                        borderRadius: "12px",
                        border: isChecked
                          ? "2px solid var(--primary)"
                          : "1px solid var(--border-color)",
                        background: isChecked
                          ? "rgba(59,130,246,0.1)"
                          : "rgba(255,255,255,0.02)",
                        cursor: "pointer",
                        transition: "all 0.18s",
                        position: "relative",
                      }}
                    >
                      {/* Checkmark */}
                      <div style={{
                        position: "absolute", top: 10, right: 10,
                        width: 20, height: 20, borderRadius: "50%",
                        border: isChecked ? "none" : "2px solid var(--border-color)",
                        background: isChecked ? "var(--primary)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                      }}>
                        {isChecked && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" style={{ width: 12, height: 12 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                      </div>

                      <div style={{ fontWeight: 800, fontSize: "1.1rem", color: isChecked ? "var(--primary)" : "var(--text-primary)", marginBottom: "0.3rem" }}>
                        {k}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {studentCount} {lang === "id" ? "siswa terdaftar" : "students"}
                      </div>
                      {hasScheduleToday && jadwal && (
                        <div style={{ marginTop: "0.4rem", fontSize: "0.7rem", color: "#10b981", fontWeight: 600 }}>
                          ✓ {jadwal.mk_nama}
                        </div>
                      )}
                      {!hasScheduleToday && (
                        <div style={{ marginTop: "0.4rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {lang === "id" ? "Tanpa jadwal (manual)" : "No schedule (manual)"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Proceed button */}
            {selectedKelas.length > 0 && (
              <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="btn btn-primary"
                  onClick={handleProceed}
                  style={{ padding: "0.75rem 2rem", fontWeight: 700 }}
                >
                  {lang === "id"
                    ? `Lanjut Isi Absensi (${selectedKelas.length} Kelas)`
                    : `Continue to Attendance (${selectedKelas.length} Class${selectedKelas.length > 1 ? "es" : ""})`}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, marginLeft: "0.5rem" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 2 — Isi Absensi
      ───────────────────────────────────────────────────────────── */}
      {step === "fill-attendance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Back + Context bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <button
              className="btn btn-secondary"
              style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}
              onClick={() => { setStep("select-class"); setSubmitDone(false); }}
            >
              ← {lang === "id" ? "Ganti Kelas" : "Change Class"}
            </button>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {selectedKelas.map((k) => (
                <span key={k} style={{ background: "rgba(59,130,246,0.1)", color: "var(--primary)", border: "1px solid rgba(59,130,246,0.25)", padding: "0.3rem 0.75rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700 }}>
                  {k}
                </span>
              ))}
              <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem", alignSelf: "center" }}>
                · {new Date(selectedDate).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Summary badges */}
          <div className="glass-panel" style={{ padding: "1rem 1.5rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600, marginRight: "0.25rem" }}>
                {lang === "id" ? "Rekap:" : "Summary:"}
              </span>
              {STATUS_OPTIONS.map((s) => (
                <div
                  key={s.value}
                  style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: s.bg, border: `1px solid ${s.border}`, padding: "0.3rem 0.75rem", borderRadius: "20px" }}
                >
                  <span style={{ color: s.color, fontWeight: 800, fontSize: "0.95rem" }}>{summary[s.value] || 0}</span>
                  <span style={{ color: s.color, fontSize: "0.75rem", fontWeight: 600 }}>{lang === "id" ? s.labelId : s.labelEn}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-color)", padding: "0.3rem 0.75rem", borderRadius: "20px" }}>
                <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>{studentsShown.length}</span>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{lang === "id" ? "Total" : "Total"}</span>
              </div>
            </div>
          </div>

          {/* Success banner */}
          {submitDone && (
            <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "12px", padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#10b981" style={{ width: 24, height: 24, flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <div>
                <p style={{ fontWeight: 700, color: "#10b981" }}>
                  {lang === "id" ? "Absensi berhasil disimpan!" : "Attendance saved successfully!"}
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  {lang === "id" ? "Anda masih bisa mengubah status siswa dan menyimpan ulang." : "You can still edit and re-save."}
                </p>
              </div>
              <Link href="/dosen/dashboard" className="btn btn-secondary" style={{ marginLeft: "auto", padding: "0.5rem 1rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                {t.backToDashboard}
              </Link>
            </div>
          )}

          {/* Per-kelas section */}
          {selectedKelas.map((k) => {
            const studentsInK = allStudents.filter((s) => isStudentInKelas(s, k));
            const jadwal = jadwalForKelas[k];
            const hasExisting = jadwal ? !!existingRecords[jadwal.id] : false;

            return (
              <div key={k} className="glass-panel dashboard-panel" style={{ padding: 0, overflow: "hidden" }}>
                {/* Kelas header */}
                <div
                  style={{
                    padding: "1rem 1.5rem",
                    background: "rgba(59,130,246,0.06)",
                    borderBottom: "1px solid var(--border-color)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--primary)" }}>
                      Kelas {k}
                    </span>
                    {jadwal && (
                      <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                        {jadwal.mk_nama} · {jadwal.jam_mulai}–{jadwal.jam_selesai}
                        {jadwal.pertemuan_ke && ` · Pertemuan ${jadwal.pertemuan_ke}`}
                      </span>
                    )}
                    {!jadwal && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                        {lang === "id" ? "Tanpa jadwal (manual)" : "No schedule (manual)"}
                      </span>
                    )}
                    {hasExisting && (
                      <span style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", padding: "0.15rem 0.5rem", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 700 }}>
                        ✓ {lang === "id" ? "Sudah diisi" : "Already submitted"}
                      </span>
                    )}
                  </div>

                  {/* Quick set-all for this kelas */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {lang === "id" ? "Set semua:" : "Set all:"}
                    </span>
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => handleSetAll(s.value, k)}
                        style={{
                          padding: "0.25rem 0.6rem", fontSize: "0.7rem", borderRadius: "6px",
                          border: `1px solid ${s.border}`, background: s.bg, color: s.color,
                          cursor: "pointer", fontWeight: 600,
                        }}
                      >
                        {lang === "id" ? s.labelId : s.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Student table */}
                {studentsInK.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                    {lang === "id"
                      ? `Belum ada siswa terdaftar di kelas ${k}. Tambahkan via menu Data Siswa.`
                      : `No students in class ${k}. Add via Student Data menu.`}
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>#</th>
                          <th>{t.nim}</th>
                          <th>{lang === "id" ? "Nama Lengkap" : "Full Name"}</th>
                          <th style={{ textAlign: "center" }}>{t.status}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentsInK.map((student, idx) => {
                          const currentStatus = statusMap[student.id] || "hadir";
                          const st = getStatusStyle(currentStatus);
                          return (
                            <tr key={student.id}>
                              <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{idx + 1}</td>
                              <td>
                                <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>
                                  {student.nim}
                                </span>
                              </td>
                              <td style={{ fontWeight: 600 }}>{student.nama_lengkap}</td>
                              <td style={{ textAlign: "center" }}>
                                <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap" }}>
                                  {STATUS_OPTIONS.map((s) => {
                                    const isActive = currentStatus === s.value;
                                    return (
                                      <button
                                        key={s.value}
                                        onClick={() =>
                                          setStatusMap((prev) => ({ ...prev, [student.id]: s.value }))
                                        }
                                        style={{
                                          padding: "0.3rem 0.65rem",
                                          fontSize: "0.72rem",
                                          borderRadius: "8px",
                                          border: `1.5px solid ${isActive ? s.color : "transparent"}`,
                                          background: isActive ? s.bg : "rgba(255,255,255,0.03)",
                                          color: isActive ? s.color : "var(--text-muted)",
                                          cursor: "pointer",
                                          fontWeight: isActive ? 700 : 400,
                                          transition: "all 0.14s",
                                          transform: isActive ? "scale(1.05)" : "scale(1)",
                                          boxShadow: isActive ? `0 0 8px ${s.border}` : "none",
                                          minWidth: "50px",
                                        }}
                                      >
                                        {lang === "id" ? s.labelId : s.labelEn}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {/* Submit / Save button */}
          {studentsShown.length > 0 && (
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", paddingBottom: "1rem" }}>
              <button
                className="btn btn-secondary"
                onClick={() => { setStep("select-class"); setSubmitDone(false); }}
              >
                ← {lang === "id" ? "Ganti Kelas" : "Change Class"}
              </button>
              <button
                className="btn btn-primary"
                style={{ padding: "0.75rem 2.5rem", fontWeight: 700, minWidth: "200px" }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <span>{lang === "id" ? "Menyimpan..." : "Saving..."}</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, marginRight: "0.4rem" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    {lang === "id"
                      ? `Simpan Daftar Hadir (${studentsShown.length} Siswa)`
                      : `Save Attendance (${studentsShown.length} Students)`}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
