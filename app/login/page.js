"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUserByEmail } from "../../lib/db";
import { translations } from "../../lib/translations";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lang, setLang] = useState("id");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    // Check if already logged in
    const loggedInUser = localStorage.getItem("sikad_logged_in_user");
    if (loggedInUser) {
      try {
        const user = JSON.parse(loggedInUser);
        if (user.role === "admin") router.replace("/admin/dashboard");
        else router.replace("/dosen/dashboard");
      } catch (err) {
        localStorage.removeItem("sikad_logged_in_user");
      }
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Query user by email directly (faster than loading all users)
      const matchedUser = await getUserByEmail(email);

      if (matchedUser && (matchedUser.password || "").trim() === password.trim()) {
        localStorage.setItem("sikad_logged_in_user", JSON.stringify(matchedUser));
        setTimeout(() => {
          if (matchedUser.role === "admin") {
            router.replace("/admin/dashboard");
          } else {
            router.replace("/dosen/dashboard");
          }
        }, 300);
      } else {
        setLoading(false);
        setError(lang === "id" ? "Email atau password salah!" : "Incorrect email or password!");
      }
    } catch (err) {
      console.error("Login error:", err);
      setLoading(false);
      setError(lang === "id" ? "Gagal terhubung ke database!" : "Failed to connect to database!");
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

      <div className="glass-panel auth-card animate-fade-in">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="airplane-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 28, height: 28 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </div>
          </div>
          <h1 className="auth-title gradient-text">{t.appName}</h1>
          <p className="auth-subtitle">{t.institution}</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">{t.email}</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. dosen1@triesakti.ac.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.password}</label>
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

          <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
            {loading ? (
              <span style={{ display: "inline-flex", gap: "0.25rem", alignItems: "center" }}>
                Logging in...
              </span>
            ) : t.login}
          </button>
        </form>

        <div className="auth-footer">
          <p>© {new Date().getFullYear()} Triesakti Makassar. All rights reserved.</p>
          <p style={{ marginTop: "0.5rem", opacity: 0.5 }}>
            Demo: admin@triesakti.ac.id / admin | dosen1@triesakti.ac.id / dosen
          </p>
        </div>
      </div>
    </div>
  );
}
