"use client";

import { useState, useEffect } from "react";
import { getUsers, saveUser } from "../../../lib/db";
import { translations } from "../../../lib/translations";

export default function AdminRegisterPage() {
  const [lang, setLang] = useState("id");
  
  // Form States
  const [role, setRole] = useState("dosen");
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fotoProfil, setFotoProfil] = useState(null);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [dosenList, setDosenList] = useState([]);
  const [selectedDosenId, setSelectedDosenId] = useState("");

  const fetchDosen = async () => {
    try {
      const users = await getUsers();
      setDosenList(users.filter((u) => u.role === "dosen"));
    } catch (e) {
      console.error(e);
    }
  };

  const syncData = () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
  };

  useEffect(() => {
    syncData();
    fetchDosen();
    window.addEventListener("storage", syncData);
    return () => window.removeEventListener("storage", syncData);
  }, []);

  // Populate email and password from existing Dosen data
  useEffect(() => {
    if (role === "dosen" && selectedDosenId) {
      const selected = dosenList.find((d) => d.id === selectedDosenId);
      if (selected) {
        setNama(selected.nama_lengkap);
        setEmail(selected.email || "");
        setPassword(selected.password || "");
      }
    } else if (role === "admin") {
      setNama("");
      setEmail("");
      setPassword("");
      setSelectedDosenId("");
    }
  }, [role, selectedDosenId, dosenList]);

  const t = translations[lang];

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoProfil(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    if (role === "admin") {
      setNama("");
      setEmail("");
      setPassword("");
    }
    setFotoProfil(null);
    setSelectedDosenId("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!nama.trim() || !email.trim() || !password.trim()) {
      setError(lang === "id" ? "Semua field bertanda bintang (*) wajib diisi!" : "All fields with an asterisk (*) are required!");
      setLoading(false);
      return;
    }

    try {
      const users = await getUsers();
      
      // Validate unique email (ignoring self if updating)
      const userId = (role === "dosen" && selectedDosenId) 
        ? selectedDosenId 
        : (role === "admin" ? "admin_" : "u_") + Math.random().toString(36).substr(2, 9);
        
      const existingUser = users.find((u) => u.id === userId);

      if (users.some((u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== userId)) {
        setError(lang === "id" ? "Email sudah terdaftar!" : "Email already registered!");
        setLoading(false);
        return;
      }

      const userToSave = {
        ...(existingUser || {}),
        id: userId,
        email: email.toLowerCase(),
        password: password,
        nama_lengkap: nama,
        role: role,
        foto_profil: fotoProfil || (existingUser ? existingUser.foto_profil : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100")
      };
      
      if (!existingUser) {
         userToSave.nip = "-";
      }

      await saveUser(userToSave);

      setSuccess(lang === "id" ? `User baru (${role.toUpperCase()}) berhasil didaftarkan!` : `New user (${role.toUpperCase()}) registered successfully!`);
      resetForm();
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(lang === "id" ? "Gagal mendaftarkan user baru!" : "Failed to register user!");
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "calc(100vh - 8rem)", maxWidth: "650px", margin: "0 auto" }}>
      <div className="glass-panel" style={{ padding: "1.5rem 2rem", background: "linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
          {lang === "id" ? "Registrasi Akun Baru" : "Register New Account"}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          {lang === "id" ? "Gunakan form ini untuk mendaftarkan akun Dosen atau Staff Akademik (Admin) baru" : "Use this form to register new Lecturer or Academic Staff (Admin) accounts"}
        </p>
      </div>

      <div className="glass-panel dashboard-panel">
        {error && <div className="auth-error" style={{ marginBottom: "1.5rem" }}>{error}</div>}
        {success && (
          <div className="badge badge-success" style={{ display: "block", textAlign: "center", padding: "0.75rem", fontSize: "0.875rem", marginBottom: "1.5rem", width: "100%" }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Select Role */}
          <div className="form-group">
            <label className="form-label">
              {lang === "id" ? "Peran / Tipe Akun" : "Role / Account Type"} <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <select
              className="form-control"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ background: "#0b0f19" }}
            >
              <option value="dosen">{lang === "id" ? "Dosen (Lecturer)" : "Lecturer"}</option>
              <option value="admin">{lang === "id" ? "Staff Akademik / Admin" : "Academic Staff / Admin"}</option>
            </select>
          </div>

          {/* Full Name / Dosen Selector */}
          {role === "dosen" ? (
            <div className="form-group">
              <label className="form-label">
                {lang === "id" ? "Pilih Data Dosen" : "Select Lecturer Data"} <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select
                className="form-control"
                value={selectedDosenId}
                onChange={(e) => setSelectedDosenId(e.target.value)}
                style={{ background: "#0b0f19" }}
                required
              >
                <option value="">{lang === "id" ? "-- Pilih Dosen --" : "-- Select Lecturer --"}</option>
                {dosenList.map((d) => (
                  <option key={d.id} value={d.id}>{d.nama_lengkap}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">
                {lang === "id" ? "Nama Lengkap" : "Full Name"} <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. John Doe"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
              />
            </div>
          )}

          {/* Email */}
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

          {/* Password */}
          <div className="form-group">
            <label className="form-label">{t.password} <span style={{ color: "var(--danger)" }}>*</span></label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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

          {/* Photo upload (Optional) */}
          <div className="form-group" style={{ marginBottom: "2rem" }}>
            <label className="form-label">
              {lang === "id" ? "Foto Profil (Opsional)" : "Profile Photo (Optional)"}
            </label>
            <input
              type="file"
              className="form-control"
              accept="image/*"
              onChange={handlePhotoChange}
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

          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "1rem" }} disabled={loading}>
            {loading ? "Registering account..." : lang === "id" ? "Daftarkan Akun Baru" : "Register New Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
