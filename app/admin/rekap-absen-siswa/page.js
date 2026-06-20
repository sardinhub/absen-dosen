"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getStudentAttendance, getCourses, getUsers } from "../../../lib/db";
import { translations } from "../../../lib/translations";

const STATUS_MAP = {
  hadir: { label: "Hadir", color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)" },
  izin:  { label: "Izin",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  sakit: { label: "Sakit", color: "#60a5fa", bg: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.3)" },
  alpha: { label: "Alfa",  color: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)" },
};

export default function RekapAbsenSiswa() {
  const [lang, setLang] = useState("id");
  const [loading, setLoading] = useState(true);
  
  // Data
  const [attendances, setAttendances] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState({});

  // Filters
  const [filterMk, setFilterMk] = useState("");
  const [filterKelas, setFilterKelas] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const syncData = useCallback(async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
    setLoading(true);
    try {
      const [rawAttendances, rawCourses, rawUsers] = await Promise.all([
        getStudentAttendance(),
        getCourses(),
        getUsers(),
      ]);

      const dosenMap = {};
      rawUsers.filter(u => u.role === "dosen").forEach(u => {
        dosenMap[u.id] = u.name;
      });

      setAttendances(rawAttendances);
      setCourses(rawCourses);
      setLecturers(dosenMap);
    } catch (err) {
      console.error("Gagal mengambil data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncData();
  }, [syncData]);

  // Derived options for filters
  const mkOptions = useMemo(() => {
    const mks = new Set();
    attendances.forEach(a => { if (a.mk_nama) mks.add(a.mk_nama); });
    return [...mks].sort();
  }, [attendances]);

  const kelasOptions = useMemo(() => {
    const kls = new Set();
    attendances.forEach(a => { if (a.kelas) kls.add(a.kelas); });
    return [...kls].sort();
  }, [attendances]);

  // Filter the attendance records
  const filteredRecords = useMemo(() => {
    return attendances.filter(a => {
      const matchMk = filterMk === "" || a.mk_nama === filterMk;
      const matchKelas = filterKelas === "" || a.kelas === filterKelas;
      const matchDate = filterDate === "" || a.tanggal === filterDate;
      return matchMk && matchKelas && matchDate;
    }).sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  }, [attendances, filterMk, filterKelas, filterDate]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "var(--text-secondary)" }}>
          {lang === "id" ? "Memuat data rekap..." : "Loading recap data..."}
        </p>
      </div>
    );
  }

  const t = translations[lang];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "1200px", margin: "0 auto" }}>
      
      {/* ── Header ── */}
      <div
        className="glass-panel"
        style={{
          padding: "1.5rem 2rem",
          background: "linear-gradient(135deg, rgba(59,130,246,0.07) 0%, rgba(139,92,246,0.05) 100%)",
          borderColor: "rgba(59,130,246,0.2)",
        }}
      >
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.3rem" }}>
          📊 {t.studentAttendanceRecap || (lang === "id" ? "Rekap Absen Siswa" : "Student Attendance Recap")}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          {lang === "id" 
            ? "Filter dan pantau kehadiran siswa berdasarkan Mata Kuliah, Kelas, dan Tanggal."
            : "Filter and monitor student attendance by Course, Class, and Date."}
        </p>
      </div>

      {/* ── Filters ── */}
      <div className="glass-panel" style={{ padding: "1.25rem 1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>
            {lang === "id" ? "Mata Kuliah" : "Course"}
          </label>
          <select
            className="form-control"
            value={filterMk}
            onChange={(e) => setFilterMk(e.target.value)}
          >
            <option value="">{lang === "id" ? "Semua Mata Kuliah" : "All Courses"}</option>
            {mkOptions.map(mk => <option key={mk} value={mk}>{mk}</option>)}
          </select>
        </div>

        <div style={{ flex: "1 1 150px" }}>
          <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>
            {lang === "id" ? "Kelas" : "Class"}
          </label>
          <select
            className="form-control"
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
          >
            <option value="">{lang === "id" ? "Semua Kelas" : "All Classes"}</option>
            {kelasOptions.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        <div style={{ flex: "1 1 180px" }}>
          <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>
            {lang === "id" ? "Tanggal" : "Date"}
          </label>
          <input
            type="date"
            className="form-control"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>

        <div>
          <button 
            className="btn btn-secondary"
            onClick={() => { setFilterMk(""); setFilterKelas(""); setFilterDate(""); }}
            style={{ height: "42px" }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Data List ── */}
      {filteredRecords.length === 0 ? (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>
            {lang === "id" ? "Tidak ada rekap absensi yang sesuai filter." : "No attendance records match the filter."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {filteredRecords.map((rec) => {
            const siswaList = rec.siswa || [];
            const hadir = siswaList.filter(s => s.status === "hadir").length;
            const izin = siswaList.filter(s => s.status === "izin").length;
            const sakit = siswaList.filter(s => s.status === "sakit").length;
            const alpha = siswaList.filter(s => s.status === "alpha").length;
            
            return (
              <div key={rec.id} className="glass-panel dashboard-panel" style={{ padding: 0, overflow: "hidden" }}>
                {/* Header info */}
                <div style={{ 
                  padding: "1.25rem 1.5rem", 
                  background: "rgba(255,255,255,0.02)", 
                  borderBottom: "1px solid var(--border-color)",
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1rem"
                }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.3rem" }}>
                      {rec.mk_nama || (lang === "id" ? "Tanpa Mata Kuliah" : "No Course")}
                    </h3>
                    <div style={{ display: "flex", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.85rem", flexWrap: "wrap" }}>
                      <span>👤 {lecturers[rec.dosen_id] || "Dosen"}</span>
                      <span>🏫 Kelas: <strong style={{ color: "var(--text-primary)"}}>{rec.kelas}</strong></span>
                      <span>📅 {new Date(rec.tanggal).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                    </div>
                  </div>
                  
                  {/* Summary Badges */}
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                    {Object.entries({ hadir, izin, sakit, alpha }).map(([key, val]) => {
                      if (val === 0) return null;
                      const sMap = STATUS_MAP[key];
                      return (
                        <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: sMap.bg, border: `1px solid ${sMap.border}`, padding: "0.25rem 0.6rem", borderRadius: "20px" }}>
                          <span style={{ color: sMap.color, fontWeight: 800, fontSize: "0.85rem" }}>{val}</span>
                          <span style={{ color: sMap.color, fontSize: "0.7rem", fontWeight: 600 }}>{sMap.label}</span>
                        </div>
                      );
                    })}
                    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", padding: "0.25rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700 }}>
                      Total: {siswaList.length}
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="table-container">
                  <table className="custom-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 40, paddingLeft: "1.5rem" }}>#</th>
                        <th>{t.nim}</th>
                        <th>{lang === "id" ? "Nama Lengkap" : "Full Name"}</th>
                        <th>{t.status}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siswaList.map((siswa, idx) => {
                        const sMap = STATUS_MAP[siswa.status] || STATUS_MAP.hadir;
                        return (
                          <tr key={siswa.siswa_id}>
                            <td style={{ color: "var(--text-muted)", fontSize: "0.8rem", paddingLeft: "1.5rem" }}>{idx + 1}</td>
                            <td><span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>{siswa.nim}</span></td>
                            <td style={{ fontWeight: 600 }}>{siswa.nama}</td>
                            <td>
                              <span style={{ 
                                display: "inline-block",
                                padding: "0.2rem 0.5rem", 
                                borderRadius: "6px", 
                                background: sMap.bg, 
                                color: sMap.color, 
                                border: `1px solid ${sMap.border}`,
                                fontSize: "0.7rem",
                                fontWeight: 700
                              }}>
                                {sMap.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
