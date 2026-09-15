"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getExamById, getExamResults, saveExamResult, autoGradeExam } from "../../../../lib/db";

export default function SiswaExamPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id;

  const [student, setStudent] = useState(null);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  // Exam Player state
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [resultSummary, setResultSummary] = useState(null);

  const timerRef = useRef(null);

  // Key names for localstorage persistence
  const storageAnsKey = `sikad_ans_${examId}`;
  const storageTimerKey = `sikad_timer_${examId}`;

  // Initial setup
  const loadExamData = useCallback(async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem("sikad_logged_in_user");
      if (!userStr) {
        router.replace("/login");
        return;
      }
      const user = JSON.parse(userStr);
      if (user.role !== "siswa") {
        router.replace("/");
        return;
      }
      setStudent(user);

      // Fetch exam
      const examData = await getExamById(examId);
      if (!examData) {
        alert("Ujian tidak ditemukan.");
        router.replace("/siswa/ujian");
        return;
      }
      setExam(examData);

      // Check if student already submitted this exam
      const existingResults = await getExamResults(examId, user.id);
      if (existingResults.length > 0) {
        setResultSummary(existingResults[0]);
        setLoading(false);
        return;
      }

      // Restore saved answers from localStorage if available
      const savedAns = localStorage.getItem(`${storageAnsKey}_${user.id}`);
      if (savedAns) {
        try {
          const parsed = JSON.parse(savedAns);
          setAnswers(parsed.answers || {});
          setFlagged(parsed.flagged || {});
        } catch (e) {}
      }

      // Restore timer from localStorage or initialize
      const defaultDurationSec = (examData.durasi_menit || 60) * 60;
      const savedTimer = localStorage.getItem(`${storageTimerKey}_${user.id}`);
      if (savedTimer) {
        const remaining = parseInt(savedTimer, 10);
        setTimeLeft(isNaN(remaining) || remaining <= 0 ? defaultDurationSec : remaining);
      } else {
        setTimeLeft(defaultDurationSec);
      }
    } catch (err) {
      console.error("Gagal memuat ujian:", err);
    } finally {
      setLoading(false);
    }
  }, [examId, router, storageAnsKey, storageTimerKey]);

  useEffect(() => {
    loadExamData();
  }, [loadExamData]);

  // Handle countdown timer interval
  useEffect(() => {
    if (!exam || resultSummary || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmitTimeUp();
          return 0;
        }
        const updated = prev - 1;
        if (student) {
          localStorage.setItem(`${storageTimerKey}_${student.id}`, String(updated));
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [exam, resultSummary, student, storageTimerKey]);

  // Auto save answers to localStorage whenever answers/flagged change
  useEffect(() => {
    if (student && examId && !resultSummary) {
      localStorage.setItem(`${storageAnsKey}_${student.id}`, JSON.stringify({ answers, flagged }));
    }
  }, [answers, flagged, student, examId, storageAnsKey, resultSummary]);

  // Format timer HH:MM:SS
  const formatTimer = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Answer handler
  const handleSelectAnswer = (qId, val) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  // Flag toggle handler
  const handleToggleFlag = (qId) => {
    setFlagged(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Submit Exam handler
  const executeSubmitExam = async (isTimeout = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowSubmitModal(false);

    try {
      const questions = exam.soal || [];
      const gradeReport = autoGradeExam(questions, answers);

      const payload = {
        ujian_id: exam.id,
        ujian_judul: exam.judul,
        siswa_id: student.id,
        siswa_nim: student.nim,
        siswa_nama: student.nama_lengkap,
        kelas: student.kelas,
        nilai_pg: gradeReport.pgGrade,
        nilai_isian: gradeReport.isianGrade,
        nilai_akhir: gradeReport.finalGrade,
        total_skor: gradeReport.totalScore,
        skor_maksimal: gradeReport.maxTotalScore,
        detail_scoring: gradeReport.itemDetails,
        jawaban_raw: answers,
        status: isTimeout ? "terlambat" : "selesai"
      };

      const savedRecord = await saveExamResult(payload);
      setResultSummary(savedRecord);

      // Cleanup localstorage
      if (student) {
        localStorage.removeItem(`${storageAnsKey}_${student.id}`);
        localStorage.removeItem(`${storageTimerKey}_${student.id}`);
      }
    } catch (err) {
      console.error("Gagal mengirim jawaban ujian:", err);
      alert("Terjadi kesalahan saat menyimpan hasil ujian. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmitTimeUp = () => {
    alert("⏰ Waktu ujian telah habis! Jawaban Anda otomatis dikirim.");
    executeSubmitExam(true);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "var(--text-secondary)" }}>Menyiapkan Lembar Ujian CBT...</p>
      </div>
    );
  }

  // If already submitted, display Result Summary Screen
  if (resultSummary) {
    const isPass = resultSummary.nilai_akhir >= (exam?.kkm || 70);
    return (
      <div style={{ maxWidth: "800px", margin: "2rem auto" }} className="animate-fade-in">
        <div className="glass-panel" style={{ padding: "2.5rem", textAlign: "center", border: `1px solid ${isPass ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, background: "rgba(10,14,26,0.9)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
            {isPass ? "🎉" : "📄"}
          </div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            {isPass ? "Selamat! Anda Telah Menyelesaikan Ujian" : "Ujian Selesai Dikirim"}
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            {exam?.judul} - Kelas {student?.kelas}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", margin: "2rem 0" }}>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>SKOR PILIHAN GANDA (70%)</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#60a5fa", marginTop: "0.25rem" }}>
                {resultSummary.nilai_pg || 0}%
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>SKOR ISIAN SINGKAT (30%)</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fbbf24", marginTop: "0.25rem" }}>
                {resultSummary.nilai_isian || 0}%
              </div>
            </div>

            <div style={{ background: isPass ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", padding: "1.25rem", borderRadius: "10px", border: `1px solid ${isPass ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}` }}>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>NILAI AKHIR KUMULATIF</div>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: isPass ? "#10b981" : "#ef4444", marginTop: "0.25rem" }}>
                {resultSummary.nilai_akhir} / 100
              </div>
            </div>
          </div>

          <div style={{ display: "inline-block", margin: "1rem 0 2rem 0" }}>
            <span className={`badge ${isPass ? "badge-success" : "badge-danger"}`} style={{ fontSize: "1rem", padding: "0.5rem 1.25rem" }}>
              STATUS KKM ({exam?.kkm || 70}): {isPass ? "LULUS EVALUASI" : "TIDAK LULUS"}
            </span>
          </div>

          <div>
            <button className="btn btn-primary" onClick={() => router.push("/siswa/ujian")} style={{ padding: "0.65rem 2rem" }}>
              Kembali ke Daftar Ujian Online
            </button>
          </div>
        </div>
      </div>
    );
  }

  const questions = exam.soal || [];
  const currentQ = questions[currentIdx] || {};
  const currentQId = currentQ.id || currentIdx + 1;
  const answeredCount = Object.keys(answers).filter(k => String(answers[k]).trim() !== "").length;
  const flaggedCount = Object.keys(flagged).filter(k => flagged[k]).length;
  const isTimeLow = timeLeft < 300; // less than 5 minutes

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "1100px", margin: "0 auto" }}>
      
      {/* ── LIVE HEADER & TIMER BAR ── */}
      <div className="glass-panel" style={{ padding: "1rem 1.5rem", position: "sticky", top: "10px", zIndex: 100, background: "#0a0e1a", borderColor: isTimeLow ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>
            {exam.judul}
          </h3>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
            Siswa: <strong>{student.nama_lengkap} ({student.nim})</strong> | Kelas: {student.kelas}
          </div>
        </div>

        {/* Timer Box */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div style={{ textAlign: "center", background: isTimeLow ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.15)", padding: "0.4rem 1rem", borderRadius: "8px", border: isTimeLow ? "1px solid #ef4444" : "1px solid rgba(59,130,246,0.3)" }}>
            <div style={{ fontSize: "0.7rem", color: isTimeLow ? "#f87171" : "#9ca3af", fontWeight: 700 }}>SISA WAKTU</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: isTimeLow ? "#ef4444" : "#60a5fa" }}>
              ⏱️ {formatTimer(timeLeft)}
            </div>
          </div>

          <button 
            className="btn btn-primary"
            onClick={() => setShowSubmitModal(true)}
            style={{ padding: "0.5rem 1.25rem", background: "linear-gradient(135deg, #10b981, #059669)", border: "none", fontWeight: 700 }}
          >
            Selesai & Submit 📤
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT: QUESTION PLAYER + NAVIGATOR SIDEBAR ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.25rem" }}>
        
        {/* Left: Question Card */}
        <div className="glass-panel" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "450px" }}>
          <div>
            {/* Top Indicator */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--primary)" }}>
                  Soal Nomor {currentIdx + 1} <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>/ {questions.length}</span>
                </span>
                <span className={`badge ${currentQ.tipe === "pg" ? "badge-secondary" : "badge-warning"}`} style={{ fontSize: "0.75rem" }}>
                  {currentQ.tipe === "pg" ? "Pilihan Ganda (70%)" : "Isian Singkat (30%)"}
                </span>
              </div>

              {/* Ragu-ragu Checkbox */}
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.85rem", color: "#fbbf24", fontWeight: 600 }}>
                <input 
                  type="checkbox"
                  checked={!!flagged[currentQId]}
                  onChange={() => handleToggleFlag(currentQId)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <span>🚩 Ragu-Ragu</span>
              </label>
            </div>

            {/* Pertanyaan Text */}
            <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff", lineHeight: "1.6", marginBottom: "1.25rem" }}>
              {currentQ.pertanyaan}
            </div>

            {/* Media Rendering (Gambar / Suara / Video) */}
            {currentQ.media_type && currentQ.media_type !== "none" && currentQ.media_url && (
              <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "rgba(0,0,0,0.3)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                {currentQ.media_type === "image" && (
                  <img 
                    src={currentQ.media_url} 
                    alt="Media Soal" 
                    style={{ maxWidth: "100%", maxHeight: "350px", borderRadius: "8px", objectFit: "contain" }}
                    onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/600x300?text=Gambar+Soal+Tidak+Dapat+Dimuat"; }}
                  />
                )}

                {currentQ.media_type === "audio" && (
                  <audio controls src={currentQ.media_url} style={{ width: "100%", maxWidth: "500px" }}>
                    Browser Anda tidak mendukung pemutar audio.
                  </audio>
                )}

                {currentQ.media_type === "video" && (
                  currentQ.media_url.includes("youtube.com") || currentQ.media_url.includes("youtu.be") ? (
                    <iframe 
                      width="100%" 
                      height="300" 
                      src={currentQ.media_url.replace("watch?v=", "embed/")} 
                      title="Video Soal"
                      style={{ borderRadius: "8px", border: "none", maxWidth: "600px" }}
                    />
                  ) : (
                    <video controls src={currentQ.media_url} style={{ maxWidth: "100%", maxHeight: "350px", borderRadius: "8px" }}>
                      Browser Anda tidak mendukung pemutar video.
                    </video>
                  )
                )}

                {currentQ.media_caption && (
                  <div style={{ fontSize: "0.85rem", color: "#10b981", fontStyle: "italic", textAlign: "center" }}>
                    📌 {currentQ.media_caption}
                  </div>
                )}
              </div>
            )}

            {/* Options for PG / Input for Isian */}
            {currentQ.tipe === "pg" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {["A", "B", "C", "D", "E"].map(optKey => {
                  const optionText = (currentQ.opsi && currentQ.opsi[optKey]) || "";
                  if (!optionText) return null;
                  const isSelected = answers[currentQId] === optKey;

                  return (
                    <div 
                      key={optKey}
                      onClick={() => handleSelectAnswer(currentQId, optKey)}
                      style={{
                        padding: "0.85rem 1.25rem",
                        borderRadius: "10px",
                        border: isSelected ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.08)",
                        background: isSelected ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.02)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        border: isSelected ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.2)",
                        background: isSelected ? "#3b82f6" : "transparent",
                        color: isSelected ? "#fff" : "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "0.85rem"
                      }}>
                        {optKey}
                      </div>
                      <div style={{ fontSize: "0.95rem", color: isSelected ? "#fff" : "var(--text-primary)" }}>
                        {optionText}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Input Field for Isian Singkat */
              <div style={{ background: "rgba(245,158,11,0.05)", padding: "1.25rem", borderRadius: "10px", border: "1px solid rgba(245,158,11,0.2)" }}>
                <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fbbf24", marginBottom: "0.5rem", display: "block" }}>
                  Ketik Jawaban Isian Singkat Anda:
                </label>
                <input 
                  type="text"
                  className="form-control"
                  style={{ fontSize: "1rem", padding: "0.75rem 1rem", background: "rgba(0,0,0,0.4)" }}
                  value={answers[currentQId] || ""}
                  onChange={e => handleSelectAnswer(currentQId, e.target.value)}
                  placeholder="Ketik jawaban teks singkat di sini..."
                />
              </div>
            )}
          </div>

          {/* Stepper Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
            <button 
              className="btn btn-secondary"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => prev - 1)}
            >
              ⬅️ Soal Sebelumnya
            </button>

            <button 
              className="btn btn-primary"
              onClick={() => {
                if (currentIdx < questions.length - 1) {
                  setCurrentIdx(prev => prev + 1);
                } else {
                  setShowSubmitModal(true);
                }
              }}
            >
              {currentIdx === questions.length - 1 ? "Selesai & Kirim Ujian 📤" : "Soal Berikutnya ➡️"}
            </button>
          </div>
        </div>

        {/* Right: Question Navigator Grid Sidebar */}
        <div className="glass-panel" style={{ padding: "1.25rem", height: "fit-content" }}>
          <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", fontWeight: 800, color: "var(--primary)" }}>
            🧭 Navigasi Nomor Soal
          </h4>

          {/* Progress summary bar */}
          <div style={{ marginBottom: "1rem", fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <div>Sudah Dijawab: <strong style={{ color: "#10b981" }}>{answeredCount}</strong> / {questions.length}</div>
            <div>Ragu-Ragu: <strong style={{ color: "#fbbf24" }}>{flaggedCount}</strong></div>
          </div>

          {/* Number Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.4rem", maxHeight: "380px", overflowY: "auto", paddingRight: "0.2rem" }}>
            {questions.map((q, idx) => {
              const qId = q.id || idx + 1;
              const isAnswered = answers[qId] !== undefined && String(answers[qId]).trim() !== "";
              const isFlag = !!flagged[qId];
              const isCurrent = idx === currentIdx;

              let bg = "rgba(255,255,255,0.05)";
              let border = "1px solid rgba(255,255,255,0.1)";
              let color = "#9ca3af";

              if (isCurrent) {
                border = "2px solid #3b82f6";
              }

              if (isFlag) {
                bg = "#f59e0b";
                color = "#000";
              } else if (isAnswered) {
                bg = "#10b981";
                color = "#fff";
              }

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  style={{
                    height: "38px",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    background: bg,
                    border: border,
                    color: color,
                    cursor: "pointer"
                  }}
                  title={`Soal #${idx + 1} (${isAnswered ? "Dijawab" : "Belum"})`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-color)", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "0.35rem", color: "var(--text-secondary)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "2px", background: "#10b981", display: "inline-block" }}></span>
              <span>Sudah Dijawab</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "2px", background: "#f59e0b", display: "inline-block" }}></span>
              <span>Ragu-Ragu</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "2px", background: "rgba(255,255,255,0.1)", display: "inline-block" }}></span>
              <span>Belum Dijawab</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── SUBMIT CONFIRMATION MODAL ── */}
      {showSubmitModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="glass-panel animate-fade-in" style={{ width: "100%", maxWidth: "500px", background: "#0a0e1a", padding: "1.75rem", border: "1px solid rgba(16,185,129,0.3)" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem", fontWeight: 800, color: "#10b981" }}>
              📤 Konfirmasi Pengiriman Ujian
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Apakah Anda yakin ingin menyelesaikan dan mengirimkan lembar jawaban ujian ini?
            </p>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "8px", margin: "1rem 0", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div>• Total Soal: <strong>{questions.length}</strong></div>
              <div>• Sudah Dijawab: <strong style={{ color: "#10b981" }}>{answeredCount}</strong></div>
              <div>• Belum Dijawab: <strong style={{ color: "#ef4444" }}>{questions.length - answeredCount}</strong></div>
              {flaggedCount > 0 && <div>• Masih Ragu-Ragu: <strong style={{ color: "#fbbf24" }}>{flaggedCount}</strong></div>}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button className="btn btn-secondary" onClick={() => setShowSubmitModal(false)}>Batal</button>
              <button 
                className="btn btn-primary" 
                onClick={() => executeSubmitExam(false)}
                disabled={isSubmitting}
                style={{ background: "linear-gradient(135deg, #10b981, #059669)", border: "none" }}
              >
                {isSubmitting ? "Mengirimkan..." : "Ya, Submit Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
