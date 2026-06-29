"use client";

import { useState, useEffect } from "react";
import { getUsers, saveUser } from "../../../lib/db";
import { translations } from "../../../lib/translations";

// Menu list that can be granted to an admin
const ADMIN_MENUS = [
  { key: "kelola-data",         labelId: "Kelola Data (Dosen, Siswa, Matakuliah, Jadwal, Penilaian)", labelEn: "Manage Data (Lecturers, Students, Courses, Schedule, Grades)" },
  { key: "register",            labelId: "Registrasi Akun",         labelEn: "Account Registration" },
  { key: "rekap-absen-siswa",   labelId: "Rekap Absen Siswa",       labelEn: "Student Attendance Recap" },
  { key: "silabus",             labelId: "Silabus Pembelajaran",    labelEn: "Course Syllabus" },
  { key: "validasi",            labelId: "Validasi Kehadiran Dosen",labelEn: "Lecturer Attendance Validation" },
  { key: "laporan",             labelId: "Rekap & Laporan",         labelEn: "Summary & Reports" },
  { key: "evaluasi-penilaian",  labelId: "Evaluasi & Penilaian",    labelEn: "Evaluation & Grading" },
];

const ALL_MENU_KEYS = ADMIN_MENUS.map(m => m.key);

export default function AdminRegisterPage() {
  const [lang, setLang] = useState("id");

  // Form States
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fotoProfil, setFotoProfil] = useState(null);
  const [menuPermissions, setMenuPermissions] = useState([]);

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

  const isSuperAdmin = menuPermissions.length === ALL_MENU_KEYS.length;

  const handleMenuToggle = (key) => {
    setMenuPermissions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    if (isSuperAdmin) {
      setMenuPermissions([]);
    } else {
      setMenuPermissions([...ALL_MENU_KEYS]);
    }
  };

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
    setMenuPermissions([]);
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

    if (menuPermissions.length === 0) {
      setError(lang === "id" ? "Pilih minimal satu Hak Akses menu untuk akun ini!" : "Please select at least one menu permission for this account!");
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

      const newUserId = "admin_" + Math.random().toString(36).substr(2, 9);

      const newUser = {
        id: newUserId,
        email: email.toLowerCase(),
        password: password,
        nama_lengkap: nama,
        nip: "-",
        role: "admin",
        menu_permissions: menuPermissions,
        foto_profil: fotoProfil || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100"
      };

      await saveUser(newUser);

      const accountType = isSuperAdmin
        ? (lang === "id" ? "Super Admin" : "Super Admin")
        : (lang === "id" ? "Admin Terbatas" : "Limited Admin");

      setSuccess(lang === "id"
        ? `Akun ${accountType} baru berhasil didaftarkan!`
        : `New ${accountType} account registered successfully!`);
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
          {lang === "id" ? "Gunakan form ini untuk mendaftarkan akun Staff Akademik (Admin) baru" : "Use this form to register new Academic Staff (Admin) accounts"}
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
          {/* Fixed Role */}
          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label className="form-label">
              {lang === "id" ? "Tipe Akun" : "Account Type"}
            </label>
            <div style={{ padding: "0.75rem", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "0.5rem", color: "#60a5fa", fontWeight: "600", fontSize: "0.9rem" }}>
              {lang === "id" ? "Staff Akademik / Admin" : "Academic Staff / Admin"}
            </div>
          </div>

          {/* Full Name */}
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

          {/* ─── Hak Akses Menu ─── */}
          <div className="form-group" style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <label className="form-label" style={{ margin: 0 }}>
                {lang === "id" ? "Hak Akses Menu" : "Menu Permissions"} <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              {/* Super Admin badge */}
              {isSuperAdmin && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "0.3rem",
                  padding: "0.25rem 0.65rem", borderRadius: "999px",
                  background: "linear-gradient(135deg, rgba(234,179,8,0.2), rgba(245,158,11,0.15))",
                  border: "1px solid rgba(234,179,8,0.4)", color: "#fbbf24",
                  fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.02em"
                }}>
                  ⭐ {lang === "id" ? "Super Admin" : "Super Admin"}
                </span>
              )}
            </div>

            <div style={{
              padding: "1rem", borderRadius: "0.75rem",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border-color)"
            }}>
              {/* Select All */}
              <label style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                cursor: "pointer", padding: "0.6rem 0.75rem", borderRadius: "0.5rem",
                marginBottom: "0.5rem",
                background: isSuperAdmin ? "rgba(234,179,8,0.08)" : "rgba(255,255,255,0.04)",
                border: isSuperAdmin ? "1px solid rgba(234,179,8,0.25)" : "1px solid rgba(255,255,255,0.06)",
                transition: "all 0.2s"
              }}>
                <input
                  type="checkbox"
                  checked={isSuperAdmin}
                  onChange={handleSelectAll}
                  style={{ width: 16, height: 16, accentColor: "#f59e0b", cursor: "pointer" }}
                />
                <span style={{ fontWeight: 700, fontSize: "0.875rem", color: isSuperAdmin ? "#fbbf24" : "var(--text-primary)" }}>
                  {lang === "id" ? "✓ Pilih Semua (Super Admin)" : "✓ Select All (Super Admin)"}
                </span>
              </label>

              <div style={{ height: "1px", background: "var(--border-color)", margin: "0.5rem 0" }} />

              {/* Individual menus */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {ADMIN_MENUS.map((menu) => {
                  const isChecked = menuPermissions.includes(menu.key);
                  return (
                    <label
                      key={menu.key}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.75rem",
                        cursor: "pointer", padding: "0.55rem 0.75rem", borderRadius: "0.5rem",
                        background: isChecked ? "rgba(139,92,246,0.08)" : "transparent",
                        border: isChecked ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
                        transition: "all 0.15s"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleMenuToggle(menu.key)}
                        style={{ width: 15, height: 15, accentColor: "#8b5cf6", cursor: "pointer", flexShrink: 0 }}
                      />
                      <span style={{ fontSize: "0.85rem", color: isChecked ? "var(--text-primary)" : "var(--text-secondary)" }}>
                        {lang === "id" ? menu.labelId : menu.labelEn}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Summary */}
              <div style={{
                marginTop: "0.75rem", paddingTop: "0.75rem",
                borderTop: "1px solid var(--border-color)",
                fontSize: "0.8rem", color: "var(--text-secondary)",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <span>
                  {menuPermissions.length}/{ALL_MENU_KEYS.length} {lang === "id" ? "menu dipilih" : "menus selected"}
                </span>
                <span style={{ fontWeight: 600, color: isSuperAdmin ? "#fbbf24" : menuPermissions.length > 0 ? "#a78bfa" : "var(--text-secondary)" }}>
                  {isSuperAdmin
                    ? (lang === "id" ? "⭐ Super Admin" : "⭐ Super Admin")
                    : menuPermissions.length > 0
                      ? (lang === "id" ? "Admin Terbatas" : "Limited Admin")
                      : (lang === "id" ? "Belum ada akses" : "No access yet")}
                </span>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "1rem" }} disabled={loading}>
            {loading ? "Registering account..." : lang === "id" ? "Daftarkan Akun Baru" : "Register New Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
