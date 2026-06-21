"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  getSchedules, 
  getStudents, 
  getCourses, 
  getStudentEvaluationByMkAndKelas, 
  saveStudentEvaluation 
} from "../../../lib/db";
import { translations } from "../../../lib/translations";

export default function EvaluasiPenilaianDosen() {
  const [lang, setLang] = useState("id");
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [allSchedules, setAllSchedules] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allCourses, setAllCourses] = useState([]);

  // Selection state
  const [selectedMkId, setSelectedMkId] = useState("");
  const [selectedKelas, setSelectedKelas] = useState("");

  // Input state
  const [evaluationRecordId, setEvaluationRecordId] = useState(null);
  const [studentScores, setStudentScores] = useState({}); // { siswa_id: 100 }
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
    const userStr = localStorage.getItem("sikad_logged_in_user");
    if (!userStr) {
      window.location.href = "/login";
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== "dosen") {
      window.location.href = "/";
      return;
    }
    setLoggedInUser(user);
    setLoading(true);
    try {
      const [schedules, students, courses] = await Promise.all([
        getSchedules(),
        getStudents(),
        getCourses(),
      ]);
      setAllSchedules(schedules.filter(j => j.dosen_id === user.id));
      setAllStudents(students);
      setAllCourses(courses);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived options for filter
  const myCoursesOptions = useMemo(() => {
    const courseIds = new Set(allSchedules.map(s => s.mk_id));
    return allCourses.filter(c => courseIds.has(c.id));
  }, [allSchedules, allCourses]);

  const kelasOptions = useMemo(() => {
    if (!selectedMkId) return [];
    const kls = new Set(allSchedules.filter(s => s.mk_id === selectedMkId).map(s => s.kelas));
    return [...kls].sort();
  }, [allSchedules, selectedMkId]);

  // Helper to check if a student belongs to a class (handling combined classes like AV08-FA10)
  const isStudentInKelas = (student, kelasName) => {
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
  };

  const studentsInClass = useMemo(() => {
    if (!selectedMkId || !selectedKelas) return [];
    return allStudents.filter(s => isStudentInKelas(s, selectedKelas)).sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  }, [allStudents, selectedMkId, selectedKelas]);

  // Fetch existing evaluation when class changes
  useEffect(() => {
    async function fetchEvals() {
      if (selectedMkId && selectedKelas) {
        setLoading(true);
        const evals = await getStudentEvaluationByMkAndKelas(selectedMkId, selectedKelas);
        if (evals) {
          setEvaluationRecordId(evals.id);
          const scores = {};
          if (evals.students) {
            evals.students.forEach(s => {
              scores[s.siswa_id] = s.score;
            });
          }
          setStudentScores(scores);
        } else {
          setEvaluationRecordId(null);
          setStudentScores({});
        }
        setLoading(false);
      } else {
        setEvaluationRecordId(null);
        setStudentScores({});
      }
    }
    fetchEvals();
  }, [selectedMkId, selectedKelas]);

  const handleScoreChange = (siswaId, value) => {
    let val = parseInt(value, 10);
    if (isNaN(val)) val = "";
    else if (val < 0) val = 0;
    else if (val > 100) val = 100;
    
    setStudentScores(prev => ({
      ...prev,
      [siswaId]: val
    }));
  };

  const handleSave = async () => {
    if (!selectedMkId || !selectedKelas) return;
    setIsSaving(true);
    
    const mk = allCourses.find(c => c.id === selectedMkId);
    
    const record = {
      id: evaluationRecordId || undefined,
      dosen_id: loggedInUser.id,
      mk_id: selectedMkId,
      mk_nama: mk?.nama_mk || "",
      kelas: selectedKelas,
      students: studentsInClass.map(s => ({
        siswa_id: s.id,
        nim: s.nim,
        nama: s.nama,
        score: studentScores[s.id] !== undefined && studentScores[s.id] !== "" ? parseInt(studentScores[s.id], 10) : 0
      })),
      updated_at: new Date().toISOString()
    };

    const success = await saveStudentEvaluation(record);
    setIsSaving(false);
    if (success) {
      alert(lang === "id" ? "Evaluasi berhasil disimpan!" : "Evaluation saved successfully!");
      // reload id
      const updatedEval = await getStudentEvaluationByMkAndKelas(selectedMkId, selectedKelas);
      if (updatedEval) setEvaluationRecordId(updatedEval.id);
    } else {
      alert(lang === "id" ? "Gagal menyimpan evaluasi." : "Failed to save evaluation.");
    }
  };

  if (loading && !allSchedules.length) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "var(--text-secondary)" }}>{lang === "id" ? "Memuat data..." : "Loading..."}</p>
      </div>
    );
  }

  const t = translations[lang] || translations.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "900px", margin: "0 auto" }}>
      
      {/* ── Page Header ── */}
      <div
        className="glass-panel"
        style={{
          padding: "1.5rem 2rem",
          background: "linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(239,68,68,0.05) 100%)",
          borderColor: "rgba(245,158,11,0.2)",
        }}
      >
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.3rem" }}>
          📝 {t.evaluasiPenilaian || (lang === "id" ? "Evaluasi & Penilaian" : "Evaluation & Grading")}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          {lang === "id"
            ? "Masukkan Skor Akhir (0-100) untuk setiap siswa pada kelas yang Anda ajar."
            : "Input the Final Score (0-100) for each student in your class."}
        </p>
      </div>

      {/* ── Filters ── */}
      <div className="glass-panel" style={{ padding: "1.25rem 1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 250px" }}>
          <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>
            {lang === "id" ? "Pilih Mata Kuliah" : "Select Course"}
          </label>
          <select
            className="form-control"
            value={selectedMkId}
            onChange={(e) => {
              setSelectedMkId(e.target.value);
              setSelectedKelas("");
            }}
          >
            <option value="">-- {lang === "id" ? "Pilih Mata Kuliah" : "Select Course"} --</option>
            {myCoursesOptions.map(c => (
              <option key={c.id} value={c.id}>{c.nama_mk}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: "1 1 200px" }}>
          <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>
            {lang === "id" ? "Pilih Kelas" : "Select Class"}
          </label>
          <select
            className="form-control"
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
            disabled={!selectedMkId}
          >
            <option value="">-- {lang === "id" ? "Pilih Kelas" : "Select Class"} --</option>
            {kelasOptions.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Students List ── */}
      {selectedMkId && selectedKelas && (
        <div className="glass-panel dashboard-panel" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
              {lang === "id" ? "Daftar Siswa" : "Student List"} ({studentsInClass.length})
            </h3>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving || studentsInClass.length === 0}>
              {isSaving ? "Menyimpan..." : (lang === "id" ? "Simpan Penilaian" : "Save Evaluation")}
            </button>
          </div>
          
          {loading && <div style={{ padding: "2rem", textAlign: "center" }}>Memuat nilai...</div>}

          {!loading && studentsInClass.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
              {lang === "id" ? "Tidak ada siswa di kelas ini." : "No students in this class."}
            </div>
          ) : !loading && (
            <div className="table-container">
              <table className="custom-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40, paddingLeft: "1.5rem" }}>#</th>
                    <th>{t.nim}</th>
                    <th>{lang === "id" ? "Nama Lengkap" : "Full Name"}</th>
                    <th style={{ width: "150px", textAlign: "center" }}>{lang === "id" ? "Skor (0-100)" : "Score (0-100)"}</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsInClass.map((siswa, idx) => (
                    <tr key={siswa.id}>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8rem", paddingLeft: "1.5rem" }}>{idx + 1}</td>
                      <td><span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>{siswa.nim}</span></td>
                      <td style={{ fontWeight: 600 }}>{siswa.nama}</td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="form-control"
                          style={{ width: "80px", display: "inline-block", textAlign: "center" }}
                          value={studentScores[siswa.id] !== undefined ? studentScores[siswa.id] : ""}
                          onChange={(e) => handleScoreChange(siswa.id, e.target.value)}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
