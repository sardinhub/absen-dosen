"use client";

import { useState, useEffect } from "react";
import { getCourses, saveCourse, deleteCourse } from "../../../lib/db";
import { translations } from "../../../lib/translations";
import Modal from "../../../components/Modal";

export default function AdminMataKuliah() {
  const [lang, setLang] = useState("id");
  const [courses, setCourses] = useState([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // add | edit
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Form Fields
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [tahunAjaran, setTahunAjaran] = useState("");

  const syncData = async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
    try {
      const rawCourses = await getCourses();
      setCourses(rawCourses);
    } catch (err) {
      console.error("Error loading courses list:", err);
    }
  };

  useEffect(() => {
    syncData();
    window.addEventListener("storage", syncData);
    return () => window.removeEventListener("storage", syncData);
  }, []);

  const t = translations[lang];

  const resetForm = () => {
    setKode("");
    setNama("");
    setTahunAjaran(String(new Date().getFullYear()));
    setSelectedCourse(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalMode("add");
    setIsModalOpen(true);
  };

  const openEditModal = (course) => {
    setSelectedCourse(course);
    setKode(course.kode_mk);
    setNama(course.nama_mk);
    setTahunAjaran(course.semester || String(new Date().getFullYear()));
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      if (modalMode === "add") {
        const rawCourses = await getCourses();
        // Validate unique code
        if (rawCourses.some((m) => m.kode_mk.toUpperCase() === kode.toUpperCase())) {
          alert(lang === "id" ? "Kode Mata Kuliah sudah terdaftar!" : "Course code already registered!");
          return;
        }

        const newCourse = {
          id: "mk" + (rawCourses.length + 1),
          kode_mk: kode.toUpperCase(),
          nama_mk: nama,
          sks: 0, // Set to 0 since SKS is removed
          semester: tahunAjaran // We store Tahun Ajaran inside the semester column
        };

        await saveCourse(newCourse);
      } else {
        // Edit mode
        const updatedCourse = {
          ...selectedCourse,
          kode_mk: kode.toUpperCase(),
          nama_mk: nama,
          sks: 0,
          semester: tahunAjaran
        };
        await saveCourse(updatedCourse);
      }

      await syncData();
      setIsModalOpen(false);
      resetForm();
      alert(lang === "id" ? "Mata Kuliah berhasil disimpan!" : "Course saved successfully!");
    } catch (err) {
      alert(lang === "id" ? "Gagal menyimpan mata kuliah!" : "Failed to save course!");
    }
  };

  const handleDelete = async (id) => {
    const confirmMsg = lang === "id" 
      ? "Apakah Anda yakin ingin menghapus mata kuliah ini?" 
      : "Are you sure you want to delete this course?";
    if (!confirm(confirmMsg)) return;

    try {
      await deleteCourse(id);
      await syncData();
      alert(lang === "id" ? "Mata Kuliah berhasil dihapus." : "Course deleted successfully.");
    } catch (err) {
      alert(lang === "id" ? "Gagal menghapus mata kuliah!" : "Failed to delete course!");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{t.courseList}</h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          + {t.addCourse}
        </button>
      </div>

      <div className="glass-panel dashboard-panel">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{lang === "id" ? "Kode" : "Code"}</th>
                <th>{t.course}</th>
                <th>{lang === "id" ? "Tahun Ajaran" : "Academic Year"}</th>
                <th style={{ textAlign: "right" }}>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <td>
                    <span className="badge badge-warning">{course.kode_mk}</span>
                  </td>
                  <td>
                    <strong>{course.nama_mk}</strong>
                  </td>
                  <td>{course.semester}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
                        onClick={() => openEditModal(course)}
                      >
                        {lang === "id" ? "Ubah" : "Edit"}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
                        onClick={() => handleDelete(course.id)}
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

      {/* Add / Edit Course Modal */}
      <Modal
        isOpen={isModalOpen}
        title={modalMode === "add" ? t.addCourse : lang === "id" ? "Edit Mata Kuliah" : "Edit Course"}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">{lang === "id" ? "Kode Mata Kuliah" : "Course Code"} <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. AV-101"
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{lang === "id" ? "Nama Mata Kuliah" : "Course Name"} <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Flight Navigation Operations"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{lang === "id" ? "Tahun Ajaran" : "Academic Year"} <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 2026/2027"
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
              required
            />
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
