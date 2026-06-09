"use client";

import { useState, useEffect } from "react";
import { getUsers, getAttendance, getSchedules, getCourses } from "../../../lib/db";
import { translations } from "../../../lib/translations";
import StatCard from "../../../components/StatCard";

export default function AdminDashboard() {
  const [lang, setLang] = useState("id");
  const [stats, setStats] = useState({
    totalLecturers: 0,
    presentToday: 0,
    permittedToday: 0,
    activeClasses: 0
  });
  const [liveFeed, setLiveFeed] = useState([]);

  const syncData = async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");

    try {
      const rawUsers = await getUsers();
      const rawAttendance = await getAttendance();
      const rawSchedules = await getSchedules();
      const rawCourses = await getCourses();
      
      // Count stats
      const lecturers = rawUsers.filter((u) => u.role === "dosen");
      const todayString = new Date().toISOString().split("T")[0];
      const presentTodayLogs = rawAttendance.filter(
        (k) => k.tanggal === todayString && k.status === "hadir"
      );

      // Determine current day for schedules
      const dayNamesId = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const todayIndex = new Date().getDay();
      const currentDay = dayNamesId[todayIndex];

      const todaysSchedules = rawSchedules.filter((j) => {
        if (j.tanggal) {
          return j.tanggal === todayString;
        }
        return j.hari.toLowerCase() === currentDay.toLowerCase();
      });

      const permittedTodayLogs = rawAttendance.filter(
        (k) => k.tanggal === todayString && k.status === "izin"
      );

      setStats({
        totalLecturers: lecturers.length,
        presentToday: presentTodayLogs.length,
        permittedToday: permittedTodayLogs.length,
        activeClasses: todaysSchedules.length
      });

      // Get latest check-in logs mapping with lecturer name & details
      const recentLogs = [...rawAttendance]
        .map((k) => {
          const lecturer = rawUsers.find((u) => u.id === k.dosen_id);
          const schedule = rawSchedules.find((j) => j.id === k.jadwal_id);
          const course = rawCourses.find((m) => m.id === schedule?.mk_id);
          return {
            ...k,
            dosen_nama: lecturer?.nama_lengkap,
            mk_nama: course?.nama_mk,
            mk_kode: course?.kode_mk,
            kelas: schedule?.kelas
          };
        })
        .sort((a, b) => new Date(b.waktu_absen) - new Date(a.waktu_absen))
        .slice(0, 5);

      setLiveFeed(recentLogs);
    } catch (err) {
      console.error("Error loading admin dashboard stats:", err);
    }
  };

  useEffect(() => {
    syncData();

    // Auto-refresh data every 10 seconds for real-time monitoring
    const interval = setInterval(() => {
      syncData();
    }, 10000);

    window.addEventListener("storage", syncData);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", syncData);
    };
  }, []);

  const t = translations[lang];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Visual Header */}
      <div className="glass-panel" style={{ padding: "1.5rem 2rem", background: "linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
          {lang === "id" ? "Monitoring Kehadiran" : "Attendance Monitoring"} — <span className="gradient-text">{t.admin}</span>
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          {lang === "id" ? "Pemantauan aktivitas mengajar dosen Triesakti secara real-time" : "Real-time surveillance of Triesakti lecturers teaching activities"}
        </p>
      </div>

      {/* Metrics Statistics Grid */}
      <div className="stats-grid">
        <StatCard
          title={t.totalLecturers}
          value={stats.totalLecturers}
          variant="primary"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 24, height: 24 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A2.25 2.25 0 0 1 12.75 21.5h-1.5a2.25 2.25 0 0 1-2.25-2.263V19.13m4.13-3.07c-.6-.414-1.27-.676-1.996-.77A4.125 4.125 0 0 0 3.788 15.67a9.3 9.3 0 0 0 4.121.952 9.38 9.38 0 0 0 2.625-.372M15 13.5A3 3 0 1 0 15 7.5a3 3 0 0 0 0 6ZM8.25 12.5A2.25 2.25 0 1 1 8.25 8a2.25 2.25 0 0 1 0 4.5Z" />
            </svg>
          }
        />
        <StatCard
          title={t.presentToday}
          value={stats.presentToday}
          variant="success"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 24, height: 24 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
          }
        />
        <StatCard
          title={t.permissionToday}
          value={stats.permittedToday}
          variant="warning"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 24, height: 24 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          }
        />
        <StatCard
          title={lang === "id" ? "Kelas Aktif Hari Ini" : "Active Classes Today"}
          value={stats.activeClasses}
          variant="danger"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 24, height: 24 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          }
        />
      </div>

      {/* Live Check-In Activity feed panel */}
      <div className="glass-panel dashboard-panel">
        <h3 className="panel-title" style={{ marginBottom: "1.5rem" }}>
          <span style={{ position: "relative", display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", marginRight: "0.5rem" }}>
            <span style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: "50%", background: "#ef4444", animation: "ping 1.5s infinite" }}></span>
          </span>
          <span>{lang === "id" ? "Aktivitas Kehadiran Terbaru" : "Recent Attendance Activity"}</span>
        </h3>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{t.lecturerName}</th>
                <th>{t.course}</th>
                <th>{t.class}</th>
                <th>{t.meetingNo}</th>
                <th>{t.subject}</th>
                <th>{t.time}</th>
              </tr>
            </thead>
            <tbody>
              {liveFeed.length > 0 ? (
                liveFeed.map((log, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong style={{ color: "var(--primary)" }}>{log.dosen_nama}</strong>
                    </td>
                    <td>
                      <span className="badge badge-warning" style={{ marginRight: "0.5rem", fontSize: "0.7rem" }}>{log.mk_kode}</span>
                      {log.mk_nama}
                    </td>
                    <td>{log.kelas}</td>
                    <td style={{ fontWeight: "bold" }}>#{log.pertemuan_ke}</td>
                    <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.materi}>
                      {log.materi}
                    </td>
                    <td>{new Date(log.waktu_absen).toLocaleTimeString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                    {lang === "id" ? "Belum ada aktivitas kehadiran hari ini." : "No attendance activity recorded today."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* CSS Keyframes for Ping effect */}
      <style jsx global>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
