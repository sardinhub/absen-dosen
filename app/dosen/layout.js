"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { translations } from "../../lib/translations";

export default function DosenLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState("id");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Synchronize user and language settings
  useEffect(() => {
    const loggedInUser = localStorage.getItem("sikad_logged_in_user");
    if (!loggedInUser) {
      router.replace("/login");
      return;
    }
    
    try {
      const parsed = JSON.parse(loggedInUser);
      if (parsed.role !== "dosen") {
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
    // Dispatch a storage event to notify other components on the page
    window.dispatchEvent(new Event("storage"));
  };

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
              <h1 className="gradient-text">{t.appName}</h1>
              <p>{t.institution}</p>
            </div>
          </div>
          
          <div className="navbar-actions">
            <span className="badge badge-success">
              {lang === "id" ? "Sesi Dosen Aktif" : "Lecturer Session Active"}
            </span>
          </div>
        </header>
        
        {/* Page children contents */}
        <div className="animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
