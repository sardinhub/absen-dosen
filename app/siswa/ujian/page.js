"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getExams, getExamResults } from "../../../lib/db";

export default function SiswaUjianListPage() {
  const [student, setStudent] = useState(null);
  const [exams, setExams] = useState([]);
  const [myResults, setMyResults] = useState({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem("sikad_logged_in_user");
      if (!userStr) {
        window.location.href = "/login";
        return;
      }
      const user = JSON.parse(userStr);
      if (user.role !== "siswa") {
        window.location.href = "/login";
        return;
      }
      setStudent(user);

      // Fetch exams for student's class
      const rawExams = await getExams(null, user.kelas);
      // Filter published exams only
      const publishedExams = rawExams.filter(e => e.status === "published");

      // Fetch results for this student
      const resultMap = {};
      for (const ex of publishedExams) {
        const resList = await getExamResults(ex.id, user.id);
        if (resList.length > 0) {
          resultMap[ex.id] = resList[0];
        }
      }

      setExams(publishedExams);
      setMyResults(resultMap);
    } catch (err) {
      console.error("Gagal memuat ujian siswa:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "var(--text-secondary)" }}>Memuat Daftar Ujian Online...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "1000px", margin: "0 auto" }}>
      
      {/* Welcome & Informative Banner */}
      <div className="glass-panel" style={{ padding: "1.75rem 2rem", background: "linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(16,185,129,0.06) 100%)", borderColor: "rgba(59,130,246,0.25)" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.25rem", color: "#60a5fa" }}>
          💻 Portal Ujian Online Siswa (CBT)
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
          Selamat datang di sistem Ujian Berbasis Komputer. Silakan pilih ujian aktif kelas <strong style={{ color: "var(--warning)" }}>{student?.kelas || "-"}</strong> di bawah ini.
        </p>
      </div>

      {/* Exam Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>📖 Ujian Tersedia ({exams.length})</h3>

        {exams.length === 0 ? (
          <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
            Saat ini tidak ada jadwal ujian aktif untuk kelas Anda.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
            {exams.map(exam => {
              const myResult = myResults[exam.id];
              const isCompleted = !!myResult;
              const numPg = exam.soal ? exam.soal.filter(q => q.tipe === "pg").length : 0;
              const numIsian = exam.soal ? exam.soal.filter(q => q.tipe === "isian").length : 0;
              const isPass = myResult && myResult.nilai_akhir >= (exam.kkm || 70);

              return (
                <div key={exam.id} className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <span className={`badge ${isCompleted ? (isPass ? "badge-success" : "badge-danger") : "badge-warning"}`} style={{ fontSize: "0.75rem" }}>
                        {isCompleted ? (isPass ? "SELESAI (LULUS)" : "SELESAI (TIDAK LULUS)") : "BELUM DIKERJAKAN"}
                      </span>
                      <span className="badge badge-secondary" style={{ fontSize: "0.75rem" }}>
                        {exam.durasi_menit} Menit
                      </span>
                    </div>

                    <h4 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>
                      {exam.judul}
                    </h4>

                    <div style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 600, marginBottom: "0.75rem" }}>
                      📚 {exam.mk_nama}
                    </div>

                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", background: "rgba(0,0,0,0.25)", padding: "0.75rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <div>👨‍🏫 Dosen: <strong style={{ color: "#fff" }}>{exam.dosen_nama || "Dosen Pengampu"}</strong></div>
                      <div>🧩 Komposisi Soal: <strong style={{ color: "#60a5fa" }}>{exam.total_soal || (numPg + numIsian)} Soal</strong> ({numPg} PG / {numIsian} Isian)</div>
                      <div>🎯 KKM: <strong style={{ color: "#10b981" }}>{exam.kkm || 70}</strong></div>
                    </div>
                  </div>

                  {/* Actions & Result Display */}
                  <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                    {isCompleted ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(16,185,129,0.08)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)" }}>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>NILAI AKHIR ANDA</div>
                          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: isPass ? "#10b981" : "#ef4444" }}>
                            {myResult.nilai_akhir} / 100
                          </div>
                        </div>
                        <span className="badge badge-secondary" style={{ fontSize: "0.75rem" }}>
                          PG: {myResult.nilai_pg}% | Isian: {myResult.nilai_isian}%
                        </span>
                      </div>
                    ) : (
                      <Link href={`/siswa/ujian/${exam.id}`} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", display: "flex", gap: "0.5rem", padding: "0.6rem 1rem" }}>
                        🚀 Mulai Kerjakan Ujian
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
