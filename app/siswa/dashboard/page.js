"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  getSchedules, 
  getStudentEvaluations, 
  getCourses, 
  getUsers, 
  getMateri 
} from "../../../lib/db";
import { translations } from "../../../lib/translations";

function getGradeCriteria(score) {
  if (score === "" || score === undefined || score === null) return { grade: "-", bobot: 0, predicate: "-", color: "#9ca3af" };
  const num = parseInt(score, 10);
  if (isNaN(num)) return { grade: "-", bobot: 0, predicate: "-", color: "#9ca3af" };
  if (num >= 95 && num <= 100) return { grade: "A+", bobot: 4.0, predicate: "Istimewa", color: "#10b981" };
  if (num >= 90 && num <= 94) return { grade: "A", bobot: 3.8, predicate: "Luar Biasa", color: "#059669" };
  if (num >= 85 && num <= 89) return { grade: "A-", bobot: 3.6, predicate: "Luar Biasa", color: "#34d399" };
  if (num >= 80 && num <= 84) return { grade: "B+", bobot: 3.4, predicate: "Sangat Baik", color: "#3b82f6" };
  if (num >= 75 && num <= 79) return { grade: "B", bobot: 3.2, predicate: "Sangat Baik", color: "#2563eb" };
  if (num >= 70 && num <= 74) return { grade: "B-", bobot: 3.0, predicate: "Baik", color: "#60a5fa" };
  if (num >= 65 && num <= 69) return { grade: "C+", bobot: 2.75, predicate: "Rata-Rata", color: "#f59e0b" };
  if (num >= 60 && num <= 64) return { grade: "C", bobot: 2.5, predicate: "Rata-Rata", color: "#d97706" };
  if (num >= 50 && num <= 59) return { grade: "D", bobot: 2.0, predicate: "Gagal", color: "#ef4444" };
  if (num >= 30 && num <= 49) return { grade: "E", bobot: 1.0, predicate: "Gagal", color: "#b91c1c" };
  if (num >= 0 && num <= 29) return { grade: "K", bobot: 0.0, predicate: "Kosong", color: "#9ca3af" };
  return { grade: "-", bobot: 0, predicate: "-", color: "#9ca3af" };
}

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
};

