"use client";

import { useState, useEffect } from "react";
import { getStudents, saveStudent, deleteStudent } from "../../../lib/db";
import { translations } from "../../../lib/translations";
import Modal from "../../../components/Modal";

const KELAS_OPTIONS = ["GS38", "GS39", "AV08", "FA10", "AV08-FA10"];

export default function AdminSiswa() {
  const [lang, setLang] = useState("id");
  const [students, setStudents] = useState([]);
  const [filterKelas, setFilterKelas] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [nim, setNim] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [kelas, setKelas] = useState("GS38");
  const [angkatan, setAngkatan] = useState("");

  const syncData = async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
    try {
      const rawStudents = await getStudents();
      setStudents(rawStudents);
    } catch (err) {
      console.error("Error loading students:", err);
    }
  };

  useEffect(() => {
    syncData();
    window.addEventListener("storage", syncData);
    return () => window.removeEventListener("storage", syncData);
  }, []);

  const t = translations[lang];

  const resetForm = () => {
    setNim("");
    setNamaLengkap("");
    setKelas("GS38");
    setAngkatan(String(new Date().getFullYear()));
    setSelectedStudent(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalMode("add");
    setIsModalOpen(true);
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setNim(student.nim || "");
    setNamaLengkap(student.nama_lengkap || "");
    setKelas(student.kelas || "GS38");
    setAngkatan(student.angkatan || "");
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (modalMode === "add") {
        // Check for duplicate NIM
        const existing = students.find(
          (s) => s.nim.toUpperCase() === nim.toUpperCase()
        );
        if (existing) {
          alert(
            lang === "id"
              ? "NIM sudah terdaftar!"
              : "Student ID already registered!"
          );
          setIsSaving(false);
          return;
        }

        const newStudent = {
          id: "siswa_" + Math.random().toString(36).substr(2, 9),
          nim: nim.toUpperCase(),
          nama_lengkap: namaLengkap,
          kelas: kelas,
          angkatan: angkatan,
          created_at: new Date().toISOString(),
        };
        await saveStudent(newStudent);
      } else {
        const updatedStudent = {
          ...selectedStudent,
          nim: nim.toUpperCase(),
          nama_lengkap: namaLengkap,
          kelas: kelas,
          angkatan: angkatan,
        };
        await saveStudent(updatedStudent);
      }

      await syncData();
      setIsModalOpen(false);
      resetForm();
      alert(
        lang === "id"
          ? "Data siswa berhasil disimpan!"
          : "Student data saved successfully!"
      );
    } catch (err) {
      console.error("Save error:", err);
      alert(
        lang === "id" ? "Gagal menyimpan data siswa!" : "Failed to save student data!"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmMsg =
      lang === "id"
        ? "Apakah Anda yakin ingin menghapus siswa ini?"
        : "Are you sure you want to delete this student?";
    if (!confirm(confirmMsg)) return;

    try {
      await deleteStudent(id);
      await syncData();
      alert(
        lang === "id"
          ? "Siswa berhasil dihapus."
          : "Student deleted successfully."
      );
    } catch (err) {
      alert(
        lang === "id" ? "Gagal menghapus siswa!" : "Failed to delete student!"
      );
    }
  };

  // Filtered students
  const filteredStudents = students.filter((s) => {
    const matchKelas = filterKelas === "" || s.kelas === filterKelas;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      searchQuery === "" ||
      (s.nim || "").toLowerCase().includes(q) ||
      (s.nama_lengkap || "").toLowerCase().includes(q) ||
      (s.kelas || "").toLowerCase().includes(q);
    return matchKelas && matchSearch;
  });

  // Count by kelas
  const countByKelas = KELAS_OPTIONS.reduce((acc, k) => {
    acc[k] = students.filter((s) => s.kelas === k).length;
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{t.studentList}</h2>
          <span
            style={{
              background: "rgba(59, 130, 246, 0.1)",
              color: "var(--primary)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              padding: "0.25rem 0.75rem",
              borderRadius: "20px",
              fontSize: "0.75rem",
              fontWeight: "bold",
            }}
          >
            {students.length} {lang === "id" ? "Siswa" : "Students"}
          </span>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + {t.addStudent}
        </button>
      </div>

      {/* Stats by class */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {KELAS_OPTIONS.map((k) => (
          <div
            key={k}
            className="glass-panel"
            onClick={() => setFilterKelas(filterKelas === k ? "" : k)}
            style={{
              padding: "1rem",
              textAlign: "center",
              cursor: "pointer",
              border:
                filterKelas === k
                  ? "1.5px solid var(--primary)"
                  : "1px solid var(--border-color)",
              transition: "all 0.2s",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: filterKelas === k ? "var(--primary)" : "var(--text-primary)",
              }}
            >
              {countByKelas[k] || 0}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Kelas {k}
            </div>
          </div>
        ))}
      </div>

      {/* Filter Section */}
      <div
        className="glass-panel"
        style={{
          padding: "1.25rem 1.5rem",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <div style={{ flex: 2, minWidth: "200px" }}>
          <label
            className="form-label"
            style={{ marginBottom: "0.5rem", display: "block", fontSize: "0.85rem", color: "var(--text-secondary)" }}
          >
            {lang === "id" ? "Cari NIM / Nama Siswa" : "Search NIM / Student Name"}
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
          <label
            className="form-label"
            style={{ marginBottom: "0.5rem", display: "block", fontSize: "0.85rem", color: "var(--text-secondary)" }}
          >
            {t.class}
          </label>
          <select
            className="form-control"
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            style={{ background: "#0b0f19" }}
          >
            <option value="">{lang === "id" ? "Semua Kelas" : "All Classes"}</option>
            {KELAS_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        {(filterKelas || searchQuery) && (
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setFilterKelas(""); setSearchQuery(""); }}
              style={{ padding: "0.6rem 1rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}
            >
              {lang === "id" ? "Reset Filter" : "Reset Filters"}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-panel dashboard-panel">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t.nim}</th>
                <th>{lang === "id" ? "Nama Lengkap" : "Full Name"}</th>
                <th>{t.class}</th>
                <th>{t.angkatan}</th>
                <th style={{ textAlign: "right" }}>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: "center", color: "var(--text-secondary)", padding: "2.5rem" }}
                  >
                    {lang === "id"
                      ? "Belum ada data siswa."
                      : "No student data found."}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => (
                  <tr key={student.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {idx + 1}
                    </td>
                    <td>
                      <span className="badge badge-warning" style={{ fontSize: "0.75rem" }}>
                        {student.nim}
                      </span>
                    </td>
                    <td style={{ fontWeight: "600" }}>{student.nama_lengkap}</td>
                    <td>
                      <span
                        style={{
                          background: "rgba(59, 130, 246, 0.12)",
                          color: "var(--primary)",
                          border: "1px solid rgba(59, 130, 246, 0.25)",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                        }}
                      >
                        {student.kelas}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{student.angkatan}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
                          onClick={() => openEditModal(student)}
                        >
                          {lang === "id" ? "Ubah" : "Edit"}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
                          onClick={() => handleDelete(student.id)}
                        >
                          {lang === "id" ? "Hapus" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        title={
          modalMode === "add"
            ? t.addStudent
            : lang === "id"
            ? "Edit Data Siswa"
            : "Edit Student"
        }
        onClose={() => { setIsModalOpen(false); resetForm(); }}
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">
              {t.nim} <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. GS38001"
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              {lang === "id" ? "Nama Lengkap" : "Full Name"}{" "}
              <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder={lang === "id" ? "Masukkan nama lengkap" : "Enter full name"}
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">
                {t.class} <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select
                className="form-control"
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                style={{ background: "#0b0f19" }}
                required
              >
                {KELAS_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                {t.angkatan} <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 2023"
                value={angkatan}
                onChange={(e) => setAngkatan(e.target.value)}
                required
              />
            </div>
          </div>

          <div
            className="modal-footer"
            style={{ border: "none", padding: 0, marginTop: "2rem" }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              disabled={isSaving}
            >
              {t.cancel}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving
                ? lang === "id"
                  ? "Menyimpan..."
                  : "Saving..."
                : t.saveChanges}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
