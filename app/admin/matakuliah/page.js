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

  // Syllabus Modal State
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);
  const [selectedSyllabusData, setSelectedSyllabusData] = useState([]);

  // Form Fields
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [tahunAjaran, setTahunAjaran] = useState("");
  const [sks, setSks] = useState("3");
  const [semesterNo, setSemesterNo] = useState("1");
  const [jumlahPertemuan, setJumlahPertemuan] = useState("14");

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
    setSks("3");
    setSemesterNo("1");
    setJumlahPertemuan("14");
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
    setSks(course.sks !== undefined ? String(course.sks) : "3");
    setSemesterNo(course.semesterNo !== undefined ? String(course.semesterNo) : "1");
    setJumlahPertemuan(course.jumlah_pertemuan || "14");
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleViewSyllabus = (course) => {
    if (!course.silabus) return;
    
    let silabusArr = [];
    try {
      if (typeof course.silabus === 'string') {
        silabusArr = JSON.parse(course.silabus);
      } else if (Array.isArray(course.silabus)) {
        silabusArr = course.silabus;
      }
    } catch (e) {
      console.error(e);
    }
    
    const hasData = silabusArr.some(s => s.materi_pokok || s.sub_materi);
    if (hasData) {
      setSelectedCourse(course);
      setSelectedSyllabusData(silabusArr.filter(s => s.materi_pokok || s.sub_materi));
      setIsSyllabusModalOpen(true);
    }
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
          id: "mk_" + Math.random().toString(36).substr(2, 9),
          kode_mk: kode.toUpperCase(),
          nama_mk: nama,
          sks: parseInt(sks, 10) || 3,
          semester: tahunAjaran,
          semesterNo: parseInt(semesterNo, 10) || 1,
          jumlah_pertemuan: jumlahPertemuan
        };

        await saveCourse(newCourse);
      } else {
        // Edit mode
        const updatedCourse = {
          ...selectedCourse,
          kode_mk: kode.toUpperCase(),
          nama_mk: nama,
          sks: parseInt(sks, 10) || 3,
          semester: tahunAjaran,
          semesterNo: parseInt(semesterNo, 10) || 1,
          jumlah_pertemuan: jumlahPertemuan
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{t.courseList}</h2>
          <span style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--primary)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "bold" }}>
            {courses.length} {lang === "id" ? "Data" : "Records"}
          </span>
        </div>
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
                <th>SKS</th>
                <th>Semester</th>
                <th>{lang === "id" ? "Tahun Ajaran" : "Academic Year"}</th>
                <th>{lang === "id" ? "Jml Pertemuan" : "Total Meetings"}</th>
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
                    <span 
                      style={{ fontWeight: "bold", cursor: "pointer", color: "var(--primary)", textDecoration: "underline" }}
                      onClick={() => handleViewSyllabus(course)}
                      title={lang === "id" ? "Lihat Silabus" : "View Syllabus"}
                    >
                      {course.nama_mk}
                    </span>
                  </td>
                  <td>{course.sks !== undefined ? course.sks : "3"}</td>
                  <td>Semester {course.semesterNo || "1"}</td>
                  <td>{course.semester}</td>
                  <td>{course.jumlah_pertemuan || "14"}</td>
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

          <div className="form-group">
            <label className="form-label">SKS <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              type="number"
              className="form-control"
              placeholder="e.g. 3"
              value={sks}
              onChange={(e) => setSks(e.target.value)}
              min="1"
              max="6"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Semester <span style={{ color: "var(--danger)" }}>*</span></label>
            <select
              className="form-control select-dark"
              value={semesterNo}
              onChange={(e) => setSemesterNo(e.target.value)}
              required
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{lang === "id" ? "Jumlah Pertemuan" : "Total Meetings"} <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              type="number"
              className="form-control"
              placeholder="14"
              value={jumlahPertemuan}
              onChange={(e) => setJumlahPertemuan(e.target.value)}
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

      {/* Syllabus View Modal */}
      <Modal
        isOpen={isSyllabusModalOpen}
        title={lang === "id" ? `Silabus: ${selectedCourse?.nama_mk}` : `Syllabus: ${selectedCourse?.nama_mk}`}
        onClose={() => setIsSyllabusModalOpen(false)}
      >
        <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: "0.5rem" }}>
          {selectedSyllabusData.map((item, idx) => (
            <div key={idx} style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-color)", marginBottom: "1rem" }}>
              <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--primary)" }}>{lang === "id" ? "Pertemuan Ke-" : "Meeting "}{item.pertemuan}</h4>
              {item.materi_pokok && <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>{item.materi_pokok}</p>}
              {item.sub_materi && (
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  {item.sub_materi}
                </pre>
              )}
            </div>
          ))}
        </div>
        <div className="modal-footer" style={{ border: "none", padding: 0, marginTop: "1rem" }}>
          <button type="button" className="btn btn-secondary" onClick={() => setIsSyllabusModalOpen(false)}>
            {lang === "id" ? "Tutup" : "Close"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
