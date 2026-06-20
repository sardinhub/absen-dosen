"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getSchedules,
  getCourses,
  getStudentsByKelas,
  getStudentAttendanceByJadwal,
  saveStudentAttendance,
} from "../../../../lib/db";
import { translations } from "../../../../lib/translations";

const STATUS_OPTIONS = [
  { value: "hadir", labelId: "Hadir", labelEn: "Present", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)" },
  { value: "izin", labelId: "Izin", labelEn: "Permitted", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)" },
  { value: "sakit", labelId: "Sakit", labelEn: "Sick", color: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)", border: "rgba(96, 165, 250, 0.3)" },
  { value: "alpha", labelId: "Alpha", labelEn: "Absent", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.3)" },
];

function getStatusStyle(value) {
  return STATUS_OPTIONS.find((s) => s.value === value) || STATUS_OPTIONS[0];
}

export default function AbsenSiswaPage() {
  const { jadwalId } = useParams();
  const router = useRouter();

  const [lang, setLang] = useState("id");
  const [schedule, setSchedule] = useState(null);
  const [students, setStudents] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [existingRecord, setExistingRecord] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const todayString = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const syncData = useCallback(async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
    setLoading(true);
    try {
      const [rawSchedules, rawCourses] = await Promise.all([
        getSchedules(),
        getCourses(),
      ]);

      const foundSchedule = rawSchedules.find((j) => j.id === jadwalId);
      if (!foundSchedule) {
        setLoading(false);
        return;
      }
      const mk = rawCourses.find((m) => m.id === foundSchedule.mk_id);
      const enrichedSchedule = {
        ...foundSchedule,
        mk_kode: mk?.kode_mk,
        mk_nama: mk?.nama_mk,
      };
      setSchedule(enrichedSchedule);

      // Load students in this class
      const rawStudents = await getStudentsByKelas(foundSchedule.kelas);
      setStudents(rawStudents);

      // Check if attendance already submitted for today
      const existing = await getStudentAttendanceByJadwal(jadwalId, todayString);
      if (existing.length > 0) {
        const rec = existing[0];
        setExistingRecord(rec);
        // Build statusMap from stored data
        const map = {};
        (rec.siswa || []).forEach((s) => {
          map[s.siswa_id] = s.status;
        });
        // For any student not in the record, default to hadir
        rawStudents.forEach((s) => {
          if (!map[s.id]) map[s.id] = "hadir";
        });
        setStatusMap(map);
        setIsViewMode(true);
      } else {
        // Default: all students hadir
        const map = {};
        rawStudents.forEach((s) => {
          map[s.id] = "hadir";
        });
        setStatusMap(map);
        setIsViewMode(false);
      }
    } catch (err) {
      console.error("Error loading student attendance data:", err);
    } finally {
      setLoading(false);
    }
  }, [jadwalId]);

  useEffect(() => {
    syncData();
  }, [syncData]);

  const handleStatusChange = (studentId, newStatus) => {
    if (isViewMode) return;
    setStatusMap((prev) => ({ ...prev, [studentId]: newStatus }));
  };

  const handleSetAll = (status) => {
    if (isViewMode) return;
    const map = {};
    students.forEach((s) => {
      map[s.id] = status;
    });
    setStatusMap(map);
  };

  const handleSubmit = async () => {
    if (students.length === 0) {
      alert(
        lang === "id"
          ? "Tidak ada siswa di kelas ini!"
          : "No students in this class!"
      );
      return;
    }

    const confirmMsg =
      lang === "id"
        ? "Simpan data absensi siswa untuk hari ini?"
        : "Save student attendance for today?";
    if (!confirm(confirmMsg)) return;

    setSubmitting(true);
    try {
      const loggedInUser = JSON.parse(
        localStorage.getItem("sikad_logged_in_user")
      );

      const siswaList = students.map((s) => ({
        siswa_id: s.id,
        nim: s.nim,
        nama: s.nama_lengkap,
        status: statusMap[s.id] || "hadir",
      }));

      const recordId = existingRecord
        ? existingRecord.id
        : "absen_siswa_" + Math.random().toString(36).substr(2, 9);

      const record = {
        id: recordId,
        jadwal_id: jadwalId,
        dosen_id: loggedInUser.id,
        kelas: schedule.kelas,
        tanggal: todayString,
        mk_id: schedule.mk_id,
        mk_nama: schedule.mk_nama,
        pertemuan_ke: schedule.pertemuan_ke || null,
        siswa: siswaList,
        updated_at: new Date().toISOString(),
      };

      await saveStudentAttendance(record);
      setExistingRecord(record);
      setIsViewMode(true);
      alert(
        lang === "id"
          ? "Absensi siswa berhasil disimpan!"
          : "Student attendance saved successfully!"
      );
    } catch (err) {
      console.error("Error saving student attendance:", err);
      alert(
        lang === "id"
          ? "Gagal menyimpan absensi siswa!"
          : "Failed to save student attendance!"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "var(--text-secondary)" }}>
          {lang === "id" ? "Memuat data siswa..." : "Loading student data..."}
        </p>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "var(--danger)" }}>
          {lang === "id" ? "Jadwal tidak ditemukan." : "Schedule not found."}
        </p>
        <Link href="/dosen/dashboard" className="btn btn-secondary" style={{ marginTop: "1rem" }}>
          ← {lang === "id" ? "Kembali" : "Back"}
        </Link>
      </div>
    );
  }

  const t = translations[lang];

  // Summary counts
  const summary = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = Object.values(statusMap).filter((v) => v === s.value).length;
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Back button */}
      <div>
        <Link href="/dosen/dashboard" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
          ← {t.backToDashboard}
        </Link>
      </div>

      {/* Header Card */}
      <div
        className="glass-panel"
        style={{
          padding: "1.5rem 2rem",
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)",
          borderColor: "rgba(139, 92, 246, 0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span className="badge badge-warning" style={{ marginBottom: "0.5rem" }}>{schedule.mk_kode}</span>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.4rem" }}>
              {t.studentAttendance}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              {schedule.mk_nama} — {t.class}: <strong style={{ color: "var(--text-primary)" }}>{schedule.kelas}</strong>
              {" · "}{t.room}: <strong style={{ color: "var(--text-primary)" }}>{schedule.ruangan}</strong>
              {schedule.pertemuan_ke && (
                <span className="badge badge-warning" style={{ marginLeft: "0.5rem", color: "#000", fontWeight: "bold", fontSize: "0.7rem" }}>
                  {lang === "id" ? "Pertemuan Ke-" : "Meeting "}{schedule.pertemuan_ke}
                </span>
              )}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
              📅 {new Date(todayString).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {isViewMode && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
              <span style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "0.3rem 0.9rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700 }}>
                ✓ {lang === "id" ? "Sudah Diisi" : "Submitted"}
              </span>
              <button
                className="btn btn-secondary"
                style={{ padding: "0.4rem 0.9rem", fontSize: "0.75rem" }}
                onClick={() => setIsViewMode(false)}
              >
                ✎ {lang === "id" ? "Edit Absensi" : "Edit Attendance"}
              </button>
            </div>
          )}
        </div>

        {/* Summary badges */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1.2rem" }}>
          {STATUS_OPTIONS.map((s) => (
            <div
              key={s.value}
              style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                background: s.bg, border: `1px solid ${s.border}`,
                padding: "0.3rem 0.85rem", borderRadius: "20px",
              }}
            >
              <span style={{ color: s.color, fontWeight: 800, fontSize: "0.95rem" }}>
                {summary[s.value] || 0}
              </span>
              <span style={{ color: s.color, fontSize: "0.75rem", fontWeight: 600 }}>
                {lang === "id" ? s.labelId : s.labelEn}
              </span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", padding: "0.3rem 0.85rem", borderRadius: "20px" }}>
            <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>{students.length}</span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
              {lang === "id" ? "Total Siswa" : "Total Students"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Set All (only in edit mode) */}
      {!isViewMode && students.length > 0 && (
        <div className="glass-panel" style={{ padding: "1rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              {lang === "id" ? "Set semua ke:" : "Set all to:"}
            </span>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => handleSetAll(s.value)}
                style={{
                  padding: "0.35rem 0.9rem", fontSize: "0.75rem", borderRadius: "8px",
                  border: `1px solid ${s.border}`, background: s.bg, color: s.color,
                  cursor: "pointer", fontWeight: 600, transition: "all 0.15s",
                }}
              >
                {lang === "id" ? s.labelId : s.labelEn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Student List */}
      <div className="glass-panel dashboard-panel">
        {students.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
            <p style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
              {lang === "id"
                ? `Belum ada siswa terdaftar di kelas ${schedule.kelas}.`
                : `No students registered in class ${schedule.kelas}.`}
            </p>
            <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>
              {lang === "id"
                ? "Minta Admin untuk menambahkan data siswa terlebih dahulu."
                : "Ask Admin to add student data first."}
            </p>
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
                {students.map((student, idx) => {
                  const currentStatus = statusMap[student.id] || "hadir";
                  const style = getStatusStyle(currentStatus);
                  return (
                    <tr key={student.id}>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {idx + 1}
                      </td>
                      <td>
                        <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>
                          {student.nim}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{student.nama_lengkap}</td>
                      <td style={{ textAlign: "center" }}>
                        {isViewMode ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.3rem 0.9rem",
                              borderRadius: "20px",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              background: style.bg,
                              color: style.color,
                              border: `1px solid ${style.border}`,
                            }}
                          >
                            {lang === "id" ? style.labelId : style.labelEn}
                          </span>
                        ) : (
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap" }}>
                            {STATUS_OPTIONS.map((s) => {
                              const isSelected = currentStatus === s.value;
                              return (
                                <button
                                  key={s.value}
                                  onClick={() => handleStatusChange(student.id, s.value)}
                                  style={{
                                    padding: "0.3rem 0.7rem",
                                    fontSize: "0.72rem",
                                    borderRadius: "8px",
                                    border: `1.5px solid ${isSelected ? s.color : "transparent"}`,
                                    background: isSelected ? s.bg : "rgba(255,255,255,0.03)",
                                    color: isSelected ? s.color : "var(--text-muted)",
                                    cursor: "pointer",
                                    fontWeight: isSelected ? 700 : 400,
                                    transition: "all 0.15s",
                                    transform: isSelected ? "scale(1.05)" : "scale(1)",
                                    boxShadow: isSelected ? `0 0 8px ${s.border}` : "none",
                                  }}
                                >
                                  {lang === "id" ? s.labelId : s.labelEn}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Button */}
      {!isViewMode && students.length > 0 && (
        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
          <Link href="/dosen/dashboard" className="btn btn-secondary">
            {t.cancel}
          </Link>
          <button
            className="btn btn-primary"
            style={{ padding: "0.75rem 2rem", fontWeight: 700, minWidth: "180px" }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <span>{lang === "id" ? "Menyimpan..." : "Saving..."}</span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, marginRight: "0.5rem" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {lang === "id" ? "Simpan Absensi Siswa" : "Save Student Attendance"}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
