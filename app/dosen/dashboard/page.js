"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSchedules, getCourses, getAttendance } from "../../../lib/db";
import { translations } from "../../../lib/translations";
import Modal from "../../../components/Modal";

export default function DosenDashboard() {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState("id");
  const [schedules, setSchedules] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [showAllSchedules, setShowAllSchedules] = useState(false);
  const [isTugasModalOpen, setIsTugasModalOpen] = useState(false);

  // Sync language and database records
  const syncData = async () => {
    const savedLang = localStorage.getItem("sikad_lang") || "id";
    setLang(savedLang);

    const loggedInUser = localStorage.getItem("sikad_logged_in_user");
    if (loggedInUser) {
      const parsedUser = JSON.parse(loggedInUser);
      setUser(parsedUser);

      try {
        const rawSchedules = await getSchedules();
        const rawCourses = await getCourses();
        const rawAttendance = await getAttendance();

        // Filter schedules for this lecturer
        const lecturerSchedules = rawSchedules.filter(
          (j) => j.dosen_id === parsedUser.id
        ).map((j) => {
          const mk = rawCourses.find((m) => m.id === j.mk_id);
          return {
            ...j,
            mk_kode: mk?.kode_mk,
            mk_nama: mk?.nama_mk,
            sks: mk?.sks
          };
        }).sort((a, b) => {
          const dateA = a.tanggal ? new Date(a.tanggal).getTime() : Infinity;
          const dateB = b.tanggal ? new Date(b.tanggal).getTime() : Infinity;
          return dateA - dateB;
        });
        setSchedules(lecturerSchedules);

        // Store all user attendance history
        const userAttendance = rawAttendance.filter((k) => k.dosen_id === parsedUser.id);
        setAttendanceHistory(userAttendance);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      }
    }
  };

  useEffect(() => {
    syncData();
    window.addEventListener("storage", syncData);
    return () => window.removeEventListener("storage", syncData);
  }, []);

  if (!user) return null;

  const t = translations[lang];
  const todayIndex = new Date().getDay(); // 0 is Sunday, 4 is Thursday
  const dayNamesId = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const dayNamesEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayId = dayNamesId[todayIndex];
  const currentDayEn = dayNamesEn[todayIndex];

  // Filter schedules matching today (by date if specified, otherwise by day of week)
  const todaySchedules = schedules.filter((j) => {
    const localDate = new Date();
    const todayString = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
    if (j.tanggal) {
      return j.tanggal.startsWith(todayString);
    }
    return j.hari.toLowerCase() === currentDayId.toLowerCase();
  });

  const formatTime = (timeStr) => {
    return timeStr;
  };

  const getAttendanceStatus = (schedule) => {
    if (schedule.tanggal) {
      return attendanceHistory.find(
        (k) => k.jadwal_id === schedule.id && k.tanggal.startsWith(schedule.tanggal)
      );
    } else {
      const localDate = new Date();
      const todayString = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
      return attendanceHistory.find(
        (k) => k.jadwal_id === schedule.id && k.tanggal.startsWith(todayString)
      );
    }
  };

  const renderScheduleCard = (schedule) => {
    const attRecord = getAttendanceStatus(schedule);
    const isCheckedIn = !!attRecord;

    const localDate = new Date();
    const todayString = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
    const isToday = schedule.tanggal
      ? schedule.tanggal.startsWith(todayString)
      : schedule.hari.toLowerCase() === currentDayId.toLowerCase();

    return (
      <div key={schedule.id} className="glass-panel schedule-card">
        <div className="schedule-details">
          <div className="schedule-time-badge">
            <div>{schedule.hari}</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>{schedule.jam_mulai}</div>
          </div>
          <div className="schedule-info">
            <h4>{schedule.mk_nama}</h4>
            <div className="schedule-meta">
              <span>
                <strong>{t.class}:</strong> {schedule.kelas}
              </span>
              <span>
                <strong>{t.room}:</strong> {schedule.ruangan}
              </span>
              <span>
                <strong>Code:</strong> {schedule.mk_kode}
              </span>
              {schedule.tanggal && (
                <span>
                  <strong>{lang === "id" ? "Tanggal:" : "Date:"}</strong> {new Date(schedule.tanggal).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
              {schedule.pertemuan_ke && (
                <span className="badge badge-warning" style={{ color: "#000", fontWeight: "bold", marginLeft: "0.25rem" }}>
                  {lang === "id" ? "Pertemuan Ke-" : "Meeting "}{schedule.pertemuan_ke}
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          {isCheckedIn ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
              <span className="badge badge-success">{t.checkedIn}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {new Date(attRecord.waktu_absen).toLocaleTimeString()}
              </span>
            </div>
          ) : isToday ? (
            <Link href={`/dosen/absen/${schedule.id}`} className="btn btn-primary btn-sm" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
              {t.checkIn}
            </Link>
          ) : (
            <button disabled className="btn btn-primary btn-sm" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", opacity: 0.5, cursor: "not-allowed" }} title={lang === "id" ? "Bukan jadwal hari ini" : "Not scheduled for today"}>
              {t.checkIn}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div className="glass-panel" style={{ padding: "1.5rem 2rem", background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
            {t.welcome}, <span className="gradient-text">{user.nama_lengkap}</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            {lang === "id" ? "Hari ini:" : "Today is:"} {lang === "id" ? currentDayId : currentDayEn}, {new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsTugasModalOpen(true)}>
          {lang === "id" ? "Tugas & Tanggung Jawab" : "Tasks & Responsibilities"}
        </button>
      </div>

      <Modal isOpen={isTugasModalOpen} onClose={() => setIsTugasModalOpen(false)} title={lang === "id" ? "Tugas & Tanggung Jawab Dosen" : "Lecturer Tasks & Responsibilities"}>
        <div style={{ padding: "1rem 0" }}>
          <ul style={{ listStyleType: "disc", paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem", color: "var(--text-secondary)" }}>
            <li>{lang === "id" ? "Hadir tepat waktu dan mengisi presensi melalui sistem." : "Be present on time and fill out the attendance via the system."}</li>
            <li>{lang === "id" ? "Menyampaikan materi perkuliahan sesuai dengan silabus." : "Deliver course materials according to the syllabus."}</li>
            <li>{lang === "id" ? "Mengunggah bukti foto mengajar pada setiap sesi kehadiran." : "Upload teaching proof photos in every attendance session."}</li>
            <li>{lang === "id" ? "Memastikan kelengkapan administrasi akademik kelas yang diampu." : "Ensure completeness of academic administration for the classes taught."}</li>
            <li>{lang === "id" ? "Melakukan evaluasi dan penilaian mahasiswa secara objektif." : "Conduct objective student evaluations and grading."}</li>
          </ul>
        </div>
        <div style={{ marginTop: "1.5rem", textAlign: "right" }}>
          <button className="btn btn-secondary" onClick={() => setIsTugasModalOpen(false)}>
            {lang === "id" ? "Tutup" : "Close"}
          </button>
        </div>
      </Modal>

      <div className="glass-panel dashboard-panel">
        <div className="panel-header">
          <h3 className="panel-title">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20, color: "var(--primary)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span>{lang === "id" ? "Jadwal Mengajar Anda" : "Your Teaching Schedule"}</span>
          </h3>
          <button 
            className="btn btn-secondary" 
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
            onClick={() => setShowAllSchedules(!showAllSchedules)}
          >
            {showAllSchedules 
              ? (lang === "id" ? "Tampilkan Hari Ini" : "Show Today Only")
              : (lang === "id" ? "Tampilkan Semua Jadwal" : "Show All Schedules")
            }
          </button>
        </div>

        <div className="schedule-list">
          {showAllSchedules ? (
            schedules.filter(s => !getAttendanceStatus(s)).length > 0 ? (
              schedules.filter(s => !getAttendanceStatus(s)).map((schedule) => renderScheduleCard(schedule))
            ) : (
              <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-secondary)" }}>
                <p>{lang === "id" ? "Semua jadwal telah diselesaikan." : "All schedules completed."}</p>
              </div>
            )
          ) : todaySchedules.filter(s => !getAttendanceStatus(s)).length > 0 ? (
            todaySchedules.filter(s => !getAttendanceStatus(s)).map((schedule) => renderScheduleCard(schedule))
          ) : (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <p>{lang === "id" ? "Tidak ada jadwal tersisa hari ini." : "No remaining schedules today."}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
