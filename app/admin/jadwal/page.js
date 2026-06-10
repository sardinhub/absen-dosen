"use client";

import { useState, useEffect } from "react";
import { getSchedules, getUsers, getCourses, saveSchedule, deleteSchedule } from "../../../lib/db";
import { translations } from "../../../lib/translations";
import Modal from "../../../components/Modal";

export default function AdminJadwal() {
  const [lang, setLang] = useState("id");
  const [schedules, setSchedules] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [courses, setCourses] = useState([]);

  // Filter States
  const [filterLecturer, setFilterLecturer] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // add | edit
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // Form Fields
  const [dosenId, setDosenId] = useState("");
  const [mkId, setMkId] = useState("");
  const [kelas, setKelas] = useState("");
  const [hari, setHari] = useState("Senin");
  const [jamMulai, setJamMulai] = useState("08:00");
  const [jamSelesai, setJamSelesai] = useState("10:00");
  const [ruangan, setRuangan] = useState("");
  const [tanggal, setTanggal] = useState("");

  const handleDateChange = (dateVal) => {
    setTanggal(dateVal);
    if (dateVal) {
      const dayIndex = new Date(dateVal).getDay();
      const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      setHari(days[dayIndex]);
    }
  };

  const syncData = async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
    try {
      const rawSchedules = await getSchedules();
      const rawUsers = await getUsers();
      const rawCourses = await getCourses();

      const activeLecturers = rawUsers.filter((u) => u.role === "dosen");
      setLecturers(activeLecturers);
      setCourses(rawCourses);

      // Map schedule details
      const mappedSchedules = rawSchedules.map((j) => {
        const lecturer = rawUsers.find((u) => u.id === j.dosen_id);
        const course = rawCourses.find((m) => m.id === j.mk_id);
        return {
          ...j,
          dosen_nama: lecturer?.nama_lengkap,
          mk_nama: course?.nama_mk,
          mk_kode: course?.kode_mk
        };
      });
      setSchedules(mappedSchedules);
    } catch (err) {
      console.error("Error loading schedules database:", err);
    }
  };

  useEffect(() => {
    syncData();
    window.addEventListener("storage", syncData);
    return () => window.removeEventListener("storage", syncData);
  }, []);

  const t = translations[lang];

  const resetForm = () => {
    setDosenId("");
    setMkId("");
    setKelas("GS38");
    setHari("Senin");
    setJamMulai("08:00");
    setJamSelesai("10:00");
    setRuangan("GA");
    setTanggal("");
    setSelectedSchedule(null);
  };

  const openAddModal = () => {
    resetForm();
    if (lecturers.length > 0) setDosenId(lecturers[0].id);
    if (courses.length > 0) setMkId(courses[0].id);
    setModalMode("add");
    setIsModalOpen(true);
  };

  const openEditModal = (schedule) => {
    setSelectedSchedule(schedule);
    setDosenId(schedule.dosen_id);
    setMkId(schedule.mk_id);
    setKelas(schedule.kelas);
    setHari(schedule.hari);
    setJamMulai(schedule.jam_mulai);
    setJamSelesai(schedule.jam_selesai);
    setRuangan(schedule.ruangan);
    setTanggal(schedule.tanggal || "");
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const rawSchedules = await getSchedules();

      // Collision Detection Logic
      const isConflict = rawSchedules.some(existing => {
        // Skip checking against itself if in edit mode
        if (modalMode === "edit" && existing.id === selectedSchedule.id) return false;
        
        // If both have specific dates, they conflict if dates are the same.
        // If either doesn't have a date (legacy schedule), check if the day matches.
        const sameDateOrDay = (existing.tanggal && tanggal)
          ? (existing.tanggal === tanggal)
          : (existing.hari.toLowerCase() === hari.toLowerCase());

        // Time overlaps if NewStart < OldEnd AND NewEnd > OldStart
        const timeOverlaps = (jamMulai < existing.jam_selesai) && (jamSelesai > existing.jam_mulai);
        // It's a conflict if they share the same physical room or the same group of students (class)
        const sameKelasOrRuangan = (existing.kelas.toLowerCase() === kelas.toLowerCase()) || 
                                   (existing.ruangan.toLowerCase() === ruangan.toLowerCase());
        
        return sameDateOrDay && timeOverlaps && sameKelasOrRuangan;
      });

      if (isConflict) {
        setIsSaving(false);
        alert(lang === "id" ? "Gagal menyimpan! Jadwal bertabrakan dengan jadwal lain di Kelas, Ruangan, atau Waktu yang bertepatan." : "Failed to save! The schedule conflicts with an existing schedule.");
        return;
      }

      if (modalMode === "add") {
        const newSchedule = {
          id: "j_" + Math.random().toString(36).substr(2, 9),
          dosen_id: dosenId,
          mk_id: mkId,
          kelas: kelas,
          hari: hari,
          jam_mulai: jamMulai,
          jam_selesai: jamSelesai,
          ruangan: ruangan,
          tanggal: tanggal || null
        };
        await saveSchedule(newSchedule);
      } else {
        const updatedSchedule = {
          id: selectedSchedule.id,
          dosen_id: dosenId,
          mk_id: mkId,
          kelas: kelas,
          hari: hari,
          jam_mulai: jamMulai,
          jam_selesai: jamSelesai,
          ruangan: ruangan,
          tanggal: tanggal || null
        };
        await saveSchedule(updatedSchedule);
      }

      await syncData();
      setIsModalOpen(false);
      resetForm();
      setIsSaving(false);
      alert(lang === "id" ? "Jadwal berhasil disimpan!" : "Schedule saved successfully!");
    } catch (err) {
      console.error("Save Error:", err);
      setIsSaving(false);
      const errDetail = err?.message || JSON.stringify(err);
      alert((lang === "id" ? "Gagal menyimpan jadwal! DETAIL ERROR DARI SUPABASE:\n\n" : "Failed to save schedule! ERROR:\n\n") + errDetail);
    }
  };

  const handleDelete = async (id) => {
    const confirmMsg = lang === "id" 
      ? "Apakah Anda yakin ingin menghapus jadwal ini?" 
      : "Are you sure you want to delete this schedule?";
    if (!confirm(confirmMsg)) return;

    try {
      await deleteSchedule(id);
      await syncData();
      alert(lang === "id" ? "Jadwal berhasil dihapus." : "Schedule deleted successfully.");
    } catch (err) {
      alert(lang === "id" ? "Gagal menghapus jadwal!" : "Failed to delete schedule!");
    }
  };

  const dayOptions = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{t.scheduleList}</h2>
          <span style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--primary)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "bold" }}>
            {schedules.length} {lang === "id" ? "Data" : "Records"}
          </span>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + {t.addSchedule}
        </button>
      </div>

      {/* Filter Section */}
      <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <label className="form-label" style={{ marginBottom: "0.5rem", display: "block", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {lang === "id" ? "Cari Mata Kuliah / Dosen / Kelas" : "Search Course / Lecturer / Class"}
          </label>
          <input 
            type="text" 
            className="form-control" 
            placeholder={lang === "id" ? "Ketik pencarian..." : "Type to search..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label className="form-label" style={{ marginBottom: "0.5rem", display: "block", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {t.lecturerName}
          </label>
          <select 
            className="form-control" 
            value={filterLecturer} 
            onChange={(e) => setFilterLecturer(e.target.value)}
            style={{ background: "#0b0f19" }}
          >
            <option value="">{lang === "id" ? "Semua Dosen" : "All Lecturers"}</option>
            {lecturers.map(l => (
              <option key={l.id} value={l.id}>{l.nama_lengkap}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label className="form-label" style={{ marginBottom: "0.5rem", display: "block", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {lang === "id" ? "Hari" : "Day"}
          </label>
          <select 
            className="form-control" 
            value={filterDay} 
            onChange={(e) => setFilterDay(e.target.value)}
            style={{ background: "#0b0f19" }}
          >
            <option value="">{lang === "id" ? "Semua Hari" : "All Days"}</option>
            {dayOptions.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-panel dashboard-panel">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{t.lecturerName}</th>
                <th>{t.course}</th>
                <th>{t.class}</th>
                <th>{lang === "id" ? "Hari / Waktu" : "Day / Time"}</th>
                <th>{t.room}</th>
                <th style={{ textAlign: "right" }}>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {schedules
                .filter((schedule) => {
                  const matchLecturer = filterLecturer === "" || schedule.dosen_id === filterLecturer;
                  const matchDay = filterDay === "" || schedule.hari === filterDay;
                  const searchLower = searchQuery.toLowerCase();
                  const matchSearch = searchQuery === "" || 
                    (schedule.mk_nama?.toLowerCase().includes(searchLower)) ||
                    (schedule.mk_kode?.toLowerCase().includes(searchLower)) ||
                    (schedule.dosen_nama?.toLowerCase().includes(searchLower)) ||
                    (schedule.kelas?.toLowerCase().includes(searchLower));
                  
                  return matchLecturer && matchDay && matchSearch;
                })
                .map((schedule) => (
                <tr key={schedule.id}>
                  <td>
                    <strong>{schedule.dosen_nama}</strong>
                  </td>
                  <td>
                    <span className="badge badge-warning" style={{ marginRight: "0.5rem", fontSize: "0.7rem" }}>{schedule.mk_kode}</span>
                    {schedule.mk_nama}
                  </td>
                  <td>{schedule.kelas}</td>
                  <td>
                    <span style={{ fontWeight: "bold", color: "var(--primary)" }}>{schedule.hari}</span>
                    {schedule.tanggal && (
                      <div style={{ fontSize: "0.75rem", color: "#60a5fa", fontWeight: "600" }}>
                        {new Date(schedule.tanggal).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{schedule.jam_mulai} - {schedule.jam_selesai}</div>
                  </td>
                  <td>{schedule.ruangan}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
                        onClick={() => openEditModal(schedule)}
                      >
                        {lang === "id" ? "Ubah" : "Edit"}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
                        onClick={() => handleDelete(schedule.id)}
                      >
                        {lang === "id" ? "Hapus" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Schedule Modal */}
      <Modal
        isOpen={isModalOpen}
        title={modalMode === "add" ? t.addSchedule : lang === "id" ? "Edit Jadwal" : "Edit Schedule"}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">{t.lecturerName} <span style={{ color: "var(--danger)" }}>*</span></label>
            <select
              className="form-control"
              value={dosenId}
              onChange={(e) => setDosenId(e.target.value)}
              style={{ background: "#0b0f19" }}
            >
              {lecturers.map((lec) => (
                <option key={lec.id} value={lec.id}>
                  {lec.nama_lengkap}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t.course} <span style={{ color: "var(--danger)" }}>*</span></label>
            <select
              className="form-control"
              value={mkId}
              onChange={(e) => setMkId(e.target.value)}
              style={{ background: "#0b0f19" }}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.kode_mk} - {c.nama_mk}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">{t.class} <span style={{ color: "var(--danger)" }}>*</span></label>
              <select
                className="form-control"
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                style={{ background: "#0b0f19" }}
                required
              >
                {["GS38", "GS39", "AV08", "FA10", "AV08-FA10"].map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t.room} <span style={{ color: "var(--danger)" }}>*</span></label>
              <select
                className="form-control"
                value={ruangan}
                onChange={(e) => setRuangan(e.target.value)}
                style={{ background: "#0b0f19" }}
                required
              >
                {["GA", "QG", "LabKom", "GC", "Aula"].map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{lang === "id" ? "Tanggal (Opsional)" : "Date (Optional)"}</label>
            <input
              type="date"
              className="form-control"
              value={tanggal}
              onChange={(e) => handleDateChange(e.target.value)}
              style={{ background: "#0b0f19", color: "white" }}
            />
            <small style={{ color: "var(--text-secondary)", display: "block", marginTop: "0.25rem", fontSize: "0.75rem" }}>
              {lang === "id" 
                ? "Isi untuk jadwal pada tanggal tertentu. Mengubah tanggal akan menyesuaikan hari secara otomatis."
                : "Fill this for specific-date schedules. Changing date will update the day of the week automatically."}
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">{lang === "id" ? "Hari" : "Day"} <span style={{ color: "var(--danger)" }}>*</span></label>
            <select
              className="form-control"
              value={hari}
              onChange={(e) => setHari(e.target.value)}
              style={{ background: "#0b0f19" }}
            >
              {dayOptions.map((d, idx) => (
                <option key={idx} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">{lang === "id" ? "Jam Mulai" : "Start Time"} <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                type="time"
                className="form-control"
                value={jamMulai}
                onChange={(e) => setJamMulai(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{lang === "id" ? "Jam Selesai" : "End Time"} <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                type="time"
                className="form-control"
                value={jamSelesai}
                onChange={(e) => setJamSelesai(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-footer" style={{ border: "none", padding: 0, marginTop: "2rem" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              {t.cancel}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? (lang === "id" ? "Menyimpan..." : "Saving...") : t.saveChanges}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