export default function SiswaDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [lang, setLang] = useState("id");
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [schedules, setSchedules] = useState([]);
  const [courses, setCourses] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [materials, setMaterials] = useState([]);

  // Check URL queries on client-side dynamically
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      if (tabParam) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Listen to navigation updates (when user clicks sidebar menu)
  useEffect(() => {
    const handleUrlChange = () => {
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      setActiveTab(tabParam || "dashboard");
    };
    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener("pushstate", handleUrlChange);
    window.addEventListener("replacestate", handleUrlChange);
    
    // Interval check as fallback since NextJS client side routing doesn't always trigger popstate
    const interval = setInterval(handleUrlChange, 250);

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener("pushstate", handleUrlChange);
      window.removeEventListener("replacestate", handleUrlChange);
      clearInterval(interval);
    };
  }, []);

  const loadData = useCallback(async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
    const userStr = localStorage.getItem("sikad_logged_in_user");
    if (!userStr) {
      window.location.href = "/login";
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== "siswa") {
      window.location.href = "/";
      return;
    }
    setStudentInfo(user);

    try {
      setLoading(true);
      const [rawSchedules, rawCourses, rawEvals, rawUsers] = await Promise.all([
        getSchedules(),
        getCourses(),
        getStudentEvaluations(),
        getUsers()
      ]);

      const filteredSchedules = rawSchedules.filter(
        s => (s.kelas || "").trim().toUpperCase() === (user?.kelas || "").trim().toUpperCase()
      );
      setSchedules(filteredSchedules);
      setCourses(rawCourses);
      setEvaluations(rawEvals);
      setLecturers(rawUsers.filter(u => u.role === "dosen"));

      // Load all materials matching course IDs
      const courseIds = rawCourses.map(c => c.id);
      const materialsList = [];
      for (const cid of courseIds) {
        const mats = await getMateri(null, cid);
        materialsList.push(...mats);
      }
      setMaterials(materialsList);
    } catch (err) {
      console.error("Gagal memuat data portal siswa:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // IPS & IPK Calculation Memo
  const academicCalculations = useMemo(() => {
    if (!studentInfo || !evaluations.length || !courses.length) {
      return { transcript: [], totalSks: 0, ipk: "0.00", semesterGpa: {} };
    }

    const transcript = [];
    let totalWeightedPoints = 0;
    let totalSks = 0;
    const semSks = {};
    const semPoints = {};

    evaluations.forEach(ev => {
      const studentEval = (ev.students || []).find(
        s => s.siswa_id === studentInfo.id || s.nim === studentInfo.nim
      );

      if (studentEval) {
        const course = courses.find(c => c.id === ev.mk_id);
        const sksVal = course ? (course.sks !== undefined ? course.sks : 3) : 3;
        const semVal = course ? (course.semesterNo !== undefined ? course.semesterNo : 1) : 1;
        const { grade, bobot, predicate, color } = getGradeCriteria(studentEval.score);

        const record = {
          courseCode: course?.kode_mk || "-",
          courseName: ev.mk_nama || course?.nama_mk || "-",
          sks: sksVal,
          semester: semVal,
          score: studentEval.score,
          grade,
          bobot,
          predicate,
          color,
          weightedScore: sksVal * bobot
        };

        transcript.push(record);

        totalSks += sksVal;
        totalWeightedPoints += sksVal * bobot;

        // Grouping per semester for IPS
        if (!semSks[semVal]) {
          semSks[semVal] = 0;
          semPoints[semVal] = 0;
        }
        semSks[semVal] += sksVal;
        semPoints[semVal] += sksVal * bobot;
      }
    });

    const ipk = totalSks > 0 ? (totalWeightedPoints / totalSks).toFixed(2) : "0.00";

    const semesterGpa = {};
    Object.keys(semSks).forEach(sem => {
      semesterGpa[sem] = {
        sks: semSks[sem],
        gpa: (semPoints[sem] / semSks[sem]).toFixed(2)
      };
    });

    return { transcript, totalSks, ipk, semesterGpa };
  }, [studentInfo, evaluations, courses]);

  // Today's schedule filtering
  const todaySchedules = useMemo(() => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const currentDay = days[new Date().getDay()];
    return schedules.filter(s => s.hari === currentDay);
  }, [schedules]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "var(--text-secondary)" }}>Memuat data kemahasiswaan...</p>
      </div>
    );
  }

  const t = translations[lang] || translations.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "1000px", margin: "0 auto" }}>
      
      {/* ── Welcome Banner ── */}
      <div className="glass-panel" style={{ padding: "1.75rem 2rem", background: "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(147,51,234,0.05) 100%)", borderColor: "rgba(59,130,246,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.25rem" }}>
              👋 Halo, {studentInfo?.nama_lengkap}!
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              NIM: <span style={{ color: "var(--primary)", fontWeight: "bold" }}>{studentInfo?.nim}</span> | Kelas: <span style={{ color: "var(--warning)", fontWeight: "bold" }}>{studentInfo?.kelas}</span> | Angkatan: {studentInfo?.angkatan}
            </p>
          </div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <div style={{ textAlign: "center", background: "rgba(0,0,0,0.3)", padding: "0.5rem 1rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>IPK KUMULATIF</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#10b981" }}>{academicCalculations.ipk}</div>
            </div>
            <div style={{ textAlign: "center", background: "rgba(0,0,0,0.3)", padding: "0.5rem 1rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>TOTAL SKS</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#60a5fa" }}>{academicCalculations.totalSks}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB CONTENT: DASHBOARD ── */}
      {activeTab === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
            
            {/* Hari Ini */}
            <div className="glass-panel">
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem", color: "var(--primary)" }}>📅 Jadwal Hari Ini</h3>
              {todaySchedules.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Tidak ada jadwal kuliah untuk hari ini. Bersantai sejenak!</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {todaySchedules.map(sch => {
                    const lecturer = lecturers.find(l => l.id === sch.dosen_id);
                    return (
                      <div key={sch.id} style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                        <div style={{ fontWeight: "bold" }}>{sch.mk_nama}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                          🕦 {sch.jam_mulai} - {sch.jam_selesai} | 🏛️ Ruangan: {sch.ruangan || "-"}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#9ca3af", marginTop: "0.5rem" }}>
                          Dosen: {lecturer?.nama_lengkap || sch.dosen_nama}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Materi Terbaru */}
            <div className="glass-panel">
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem", color: "var(--warning)" }}>📚 Materi Kuliah Terbaru</h3>
              {materials.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Belum ada materi pembelajaran yang diunggah.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {materials.slice(0, 4).map(mat => (
                    <div key={mat.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", padding: "0.75rem 1rem", borderRadius: "8px" }}>
                      <div style={{ maxWidth: "70%" }}>
                        <div style={{ fontWeight: "bold", fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mat.judul}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{mat.mk_nama}</div>
                      </div>
                      <a href={mat.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}>
                        Buka PDF
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── TAB CONTENT: JADWAL & DOSEN ── */}
      {activeTab === "jadwal" && (
        <div className="glass-panel">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem" }}>📅 Jadwal Perkuliahan 1 Minggu</h3>
          {schedules.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
              Tidak ada jadwal mata kuliah yang terdaftar untuk kelas Anda.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              {schedules.map(sch => {
                const lecturer = lecturers.find(l => l.id === sch.dosen_id);
                return (
                  <div key={sch.id} className="glass-panel" style={{ padding: "1.25rem", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column", gap: "0.75rem", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div>
                      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                        <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>{sch.hari}</span>
                        {sch.tanggal && (
                          <span className="badge badge-secondary" style={{ fontSize: "0.7rem", background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)" }}>
                            📅 {formatDate(sch.tanggal)}
                          </span>
                        )}
                      </div>
                      <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--primary)" }}>{sch.mk_nama}</h4>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Kode: {courses.find(c => c.id === sch.mk_id)?.kode_mk || "-"}</span>
                    </div>
                    
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      <div>🕒 Jam: <strong>{sch.jam_mulai} - {sch.jam_selesai}</strong></div>
                      <div>🏛️ Ruangan: <strong>{sch.ruangan || "-"}</strong></div>
                    </div>
                    
                    <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "0.5rem 0" }} />
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <img 
                        src={lecturer?.foto_profil || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"} 
                        alt="Dosen" 
                        style={{ width: "2.25rem", height: "2.25rem", borderRadius: "50%", objectFit: "cover", background: "rgba(255,255,255,0.05)" }}
                      />
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: "bold", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                          {lecturer?.nama_lengkap || sch.dosen_nama}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                          Bidang: <span style={{ color: "#34d399", fontWeight: 600 }}>{lecturer?.bidang_keilmuan || (lang === "id" ? "Penerbangan" : "Aviation")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB CONTENT: MATERI ── */}
      {activeTab === "materi" && (
        <div className="glass-panel">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem" }}>📚 Materi Pembelajaran</h3>
          {materials.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
              Belum ada materi pembelajaran yang dibagikan oleh Dosen.
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Mata Kuliah</th>
                    <th>Judul Materi</th>
                    <th>Deskripsi</th>
                    <th>Pengunggah</th>
                    <th style={{ textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map(mat => {
                    const lecturer = lecturers.find(l => l.id === mat.dosen_id);
                    return (
                      <tr key={mat.id}>
                        <td style={{ fontWeight: "bold" }}>{mat.mk_nama}</td>
                        <td>{mat.judul}</td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{mat.deskripsi || "-"}</td>
                        <td style={{ fontSize: "0.85rem" }}>{lecturer?.nama_lengkap || "Dosen"}</td>
                        <td style={{ textAlign: "right" }}>
                          <a href={mat.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}>
                            Unduh PDF
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB CONTENT: NILAI & TRANSKRIP ── */}
      {activeTab === "nilai" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Card Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div className="glass-panel" style={{ padding: "1.25rem", textAlign: "center", borderLeft: "4px solid #10b981" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>INDEKS PRESTASI KUMULATIF (IPK)</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#10b981", marginTop: "0.25rem" }}>{academicCalculations.ipk}</div>
            </div>
            <div className="glass-panel" style={{ padding: "1.25rem", textAlign: "center", borderLeft: "4px solid #3b82f6" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>TOTAL KREDIT SKS</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#3b82f6", marginTop: "0.25rem" }}>{academicCalculations.totalSks} SKS</div>
            </div>
            <div className="glass-panel" style={{ padding: "1.25rem", textAlign: "center", borderLeft: "4px solid #f59e0b" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>MATA KULIAH DITEMPUH</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f59e0b", marginTop: "0.25rem" }}>{academicCalculations.transcript.length} MK</div>
            </div>
          </div>

          {/* Transcript Tables grouped by Semester */}
          {academicCalculations.transcript.length === 0 ? (
            <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
              Dosen belum menginput nilai evaluasi belajar Anda di SIKAD.
            </div>
          ) : (
            [1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
              const semRecords = academicCalculations.transcript.filter(r => r.semester === sem);
              if (semRecords.length === 0) return null;

              const semStats = academicCalculations.semesterGpa[sem] || { sks: 0, gpa: "0.00" };

              return (
                <div key={sem} className="glass-panel" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "1.25rem 1.5rem", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ margin: 0, fontWeight: 700, fontSize: "1.05rem" }}>📖 Semester {sem}</h4>
                    <div style={{ display: "flex", gap: "1rem", fontSize: "0.85rem" }}>
                      <span>SKS: <strong style={{ color: "var(--primary)" }}>{semStats.sks}</strong></span>
                      <span>IPS: <strong style={{ color: "#10b981" }}>{semStats.gpa}</strong></span>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="custom-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Kode</th>
                          <th>Mata Kuliah</th>
                          <th style={{ textAlign: "center" }}>SKS</th>
                          <th style={{ textAlign: "center" }}>Bobot</th>
                          <th style={{ textAlign: "center" }}>Grade</th>
                          <th>Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semRecords.map((rec, idx) => (
                          <tr key={idx}>
                            <td><span className="badge badge-secondary" style={{ fontSize: "0.75rem" }}>{rec.courseCode}</span></td>
                            <td style={{ fontWeight: "bold" }}>{rec.courseName}</td>
                            <td style={{ textAlign: "center" }}>{rec.sks}</td>
                            <td style={{ textAlign: "center", fontWeight: "bold", color: "var(--primary)" }}>{rec.bobot.toFixed(2)}</td>
                            <td style={{ textAlign: "center" }}>
                              <span style={{ 
                                background: `${rec.color}15`, 
                                color: rec.color, 
                                border: `1px solid ${rec.color}30`,
                                padding: "0.25rem 0.5rem",
                                borderRadius: "4px",
                                fontWeight: "bold",
                                fontSize: "0.85rem"
                              }}>
                                {rec.grade}
                              </span>
                            </td>
                            <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{rec.predicate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
}
