"use client";

import { useState, useEffect } from "react";
import { getAttendance, getUsers, getSchedules, getCourses, saveAttendance, deleteAttendance } from "../../../lib/db";
import { translations } from "../../../lib/translations";
import Modal from "../../../components/Modal";

export default function AdminValidasi() {
  const [lang, setLang] = useState("id");
  const [attendance, setAttendance] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editWaktuAbsen, setEditWaktuAbsen] = useState("");
  const [editMateri, setEditMateri] = useState("");
  const [editCatatan, setEditCatatan] = useState("");

  const syncData = async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
    try {
      const [rawAttendance, rawUsers, rawSchedules, rawCourses] = await Promise.all([
        getAttendance(),
        getUsers(),
        getSchedules(),
        getCourses()
      ]);

      // Map attendance with lecturer and schedule details
      const mapped = rawAttendance
        .filter((k) => k.status === 'pending')
        .map((k) => {
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

    // Auto-refresh data every 10 seconds for real-time updates
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

  const handleDelete = async (id) => {
    const confirmMsg = lang === "id" 
      ? "Apakah Anda yakin ingin menghapus data kehadiran ini secara permanen?" 
      : "Are you sure you want to permanently delete this attendance record?";
    if (!confirm(confirmMsg)) return;

    try {
      await deleteAttendance(id);
      await syncData();
      alert(lang === "id" ? "Data kehadiran berhasil dihapus." : "Attendance record deleted successfully.");
    } catch (err) {
      alert(lang === "id" ? "Gagal menghapus data kehadiran!" : "Failed to delete attendance record!");
    }
  };

  const openDetails = (item) => {
    setActiveItem(item);
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    // Convert ISO string to format required by datetime-local input: YYYY-MM-DDThh:mm
    let localDatetime = "";
    if (item.waktu_absen) {
      const d = new Date(item.waktu_absen);
      const tzoffset = d.getTimezoneOffset() * 60000; // offset in milliseconds
      localDatetime = new Date(d - tzoffset).toISOString().slice(0, 16);
    }
    setEditWaktuAbsen(localDatetime);
    setEditMateri(item.materi || "");
    setEditCatatan(item.catatan || "");
    setIsEditModalOpen(true);
  };

  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleEditSave = async (e) => {
    e.preventDefault();
    setIsSavingEdit(true);

    try {
      const rawAttendance = await getAttendance();
      const itemToUpdate = rawAttendance.find((k) => k.id === editItem.id);
      if (itemToUpdate) {
        // Convert local datetime string back to UTC ISO string
        let newWaktuAbsen = itemToUpdate.waktu_absen;
        if (editWaktuAbsen) {
          newWaktuAbsen = new Date(editWaktuAbsen).toISOString();
        }

        const updated = {
          ...itemToUpdate,
          waktu_absen: newWaktuAbsen,
          materi: editMateri,
          catatan: editCatatan
        };
        await saveAttendance(updated);
      }

      await syncData();
      setIsEditModalOpen(false);
      setIsSavingEdit(false);
      alert(lang === "id" ? "Data kehadiran berhasil diperbarui!" : "Attendance record updated successfully!");
    } catch (err) {
      console.error("Edit error:", err);
      setIsSavingEdit(false);
      alert(lang === "id" ? "Gagal menyimpan perubahan!" : "Failed to save changes!");
    }
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
                <th>{lang === "id" ? "Selfie Kehadiran" : "Attendance Selfie"}</th>
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
                    </td>
                    <td>
                      <span className="badge badge-warning" style={{ marginRight: "0.5rem", fontSize: "0.7rem" }}>{item.mk_kode}</span>
                      {item.mk_nama}
                    </td>
                    <td>{item.kelas}</td>
                    <td style={{ fontWeight: "bold" }}>#{item.pertemuan_ke}</td>
                    <td>
                      {item.tanda_tangan ? (
                        <img src={item.tanda_tangan} alt="Selfie thumbnail" style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "50%", border: "2px solid var(--border-color)" }} />
                      ) : "-"}
                    </td>
                    <td>
                      <span className={`badge ${item.status === 'hadir' ? 'badge-success' : item.status === 'izin' ? 'badge-warning' : item.status === 'pending' ? 'badge-secondary' : 'badge-danger'}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button className="btn btn-secondary btn-sm" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }} onClick={() => openDetails(item)}>
                          {lang === "id" ? "Validasi" : "Validate"}
                        </button>
                        <button className="btn btn-warning btn-sm" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }} onClick={() => openEdit(item)}>
                          {lang === "id" ? "Edit" : "Edit"}
                        </button>
                        <button className="btn btn-danger btn-sm" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }} onClick={() => handleDelete(item.id)}>
                          {lang === "id" ? "Hapus" : "Delete"}
                        </button>
                      </div>
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
                <span className={`badge ${activeItem.status === 'hadir' ? 'badge-success' : activeItem.status === 'izin' ? 'badge-warning' : activeItem.status === 'pending' ? 'badge-secondary' : 'badge-danger'}`} style={{ display: "inline-block", width: "fit-content" }}>
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
                <label className="form-label" style={{ textAlign: "center" }}>{lang === "id" ? "Foto Selfie Kehadiran" : "Attendance Selfie"}</label>
                <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden", height: "150px" }}>
                  <img src={activeItem.tanda_tangan} alt="Selfie" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
                </div>
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

      {/* Edit Attendance Modal */}
      {editItem && (
        <Modal
          isOpen={isEditModalOpen}
          title={lang === "id" ? "Edit Log Kehadiran" : "Edit Attendance Log"}
          onClose={() => setIsEditModalOpen(false)}
        >
          <form onSubmit={handleEditSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ paddingBottom: "1rem", borderBottom: "1px solid var(--border-color)" }}>
              <p style={{ fontWeight: "bold" }}>{editItem.dosen_nama}</p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {editItem.mk_nama} ({editItem.mk_kode}) - Kelas {editItem.kelas}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">{lang === "id" ? "Jam Absen Masuk" : "Check-in Time"} <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                type="datetime-local"
                className="form-control"
                value={editWaktuAbsen}
                onChange={(e) => setEditWaktuAbsen(e.target.value)}
                style={{ background: "#0b0f19", color: "white" }}
                required
              />
              <small style={{ color: "var(--text-secondary)", display: "block", marginTop: "0.25rem", fontSize: "0.75rem" }}>
                {lang === "id" ? "Ubah jam ini jika dosen lupa menekan tombol absen tepat waktu." : "Change this time if the lecturer forgot to check-in on time."}
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">{t.subject} <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                type="text"
                className="form-control"
                value={editMateri}
                onChange={(e) => setEditMateri(e.target.value)}
                style={{ background: "#0b0f19", color: "white" }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t.notes}</label>
              <textarea
                className="form-control"
                rows={3}
                value={editCatatan}
                onChange={(e) => setEditCatatan(e.target.value)}
                style={{ background: "#0b0f19", color: "white" }}
              />
            </div>

            <div className="modal-footer" style={{ border: "none", padding: 0, marginTop: "1rem" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)} disabled={isSavingEdit}>
                {t.cancel}
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSavingEdit}>
                {isSavingEdit ? (lang === "id" ? "Menyimpan..." : "Saving...") : t.saveChanges}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
