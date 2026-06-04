"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUsers, saveUser } from "../../lib/db";
import { translations } from "../../lib/translations";

export default function RegisterPage() {
  const router = useRouter();
  const [lang, setLang] = useState("id");
  
  // Form States
  const [role, setRole] = useState("dosen");
  const [nama, setNama] = useState("");
  const [nip, setNip] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fotoProfil, setFotoProfil] = useState(null);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!nama.trim() || !email.trim() || !password.trim()) {
      setError(lang === "id" ? "Semua field bertanda bintang (*) wajib diisi!" : "All fields with an asterisk (*) are required!");
      setLoading(false);
      return;
    }

    if (role === "dosen" && !nip.trim()) {
      setError(lang === "id" ? "NIP wajib diisi untuk Dosen!" : "NIP is required for Lecturers!");
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
        nip: role === "dosen" ? nip : "ADMIN",
        role: role,
        foto_profil: fotoProfil || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100"
      };

      await saveUser(newUser);

      alert(lang === "id" ? "Pendaftaran berhasil! Silakan masuk." : "Registration successful! Please log in.");
      router.push("/login");
    } catch (err) {
      console.error(err);
      setError(lang === "id" ? "Gagal melakukan pendaftaran!" : "Registration failed!");
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLang(lang === "id" ? "en" : "id");
  };

  return (
    <div className="auth-container">
      {/* Dynamic Glow Backgrounds */}
      <div className="auth-bg-glow-1"></div>
      <div className="auth-bg-glow-2"></div>

      {/* Language Selector Top Right */}
      <div className="lang-selector-top">
        <button type="button" className="lang-btn" onClick={toggleLanguage}>
          {lang === "id" ? "🇬🇧 English" : "🇮🇩 Indonesia"}
        </button>
      </div>

      <div className="glass-panel auth-card animate-fade-in" style={{ maxWidth: "500px", padding: "2rem" }}>
        <div className="auth-header" style={{ marginBottom: "1.5rem" }}>
          <div className="auth-logo">
            <div className="airplane-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 28, height: 28 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </div>
          </div>
          <h1 className="auth-title gradient-text">
            {lang === "id" ? "Daftar Akun Baru" : "Register New Account"}
          </h1>
          <p className="auth-subtitle">{t.institution}</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Role select */}
          <div className="form-group">
            <label className="form-label">{t.role} <span style={{ color: "var(--danger)" }}>*</span></label>
            <select
              className="form-control"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ background: "#0b0f19" }}
            >
              <option value="dosen">{t.dosen}</option>
              <option value="admin">{t.admin}</option>
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

          {/* NIP (only for Dosen) */}
          {role === "dosen" && (
            <div className="form-group">
              <label className="form-label">NIP <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. NIP. 198012122005011002"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                required={role === "dosen"}
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
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Lecturer Photo (Optional) */}
          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
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
              <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <img 
                  src={fotoProfil} 
                  alt="Preview" 
                  style={{ width: "45px", height: "45px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-color)" }} 
                />
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                  onClick={() => setFotoProfil(null)}
                >
                  {lang === "id" ? "Hapus" : "Remove"}
                </button>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
            {loading ? "Registering account..." : lang === "id" ? "Daftar Akun" : "Register Account"}
          </button>
        </form>

        <div style={{ marginTop: "1.25rem", textAlign: "center" }}>
          <Link href="/login" style={{ color: "var(--primary)", fontSize: "0.85rem", fontWeight: "600", textDecoration: "none" }}>
            {lang === "id" ? "Sudah punya akun? Masuk" : "Already have an account? Log In"}
          </Link>
        </div>
      </div>
    </div>
  );
}
