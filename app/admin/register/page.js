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
  const [fotoProfil, setFotoProfil] = useState(null);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const syncData = () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
  };

  useEffect(() => {
    syncData();
    window.addEventListener("storage", syncData);
    return () => window.removeEventListener("storage", syncData);
  }, []);

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
    setNama("");
    setEmail("");
    setPassword("");
    setFotoProfil(null);
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
      
      // Validate unique email
      if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        setError(lang === "id" ? "Email sudah terdaftar!" : "Email already registered!");
        setLoading(false);
        return;
      }

      // Generate a unique ID
      const newUserId = (role === "admin" ? "admin_" : "u_") + Math.random().toString(36).substr(2, 9);

      const newUser = {
        id: newUserId,
        email: email.toLowerCase(),
        password: password,
        nama_lengkap: nama,
        nip: "-", // Default placeholder since NIP is removed
        role: role,
        foto_profil: fotoProfil || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100"
      };

      await saveUser(newUser);

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
    <div style={{ maxWidth: "650px", margin: "0 auto" }}>
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

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">
              {lang === "id" ? "Nama Lengkap" : "Full Name"} <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Capt. John Doe, M.T."
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
            />
          </div>

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
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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
