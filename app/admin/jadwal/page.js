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
    setKelas("");
    setHari("Senin");
    setJamMulai("08:00");
    setJamSelesai("10:00");
    setRuangan("");
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
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      if (modalMode === "add") {
        const rawSchedules = await getSchedules();
        const newSchedule = {
          id: "j" + (rawSchedules.length + 1),
          dosen_id: dosenId,
          mk_id: mkId,
          kelas: kelas,
          hari: hari,
          jam_mulai: jamMulai,
          jam_selesai: jamSelesai,
          ruangan: ruangan
        };
        await saveSchedule(newSchedule);
      } else {
        const updatedSchedule = {
          ...selectedSchedule,
          dosen_id: dosenId,
          mk_id: mkId,
          kelas: kelas,
          hari: hari,
          jam_mulai: jamMulai,
          jam_selesai: jamSelesai,
          ruangan: ruangan
        };
        await saveSchedule(updatedSchedule);
      }

      await syncData();
      setIsModalOpen(false);
      resetForm();
      alert(lang === "id" ? "Jadwal berhasil disimpan!" : "Schedule saved successfully!");
    } catch (err) {
      alert(lang === "id" ? "Gagal menyimpan jadwal!" : "Failed to save schedule!");
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
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{t.scheduleList}</h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          + {t.addSchedule}
        </button>
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
              {schedules.map((schedule) => (
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
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Aero-A"
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t.room} <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. R. Simulator"
                value={ruangan}
                onChange={(e) => setRuangan(e.target.value)}
                required
              />
            </div>
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
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              {t.cancel}
            </button>
            <button type="submit" className="btn btn-primary">
              {t.saveChanges}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
