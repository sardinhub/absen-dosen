"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getStudentEvaluations, getCourses, getUsers } from "../../../lib/db";
import { translations } from "../../../lib/translations";

// Grading logic based on the user's specific instructions
function getGradeCriteria(score) {
  if (score >= 95 && score <= 100) return { grade: "A+", predicate: "Terrific", color: "#10b981" };
  if (score >= 86 && score <= 94) return { grade: "A", predicate: "Excellent", color: "#059669" };
  if (score >= 81 && score <= 85) return { grade: "A-", predicate: "Excellent", color: "#34d399" };
  if (score >= 76 && score <= 80) return { grade: "B+", predicate: "Very Good", color: "#3b82f6" };
  if (score >= 71 && score <= 75) return { grade: "B", predicate: "Very Good", color: "#2563eb" };
  if (score >= 66 && score <= 70) return { grade: "B-", predicate: "Good", color: "#60a5fa" };
  if (score >= 61 && score <= 65) return { grade: "C+", predicate: "Average", color: "#f59e0b" };
  if (score >= 51 && score <= 60) return { grade: "C", predicate: "Average", color: "#d97706" };
  if (score >= 0 && score <= 50) return { grade: "D", predicate: "Failure", color: "#ef4444" };
  return { grade: "-", predicate: "-", color: "#9ca3af" };
}

export default function KelolaPenilaianAdmin() {
  const [lang, setLang] = useState("id");
  const [loading, setLoading] = useState(true);
  
  // Data
  const [evaluations, setEvaluations] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState({});

  // Filters
  const [filterMk, setFilterMk] = useState("");
  const [filterKelas, setFilterKelas] = useState("");
  const [filterDosen, setFilterDosen] = useState("");

  const syncData = useCallback(async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
    setLoading(true);
    try {
      const [rawEvaluations, rawCourses, rawUsers] = await Promise.all([
        getStudentEvaluations(),
        getCourses(),
        getUsers(),
      ]);

      const dosenMap = {};
      rawUsers.filter(u => u.role === "dosen").forEach(u => {
        dosenMap[u.id] = u.name;
      });

      setEvaluations(rawEvaluations);
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
    evaluations.forEach(a => { if (a.mk_nama) mks.add(a.mk_nama); });
    return [...mks].sort();
  }, [evaluations]);

  const kelasOptions = useMemo(() => {
    const kls = new Set();
    evaluations.forEach(a => { if (a.kelas) kls.add(a.kelas); });
    return [...kls].sort();
  }, [evaluations]);
  
  const dosenOptions = useMemo(() => {
    const dsns = new Set();
    evaluations.forEach(a => { if (a.dosen_id) dsns.add(a.dosen_id); });
    return [...dsns].map(id => ({ id, name: lecturers[id] || id })).sort((a,b) => a.name.localeCompare(b.name));
  }, [evaluations, lecturers]);

  // Filter the evaluation records
  const filteredRecords = useMemo(() => {
    return evaluations.filter(a => {
      const matchMk = filterMk === "" || a.mk_nama === filterMk;
      const matchKelas = filterKelas === "" || a.kelas === filterKelas;
      const matchDosen = filterDosen === "" || a.dosen_id === filterDosen;
      return matchMk && matchKelas && matchDosen;
    });
  }, [evaluations, filterMk, filterKelas, filterDosen]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "var(--text-secondary)" }}>
          {lang === "id" ? "Memuat data penilaian..." : "Loading evaluation data..."}
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
          background: "linear-gradient(135deg, rgba(59,130,246,0.07) 0%, rgba(16,185,129,0.05) 100%)",
          borderColor: "rgba(59,130,246,0.2)",
        }}
      >
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.3rem" }}>
          🏆 {t.kelolaPenilaian || (lang === "id" ? "Kelola Penilaian Siswa" : "Manage Student Grades")}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          {lang === "id" 
            ? "Rekap nilai evaluasi mahasiswa yang telah diinput oleh Dosen beserta hasil konversinya."
            : "Recap of student evaluation scores inputted by Lecturers with their converted grades."}
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
        
        <div style={{ flex: "1 1 200px" }}>
          <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>
            Dosen
          </label>
          <select
            className="form-control"
            value={filterDosen}
            onChange={(e) => setFilterDosen(e.target.value)}
          >
            <option value="">{lang === "id" ? "Semua Dosen" : "All Lecturers"}</option>
            {dosenOptions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div>
          <button 
            className="btn btn-secondary"
            onClick={() => { setFilterMk(""); setFilterKelas(""); setFilterDosen(""); }}
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
            {lang === "id" ? "Tidak ada penilaian yang sesuai filter." : "No evaluation records match the filter."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {filteredRecords.map((rec) => {
            const siswaList = rec.students || [];
            
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
                      <span>🔄 {new Date(rec.updated_at).toLocaleString(lang === "id" ? "id-ID" : "en-US")}</span>
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
                        <th style={{ textAlign: "center" }}>Skor Dosen</th>
                        <th style={{ textAlign: "center" }}>Grade</th>
                        <th style={{ textAlign: "center" }}>Kriteria</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siswaList.map((siswa, idx) => {
                        const { grade, predicate, color } = getGradeCriteria(siswa.score);
                        return (
                          <tr key={siswa.siswa_id}>
                            <td style={{ color: "var(--text-muted)", fontSize: "0.8rem", paddingLeft: "1.5rem" }}>{idx + 1}</td>
                            <td><span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>{siswa.nim}</span></td>
                            <td style={{ fontWeight: 600 }}>{siswa.nama}</td>
                            <td style={{ textAlign: "center", fontWeight: 800 }}>{siswa.score}</td>
                            <td style={{ textAlign: "center" }}>
                              <span style={{
                                padding: "0.2rem 0.6rem",
                                borderRadius: "8px",
                                background: `${color}15`,
                                border: `1px solid ${color}40`,
                                color: color,
                                fontWeight: 800,
                                fontSize: "0.9rem"
                              }}>
                                {grade}
                              </span>
                            </td>
                            <td style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>
                              {predicate}
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
