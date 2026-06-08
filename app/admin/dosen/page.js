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
  const [noRekening, setNoRekening] = useState("");
  const [namaBank, setNamaBank] = useState("BCA");
  const [namaPemilikRek, setNamaPemilikRek] = useState("");
  const [noWa, setNoWa] = useState("");

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

  const resetForm = () => {
    setNama("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setFotoProfil(null);
    setNoRekening("");
    setNamaBank("BCA");
    setNamaPemilikRek("");
    setNoWa("");
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
    setNoRekening(dosen.no_rekening || "");
    setNamaBank(dosen.nama_bank || "BCA");
    setNamaPemilikRek(dosen.nama_pemilik_rek || "");
    setNoWa(dosen.no_wa || "");
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (modalMode === "add") {
        const rawUsers = await getUsers();
        // Validate unique email
        if (rawUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
          alert(lang === "id" ? "Email sudah terdaftar!" : "Email already registered!");
          setIsSaving(false);
          return;
        }

        const newUser = {
          id: "u" + (rawUsers.length + 1),
          email: email,
          password: password || "dosen", // Default password
          nama_lengkap: nama,
          nip: "-", // Default placeholder since NIP is removed
          role: "dosen",
          foto_profil: fotoProfil || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100", // Default profile
          no_rekening: noRekening,
          nama_bank: namaBank,
          nama_pemilik_rek: namaPemilikRek,
          no_wa: noWa
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
          nip: "-",
          no_rekening: noRekening,
          nama_bank: namaBank,
          nama_pemilik_rek: namaPemilikRek,
          no_wa: noWa
        };
        await saveUser(updatedDosen);
      }

      // Show alert quickly before waiting for table refresh
      alert(lang === "id" ? "Data Dosen berhasil disimpan!" : "Lecturer data saved successfully!");
      
      setIsModalOpen(false);
      resetForm();
      setIsSaving(false);
      
      // Sync table silently in background
      syncData();
    } catch (err) {
      console.error("Save Error:", err);
      const errDetail = err?.message || JSON.stringify(err);
      alert((lang === "id" ? "Gagal menyimpan data dosen! DETAIL ERROR DARI SUPABASE:\n\n" : "Failed to save lecturer! ERROR:\n\n") + errDetail);
      setIsSaving(false);
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{t.lecturerList}</h2>
          <span style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--primary)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "bold" }}>
            {dosenList.length} {lang === "id" ? "Data" : "Records"}
          </span>
        </div>
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
                <th>{lang === "id" ? "Kontak" : "Contact"}</th>
                <th>{lang === "id" ? "Info Rekening" : "Account Info"}</th>
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
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <a href={`mailto:${dosen.email}`} style={{ color: "var(--text-secondary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                        {dosen.email}
                      </a>
                      {dosen.no_wa && (
                        <a href={`https://wa.me/${dosen.no_wa.replace(/\D/g, '').startsWith('0') ? '62' + dosen.no_wa.replace(/\D/g, '').substring(1) : dosen.no_wa.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: "#25D366", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem", fontWeight: 600 }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          {dosen.no_wa}
                        </a>
                      )}
                    </div>
                  </td>
                  <td>
                    {dosen.no_rekening ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--primary)" }}>{dosen.nama_bank}</span>
                        <span style={{ fontSize: "0.85rem" }}>{dosen.no_rekening}</span>
                        {dosen.nama_pemilik_rek && (
                          <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>a.n. {dosen.nama_pemilik_rek}</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                        {lang === "id" ? "Belum ada" : "No data"}
                      </span>
                    )}
                  </td>
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
            <label className="form-label">{lang === "id" ? "Nomor WhatsApp" : "WhatsApp Number"} <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              type="tel"
              className="form-control"
              placeholder="e.g. 081234567890"
              value={noWa}
              onChange={(e) => setNoWa(e.target.value)}
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">{lang === "id" ? "Nama Bank" : "Bank Name"}</label>
              <select
                className="form-control"
                value={namaBank}
                onChange={(e) => setNamaBank(e.target.value)}
                style={{ background: "#0b0f19" }}
              >
                <option value="BCA">BCA</option>
                <option value="Mandiri">Mandiri</option>
                <option value="BNI">BNI</option>
                <option value="BRI">BRI</option>
                <option value="BSI">BSI</option>
                <option value="CIMB Niaga">CIMB Niaga</option>
                <option value="Danamon">Danamon</option>
                <option value="Permata">Permata</option>
                <option value="Bank Jago">Bank Jago</option>
                <option value="SeaBank">SeaBank</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">{lang === "id" ? "Nomor Rekening" : "Account Number"}</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 1234567890"
                value={noRekening}
                onChange={(e) => setNoRekening(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{lang === "id" ? "Nama Pemilik Rekening" : "Account Owner Name"}</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. ANDI WIJAYA"
              value={namaPemilikRek}
              onChange={(e) => setNamaPemilikRek(e.target.value)}
            />
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
