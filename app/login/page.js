"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUsers } from "../../lib/db";
import { translations } from "../../lib/translations";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      // Get latest database from abstraction layer
      const users = await getUsers();
      
      // Find matching user
      const matchedUser = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (matchedUser) {
        localStorage.setItem("sikad_logged_in_user", JSON.stringify(matchedUser));
        setTimeout(() => {
          if (matchedUser.role === "admin") {
            router.replace("/admin/dashboard");
          } else {
            router.replace("/dosen/dashboard");
          }
        }, 500);
      } else {
        setLoading(false);
        setError(lang === "id" ? "Email atau password salah!" : "Incorrect email or password!");
      }
    } catch (err) {
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
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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
