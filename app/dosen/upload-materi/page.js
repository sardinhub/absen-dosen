"use client";

import { useState, useEffect } from "react";
import { getSchedules, getCourses, getMateri, saveMateri, deleteMateri } from "../../../lib/db";
import { translations } from "../../../lib/translations";

export default function DosenUploadMateri() {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState("id");
  const [schedules, setSchedules] = useState([]);
  const [materiList, setMateriList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedMkId, setSelectedMkId] = useState("");
  const [judulMateri, setJudulMateri] = useState("");
  const [pdfBase64, setPdfBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const loadData = async (parsedUser) => {
    try {
      const [rawSchedules, rawCourses, rawMateri] = await Promise.all([
        getSchedules(),
        getCourses(),
        getMateri(parsedUser.id)
      ]);

      // Get unique courses for this lecturer
      const lecturerCourses = [];
      const mkIds = new Set();
      
      rawSchedules.forEach(j => {
        if (j.dosen_id === parsedUser.id && !mkIds.has(j.mk_id)) {
          mkIds.add(j.mk_id);
          const mk = rawCourses.find(m => m.id === j.mk_id);
          if (mk) lecturerCourses.push(mk);
        }
      });

      setSchedules(lecturerCourses);

      // Enhance materi list with course details
      const enhancedMateri = rawMateri.map(m => {
        const mk = rawCourses.find(c => c.id === m.mk_id);
        return {
          ...m,
          mk_kode: mk?.kode_mk || "",
          mk_nama: mk?.nama_mk || ""
        };
      }).sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
      
      setMateriList(enhancedMateri);
      if (lecturerCourses.length > 0) setSelectedMkId(lecturerCourses[0].id);
    } catch (err) {
      console.error("Error loading materi data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedLang = localStorage.getItem("sikad_lang") || "id";
    setLang(savedLang);

    const loggedInUser = localStorage.getItem("sikad_logged_in_user");
    if (loggedInUser) {
      const parsedUser = JSON.parse(loggedInUser);
      setUser(parsedUser);
      loadData(parsedUser);
    } else {
      setLoading(false);
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setPdfBase64("");
      setFileName("");
      setSelectedFile(null);
      return;
    }
    
    if (file.type !== "application/pdf") {
      alert(lang === "id" ? "Harap upload file dengan format PDF." : "Please upload a PDF file.");
      e.target.value = null;
      return;
    }

    setFileName(file.name);
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPdfBase64(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMkId || !judulMateri || !pdfBase64) {
      alert(lang === "id" ? "Mohon lengkapi semua field." : "Please fill all fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newMateri = {
        dosen_id: user.id,
        dosen_nama: user.nama_lengkap,
        mk_id: selectedMkId,
        judul: judulMateri,
        file_name: fileName,
        file_data: pdfBase64,
        raw_file: selectedFile,
        uploaded_at: new Date().toISOString()
      };

      setUploadProgress(0);
      await saveMateri(newMateri, (progress) => {
        setUploadProgress(Math.round(progress));
      });
      
      // Reset form
      setJudulMateri("");
      setPdfBase64("");
      setFileName("");
      setSelectedFile(null);
      document.getElementById("pdfInput").value = null;
      
      // Reload list
      await loadData(user);
      
      alert(lang === "id" ? "Materi berhasil diupload!" : "Material uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert(lang === "id" ? "Terjadi kesalahan." : "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm(lang === "id" ? "Yakin ingin menghapus materi ini?" : "Are you sure you want to delete this material?")) {
      try {
        await deleteMateri(id);
        setMateriList(prev => prev.filter(m => m.id !== id));
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  if (loading || !user) {
    return <div style={{ color: "var(--text-muted)" }}>{lang === "id" ? "Memuat..." : "Loading..."}</div>;
  }

  const t = translations[lang] || translations.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div className="glass-panel dashboard-panel">
        <div className="panel-header">
          <h3 className="panel-title">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20, color: "var(--primary)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span>{t.uploadMateri}</span>
          </h3>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "1.5rem" }}>
          <div className="form-group">
            <label className="form-label">{t.course}</label>
            <select
              className="form-control"
              value={selectedMkId}
              onChange={(e) => setSelectedMkId(e.target.value)}
              required
            >
              <option value="">-- {lang === "id" ? "Pilih Mata Kuliah" : "Select Course"} --</option>
              {schedules.map(mk => (
                <option key={mk.id} value={mk.id}>{mk.kode_mk} - {mk.nama_mk}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t.materiTitle}</label>
            <input
              type="text"
              className="form-control"
              value={judulMateri}
              onChange={(e) => setJudulMateri(e.target.value)}
              placeholder={lang === "id" ? "Contoh: Pertemuan 1 - Pengenalan" : "E.g. Meeting 1 - Introduction"}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.uploadPdf}</label>
            <input
              id="pdfInput"
              type="file"
              accept=".pdf"
              className="form-control"
              onChange={handleFileChange}
              required
              style={{ paddingTop: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem", flexDirection: "column", gap: "1rem" }}>
            {isSubmitting && (
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem", color: "var(--text-secondary)" }}>
                  <span>{lang === "id" ? "Mengunggah..." : "Uploading..."}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ 
                    height: "100%", 
                    background: "var(--primary)", 
                    width: `${uploadProgress}%`,
                    transition: "width 0.2s ease-out"
                  }}></div>
                </div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (lang === "id" ? "Menyimpan..." : "Saving...") : t.upload}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="glass-panel dashboard-panel">
        <div className="panel-header">
          <h3 className="panel-title">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20, color: "var(--accent)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span>{t.materiList}</span>
          </h3>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{t.date}</th>
                <th>{t.course}</th>
                <th>{t.materiTitle}</th>
                <th>File</th>
                <th>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {materiList.length > 0 ? (
                materiList.map(materi => (
                  <tr key={materi.id}>
                    <td>{new Date(materi.uploaded_at).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td><span className="badge badge-warning" style={{ marginRight: "0.5rem", fontSize: "0.7rem" }}>{materi.mk_kode}</span> {materi.mk_nama}</td>
                    <td>{materi.judul}</td>
                    <td>
                      <a href={materi.file_url || materi.file_data} target="_blank" rel="noopener noreferrer" download={materi.file_name} style={{ color: "var(--primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        {materi.file_name}
                      </a>
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(materi.id)}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                        {lang === "id" ? "Hapus" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    {lang === "id" ? "Belum ada materi yang diupload." : "No materials uploaded yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
