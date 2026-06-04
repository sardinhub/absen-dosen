"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSchedules, getCourses, getAttendance } from "../../../lib/db";
import { translations } from "../../../lib/translations";

export default function DosenDashboard() {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState("id");
  const [schedules, setSchedules] = useState([]);
  const [attendanceToday, setAttendanceToday] = useState([]);
  const [showAllSchedules, setShowAllSchedules] = useState(false);

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
        });
        setSchedules(lecturerSchedules);

        // Filter today's attendance logs
        const todayString = new Date().toISOString().split("T")[0];
        const todayLogs = rawAttendance.filter(
          (k) => k.dosen_id === parsedUser.id && k.tanggal === todayString
        );
        setAttendanceToday(todayLogs);
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

  // Filter schedules matching today's day (e.g., "Kamis" / "Thursday")
  const todaySchedules = schedules.filter(
    (j) => j.hari.toLowerCase() === currentDayId.toLowerCase()
  );

  const formatTime = (timeStr) => {
    return timeStr;
  };

  const getAttendanceStatus = (scheduleId) => {
    const todayString = new Date().toISOString().split("T")[0];
    return attendanceToday.find(
      (k) => k.jadwal_id === scheduleId && k.tanggal === todayString
    );
  };

  const renderScheduleCard = (schedule) => {
    const attRecord = getAttendanceStatus(schedule.id);
    const isCheckedIn = !!attRecord;

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
                <strong>Code:</strong> {schedule.mk_kode} ({schedule.sks} SKS)
              </span>
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
          ) : (
            <Link href={`/dosen/absen/${schedule.id}`} className="btn btn-primary btn-sm" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
              {t.checkIn}
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div className="glass-panel" style={{ padding: "1.5rem 2rem", background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
          {t.welcome}, <span className="gradient-text">{user.nama_lengkap}</span>
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          NIP: {user.nip} | {lang === "id" ? "Hari ini:" : "Today is:"} {lang === "id" ? currentDayId : currentDayEn}, {new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="glass-panel dashboard-panel">
        <div className="panel-header">
          <h3 className="panel-title">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20, color: "var(--primary)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span>{t.todaySchedule} ({lang === "id" ? currentDayId : currentDayEn})</span>
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
            schedules.map((schedule) => renderScheduleCard(schedule))
          ) : todaySchedules.length > 0 ? (
            todaySchedules.map((schedule) => renderScheduleCard(schedule))
          ) : (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <p>{t.noSchedule}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
