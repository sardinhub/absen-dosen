"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { getStudentEvaluations, getCourses, getUsers } from "../../../lib/db";
import { translations } from "../../../lib/translations";
import { exportGradesToPDF } from "../../../lib/exportUtils";

// Grading logic based on the user's specific instructions
function getGradeCriteria(score) {
  if (score >= 95 && score <= 100) return { bobot: 4.0, grade: "A+", predicate: "Terrific", color: "#10b981" };
  if (score >= 90 && score <= 94) return { bobot: 3.8, grade: "A", predicate: "Excellent", color: "#059669" };
  if (score >= 85 && score <= 89) return { bobot: 3.6, grade: "A-", predicate: "Excellent", color: "#34d399" };
  if (score >= 80 && score <= 84) return { bobot: 3.4, grade: "B+", predicate: "Very Good", color: "#3b82f6" };
  if (score >= 75 && score <= 79) return { bobot: 3.2, grade: "B", predicate: "Very Good", color: "#2563eb" };
  if (score >= 70 && score <= 74) return { bobot: 3.0, grade: "B-", predicate: "Good", color: "#60a5fa" };
  if (score >= 65 && score <= 69) return { bobot: 2.75, grade: "C+", predicate: "Average", color: "#f59e0b" };
  if (score >= 60 && score <= 64) return { bobot: 2.5, grade: "C", predicate: "Average", color: "#d97706" };
  if (score >= 50 && score <= 59) return { bobot: 2.0, grade: "D", predicate: "Failure", color: "#ef4444" };
  if (score >= 30 && score <= 49) return { bobot: 1.0, grade: "E", predicate: "Failure", color: "#b91c1c" };
  if (score >= 0 && score <= 29) return { bobot: 0.0, grade: "K", predicate: "Empty", color: "#9ca3af" };
  return { bobot: 0.0, grade: "-", predicate: "-", color: "#9ca3af" };
}

export default function KelolaPenilaianAdmin() {
  const [lang, setLang] = useState("id");
  const [loading, setLoading] = useState(true);
  
  // Preview State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
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
        dosenMap[u.id] = u.nama_lengkap || u.name || u.id;
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

  const handlePreviewPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const url = await exportGradesToPDF(filteredRecords, lecturers, lang, 'preview');
      setPreviewUrl(url);
      setIsPreviewModalOpen(true);
    } catch (err) {
      console.error(err);
      alert(lang === "id" ? "Gagal memuat pratinjau PDF." : "Failed to load PDF preview.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const t = translations[lang] || translations.id;

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
            className="form-control select-dark"
            value={filterMk}
            onChange={(e) => setFilterMk(e.target.value)}
          >
            <option className="select-option" value="">{lang === "id" ? "Semua Mata Kuliah" : "All Courses"}</option>
            {mkOptions.map(mk => <option className="select-option" key={mk} value={mk}>{mk}</option>)}
          </select>
        </div>

        <div style={{ flex: "1 1 150px" }}>
          <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>
            {lang === "id" ? "Kelas" : "Class"}
          </label>
          <select
            className="form-control select-dark"
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
          >
            <option className="select-option" value="">{lang === "id" ? "Semua Kelas" : "All Classes"}</option>
            {kelasOptions.map(k => <option className="select-option" key={k} value={k}>{k}</option>)}
          </select>
        </div>
        
        <div style={{ flex: "1 1 200px" }}>
          <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>
            Dosen
          </label>
          <select
            className="form-control select-dark"
            value={filterDosen}
            onChange={(e) => setFilterDosen(e.target.value)}
          >
            <option className="select-option" value="">{lang === "id" ? "Semua Dosen" : "All Lecturers"}</option>
            {dosenOptions.map(d => <option className="select-option" key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            className="btn btn-secondary"
            onClick={handlePreviewPDF}
            style={{ height: "42px", display: "flex", alignItems: "center", gap: "0.5rem" }}
            disabled={isGeneratingPdf}
          >
            👁️ {isGeneratingPdf ? (lang === "id" ? "Memproses..." : "Loading...") : (lang === "id" ? "Pratinjau" : "Preview")}
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => exportGradesToPDF(filteredRecords, lecturers, lang)}
            style={{ height: "42px", display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            🖨️ {lang === "id" ? "Cetak PDF" : "Print PDF"}
          </button>
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
                        <th style={{ textAlign: "center" }}>Bobot</th>
                        <th style={{ textAlign: "center" }}>Grade</th>
                        <th style={{ textAlign: "center" }}>Kriteria</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siswaList.map((siswa, idx) => {
                        const { bobot, grade, predicate, color } = getGradeCriteria(siswa.score);
                        return (
                          <tr key={siswa.siswa_id}>
                            <td style={{ color: "var(--text-muted)", fontSize: "0.8rem", paddingLeft: "1.5rem" }}>{idx + 1}</td>
                            <td><span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>{siswa.nim}</span></td>
                            <td style={{ fontWeight: 600 }}>{siswa.nama}</td>
                            <td style={{ textAlign: "center", fontWeight: 800, color: "var(--primary)" }}>{bobot}</td>
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

      {/* Preview Modal */}
      {isPreviewModalOpen && typeof document !== "undefined" && createPortal(
        <div className="modal-overlay" onClick={() => setIsPreviewModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: "90%", maxWidth: "1000px", height: "90vh", display: "flex", flexDirection: "column" }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {lang === "id" ? "Pratinjau Daftar Nilai" : "Grades Preview"}
              </h3>
              <button className="modal-close" onClick={() => setIsPreviewModalOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ flex: 1, padding: 0 }}>
              {previewUrl ? (
                <iframe src={previewUrl} style={{ width: "100%", height: "100%", border: "none", borderRadius: "0 0 16px 16px" }} title="PDF Preview" />
              ) : (
                <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
