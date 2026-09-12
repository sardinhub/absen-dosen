"use client";

import { useState, useEffect } from "react";
import { getCasis, saveCasis, deleteCasis, convertCasisToNim } from "../../../lib/db";
import { translations } from "../../../lib/translations";

const JURUSAN_OPTIONS = [
  "Ground Staff",
  "AVSEC",
  "Flight Attendant"
];

export default function AdminCasisPage() {
  const [lang, setLang] = useState("id");
  const [casisList, setCasisList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJurusan, setSelectedJurusan] = useState("ALL");

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    nama_lengkap: "",
    asal_sekolah: "",
    jurusan: JURUSAN_OPTIONS[0],
    username: "",
    password: "",
    status_pembayaran: "LUNAS"
  });

  // Convert Modal States
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertTarget, setConvertTarget] = useState(null);
  const [convertData, setConvertData] = useState({
    nim: "",
    kelas: "Aero-A",
    angkatan: "2026"
  });

  const [toastMessage, setToastMessage] = useState("");

  const t = translations[lang];

  useEffect(() => {
    const savedLang = localStorage.getItem("sikad_lang");
    if (savedLang) setLang(savedLang);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCasis();
      setCasisList(data);
    } catch (err) {
      console.error("Gagal memuat data CASIS:", err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleOpenAddModal = () => {
    setEditItem(null);
    const nextNum = casisList.length + 1;
    const currentYear = new Date().getFullYear();
    const defaultUsername = `casis${currentYear}${String(nextNum).padStart(2, '0')}`;
    
    setFormData({
      nama_lengkap: "",
      asal_sekolah: "",
      jurusan: JURUSAN_OPTIONS[0],
      username: defaultUsername,
      password: "123",
      status_pembayaran: "LUNAS"
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditItem(item);
    setFormData({
      nama_lengkap: item.nama_lengkap || "",
      asal_sekolah: item.asal_sekolah || "",
      jurusan: item.jurusan || JURUSAN_OPTIONS[0],
      username: item.username || "",
      password: item.password || "",
      status_pembayaran: item.status_pembayaran || "LUNAS"
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        id: editItem ? editItem.id : undefined,
        niss: editItem ? editItem.niss : undefined
      };
      await saveCasis(payload);
      showToast(editItem ? "Data CASIS berhasil diperbarui!" : "Data CASIS berhasil ditambahkan dan NISS telah dibuat otomatis!");
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error("Gagal menyimpan CASIS:", err);
      alert("Gagal menyimpan data CASIS.");
    }
  };

  const handleDelete = async (id, nama) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus calon siswa ${nama}?`)) return;
    try {
      await deleteCasis(id);
      showToast("Data CASIS berhasil dihapus!");
      loadData();
    } catch (err) {
      console.error("Gagal menghapus CASIS:", err);
      alert("Gagal menghapus data.");
    }
  };

  const handleOpenConvertModal = (item) => {
    setConvertTarget(item);
    const currentYear = new Date().getFullYear();
    const nextNim = `${currentYear}${String(casisList.length + 100).padStart(4, '0')}`;
    setConvertData({
      nim: nextNim,
      kelas: "Aero-A",
      angkatan: String(currentYear)
    });
    setShowConvertModal(true);
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!convertTarget) return;
    try {
      await convertCasisToNim(
        convertTarget.id,
        convertData.nim,
        convertData.kelas,
        convertData.angkatan
      );
      showToast(`Berhasil! ${convertTarget.nama_lengkap} kini memiliki NIM resmi (${convertData.nim}) dan telah terdaftar di data siswa utama.`);
      setShowConvertModal(false);
      loadData();
    } catch (err) {
      console.error("Gagal mengonversi ke NIM:", err);
      alert("Gagal mengonversi data ke NIM.");
    }
  };

  // Filtered List
  const filteredCasis = casisList.filter(item => {
    const matchesSearch = (item.nama_lengkap || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.niss || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.asal_sekolah || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.username || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesJurusan = selectedJurusan === "ALL" || item.jurusan === selectedJurusan;
    return matchesSearch && matchesJurusan;
  });

  const totalCasis = casisList.length;
  const convertedCount = casisList.filter(c => c.status_konversi === "Terkonversi ke NIM").length;
  const activeCasisCount = totalCasis - convertedCount;

  return (
    <div className="container" style={{ padding: "1.5rem 1rem" }}>
      {/* Header Title Banner */}
      <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "16px", marginBottom: "1.5rem", background: "linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(99, 102, 241, 0.05))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span className="badge badge-primary" style={{ fontSize: "0.75rem" }}>Portal Akademik</span>
              <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>Pangkal Lunas</span>
            </div>
            <h1 className="gradient-text" style={{ fontSize: "1.75rem", margin: 0 }}>
              {lang === "id" ? "Pendataan & Konversi Calon Siswa (CASIS)" : "Prospective Student (CASIS) Management"}
            </h1>
            <p style={{ color: "#9ca3af", margin: "0.25rem 0 0 0", fontSize: "0.9rem" }}>
              {lang === "id" 
                ? "Kelola pendataan siswa yang telah membayar uang pangkal, dapatkan NISS otomatis, serta konversi menjadi NIM resmi kampus."
                : "Manage prospective students who completed initial fee payment, generate NISS automatically, and convert to official NIM."}
            </p>
          </div>
          <button className="btn btn-primary" onClick={handleOpenAddModal} style={{ gap: "0.5rem", padding: "0.75rem 1.25rem" }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 18, height: 18 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>{lang === "id" ? "Tambah Calon Siswa (CASIS)" : "Add New CASIS"}</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 9999,
          background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff",
          padding: "0.85rem 1.25rem", borderRadius: "10px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          fontWeight: 500, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem"
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "12px", borderLeft: "4px solid #0ea5e9" }}>
          <div style={{ color: "#9ca3af", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total CASIS Terdaftar
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#0ea5e9", marginTop: "0.25rem" }}>
            {totalCasis} <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "#9ca3af" }}>Orang</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "12px", borderLeft: "4px solid #10b981" }}>
          <div style={{ color: "#9ca3af", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Status Uang Pangkal
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#10b981", marginTop: "0.25rem" }}>
            100% <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "#9ca3af" }}>LUNAS</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "12px", borderLeft: "4px solid #f59e0b" }}>
          <div style={{ color: "#9ca3af", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            CASIS Aktif (NISS)
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#f59e0b", marginTop: "0.25rem" }}>
            {activeCasisCount} <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "#9ca3af" }}>Siswa</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "12px", borderLeft: "4px solid #8b5cf6" }}>
          <div style={{ color: "#9ca3af", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Terkonversi ke NIM Resmi
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#8b5cf6", marginTop: "0.25rem" }}>
            {convertedCount} <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "#9ca3af" }}>Siswa</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel" style={{ padding: "1rem", borderRadius: "12px", marginBottom: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "240px" }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by NISS, Nama Siswa, Asal Sekolah, Username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ width: "220px" }}>
          <select
            className="form-control select-dark"
            value={selectedJurusan}
            onChange={(e) => setSelectedJurusan(e.target.value)}
            style={{
              backgroundColor: "#0f172a",
              color: "#f8fafc",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <option value="ALL" style={{ backgroundColor: "#0f172a", color: "#ffffff" }}>-- Semua Jurusan --</option>
            {JURUSAN_OPTIONS.map((j, i) => (
              <option key={i} value={j} style={{ backgroundColor: "#0f172a", color: "#ffffff" }}>{j}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-panel" style={{ borderRadius: "12px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>
            Memuat data calon siswa...
          </div>
        ) : filteredCasis.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>
            Belum ada data Calon Siswa (CASIS) yang sesuai.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid var(--border-color)", textAlign: "left", fontSize: "0.85rem", color: "#9ca3af" }}>
                  <th style={{ padding: "1rem" }}>NISS (Otomatis)</th>
                  <th style={{ padding: "1rem" }}>Nama Siswa</th>
                  <th style={{ padding: "1rem" }}>Asal Sekolah</th>
                  <th style={{ padding: "1rem" }}>Jurusan</th>
                  <th style={{ padding: "1rem" }}>Username & Password</th>
                  <th style={{ padding: "1rem" }}>Status Pangkal</th>
                  <th style={{ padding: "1rem" }}>Status Konversi</th>
                  <th style={{ padding: "1rem", textAlign: "center" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredCasis.map((item) => {
                  const isConverted = item.status_konversi === "Terkonversi ke NIM";
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.88rem" }}>
                      <td style={{ padding: "1rem" }}>
                        <span style={{
                          fontFamily: "monospace",
                          fontWeight: 700,
                          padding: "0.2rem 0.5rem",
                          borderRadius: "6px",
                          background: "rgba(14, 165, 233, 0.15)",
                          color: "#38bdf8",
                          border: "1px solid rgba(14, 165, 233, 0.3)"
                        }}>
                          {item.niss || "NISS-AUTO"}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", fontWeight: 600, color: "#f9fafb" }}>
                        {item.nama_lengkap}
                      </td>
                      <td style={{ padding: "1rem", color: "#d1d5db" }}>
                        {item.asal_sekolah}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span className="badge badge-secondary" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e5e7eb" }}>
                          {item.jurusan}
                        </span>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                          User: <strong style={{ color: "#38bdf8" }}>{item.username}</strong>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                          Pass: <span style={{ fontFamily: "monospace", color: "#fbbf24" }}>{item.password}</span>
                        </div>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span className="badge badge-success" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                          ✓ LUNAS
                        </span>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        {isConverted ? (
                          <div>
                            <span className="badge" style={{ background: "rgba(139, 92, 246, 0.2)", color: "#c084fc", border: "1px solid rgba(139, 92, 246, 0.4)", display: "inline-flex", gap: "0.25rem", alignItems: "center" }}>
                              ✓ NIM: {item.nim}
                            </span>
                          </div>
                        ) : (
                          <span className="badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                            ● CASIS Aktif
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "1rem", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                          {!isConverted && (
                            <button
                              className="btn btn-sm"
                              style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#fff", border: "none", padding: "0.35rem 0.65rem", fontSize: "0.75rem", borderRadius: "6px" }}
                              title="Konversi ke NIM Resmi"
                              onClick={() => handleOpenConvertModal(item)}
                            >
                              ⚡ Konversi NIM
                            </button>
                          )}
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
                            onClick={() => handleOpenEditModal(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
                            onClick={() => handleDelete(item.id, item.nama_lengkap)}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit CASIS */}
      {showModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(5px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "1rem"
        }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "540px", borderRadius: "16px", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, color: "#f9fafb" }}>
                {editItem ? "Edit Data Calon Siswa (CASIS)" : "Tambah Calon Siswa (CASIS)"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "1.5rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave}>
              {!editItem && (
                <div style={{ marginBottom: "1rem", background: "rgba(14, 165, 233, 0.1)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid rgba(14, 165, 233, 0.3)" }}>
                  <div style={{ fontSize: "0.8rem", color: "#38bdf8", fontWeight: 600 }}>
                    ℹ NISS (Nomor Induk Siswa Sementara) Otomatis
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.2rem" }}>
                    Nomor NISS format <code style={{ color: "#38bdf8" }}>NISS-2026-XXX</code> akan tergenerasi secara otomatis setelah disimpan.
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Muhammad Farhan"
                  value={formData.nama_lengkap}
                  onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">Asal Sekolah *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: SMA Negeri 2 Makassar"
                  value={formData.asal_sekolah}
                  onChange={(e) => setFormData({ ...formData, asal_sekolah: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">Jurusan yang Diambil *</label>
                <select
                  className="form-control select-dark"
                  value={formData.jurusan}
                  onChange={(e) => setFormData({ ...formData, jurusan: e.target.value })}
                  style={{
                    backgroundColor: "#0f172a",
                    color: "#f8fafc",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {JURUSAN_OPTIONS.map((j, idx) => (
                    <option key={idx} value={j} style={{ backgroundColor: "#0f172a", color: "#ffffff" }}>{j}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Username Login *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. farhancasis"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 123"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", color: "#34d399", fontWeight: 600, fontSize: "0.9rem" }}>
                  <input
                    type="checkbox"
                    checked={formData.status_pembayaran === "LUNAS"}
                    onChange={(e) => setFormData({ ...formData, status_pembayaran: e.target.checked ? "LUNAS" : "BELUM" })}
                  />
                  <span>Siswa telah melunasi Uang Pangkal</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editItem ? "Simpan Perubahan" : "Tambah & Generate NISS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Convert to NIM */}
      {showConvertModal && convertTarget && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(5px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "1rem"
        }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "500px", borderRadius: "16px", padding: "1.5rem", border: "1px solid rgba(139, 92, 246, 0.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, color: "#c084fc", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                ⚡ Konversi NISS ke NIM Resmi
              </h3>
              <button
                onClick={() => setShowConvertModal(false)}
                style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "1.5rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <div style={{ marginBottom: "1rem", background: "rgba(139, 92, 246, 0.1)", padding: "0.85rem", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.85rem", color: "#d1d5db" }}>
                Nama Siswa: <strong style={{ color: "#fff" }}>{convertTarget.nama_lengkap}</strong>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#d1d5db", marginTop: "0.25rem" }}>
                NISS Saat Ini: <strong style={{ color: "#38bdf8" }}>{convertTarget.niss}</strong>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#d1d5db", marginTop: "0.25rem" }}>
                Jurusan: <strong>{convertTarget.jurusan}</strong>
              </div>
            </div>

            <form onSubmit={handleConvertSubmit}>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">Nomor Induk Mahasiswa (NIM Baru) *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 20261005"
                  value={convertData.nim}
                  onChange={(e) => setConvertData({ ...convertData, nim: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div className="form-group">
                  <label className="form-label">Kelas Perkuliahan *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Aero-A"
                    value={convertData.kelas}
                    onChange={(e) => setConvertData({ ...convertData, kelas: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Angkatan *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 2026"
                    value={convertData.angkatan}
                    onChange={(e) => setConvertData({ ...convertData, angkatan: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConvertModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}>
                  Proses Konversi NIM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
