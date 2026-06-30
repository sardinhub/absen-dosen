"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { translations } from "../../lib/translations";

// Maps route prefixes to permission keys
const ROUTE_PERMISSION_MAP = [
  { prefix: "/admin/dosen",            key: "kelola-data" },
  { prefix: "/admin/siswa",            key: "kelola-data" },
  { prefix: "/admin/matakuliah",       key: "kelola-data" },
  { prefix: "/admin/jadwal",           key: "kelola-data" },
  { prefix: "/admin/kelola-penilaian", key: "kelola-data" },
  { prefix: "/admin/register",         key: "register" },
  { prefix: "/admin/rekap-absen-siswa",key: "rekap-absen-siswa" },
  { prefix: "/admin/silabus",          key: "silabus" },
  { prefix: "/admin/validasi",         key: "validasi" },
  { prefix: "/admin/laporan",          key: "laporan" },
  { prefix: "/dosen/evaluasi-penilaian", key: "evaluasi-penilaian" },
];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState("id");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync login sessions and languages
  useEffect(() => {
    const loggedInUser = localStorage.getItem("sikad_logged_in_user");
    if (!loggedInUser) {
      router.replace("/login");
      return;
    }
    
    try {
      const parsed = JSON.parse(loggedInUser);
      if (parsed.role !== "admin") {
        router.replace("/login");
        return;
      }
      setUser(parsed);
    } catch (err) {
      router.replace("/login");
      return;
    }

    const savedLang = localStorage.getItem("sikad_lang");
    if (savedLang) {
      setLang(savedLang);
    } else {
      localStorage.setItem("sikad_lang", "id");
    }
    setLoading(false);
  }, [router]);

  const handleSetLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem("sikad_lang", newLang);
    // Dispatch storage event to trigger pages sync
    window.dispatchEvent(new Event("storage"));
  };

  // ── Route Protection: redirect if user lacks menu_permissions for current path ──
  useEffect(() => {
    if (!user) return;
    const perms = user.menu_permissions;
    if (!Array.isArray(perms)) return; // Legacy user → allow all routes

    const match = ROUTE_PERMISSION_MAP.find(r => pathname.startsWith(r.prefix));
    if (match && !perms.includes(match.key)) {
      router.replace("/admin/dashboard");
    }
  }, [user, pathname, router]);

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#060913" }}>
        <p style={{ color: "#9ca3af" }}>Loading system environment...</p>
      </div>
    );
  }

  const t = translations[lang];

  return (
    <div className="app-layout">
      <Sidebar
        user={user}
        lang={lang}
        setLang={handleSetLang}
        translations={t}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      
      <div className="main-content">
        {/* Header Navbar */}
        <header className="navbar">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 24, height: 24 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div className="navbar-title">
              <h1 className="gradient-text">{t.appTitleAdmin}</h1>
              <p>{t.institution}</p>
            </div>
          </div>
          
          <div className="navbar-actions">
            <span className="badge badge-danger" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
              {lang === "id" ? "Portal Administrasi" : "Administration Portal"}
            </span>
          </div>
        </header>
        
        {/* Page content */}
        <div className="animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
