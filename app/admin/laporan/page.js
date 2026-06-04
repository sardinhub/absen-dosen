"use client";

import { useState, useEffect } from "react";
import { getAttendance, getUsers, getSchedules, getCourses } from "../../../lib/db";
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

  const syncData = async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");
    try {
      const rawAttendance = await getAttendance();
      const rawUsers = await getUsers();
      const rawSchedules = await getSchedules();
      const rawCourses = await getCourses();

      const activeLecturers = rawUsers.filter((u) => u.role === "dosen");
      setLecturers(activeLecturers);
      setCourses(rawCourses);

      // Map all records
      const mapped = rawAttendance.map((k) => {
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
                        <img src={item.tanda_tangan} alt="TTD" className="signature-preview-thumbnail" />
                      ) : "-"}
                    </td>
                    <td>
                      <span className={`badge ${item.status === 'hadir' ? 'badge-success' : item.status === 'izin' ? 'badge-warning' : 'badge-danger'}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                    {lang === "id" ? "Tidak ada data rekapitulasi." : "No summary records found."}
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
