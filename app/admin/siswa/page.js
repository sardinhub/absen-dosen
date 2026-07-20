"use client";

import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { getStudents, saveStudent, deleteStudent } from "../../../lib/db";
import { translations } from "../../../lib/translations";
import Modal from "../../../components/Modal";

const KELAS_OPTIONS = ["GS38", "GS39", "GS40", "AV08", "FA10", "AV08-FA10"];

// Normalise header key dari Excel (case-insensitive, trim whitespace)
function normaliseKey(raw) {
  return (raw || "").toString().trim().toLowerCase().replace(/\s+/g, "_");
}

// Coba mapping kolom dari baris header Excel ke field yang kita butuhkan
function mapRow(row) {
  const nim =
    row["nim"] ||
    row["no._induk"] ||
    row["no_induk"] ||
    row["nomor_induk"] ||
    row["student_id"] ||
    "";
  const nama =
    row["nama_lengkap"] ||
    row["nama"] ||
    row["full_name"] ||
    row["name"] ||
    "";
  const kelas =
    row["kelas"] ||
    row["class"] ||
    row["kode_kelas"] ||
    "";
  const angkatan =
    row["angkatan"] ||
    row["tahun_masuk"] ||
    row["batch"] ||
    row["batch_year"] ||
    "";
  return { nim: String(nim).trim(), nama: String(nama).trim(), kelas: String(kelas).trim(), angkatan: String(angkatan).trim() };
}

