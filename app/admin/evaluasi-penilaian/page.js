"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getStudents, getSchedules, getCourses, getStudentEvaluations } from "../../../lib/db";

// Grading logic mapping
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

// Class helper match (e.g. AV08 matches AV08-FA10)
const isClassMatch = (schKelas, studentKelas) => {
  if (!schKelas || !studentKelas) return false;
  const sK = schKelas.trim().toUpperCase();
  const stdK = studentKelas.trim().toUpperCase();
  if (sK === stdK) return true;
  if (sK.includes("-")) {
    const parts = sK.split("-").map(p => p.trim());
    if (parts.includes(stdK)) return true;
  }
  if (stdK.includes("-")) {
    const parts = stdK.split("-").map(p => p.trim());
    if (parts.includes(sK)) return true;
  }
  return false;
};

export default function AdminKHSPreview() {
  const [lang, setLang] = useState("id");
  const [loading, setLoading] = useState(true);

  // Database lists
  const [students, setStudents] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [courses, setCourses] = useState([]);
  const [evaluations, setEvaluations] = useState([]);

  // Selections
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const syncData = useCallback(async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
    setLoading(true);
    try {
      const [rawStudents, rawSchedules, rawCourses, rawEvals] = await Promise.all([
        getStudents(),
        getSchedules(),
        getCourses(),
        getStudentEvaluations()
      ]);

      setStudents(rawStudents);
      setSchedules(rawSchedules);
      setCourses(rawCourses);
      setEvaluations(rawEvals);
    } catch (err) {
      console.error("Gagal memuat data KHS admin:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncData();
  }, [syncData]);

  // Filter students based on search query
  const filteredStudentsList = useMemo(() => {
    if (!searchQuery.trim()) return students;
    return students.filter(s =>
      (s.nama_lengkap || s.nama || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.nim || "").includes(searchQuery) ||
      (s.kelas || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const activeStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  // Compute Academic calculations and transcript for active student
  const khsData = useMemo(() => {
    if (!activeStudent || !courses.length) {
      return { transcript: [], totalPertemuan: 0, ipk: "0.00", semesterGpa: {} };
    }

    const studentSchedules = schedules.filter(s => isClassMatch(s.kelas, activeStudent.kelas));
    const scheduleMkIds = studentSchedules.map(s => s.mk_id);

    // Get unique course IDs from schedules or evaluations
    const studentEvalData = evaluations.filter(ev => 
      (ev.students || []).some(s => s.siswa_id === activeStudent.id || s.nim === activeStudent.nim)
    );
    const evalMkIds = studentEvalData.map(ev => ev.mk_id);
    const uniqueCourseIds = Array.from(new Set([...scheduleMkIds, ...evalMkIds]));

    const transcript = [];
    let totalWeightedPoints = 0;
    let totalPertemuan = 0;
    const semPertemuan = {};
    const semPoints = {};

    uniqueCourseIds.forEach(mkId => {
      const course = courses.find(c => c.id === mkId);
      const evalData = evaluations.find(ev => 
        ev.mk_id === mkId && 
        (ev.students || []).some(s => s.siswa_id === activeStudent.id || s.nim === activeStudent.nim)
      );
      
      const studentEval = evalData
        ? (evalData.students || []).find(s => s.siswa_id === activeStudent.id || s.nim === activeStudent.nim)
        : null;

      const meetingsVal = course ? (parseInt(course.jumlah_pertemuan, 10) || 14) : 14;
      const semVal = course ? (course.semesterNo !== undefined ? course.semesterNo : 1) : 1;

      if (studentEval && studentEval.score !== undefined) {
        const { grade, bobot, predicate, color } = getGradeCriteria(studentEval.score);
        
        transcript.push({
          courseCode: course?.kode_mk || "-",
          courseName: course?.nama_mk || "-",
          pertemuan: meetingsVal,
          semester: semVal,
          score: studentEval.score,
          grade,
          bobot,
          predicate,
          color,
          status: lang === "id" ? "Selesai" : "Completed"
        });

        totalPertemuan += meetingsVal;
        totalWeightedPoints += meetingsVal * bobot;

        if (!semPertemuan[semVal]) {
          semPertemuan[semVal] = 0;
          semPoints[semVal] = 0;
        }
        semPertemuan[semVal] += meetingsVal;
        semPoints[semVal] += meetingsVal * bobot;
      } else {
        transcript.push({
          courseCode: course?.kode_mk || "-",
          courseName: course?.nama_mk || "-",
          pertemuan: meetingsVal,
          semester: semVal,
          score: "-",
          grade: "-",
          bobot: 0,
          predicate: lang === "id" ? "Belum Dinilai" : "Not Graded",
          color: "#9ca3af",
          status: lang === "id" ? "Dalam Proses" : "In Progress"
        });
      }
    });

    const ipk = totalPertemuan > 0 ? (totalWeightedPoints / totalPertemuan).toFixed(2) : "0.00";

    const semesterGpa = {};
    Object.keys(semPertemuan).forEach(sem => {
      semesterGpa[sem] = {
        pertemuan: semPertemuan[sem],
        gpa: (semPoints[sem] / semPertemuan[sem]).toFixed(2)
      };
    });

    return { transcript, totalPertemuan, ipk, semesterGpa };
  }, [activeStudent, schedules, courses, evaluations, lang]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div style={{ color: "var(--text-muted)", padding: "2rem" }}>{lang === "id" ? "Memuat..." : "Loading..."}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Dynamic printer css block */}
      <style>{`
        /* Hide print area on screen display */
        .print-area, .print-bg {
          display: none;
        }

        @media print {
          /* Enforce single page limits */
          html, body {
            height: 297mm !important;
            overflow: hidden !important;
            background: white !important;
            color: black !important;
          }
          nav, header, aside, .no-print, button, input, select, .sidebar, .navbar, .navbar-container {
            display: none !important;
          }
          /* Reset layouts for clean print */
          .app-layout, .main-content, .animate-fade-in {
            background: white !important;
            color: black !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            display: block !important;
          }
          /* Stylize print page layout to match A4 dimensions */
          .print-area {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            background: transparent !important;
            color: black !important;
            padding: 38mm 15mm 25mm 15mm !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .print-bg {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: -1 !important;
          }
          .custom-table {
            border-collapse: collapse !important;
            width: 100% !important;
            color: black !important;
            font-size: 0.8rem !important;
          }
          .custom-table th, .custom-table td {
            border: 1px solid #111 !important;
            padding: 6px 8px !important;
            color: black !important;
            background: transparent !important;
          }
          .badge {
            border: none !important;
            background: transparent !important;
            color: black !important;
            padding: 0 !important;
          }
          .print-header {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            margin-bottom: 1rem !important;
            border: none !important;
            padding: 0 !important;
          }
          .print-title {
            font-size: 1.5rem !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            margin-bottom: 0.25rem !important;
          }
          .print-subtitle {
            font-size: 0.9rem !important;
            margin-bottom: 0.5rem !important;
          }
          .print-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 1rem !important;
            margin-bottom: 0.75rem !important;
            font-size: 0.85rem !important;
          }
          .print-footer {
            display: flex !important;
            justify-content: space-between !important;
            margin-top: 1.5rem !important;
            page-break-inside: avoid !important;
            font-size: 0.85rem !important;
          }
          .signature-box {
            text-align: center !important;
            width: 200px !important;
          }
        }
      `}</style>

      {/* Main Admin UI - Hidden when printing */}
      <div className="no-print" style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        
        {/* Left Side: Student List Selector */}
        <div className="glass-panel" style={{ flex: "1 1 300px", padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>👥 Pilih Siswa</h3>
          <input
            type="text"
            className="form-control"
            placeholder={lang === "id" ? "Cari nama, NIM, atau kelas..." : "Search name, NIM, class..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: "1rem" }}
          />

          <div style={{ maxHeight: "380px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            {filteredStudentsList.length === 0 ? (
              <div style={{ padding: "1.5rem", fontStyle: "italic", color: "var(--text-secondary)", textAlign: "center" }}>
                {lang === "id" ? "Siswa tidak ditemukan" : "No students found"}
              </div>
            ) : (
              filteredStudentsList.map(student => (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  style={{
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid var(--border-color)",
                    cursor: "pointer",
                    background: selectedStudentId === student.id ? "rgba(59, 130, 246, 0.15)" : "transparent",
                    transition: "background 0.2s"
                  }}
                >
                  <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>{student.nama_lengkap || student.nama}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                    NIM: {student.nim} | Kelas: <span style={{ color: "var(--warning)", fontWeight: 600 }}>{student.kelas}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Quick Action Preview Banner */}
        <div style={{ flex: "2 2 500px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {activeStudent ? (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-primary" onClick={handlePrint}>
                🖨️ {lang === "id" ? "Cetak KHS Siswa" : "Print Student KHS"}
              </button>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
              👈 Pilih salah satu siswa di panel sebelah kiri untuk mempratinjau Kartu Hasil Studi (KHS).
            </div>
          )}

          {activeStudent && (
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>KHS: {activeStudent.nama_lengkap || activeStudent.nama}</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                    NIM: {activeStudent.nim} | Kelas: {activeStudent.kelas}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.5rem 1rem", borderRadius: "8px", textAlign: "center", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>IPK SEMESTER</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#10b981" }}>{khsData.ipk}</div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.5rem 1rem", borderRadius: "8px", textAlign: "center", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>TOTAL PERTEMUAN</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#3b82f6" }}>{khsData.totalPertemuan} Sesi</div>
                  </div>
                </div>
              </div>

              {khsData.transcript.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                  Siswa ini belum memiliki mata kuliah aktif terdaftar.
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Kode</th>
                        <th>Mata Kuliah</th>
                        <th style={{ textAlign: "center" }}>Jumlah Pertemuan</th>
                        <th style={{ textAlign: "center" }}>Nilai Akhir</th>
                        <th style={{ textAlign: "center" }}>Bobot</th>
                        <th style={{ textAlign: "center" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {khsData.transcript.map((rec, idx) => (
                        <tr key={idx}>
                          <td><span className="badge badge-secondary" style={{ fontSize: "0.75rem" }}>{rec.courseCode}</span></td>
                          <td style={{ fontWeight: "bold" }}>{rec.courseName}</td>
                          <td style={{ textAlign: "center" }}>{rec.pertemuan} Sesi</td>
                          <td style={{ textAlign: "center" }}>
                            {rec.score !== "-" ? (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                                <strong>{rec.score}</strong>
                                <span style={{
                                  background: `${rec.color}15`,
                                  color: rec.color,
                                  border: `1px solid ${rec.color}30`,
                                  padding: "0.15rem 0.3rem",
                                  borderRadius: "4px",
                                  fontWeight: "bold",
                                  fontSize: "0.7rem"
                                }}>{rec.grade}</span>
                              </div>
                            ) : "-"}
                          </td>
                          <td style={{ textAlign: "center", fontWeight: "bold" }}>{rec.score !== "-" ? rec.bobot.toFixed(2) : "-"}</td>
                          <td style={{ textAlign: "center" }}>
                            <span className={`badge ${rec.score !== "-" ? "badge-success" : "badge-warning"}`} style={{ fontSize: "0.75rem" }}>
                              {rec.status}
                            </span>
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
      </div>

      {activeStudent && (
        <div className="print-area">
          {/* Background Kop Surat Template */}
          <img src="/kop_surat.png" alt="Kop Surat Background" className="print-bg" />
          
          <div style={{ fontSize: "1.25rem", fontWeight: "bold", textAlign: "center", textDecoration: "underline", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            KARTU HASIL STUDI (KHS) SISWA
          </div>

          {/* Student Profile Info Grid */}
          <div className="print-grid">
            <div>
              <table>
                <tbody>
                  <tr>
                    <td style={{ border: "none", padding: "4px", fontWeight: "bold" }}>Nama Lengkap</td>
                    <td style={{ border: "none", padding: "4px" }}>: {activeStudent.nama_lengkap || activeStudent.nama}</td>
                  </tr>
                  <tr>
                    <td style={{ border: "none", padding: "4px", fontWeight: "bold" }}>NIM</td>
                    <td style={{ border: "none", padding: "4px" }}>: {activeStudent.nim}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <table>
                <tbody>
                  <tr>
                    <td style={{ border: "none", padding: "4px", fontWeight: "bold" }}>Kelas / Angkatan</td>
                    <td style={{ border: "none", padding: "4px" }}>: {activeStudent.kelas} / {activeStudent.angkatan || "-"}</td>
                  </tr>
                  <tr>
                    <td style={{ border: "none", padding: "4px", fontWeight: "bold" }}>Semester</td>
                    <td style={{ border: "none", padding: "4px" }}>: Ganjil / Genap</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Academic Records Table */}
          <table className="custom-table" style={{ marginTop: "0.75rem" }}>
            <thead>
              <tr>
                <th style={{ width: "10%" }}>KODE</th>
                <th style={{ width: "45%" }}>MATA KULIAH</th>
                <th style={{ width: "15%", textAlign: "center" }}>JML PERTEMUAN</th>
                <th style={{ width: "10%", textAlign: "center" }}>NILAI</th>
                <th style={{ width: "10%", textAlign: "center" }}>GRADE</th>
                <th style={{ width: "10%", textAlign: "center" }}>BOBOT</th>
              </tr>
            </thead>
            <tbody>
              {khsData.transcript.map((rec, idx) => (
                <tr key={idx}>
                  <td>{rec.courseCode}</td>
                  <td style={{ fontWeight: "bold" }}>{rec.courseName}</td>
                  <td style={{ textAlign: "center" }}>{rec.pertemuan}</td>
                  <td style={{ textAlign: "center" }}>{rec.score}</td>
                  <td style={{ textAlign: "center", fontWeight: "bold" }}>{rec.grade}</td>
                  <td style={{ textAlign: "center" }}>{rec.score !== "-" ? rec.bobot.toFixed(2) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* GPA Summary */}
          <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end" }}>
            <table style={{ borderCollapse: "collapse", width: "300px" }}>
              <tbody>
                <tr>
                  <td style={{ border: "1px solid #111", padding: "8px", fontWeight: "bold" }}>Total Pertemuan</td>
                  <td style={{ border: "1px solid #111", padding: "8px", textAlign: "center" }}>{khsData.totalPertemuan} Sesi</td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #111", padding: "8px", fontWeight: "bold" }}>IPK Semester</td>
                  <td style={{ border: "1px solid #111", padding: "8px", textAlign: "center", fontWeight: "bold", color: "green" }}>{khsData.ipk}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signature Footer */}
          <div className="print-footer">
            <div className="signature-box">
              <div>Mengetahui,</div>
              <div>Manager Akademik</div>
              <div style={{ height: "45px" }}></div>
              <div style={{ borderBottom: "1px solid #111", fontWeight: "bold" }}>Darwin</div>
            </div>
            
            <div className="signature-box">
              <div>Makassar, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
              <div>Direktur</div>
              <div style={{ height: "45px" }}></div>
              <div style={{ borderBottom: "1px solid #111", fontWeight: "bold" }}>Sugeng Rianto</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
