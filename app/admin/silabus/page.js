"use client";

import { useState, useEffect } from "react";
import { getCourses, saveCourse } from "../../../lib/db";
import { translations } from "../../../lib/translations";

export default function AdminSilabus() {
  const [lang, setLang] = useState("id");
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [syllabusData, setSyllabusData] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const syncData = async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
    try {
      const rawCourses = await getCourses();
      setCourses(rawCourses);
    } catch (err) {
      console.error("Error loading courses list:", err);
    }
  };

  useEffect(() => {
    syncData();
    window.addEventListener("storage", syncData);
    return () => window.removeEventListener("storage", syncData);
  }, []);

  const t = translations[lang];

  const handleCourseChange = (e) => {
    const courseId = e.target.value;
    setSelectedCourseId(courseId);
    
    if (courseId) {
      const course = courses.find(c => c.id === courseId);
      const totalMeetings = Math.max(parseInt(course.jumlah_pertemuan || "14", 10) || 14, 1);
      
      let existingSyllabus = [];
      try {
        if (typeof course.silabus === 'string') {
          existingSyllabus = JSON.parse(course.silabus);
        } else if (Array.isArray(course.silabus)) {
          existingSyllabus = course.silabus;
        }
      } catch (err) {
        console.error("Failed to parse existing syllabus:", err);
      }

      const initialSyllabus = Array.from({ length: totalMeetings }).map((_, idx) => {
        const meetingNo = idx + 1;
        const existing = existingSyllabus.find(s => parseInt(s.pertemuan) === meetingNo);
        return {
          pertemuan: meetingNo,
          materi_pokok: existing ? existing.materi_pokok : "",
          sub_materi: existing ? existing.sub_materi : ""
        };
      });
      
      setSyllabusData(initialSyllabus);
    } else {
      setSyllabusData([]);
    }
  };

  const handleSyllabusChange = (index, field, value) => {
    const newData = [...syllabusData];
    newData[index][field] = value;
    setSyllabusData(newData);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    
    setIsSaving(true);
    try {
      const course = courses.find(c => c.id === selectedCourseId);
      const updatedCourse = {
        ...course,
        silabus: syllabusData
      };
      
      await saveCourse(updatedCourse);
      await syncData();
      
      alert(lang === "id" ? "Silabus berhasil disimpan!" : "Syllabus saved successfully!");
    } catch (err) {
      alert(lang === "id" ? "Gagal menyimpan silabus!" : "Failed to save syllabus!");
      console.error(err);
    }
    setIsSaving(false);
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{lang === "id" ? "Kelola Silabus Pembelajaran" : "Manage Course Syllabus"}</h2>
      </div>

      <div className="glass-panel dashboard-panel" style={{ padding: "1.5rem" }}>
        <div className="form-group" style={{ maxWidth: "500px", marginBottom: 0 }}>
          <label className="form-label">{t.course}</label>
          <select 
            className="form-control"
            value={selectedCourseId}
            onChange={handleCourseChange}
            style={{ background: "#0b0f19" }}
          >
            <option value="">-- {lang === "id" ? "Pilih Mata Kuliah" : "Select Course"} --</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.kode_mk} - {c.nama_mk}</option>
            ))}
          </select>
        </div>

        {selectedCourse && (
          <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(59, 130, 246, 0.1)", borderRadius: "8px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
            <p style={{ margin: 0 }}><strong>{lang === "id" ? "Jumlah Pertemuan:" : "Total Meetings:"}</strong> {selectedCourse.jumlah_pertemuan || "14"}</p>
          </div>
        )}
      </div>

      {selectedCourseId && syllabusData.length > 0 && (
        <form onSubmit={handleSave} className="glass-panel dashboard-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
            {lang === "id" ? "Rincian Materi Per Pertemuan" : "Meeting Details"}
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {syllabusData.map((item, idx) => (
              <div key={idx} style={{ background: "rgba(0,0,0,0.2)", padding: "1.5rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--primary)" }}>{lang === "id" ? "Pertemuan Ke-" : "Meeting "}{item.pertemuan}</h4>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{lang === "id" ? "Materi Pokok" : "Main Topic"}</label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder={lang === "id" ? "Misal: Pengenalan Konsep Dasar" : "e.g. Introduction to Basic Concepts"}
                      value={item.materi_pokok}
                      onChange={(e) => handleSyllabusChange(idx, "materi_pokok", e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{lang === "id" ? "Sub Materi" : "Sub Topics"}</label>
                    <textarea 
                      className="form-control"
                      rows={3}
                      placeholder={lang === "id" ? "Pisahkan dengan enter atau strip (-)" : "Separate with enter or dash (-)"}
                      value={item.sub_materi}
                      onChange={(e) => handleSyllabusChange(idx, "sub_materi", e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end", position: "sticky", bottom: "1rem", zIndex: 10 }}>
            <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem 2rem", fontSize: "1rem", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)" }} disabled={isSaving}>
              {isSaving ? (lang === "id" ? "Menyimpan..." : "Saving...") : (lang === "id" ? "Simpan Silabus" : "Save Syllabus")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
