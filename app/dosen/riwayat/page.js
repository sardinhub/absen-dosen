"use client";

import { useState, useEffect } from "react";
import { getAttendance, getSchedules, getCourses } from "../../../lib/db";
import { translations } from "../../../lib/translations";
import { formatTanggalStr } from "../../../lib/dateUtils";
import Modal from "../../../components/Modal";

export default function DosenRiwayat() {
  const [lang, setLang] = useState("id");
  const [history, setHistory] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Detail Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  const syncData = async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");

    const loggedInUser = JSON.parse(localStorage.getItem("sikad_logged_in_user"));
    if (loggedInUser) {
      try {
        const rawAttendance = await getAttendance();
        const rawSchedules = await getSchedules();
        const rawCourses = await getCourses();

        // Map attendance with course information
        const mappedHistory = rawAttendance
          .filter((k) => k.dosen_id === loggedInUser.id)
          .map((k) => {
            const schedule = rawSchedules.find((j) => j.id === k.jadwal_id);
            const course = rawCourses.find((m) => m.id === schedule?.mk_id);
            return {
              ...k,
              mk_nama: course?.nama_mk,
              mk_kode: course?.kode_mk,
              kelas: schedule?.kelas,
              ruangan: schedule?.ruangan,
              pertemuan_ke: schedule?.pertemuan_ke || k.pertemuan_ke,
              jumlah_pertemuan: course?.jumlah_pertemuan || 14,
              jam: schedule ? `${schedule.jam_mulai} - ${schedule.jam_selesai}` : ""
            };
          })
          .sort((a, b) => new Date(b.waktu_absen) - new Date(a.waktu_absen));
        
        setHistory(mappedHistory);

        // Collect unique courses for filter dropdown
        const uniqueCourses = Array.from(
          new Set(mappedHistory.map((h) => h.mk_nama))
        ).filter(Boolean);
        setCourses(uniqueCourses);
      } catch (err) {
        console.error("Error loading history data:", err);
      }
    }
  };

  useEffect(() => {
    syncData();
    window.addEventListener("storage", syncData);
    return () => window.removeEventListener("storage", syncData);
  }, []);

  const t = translations[lang];

  // Filtering logs
  const filteredHistory = history.filter((item) => {
    const matchesCourse = selectedCourse ? item.mk_nama === selectedCourse : true;
    const matchesSearch = searchQuery
      ? (item.materi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.mk_kode || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCourse && matchesSearch;
  });

  const openDetails = (item) => {
    setActiveItem(item);
    setIsModalOpen(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>{t.filter}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          {/* Course Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t.course}</label>
            <select
              className="form-control"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              style={{ background: "#0b0f19" }}
            >
              <option value="">{lang === "id" ? "Semua Mata Kuliah" : "All Courses"}</option>
              {courses.map((c, idx) => (
                <option key={idx} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Search Topic */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t.search}</label>
            <input
              type="text"
              className="form-control"
              placeholder={lang === "id" ? "Cari materi atau kode..." : "Search topic or code..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* History Table panel */}
      <div className="glass-panel dashboard-panel">
        <h3 className="panel-title" style={{ marginBottom: "1.5rem" }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20, color: "var(--accent)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <span>{t.history}</span>
        </h3>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{t.date}</th>
                <th>{t.course}</th>
                <th>{t.class}</th>
                <th>{t.meetingNo}</th>
                <th>{t.subject}</th>
                <th>{lang === "id" ? "Selfie Kehadiran" : "Attendance Selfie"}</th>
                <th style={{ textAlign: "right" }}>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <div>{formatTanggalStr(item.tanggal, lang)}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {item.waktu_absen ? new Date(item.waktu_absen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-warning" style={{ marginRight: "0.5rem", fontSize: "0.7rem" }}>{item.mk_kode}</span>
                      <strong>{item.mk_nama}</strong>
                    </td>
                    <td>{item.kelas}</td>
                    <td style={{ fontWeight: "bold", color: "var(--primary)" }}>
                      #{item.pertemuan_ke}
                      {item.jumlah_pertemuan && (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "6px", fontWeight: "normal" }}>
                          {lang === "id" ? "dari" : "of"} {item.jumlah_pertemuan} ({Math.round((item.pertemuan_ke / item.jumlah_pertemuan) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.materi}
                    </td>
                    <td>
                      {item.tanda_tangan ? (
                        <img src={item.tanda_tangan} alt="Selfie thumbnail" style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "50%", border: "2px solid var(--border-color)" }} />
                      ) : "-"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-secondary btn-sm" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }} onClick={() => openDetails(item)}>
                        {lang === "id" ? "Detail" : "View"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                    {lang === "id" ? "Belum ada riwayat mengajar." : "No attendance logs found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Dialog modal */}
      {activeItem && (
        <Modal
          isOpen={isModalOpen}
          title={`${t.history} - Meeting #${activeItem.pertemuan_ke}`}
          onClose={() => setIsModalOpen(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
              <div>
                <label className="form-label">{t.course}</label>
                <p style={{ fontWeight: "bold" }}>{activeItem.mk_nama} ({activeItem.mk_kode})</p>
              </div>
              <div>
                <label className="form-label">{t.class} / {t.room}</label>
                <p>{activeItem.kelas} / {activeItem.ruangan}</p>
              </div>
              <div>
                <label className="form-label">{t.date} / {t.time}</label>
                <p>{formatTanggalStr(activeItem.tanggal, lang)} ({activeItem.jam})</p>
              </div>
              <div>
                <label className="form-label">{t.status}</label>
                <span className="badge badge-success">{(activeItem.status || '').toUpperCase()}</span>
              </div>
            </div>

            <div>
              <label className="form-label">{t.subject}</label>
              <p style={{ background: "rgba(255,255,255,0.02)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                {activeItem.materi}
              </p>
            </div>

            {activeItem.catatan && (
              <div>
                <label className="form-label">{t.notes}</label>
                <p style={{ background: "rgba(255,255,255,0.02)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {activeItem.catatan}
                </p>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.5rem" }}>
              <div>
                <label className="form-label" style={{ textAlign: "center" }}>{lang === "id" ? "Foto Selfie Kehadiran" : "Attendance Selfie"}</label>
                <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden", height: "150px" }}>
                  <img src={activeItem.tanda_tangan} alt="Selfie Kehadiran" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
                </div>
              </div>
              <div>
                <label className="form-label" style={{ textAlign: "center" }}>{t.proofPhoto}</label>
                <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden", height: "150px" }}>
                  <img src={activeItem.foto_bukti} alt="Bukti Mengajar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
