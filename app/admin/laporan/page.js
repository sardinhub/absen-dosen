"use client";

import { useState, useEffect } from "react";
import { getAttendance, getUsers, getSchedules, getCourses, deleteAttendance } from "../../../lib/db";
import { translations } from "../../../lib/translations";
import { exportToExcel, exportToPDF } from "../../../lib/exportUtils";

export default function AdminLaporan() {
  const [lang, setLang] = useState("id");
  const [attendance, setAttendance] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [courses, setCourses] = useState([]);

  // Filter States
  const [filterLecturer, setFilterLecturer] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Modal State
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const syncData = async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");

    // SWR Pattern: Load from cache immediately for fast rendering
    const cachedAttendance = localStorage.getItem("sikad_laporan_cache");
    if (cachedAttendance) {
      try {
        setAttendance(JSON.parse(cachedAttendance));
      } catch (e) {
        // ignore parse error
      }
    }

    try {
      const [rawAttendance, rawUsers, rawSchedules, rawCourses] = await Promise.all([
        getAttendance(),
        getUsers(),
        getSchedules(),
        getCourses()
      ]);

      const activeLecturers = rawUsers.filter((u) => u.role === "dosen");
      setLecturers(activeLecturers);
      setCourses(rawCourses);

      // Map all records
      const mapped = rawAttendance
        .filter((k) => k.status !== 'pending')
        .map((k) => {
          const lecturer = rawUsers.find((u) => u.id === k.dosen_id);
          const schedule = rawSchedules.find((j) => j.id === k.jadwal_id);
          const course = rawCourses.find((m) => m.id === schedule?.mk_id);
          return {
            ...k,
            dosen_nama: lecturer?.nama_lengkap,
            dosen_nip: lecturer?.nip,
            mk_nama: course?.nama_mk,
            mk_kode: course?.kode_mk,
            kelas: schedule?.kelas,
            ruangan: schedule?.ruangan
          };
        }).sort((a, b) => new Date(b.waktu_absen) - new Date(a.waktu_absen));

      setAttendance(mapped);
      // Save mapped data to cache for next instant load
      localStorage.setItem("sikad_laporan_cache", JSON.stringify(mapped));
    } catch (err) {
      console.error("Error loading reporting summary:", err);
    }
  };

  useEffect(() => {
    syncData();
    window.addEventListener("storage", syncData);
    return () => window.removeEventListener("storage", syncData);
  }, []);

  const t = translations[lang];

  // Filtering Logic
  const filteredData = attendance.filter((item) => {
    const matchesLecturer = filterLecturer ? item.dosen_id === filterLecturer : true;
    const matchesCourse = filterCourse ? item.mk_id === filterCourse : true;
    
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(item.tanggal) >= new Date(startDate);
    }
    if (endDate) {
      matchesDate = matchesDate && new Date(item.tanggal) <= new Date(endDate);
    }

    return matchesLecturer && matchesCourse && matchesDate;
  });

  // Export handlers
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      alert(lang === "id" ? "Tidak ada data untuk diekspor!" : "No data available to export!");
      return;
    }
    exportToExcel(filteredData, `rekap_kehadiran_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (filteredData.length === 0) {
      alert(lang === "id" ? "Tidak ada data untuk diekspor!" : "No data available to export!");
      return;
    }

    let reportTitle = lang === "id" ? "REKAPITULASI KEHADIRAN DOSEN" : "LECTURER ATTENDANCE SUMMARY";
    let dateRangeText = "";
    
    if (startDate && endDate) {
      dateRangeText = `${lang === "id" ? "Periode" : "Period"}: ${startDate} s/d ${endDate}`;
    } else if (startDate) {
      dateRangeText = `${lang === "id" ? "Sejak" : "Since"}: ${startDate}`;
    } else if (endDate) {
      dateRangeText = `${lang === "id" ? "Hingga" : "Until"}: ${endDate}`;
    }

    await exportToPDF(filteredData, reportTitle, dateRangeText, lang);
  };

  const handleDelete = async (id) => {
    if (confirm(lang === "id" ? "Yakin ingin menghapus data absen ini?" : "Are you sure you want to delete this record?")) {
      try {
        await deleteAttendance(id);
        // refresh data
        syncData();
      } catch (err) {
        console.error("Delete failed:", err);
        alert("Gagal menghapus data!");
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <h3 className="panel-title" style={{ marginBottom: "1rem" }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20, color: "var(--primary)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
          </svg>
          <span>{t.filter}</span>
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
          {/* Lecturer filter dropdown */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t.lecturerName}</label>
            <select
              className="form-control"
              value={filterLecturer}
              onChange={(e) => setFilterLecturer(e.target.value)}
              style={{ background: "#0b0f19" }}
            >
              <option value="">{lang === "id" ? "Semua Dosen" : "All Lecturers"}</option>
              {lecturers.map((lec) => (
                <option key={lec.id} value={lec.id}>
                  {lec.nama_lengkap}
                </option>
              ))}
            </select>
          </div>

          {/* Course filter dropdown */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t.course}</label>
            <select
              className="form-control"
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              style={{ background: "#0b0f19" }}
            >
              <option value="">{lang === "id" ? "Semua Mata Kuliah" : "All Courses"}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.kode_mk} - {c.nama_mk}
                </option>
              ))}
            </select>
          </div>

          {/* Start date */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t.startDate}</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End date */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t.endDate}</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Laporan Preview Table */}
      <div className="glass-panel dashboard-panel">
        <div className="panel-header" style={{ marginBottom: "1.5rem" }}>
          <h3 className="panel-title">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20, color: "var(--accent)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span>{t.report} ({filteredData.length} records)</span>
          </h3>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-success btn-sm" onClick={handleExportExcel}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span>{t.exportExcel}</span>
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleExportPDF}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span>{t.exportPdf}</span>
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{t.date}</th>
                <th>{t.lecturerName}</th>
                <th>{t.course}</th>
                <th>{t.class}</th>
                <th>{t.meetingNo}</th>
                <th>{t.subject}</th>
                <th>{t.signature}</th>
                <th>{t.status}</th>
                <th>{lang === "id" ? "Aksi" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.tanggal}</td>
                    <td>
                      <strong>{item.dosen_nama}</strong>
                    </td>
                    <td>
                      <span className="badge badge-warning" style={{ marginRight: "0.5rem", fontSize: "0.7rem" }}>{item.mk_kode}</span>
                      {item.mk_nama}
                    </td>
                    <td>{item.kelas}</td>
                    <td style={{ fontWeight: "bold" }}>#{item.pertemuan_ke}</td>
                    <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.materi}
                    </td>
                    <td>
                      {item.tanda_tangan ? (
                        <img 
                          src={item.tanda_tangan} 
                          alt="TTD" 
                          className="signature-preview-thumbnail" 
                          onClick={() => setSelectedPhoto(item.tanda_tangan)}
                          style={{ cursor: "pointer", border: "1px solid rgba(255,255,255,0.1)" }}
                          title={lang === "id" ? "Klik untuk memperbesar" : "Click to enlarge"}
                        />
                      ) : "-"}
                    </td>
                    <td>
                      <span className={`badge ${item.status === 'hadir' ? 'badge-success' : item.status === 'izin' ? 'badge-warning' : item.status === 'pending' ? 'badge-secondary' : 'badge-danger'}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                    {lang === "id" ? "Tidak ada data rekapitulasi." : "No summary records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo Modal Overlay */}
      {selectedPhoto && (
        <div 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, 
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <img 
              src={selectedPhoto} 
              alt="Zoomed Photo" 
              style={{ 
                maxWidth: '100%', maxHeight: '90vh', 
                borderRadius: '12px', border: '2px solid var(--primary)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }} 
            />
            <button 
              style={{
                position: 'absolute', top: '-15px', right: '-15px',
                background: 'var(--danger)', color: 'white',
                border: 'none', borderRadius: '50%', width: '36px', height: '36px',
                fontSize: '18px', cursor: 'pointer', display: 'flex', 
                alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
              }}
              onClick={(e) => { e.stopPropagation(); setSelectedPhoto(null); }}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
