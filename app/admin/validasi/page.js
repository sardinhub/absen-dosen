"use client";

import { useState, useEffect } from "react";
import { getAttendance, getUsers, getSchedules, getCourses, saveAttendance } from "../../../lib/db";
import { translations } from "../../../lib/translations";
import Modal from "../../../components/Modal";

export default function AdminValidasi() {
  const [lang, setLang] = useState("id");
  const [attendance, setAttendance] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  const syncData = async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
    try {
      const rawAttendance = await getAttendance();
      const rawUsers = await getUsers();
      const rawSchedules = await getSchedules();
      const rawCourses = await getCourses();

      // Map attendance with lecturer and schedule details
      const mapped = rawAttendance.map((k) => {
        const lecturer = rawUsers.find((u) => u.id === k.dosen_id);
        const schedule = rawSchedules.find((j) => j.id === k.jadwal_id);
        const course = rawCourses.find((m) => m.id === schedule?.mk_id);
        return {
          ...k,
          dosen_nama: lecturer?.nama_lengkap,
          dosen_nip: lecturer?.nip,
          mk_nama: course?.nama_mk,
          mk_kode: course?.kode_mk,
          kelas: schedule?.kelas,
          ruangan: schedule?.ruangan,
          jam: schedule ? `${schedule.jam_mulai} - ${schedule.jam_selesai}` : ""
        };
      }).sort((a, b) => new Date(b.waktu_absen) - new Date(a.waktu_absen));

      setAttendance(mapped);
    } catch (err) {
      console.error("Error loading validations list:", err);
    }
  };

  useEffect(() => {
    syncData();
    window.addEventListener("storage", syncData);
    return () => window.removeEventListener("storage", syncData);
  }, []);

  const t = translations[lang];

  const handleStatusChange = async (id, newStatus) => {
    try {
      const rawAttendance = await getAttendance();
      const itemToUpdate = rawAttendance.find((k) => k.id === id);
      if (itemToUpdate) {
        const updated = {
          ...itemToUpdate,
          status: newStatus
        };
        await saveAttendance(updated);
      }

      await syncData();
      setIsModalOpen(false);
      
      const alertMsg = lang === "id" 
        ? `Kehadiran berhasil diubah menjadi ${newStatus.toUpperCase()}`
        : `Attendance status updated to ${newStatus.toUpperCase()}`;
      alert(alertMsg);
    } catch (err) {
      alert(lang === "id" ? "Gagal mengubah status!" : "Failed to update validation status!");
    }
  };

  const openDetails = (item) => {
    setActiveItem(item);
    setIsModalOpen(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div className="glass-panel" style={{ padding: "1.5rem 2rem", background: "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
          {t.validationList}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          {lang === "id" ? "Validasi bukti e-signature dan foto mengajar dosen" : "Validate e-signature proofs and teaching photos of lecturers"}
        </p>
      </div>

      <div className="glass-panel dashboard-panel">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{t.date}</th>
                <th>{t.lecturerName}</th>
                <th>{t.course}</th>
                <th>{t.class}</th>
                <th>{t.meetingNo}</th>
                <th>{t.signature}</th>
                <th>{t.status}</th>
                <th style={{ textAlign: "right" }}>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length > 0 ? (
                attendance.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <div>{item.tanggal}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {new Date(item.waktu_absen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <strong>{item.dosen_nama}</strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{item.dosen_nip}</div>
                    </td>
                    <td>
                      <span className="badge badge-warning" style={{ marginRight: "0.5rem", fontSize: "0.7rem" }}>{item.mk_kode}</span>
                      {item.mk_nama}
                    </td>
                    <td>{item.kelas}</td>
                    <td style={{ fontWeight: "bold" }}>#{item.pertemuan_ke}</td>
                    <td>
                      {item.tanda_tangan ? (
                        <img src={item.tanda_tangan} alt="E-signature thumbnail" className="signature-preview-thumbnail" />
                      ) : "-"}
                    </td>
                    <td>
                      <span className={`badge ${item.status === 'hadir' ? 'badge-success' : item.status === 'izin' ? 'badge-warning' : 'badge-danger'}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-secondary btn-sm" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }} onClick={() => openDetails(item)}>
                        {lang === "id" ? "Validasi" : "Validate"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                    {lang === "id" ? "Belum ada logs kehadiran." : "No attendance logs recorded yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Modal Detail */}
      {activeItem && (
        <Modal
          isOpen={isModalOpen}
          title={lang === "id" ? "Verifikasi Log Kehadiran Dosen" : "Verify Lecturer Attendance Log"}
          onClose={() => setIsModalOpen(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
              <div>
                <label className="form-label">{t.lecturerName}</label>
                <p style={{ fontWeight: "bold" }}>{activeItem.dosen_nama}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{activeItem.dosen_nip}</p>
              </div>
              <div>
                <label className="form-label">{t.course}</label>
                <p style={{ fontWeight: "bold" }}>{activeItem.mk_nama} ({activeItem.mk_kode})</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{t.class}: {activeItem.kelas}</p>
              </div>
              <div>
                <label className="form-label">{t.date} / {t.time}</label>
                <p>{activeItem.tanggal} ({activeItem.jam})</p>
              </div>
              <div>
                <label className="form-label">{lang === "id" ? "Status Verifikasi" : "Verification Status"}</label>
                <span className={`badge ${activeItem.status === 'hadir' ? 'badge-success' : activeItem.status === 'izin' ? 'badge-warning' : 'badge-danger'}`} style={{ display: "inline-block", width: "fit-content" }}>
                  {activeItem.status.toUpperCase()}
                </span>
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
                <label className="form-label" style={{ textAlign: "center" }}>{t.signature}</label>
                <img src={activeItem.tanda_tangan} alt="Full e-signature" className="signature-preview-large" />
              </div>
              <div>
                <label className="form-label" style={{ textAlign: "center" }}>{t.proofPhoto}</label>
                <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden", height: "150px" }}>
                  <img src={activeItem.foto_bukti} alt="Bukti Mengajar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              </div>
            </div>

            {/* Verification action buttons */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={() => handleStatusChange(activeItem.id, "alpha")}
              >
                {lang === "id" ? "Tolak (Alpha)" : "Reject (Absent)"}
              </button>
              <button 
                type="button" 
                className="btn btn-warning" 
                onClick={() => handleStatusChange(activeItem.id, "izin")}
              >
                {lang === "id" ? "Izin" : "Permit"}
              </button>
              <button 
                type="button" 
                className="btn btn-success" 
                onClick={() => handleStatusChange(activeItem.id, "hadir")}
              >
                {lang === "id" ? "Setujui (Hadir)" : "Approve (Present)"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
