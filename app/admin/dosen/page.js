"use client";

import { useState, useEffect } from "react";
import { getUsers, saveUser, deleteUser } from "../../../lib/db";
import { translations } from "../../../lib/translations";
import Modal from "../../../components/Modal";

export default function AdminDosen() {
  const [lang, setLang] = useState("id");
  const [dosenList, setDosenList] = useState([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // add | edit
  const [selectedDosen, setSelectedDosen] = useState(null);

  // Form Fields
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fotoProfil, setFotoProfil] = useState(null);

  const syncData = async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
    try {
      const rawUsers = await getUsers();
      setDosenList(rawUsers.filter((u) => u.role === "dosen"));
    } catch (err) {
      console.error("Error loading lecturers list:", err);
    }
  };

  useEffect(() => {
    syncData();
    window.addEventListener("storage", syncData);
    return () => window.removeEventListener("storage", syncData);
  }, []);

  const t = translations[lang];

  const resetForm = () => {
    setNama("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setFotoProfil(null);
    setSelectedDosen(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalMode("add");
    setIsModalOpen(true);
  };

  const openEditModal = (dosen) => {
    setSelectedDosen(dosen);
    setNama(dosen.nama_lengkap);
    setEmail(dosen.email);
    setPassword(dosen.password);
    setFotoProfil(dosen.foto_profil || null);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      if (modalMode === "add") {
        const rawUsers = await getUsers();
        // Validate unique email
        if (rawUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
          alert(lang === "id" ? "Email sudah terdaftar!" : "Email already registered!");
          return;
        }

        const newUser = {
          id: "u" + (rawUsers.length + 1),
          email: email,
          password: password || "dosen", // Default password
          nama_lengkap: nama,
          nip: "-", // Default placeholder since NIP is removed
          role: "dosen",
          foto_profil: fotoProfil || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100" // Default profile
        };

        await saveUser(newUser);
      } else {
        // Edit mode
        const updatedDosen = {
          ...selectedDosen,
          nama_lengkap: nama,
          email: email,
          password: password,
          foto_profil: fotoProfil || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100",
          nip: "-"
        };
        await saveUser(updatedDosen);
      }

      await syncData();
      setIsModalOpen(false);
      resetForm();
      alert(lang === "id" ? "Data Dosen berhasil disimpan!" : "Lecturer data saved successfully!");
    } catch (err) {
      alert(lang === "id" ? "Gagal menyimpan data dosen!" : "Failed to save lecturer!");
    }
  };

  const handleDelete = async (id) => {
    const confirmMsg = lang === "id" 
      ? "Apakah Anda yakin ingin menghapus dosen ini?" 
      : "Are you sure you want to delete this lecturer?";
    if (!confirm(confirmMsg)) return;

    try {
      await deleteUser(id);
      await syncData();
      alert(lang === "id" ? "Dosen berhasil dihapus." : "Lecturer deleted successfully.");
    } catch (err) {
      alert(lang === "id" ? "Gagal menghapus dosen!" : "Failed to delete lecturer!");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{t.lecturerList}</h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          + {t.addLecturer}
        </button>
      </div>

      <div className="glass-panel dashboard-panel">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>{t.lecturerName}</th>
                <th>{t.email}</th>
                <th style={{ textAlign: "right" }}>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {dosenList.map((dosen) => (
                <tr key={dosen.id}>
                  <td>
                    <img src={dosen.foto_profil} alt={dosen.nama_lengkap} className="user-avatar" />
                  </td>
                  <td>
                    <strong>{dosen.nama_lengkap}</strong>
                  </td>
                  <td>{dosen.email}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
                        onClick={() => openEditModal(dosen)}
                      >
                        {lang === "id" ? "Ubah" : "Edit"}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
                        onClick={() => handleDelete(dosen.id)}
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

      {/* Add / Edit Lecturer Modal */}
      <Modal
        isOpen={isModalOpen}
        title={modalMode === "add" ? t.addLecturer : t.editLecturer}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">{t.lecturerName} <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Capt. John Doe, M.T."
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.email} <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. johndoe@triesakti.ac.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              {t.password} {modalMode === "add" && <span style={{ color: "var(--danger)" }}>*</span>}
            </label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={modalMode === "add"}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: 18, height: 18 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: 18, height: 18 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              {lang === "id" ? "Foto Profil Dosen (Opsional)" : "Lecturer Profile Photo (Optional)"}
            </label>
            <input
              type="file"
              className="form-control"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setFotoProfil(reader.result);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            {fotoProfil && (
              <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <img 
                  src={fotoProfil} 
                  alt="Preview" 
                  style={{ width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-color)" }} 
                />
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                  onClick={() => setFotoProfil(null)}
                >
                  {lang === "id" ? "Hapus" : "Remove"}
                </button>
              </div>
            )}
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