export default function AdminSiswa() {
  const [lang, setLang] = useState("id");
  const [students, setStudents] = useState([]);
  const [filterKelas, setFilterKelas] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Add / Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [nim, setNim] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [kelas, setKelas] = useState("GS38");
  const [angkatan, setAngkatan] = useState("");

  // Import Excel state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState([]); // parsed rows sebelum simpan
  const [importErrors, setImportErrors] = useState([]);   // baris yg gagal validasi
  const [isImporting, setIsImporting] = useState(false);
  const [importDone, setImportDone] = useState(null);     // { success, skipped }
  const [importMode, setImportMode] = useState("skip");   // "skip" | "update"
  const importFileRef = useRef(null);

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

  // ─── FORM helpers ─────────────────────────────────────────────
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
        const existing = students.find(
          (s) => s.nim.toUpperCase() === nim.toUpperCase()
        );
        if (existing) {
          alert(lang === "id" ? "NIM sudah terdaftar!" : "Student ID already registered!");
          setIsSaving(false);
          return;
        }
        await saveStudent({
          id: "siswa_" + Math.random().toString(36).substr(2, 9),
          nim: nim.toUpperCase(),
          nama_lengkap: namaLengkap,
          kelas,
          angkatan,
          created_at: new Date().toISOString(),
        });
      } else {
        await saveStudent({ ...selectedStudent, nim: nim.toUpperCase(), nama_lengkap: namaLengkap, kelas, angkatan });
      }
      await syncData();
      setIsModalOpen(false);
      resetForm();
      alert(lang === "id" ? "Data siswa berhasil disimpan!" : "Student data saved successfully!");
    } catch (err) {
      console.error(err);
      alert(lang === "id" ? "Gagal menyimpan data siswa!" : "Failed to save student data!");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(lang === "id" ? "Hapus siswa ini?" : "Delete this student?")) return;
    try {
      await deleteStudent(id);
      await syncData();
    } catch (err) {
      alert(lang === "id" ? "Gagal menghapus siswa!" : "Failed to delete student!");
    }
  };

  // ─── IMPORT EXCEL ─────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]]; // sheet pertama
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (rawRows.length === 0) {
          alert(lang === "id" ? "File Excel kosong atau tidak terbaca!" : "Excel file is empty or unreadable!");
          return;
        }

        // Normalise headers
        const normalisedRows = rawRows.map((row) => {
          const normRow = {};
          Object.keys(row).forEach((k) => {
            normRow[normaliseKey(k)] = row[k];
          });
          return normRow;
        });

        const preview = [];
        const errors = [];

        normalisedRows.forEach((row, idx) => {
          const { nim, nama, kelas, angkatan } = mapRow(row);
          if (!nim || !nama) {
            errors.push({ baris: idx + 2, alasan: lang === "id" ? "NIM atau Nama kosong" : "NIM or Name is empty", data: row });
            return;
          }
          preview.push({ nim: nim.toUpperCase(), nama_lengkap: nama, kelas: kelas || "GS38", angkatan: angkatan || String(new Date().getFullYear()) });
        });

        setImportPreview(preview);
        setImportErrors(errors);
        setImportDone(null);
      } catch (err) {
        console.error(err);
        alert(lang === "id" ? "Gagal membaca file Excel!" : "Failed to read Excel file!");
      }
    };
    reader.readAsBinaryString(file);

    // Reset input agar bisa pilih file yang sama lagi
    e.target.value = "";
  };

  const handleOpenImport = () => {
    setImportPreview([]);
    setImportErrors([]);
    setImportDone(null);
    setImportMode("skip");
    setIsImportModalOpen(true);
  };

  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    setIsImporting(true);

    const existingNims = new Set(students.map((s) => s.nim.toUpperCase()));
    let successCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const row of importPreview) {
      const nimUp = row.nim.toUpperCase();
      const existing = students.find((s) => s.nim.toUpperCase() === nimUp);

      if (existing) {
        if (importMode === "update") {
          await saveStudent({ ...existing, nama_lengkap: row.nama_lengkap, kelas: row.kelas, angkatan: row.angkatan });
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        await saveStudent({
          id: "siswa_" + Math.random().toString(36).substr(2, 9),
          nim: nimUp,
          nama_lengkap: row.nama_lengkap,
          kelas: row.kelas,
          angkatan: row.angkatan,
          created_at: new Date().toISOString(),
        });
        successCount++;
      }
    }

    await syncData();
    setIsImporting(false);
    setImportDone({ success: successCount, skipped: skippedCount, updated: updatedCount });
  };

  // ─── FILTER ───────────────────────────────────────────────────
  const filteredStudents = students.filter((s) => {
    let matchKelas = filterKelas === "" || s.kelas === filterKelas;
    if (filterKelas === "AV08-FA10") {
      matchKelas = s.kelas === "AV08" || s.kelas === "FA10" || s.kelas === "AV08-FA10";
    }
    
    const q = searchQuery.toLowerCase();
    const matchSearch =
      searchQuery === "" ||
      (s.nim || "").toLowerCase().includes(q) ||
      (s.nama_lengkap || "").toLowerCase().includes(q) ||
      (s.kelas || "").toLowerCase().includes(q);
    return matchKelas && matchSearch;
  });

  const countByKelas = KELAS_OPTIONS.reduce((acc, k) => {
    if (k === "AV08-FA10") {
      acc[k] = students.filter((s) => s.kelas === "AV08" || s.kelas === "FA10" || s.kelas === "AV08-FA10").length;
    } else {
      acc[k] = students.filter((s) => s.kelas === k).length;
    }
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{t.studentList}</h2>
          <span style={{ background: "rgba(59,130,246,0.1)", color: "var(--primary)", border: "1px solid rgba(59,130,246,0.2)", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "bold" }}>
            {students.length} {lang === "id" ? "Siswa" : "Students"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Import Button */}
          <button
            className="btn btn-secondary"
            onClick={handleOpenImport}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: 16, height: 16 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            {lang === "id" ? "Import Excel" : "Import Excel"}
          </button>
          {/* Add Manual */}
          <button className="btn btn-primary" onClick={openAddModal}>
            + {t.addStudent}
          </button>
        </div>
      </div>

      {/* ── Stats by class ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "0.75rem" }}>
        {KELAS_OPTIONS.map((k) => (
          <div
            key={k}
            className="glass-panel"
            onClick={() => setFilterKelas(filterKelas === k ? "" : k)}
            style={{ padding: "1rem", textAlign: "center", cursor: "pointer", border: filterKelas === k ? "1.5px solid var(--primary)" : "1px solid var(--border-color)", transition: "all 0.2s", borderRadius: "12px" }}
          >
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: filterKelas === k ? "var(--primary)" : "var(--text-primary)" }}>
              {countByKelas[k] || 0}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Kelas {k}</div>
          </div>
        ))}
      </div>

      {/* ── Filter ── */}
      <div className="glass-panel" style={{ padding: "1.25rem 1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 2, minWidth: "200px" }}>
          <label className="form-label" style={{ marginBottom: "0.5rem", display: "block", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {lang === "id" ? "Cari NIM / Nama Siswa" : "Search NIM / Student Name"}
          </label>
          <input type="text" className="form-control" placeholder={lang === "id" ? "Ketik pencarian..." : "Type to search..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)" }} />
        </div>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label className="form-label" style={{ marginBottom: "0.5rem", display: "block", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{t.class}</label>
          <select className="form-control" value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)} style={{ background: "#0b0f19" }}>
            <option value="">{lang === "id" ? "Semua Kelas" : "All Classes"}</option>
            {KELAS_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        {(filterKelas || searchQuery) && (
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setFilterKelas(""); setSearchQuery(""); }} style={{ padding: "0.6rem 1rem", fontSize: "0.8rem" }}>
              {lang === "id" ? "Reset Filter" : "Reset Filters"}
            </button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
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
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-secondary)", padding: "2.5rem" }}>
                    {lang === "id" ? "Belum ada data siswa." : "No student data found."}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => (
                  <tr key={student.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{idx + 1}</td>
                    <td><span className="badge badge-warning" style={{ fontSize: "0.75rem" }}>{student.nim}</span></td>
                    <td style={{ fontWeight: "600" }}>{student.nama_lengkap}</td>
                    <td>
                      <span style={{ background: "rgba(59,130,246,0.12)", color: "var(--primary)", border: "1px solid rgba(59,130,246,0.25)", padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "bold" }}>
                        {student.kelas}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{student.angkatan}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button className="btn btn-secondary btn-sm" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }} onClick={() => openEditModal(student)}>
                          {lang === "id" ? "Ubah" : "Edit"}
                        </button>
                        <button className="btn btn-danger btn-sm" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }} onClick={() => handleDelete(student.id)}>
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

      {/* ── Add / Edit Modal ── */}
      <Modal isOpen={isModalOpen} title={modalMode === "add" ? t.addStudent : lang === "id" ? "Edit Data Siswa" : "Edit Student"} onClose={() => { setIsModalOpen(false); resetForm(); }}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">{t.nim} <span style={{ color: "var(--danger)" }}>*</span></label>
            <input type="text" className="form-control" placeholder="e.g. GS38001" value={nim} onChange={(e) => setNim(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === "id" ? "Nama Lengkap" : "Full Name"} <span style={{ color: "var(--danger)" }}>*</span></label>
            <input type="text" className="form-control" placeholder={lang === "id" ? "Masukkan nama lengkap" : "Enter full name"} value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">{t.class} <span style={{ color: "var(--danger)" }}>*</span></label>
              <select className="form-control" value={kelas} onChange={(e) => setKelas(e.target.value)} style={{ background: "#0b0f19" }} required>
                {KELAS_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t.angkatan} <span style={{ color: "var(--danger)" }}>*</span></label>
              <input type="text" className="form-control" placeholder="e.g. 2023" value={angkatan} onChange={(e) => setAngkatan(e.target.value)} required />
            </div>
          </div>
          <div className="modal-footer" style={{ border: "none", padding: 0, marginTop: "2rem" }}>
            <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); resetForm(); }} disabled={isSaving}>{t.cancel}</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? (lang === "id" ? "Menyimpan..." : "Saving...") : t.saveChanges}</button>
          </div>
        </form>
      </Modal>

      {/* ── Import Excel Modal ── */}
      <Modal
        isOpen={isImportModalOpen}
        title={lang === "id" ? "Import Data Siswa dari Excel" : "Import Students from Excel"}
        onClose={() => { if (!isImporting) { setIsImportModalOpen(false); setImportPreview([]); setImportErrors([]); setImportDone(null); } }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Format panduan */}
          <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "10px", padding: "1rem" }}>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.5rem", fontWeight: 600 }}>
              📋 {lang === "id" ? "Format kolom yang diharapkan:" : "Expected column format:"}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {["NIM", "Nama Lengkap", "Kelas", "Angkatan"].map((col) => (
                <span key={col} style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)", padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.75rem", fontFamily: "monospace" }}>
                  {col}
                </span>
              ))}
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.6rem" }}>
              {lang === "id"
                ? "Header tidak sensitif huruf besar/kecil. Kolom Kelas & Angkatan boleh kosong (akan diisi default)."
                : "Headers are case-insensitive. Kelas & Angkatan columns are optional (will use defaults)."}
            </p>
          </div>

          {/* Upload zone */}
          {!importDone && (
            <div
              onClick={() => importFileRef.current?.click()}
              style={{ border: "2px dashed rgba(139,92,246,0.4)", borderRadius: "12px", padding: "2rem", textAlign: "center", cursor: "pointer", background: "rgba(139,92,246,0.04)", transition: "all 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(139,92,246,0.8)"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 40, height: 40, color: "#a78bfa", margin: "0 auto 0.75rem" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <p style={{ color: "#a78bfa", fontWeight: 700, marginBottom: "0.25rem" }}>
                {lang === "id" ? "Klik untuk pilih file Excel" : "Click to select Excel file"}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>.xlsx, .xls, .csv</p>
              <input
                ref={importFileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* Preview hasil parse */}
          {importPreview.length > 0 && !importDone && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                  ✅ {importPreview.length} {lang === "id" ? "baris siap diimport" : "rows ready to import"}
                  {importErrors.length > 0 && (
                    <span style={{ color: "var(--danger)", marginLeft: "0.5rem", fontSize: "0.8rem" }}>
                      ({importErrors.length} {lang === "id" ? "baris dilewati" : "rows skipped"})
                    </span>
                  )}
                </p>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: "0.75rem", padding: "0.35rem 0.7rem" }}
                  onClick={() => importFileRef.current?.click()}
                >
                  {lang === "id" ? "Ganti File" : "Change File"}
                </button>
              </div>

              {/* Duplicate handling option */}
              <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "10px", padding: "0.9rem 1.1rem", border: "1px solid var(--border-color)" }}>
                <p style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.6rem", color: "var(--text-secondary)" }}>
                  {lang === "id" ? "Jika NIM sudah terdaftar:" : "If NIM already exists:"}
                </p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  {[
                    { val: "skip", labelId: "Lewati (biarkan data lama)", labelEn: "Skip (keep existing)" },
                    { val: "update", labelId: "Timpa (update data lama)", labelEn: "Overwrite (update existing)" },
                  ].map((opt) => (
                    <label key={opt.val} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.82rem" }}>
                      <input
                        type="radio"
                        name="importMode"
                        value={opt.val}
                        checked={importMode === opt.val}
                        onChange={() => setImportMode(opt.val)}
                        style={{ accentColor: "var(--primary)" }}
                      />
                      {lang === "id" ? opt.labelId : opt.labelEn}
                    </label>
                  ))}
                </div>
              </div>

              {/* Preview tabel */}
              <div style={{ maxHeight: "220px", overflowY: "auto", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#0d1117" }}>
                    <tr>
                      {["NIM", "Nama Lengkap", "Kelas", "Angkatan"].map((h) => (
                        <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, borderBottom: "1px solid var(--border-color)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.slice(0, 50).map((row, i) => {
                      const isDuplicate = students.some((s) => s.nim.toUpperCase() === row.nim.toUpperCase());
                      return (
                        <tr key={i} style={{ background: isDuplicate ? "rgba(245,158,11,0.06)" : "transparent" }}>
                          <td style={{ padding: "0.4rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{row.nim}</span>
                            {isDuplicate && <span style={{ marginLeft: "0.4rem", fontSize: "0.65rem", color: "#f59e0b", fontWeight: 700 }}>⚠ duplikat</span>}
                          </td>
                          <td style={{ padding: "0.4rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{row.nama_lengkap}</td>
                          <td style={{ padding: "0.4rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{row.kelas}</td>
                          <td style={{ padding: "0.4rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.04)", color: "var(--text-secondary)" }}>{row.angkatan}</td>
                        </tr>
                      );
                    })}
                    {importPreview.length > 50 && (
                      <tr>
                        <td colSpan={4} style={{ padding: "0.5rem 0.75rem", color: "var(--text-muted)", textAlign: "center", fontStyle: "italic", fontSize: "0.75rem" }}>
                          ... dan {importPreview.length - 50} baris lainnya
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Error rows */}
              {importErrors.length > 0 && (
                <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "0.75rem 1rem" }}>
                  <p style={{ color: "#ef4444", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                    ⚠ {importErrors.length} {lang === "id" ? "baris dilewati:" : "rows skipped:"}
                  </p>
                  {importErrors.slice(0, 5).map((err, i) => (
                    <p key={i} style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                      Baris {err.baris}: {err.alasan}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Hasil import selesai */}
          {importDone && (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🎉</div>
              <p style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "0.5rem", color: "var(--primary)" }}>
                {lang === "id" ? "Import Selesai!" : "Import Complete!"}
              </p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginTop: "0.75rem" }}>
                <span style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", padding: "0.4rem 1rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 700 }}>
                  +{importDone.success} {lang === "id" ? "ditambah" : "added"}
                </span>
                {importDone.updated > 0 && (
                  <span style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)", padding: "0.4rem 1rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 700 }}>
                    ✎ {importDone.updated} {lang === "id" ? "diupdate" : "updated"}
                  </span>
                )}
                {importDone.skipped > 0 && (
                  <span style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", padding: "0.4rem 1rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 700 }}>
                    ⏭ {importDone.skipped} {lang === "id" ? "dilewati" : "skipped"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="modal-footer" style={{ border: "none", padding: 0 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setIsImportModalOpen(false); setImportPreview([]); setImportErrors([]); setImportDone(null); }}
              disabled={isImporting}
            >
              {importDone ? (lang === "id" ? "Tutup" : "Close") : t.cancel}
            </button>
            {importPreview.length > 0 && !importDone && (
              <button
                className="btn btn-primary"
                onClick={handleConfirmImport}
                disabled={isImporting}
                style={{ minWidth: "160px" }}
              >
                {isImporting ? (
                  <span>{lang === "id" ? `Mengimport...` : "Importing..."}</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15, marginRight: "0.4rem" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    {lang === "id" ? `Import ${importPreview.length} Siswa` : `Import ${importPreview.length} Students`}
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      </Modal>
    </div>
  );
}
