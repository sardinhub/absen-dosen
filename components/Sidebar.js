"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

// All possible admin menu permission keys (must match register/page.js)
const ALL_ADMIN_MENU_KEYS = [
  "kelola-data", "register", "rekap-absen-siswa",
  "silabus", "validasi", "laporan", "evaluasi-penilaian"
];

export default function Sidebar({ user, lang, setLang, translations, isOpen, setIsOpen }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isKelolaDataOpen, setIsKelolaDataOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Keep the sub-menu open if we are in one of the nested routes
    if (
      pathname.startsWith("/admin/dosen") ||
      pathname.startsWith("/admin/siswa") ||
      pathname.startsWith("/admin/kelola-penilaian") ||
      pathname.startsWith("/admin/matakuliah") ||
      pathname.startsWith("/admin/jadwal")
    ) {
      setIsKelolaDataOpen(true);
    }
  }, [pathname]);

  if (!user) return null;

  const handleLogout = () => {
    localStorage.removeItem("sikad_logged_in_user");
    router.push("/login");
  };

  const isDosen = user.role === "dosen";

  // ── Hak Akses: determine which admin menus this user can see ──
  // If menu_permissions is absent (legacy/existing users) → show all menus
  const perms = user.menu_permissions;
  const hasPermsField = Array.isArray(perms);
  const canAccess = (key) => !hasPermsField || perms.includes(key);
  const isSuperAdmin = hasPermsField && ALL_ADMIN_MENU_KEYS.every(k => perms.includes(k));

  // Menu lists
  const dosenMenu = [
    {
      name: translations.todaySchedule,
      path: "/dosen/dashboard",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      )
    },
    {
      name: translations.studentAttendanceList || (lang === "id" ? "Daftar Hadir Siswa" : "Student Attendance"),
      path: "/dosen/daftar-hadir-siswa",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
        </svg>
      )
    },
    {
      name: translations.history,
      path: "/dosen/riwayat",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )
    },
    {
      name: translations.evaluasiPenilaian || (lang === "id" ? "Evaluasi & Penilaian" : "Evaluation & Grading"),
      path: "/dosen/evaluasi-penilaian",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
        </svg>
      )
    },
    {
      name: translations.uploadMateri || (lang === "id" ? "Upload Materi" : "Upload Material"),
      path: "/dosen/upload-materi",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      )
    }
  ];

  const adminMenu = [
    {
      name: "Dashboard",
      path: "/admin/dashboard",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
        </svg>
      )
    },
    ...(canAccess("kelola-data") ? [{
      name: lang === "id" ? "Kelola Data" : "Manage Data",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
        </svg>
      ),
      subMenus: [
        {
          name: translations.lecturerList,
          path: "/admin/dosen",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A2.25 2.25 0 0 1 12.75 21.5h-1.5a2.25 2.25 0 0 1-2.25-2.263V19.13m4.13-3.07c-.6-.414-1.27-.676-1.996-.77A4.125 4.125 0 0 0 3.788 15.67a9.3 9.3 0 0 0 4.121.952 9.38 9.38 0 0 0 2.625-.372M15 13.5A3 3 0 1 0 15 7.5a3 3 0 0 0 0 6ZM8.25 12.5A2.25 2.25 0 1 1 8.25 8a2.25 2.25 0 0 1 0 4.5Z" />
            </svg>
          )
        },
        {
          name: translations.studentList,
          path: "/admin/siswa",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
          )
        },
        {
          name: translations.kelolaPenilaian || (lang === "id" ? "Kelola Penilaian Siswa" : "Manage Student Grades"),
          path: "/admin/kelola-penilaian",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
          )
        },
        {
          name: translations.courseList,
          path: "/admin/matakuliah",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          )
        },
        {
          name: translations.scheduleList,
          path: "/admin/jadwal",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          )
        }
      ]
    }] : []),
    ...(canAccess("register") ? [{
      name: lang === "id" ? "Registrasi Akun" : "Register Account",
      path: "/admin/register",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      )
    }] : []),
    ...(canAccess("evaluasi-penilaian") ? [{
      name: translations.evaluasiPenilaian || (lang === "id" ? "Evaluasi & Penilaian" : "Evaluation & Grading"),
      path: "/dosen/evaluasi-penilaian",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
        </svg>
      )
    }] : []),
    ...(canAccess("rekap-absen-siswa") ? [{
      name: translations.studentAttendanceRecap || (lang === "id" ? "Rekap Absen Siswa" : "Student Attendance Recap"),
      path: "/admin/rekap-absen-siswa",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
        </svg>
      )
    }] : []),
    ...(canAccess("silabus") ? [{
      name: translations.syllabus,
      path: "/admin/silabus",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      )
    }] : []),
    ...(canAccess("validasi") ? [{
      name: translations.validationList,
      path: "/admin/validasi",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
        </svg>
      )
    }] : [])
  ];

  const isSiswa = user.role === "siswa";

  const siswaMenu = [
    {
      name: "Dashboard",
      path: "/siswa/dashboard",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      )
    },
    {
      name: lang === "id" ? "Jadwal & Dosen" : "Schedule & Lecturers",
      path: "/siswa/dashboard?tab=jadwal",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      )
    },
    {
      name: lang === "id" ? "Materi Kuliah" : "Course Materials",
      path: "/siswa/dashboard?tab=materi",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      )
    },
    {
      name: lang === "id" ? "Indeks Prestasi (IPS/IPK)" : "Academic Transcripts",
      path: "/siswa/dashboard?tab=nilai",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
        </svg>
      )
    }
  ];

  const currentMenu = isDosen ? dosenMenu : (isSiswa ? siswaMenu : adminMenu);

  return (
    <>
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <img src="/logo-triesakti.png" alt="Logo" style={{ width: "2.5rem", height: "2.5rem", objectFit: "contain", borderRadius: "8px" }} />
          <div className="sidebar-logo-text">
            Triesakti
            <div className="sidebar-logo-sub">Makassar - Aviation</div>
          </div>
          {/* Close button on mobile */}
          <button 
            style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "1.25rem", cursor: "pointer" }}
            onClick={() => setIsOpen(false)}
            className="menu-toggle"
          >
            &times;
          </button>
        </div>

        <ul className="sidebar-menu">
          {currentMenu.map((item, idx) => {
            if (item.subMenus) {
              const isChildActive = item.subMenus.some(sub => pathname === sub.path);
              return (
                <li key={idx} style={{ marginBottom: "0.25rem" }}>
                  <div
                    className={`sidebar-link ${isChildActive && !isKelolaDataOpen ? "active" : ""}`}
                    onClick={() => setIsKelolaDataOpen(!isKelolaDataOpen)}
                    style={{ 
                      cursor: "pointer", 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      background: isKelolaDataOpen ? "rgba(255,255,255,0.05)" : undefined,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      {item.icon}
                      <span>{item.name}</span>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                      style={{ width: 14, height: 14, transform: isKelolaDataOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                  {isKelolaDataOpen && (
                    <ul style={{ listStyle: "none", padding: "0", margin: "0.25rem 0 0 0", borderLeft: "2px solid rgba(255,255,255,0.1)", marginLeft: "1.5rem" }}>
                      {item.subMenus.map((sub, subIdx) => {
                        const isActive = pathname === sub.path;
                        return (
                          <li key={subIdx} style={{ margin: "0.25rem 0" }}>
                            <Link 
                              href={sub.path} 
                              prefetch={true}
                              className={`sidebar-link ${isActive ? "active" : ""}`}
                              onClick={() => setIsOpen(false)}
                              style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }}
                            >
                              <div style={{ transform: "scale(0.85)", opacity: 0.8, display: "flex", alignItems: "center" }}>
                                {sub.icon}
                              </div>
                              <span>{sub.name}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            const isActive = item.path.includes("?") 
              ? (mounted && (pathname + window.location.search) === item.path)
              : pathname === item.path;
            return (
              <li key={idx} style={{ marginBottom: "0.25rem" }}>
                <Link 
                  href={item.path} 
                  prefetch={true}
                  className={`sidebar-link ${isActive ? "active" : ""}`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-footer">
          {/* Language Switcher */}
          <div style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
            <button 
              className="lang-btn" 
              style={{ flex: 1, border: lang === "id" ? "1.5px solid var(--primary)" : "1px solid var(--border-color)", opacity: lang === "id" ? 1 : 0.6 }}
              onClick={() => setLang("id")}
            >
              🇮🇩 ID
            </button>
            <button 
              className="lang-btn" 
              style={{ flex: 1, border: lang === "en" ? "1.5px solid var(--primary)" : "1px solid var(--border-color)", opacity: lang === "en" ? 1 : 0.6 }}
              onClick={() => setLang("en")}
            >
              🇬🇧 EN
            </button>
          </div>

          {/* User profile */}
          <div className="sidebar-user">
            <img src={user.foto_profil || "https://via.placeholder.com/100"} alt="User profile" className="user-avatar" />
            <div className="user-info">
              <span className="user-name" title={user.nama_lengkap}>{user.nama_lengkap}</span>
              <span className="user-role" style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
                {!isDosen && isSuperAdmin && (
                  <span style={{
                    display: "inline-flex", alignItems: "center",
                    padding: "0.1rem 0.4rem", borderRadius: "999px",
                    background: "linear-gradient(135deg, rgba(234,179,8,0.25), rgba(245,158,11,0.18))",
                    border: "1px solid rgba(234,179,8,0.4)", color: "#fbbf24",
                    fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.02em"
                  }}>⭐ Super Admin</span>
                )}
                {!isDosen && !isSuperAdmin && (
                  <span>{translations.admin}</span>
                )}
                {isDosen && <span>{translations.dosen}</span>}
              </span>
            </div>
          </div>

          {/* Log Out */}
          <button className="btn btn-secondary" onClick={handleLogout} style={{ justifyContent: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
            </svg>
            <span>{translations.logout}</span>
          </button>
        </div>
      </div>
      
      {/* Background overlay for mobile */}
      {isOpen && (
        <div 
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 90 }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
