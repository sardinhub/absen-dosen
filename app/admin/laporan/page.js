"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getAttendanceReport, getUsers, getCourses, getSchedules, deleteAttendance, saveAttendance, getMateri } from "../../../lib/db";
import { translations } from "../../../lib/translations";
import { exportToExcel, exportToPDF } from "../../../lib/exportUtils";
import { formatTanggalStr } from "../../../lib/dateUtils";
import Modal from "../../../components/Modal";

const PAGE_SIZE = 25;

// Increment this version whenever a breaking cache change is made.
// All devices with old cache keys will automatically fetch fresh data.
const CACHE_VERSION = "v2";
const CACHE_KEY = `sikad_laporan_cache_${CACHE_VERSION}`;

// List of old cache keys from previous versions to purge on startup
const OLD_CACHE_KEYS = ["sikad_laporan_cache"];


export default function AdminLaporan() {
  const [lang, setLang] = useState("id");
  const [attendance, setAttendance] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter States
  const [filterLecturer, setFilterLecturer] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterKelas, setFilterKelas] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Modal State
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  
  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editPertemuan, setEditPertemuan] = useState("");
  const [editMateri, setEditMateri] = useState("");

  // Materi State
  const [materiList, setMateriList] = useState([]);

  // Preview State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Debounce timer for filter changes
  const debounceRef = useRef(null);

  // Load dropdown data (users & courses) once on mount
  useEffect(() => {
    setLang(localStorage.getItem("sikad_lang") || "id");

    // Purge stale cache keys from old versions so all devices get fresh data
    OLD_CACHE_KEYS.forEach(key => localStorage.removeItem(key));
    
    Promise.all([getUsers(), getCourses(), getSchedules()]).then(([rawUsers, rawCourses, rawSchedules]) => {
      setLecturers(rawUsers.filter(u => u.role === "dosen"));
      setCourses(rawCourses);
      
      const uniqueClasses = Array.from(new Set(rawSchedules.map(s => s.kelas).filter(Boolean))).sort();
      setAvailableClasses(uniqueClasses);
    }).catch(err => console.error("Error loading filter data:", err));
  }, []);

  // Fetch report data with server-side filters
  const fetchReport = useCallback(async (filters = {}) => {
    setLoading(true);
    setFetchError(null);
    try {
      // Only use cache when there are no active filters (initial load)
      // This prevents stale/mismatched data from showing across different devices
      const hasActiveFilter = filters.dosenId || filters.mkId || filters.kelas || filters.startDate || filters.endDate;
      if (!hasActiveFilter) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            setAttendance(JSON.parse(cached));
            setLoading(false); // Show cached data immediately while fetching
          } catch (e) { /* ignore */ }
        }
      }

      const data = await getAttendanceReport({
        dosenId: filters.dosenId || undefined,
        mkId: filters.mkId || undefined,
        kelas: filters.kelas || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });

      setAttendance(data);
      setCurrentPage(1);
      // Only cache the unfiltered result so it's safe to reuse across sessions
      if (!hasActiveFilter) {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch (storageError) {
          console.warn("Could not save report to cache, quota might be exceeded", storageError);
          // Optional: clear the cache if it's too big to make room, or just let it be.
          localStorage.removeItem(CACHE_KEY);
        }
      }
      
      // Fetch materi list if both lecturer and course filters are active
      if (filters.dosenId && filters.mkId) {
        const materiData = await getMateri(filters.dosenId, filters.mkId);
        setMateriList(materiData);
      } else {
        setMateriList([]);
      }
    } catch (err) {
      console.error("Error loading report:", err);
      setFetchError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Debounced filter change handler
  const handleFilterChange = useCallback((newFilters) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchReport(newFilters);
    }, 400);
  }, [fetchReport]);

  const getCurrentFilters = useCallback(() => ({
    dosenId: filterLecturer,
    mkId: filterCourse,
    kelas: filterKelas,
    startDate,
    endDate,
  }), [filterLecturer, filterCourse, filterKelas, startDate, endDate]);

  // Filter change handlers
  const onFilterLecturerChange = (val) => {
    setFilterLecturer(val);
    handleFilterChange({ ...getCurrentFilters(), dosenId: val });
  };
  const onFilterCourseChange = (val) => {
    setFilterCourse(val);
    handleFilterChange({ ...getCurrentFilters(), mkId: val });
  };
  const onFilterKelasChange = (val) => {
    setFilterKelas(val);
    handleFilterChange({ ...getCurrentFilters(), kelas: val });
  };
  const onStartDateChange = (val) => {
    setStartDate(val);
    handleFilterChange({ ...getCurrentFilters(), startDate: val });
  };
  const onEndDateChange = (val) => {
    setEndDate(val);
    handleFilterChange({ ...getCurrentFilters(), endDate: val });
  };

  const t = translations[lang];

  // Pagination
  const totalPages = Math.max(1, Math.ceil(attendance.length / PAGE_SIZE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return attendance.slice(start, start + PAGE_SIZE);
  }, [attendance, currentPage]);

  // Export handlers — export ALL filtered data, not just current page
  const handleExportExcel = () => {
    if (attendance.length === 0) {
      alert(lang === "id" ? "Tidak ada data untuk diekspor!" : "No data available to export!");
      return;
    }
    exportToExcel(attendance, `rekap_kehadiran_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (attendance.length === 0) {
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

    await exportToPDF(attendance, reportTitle, dateRangeText, lang);
  };

  const handlePreviewClick = () => {
    if (attendance.length === 0) {
      alert(lang === "id" ? "Tidak ada data untuk dipratinjau!" : "No data available to preview!");
      return;
    }
    setIsPreviewModalOpen(true);
  };

  const handleEditClick = (record) => {
    setSelectedRecord(record);
    setEditPertemuan(record.pertemuan_ke || "");
    setEditMateri(record.materi || "");
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    
    try {
      const updatedRecord = {
        ...selectedRecord,
        pertemuan_ke: parseInt(editPertemuan, 10),
        materi: editMateri
      };
      
      // Update DB (Hanya kirim field yang ada di tabel_kehadiran)
      const dbPayload = {
        id: updatedRecord.id,
        pertemuan_ke: updatedRecord.pertemuan_ke,
        materi: updatedRecord.materi
      };
      await saveAttendance(dbPayload);
      
      // Optimistic update locally
      const newData = attendance.map(item => item.id === selectedRecord.id ? updatedRecord : item);
      setAttendance(newData);
      // Invalidate cache so other devices fetch fresh data on next load
      localStorage.removeItem(CACHE_KEY);
      
      setIsEditModalOpen(false);
      alert(lang === "id" ? "Data pertemuan berhasil diperbarui!" : "Meeting data updated successfully!");
    } catch (err) {
      console.error("Save edit failed:", err);
      alert(lang === "id" ? "Gagal menyimpan perubahan!" : "Failed to save changes!");
    }
  };

  const handleDelete = async (id) => {
    if (confirm(lang === "id" ? "Yakin ingin menghapus data absen ini?" : "Are you sure you want to delete this record?")) {
      try {
        await deleteAttendance(id);
        // Remove from local state immediately (optimistic update)
        setAttendance(prev => prev.filter(item => item.id !== id));
        // Invalidate cache so other devices fetch fresh data on next load
        localStorage.removeItem(CACHE_KEY);
      } catch (err) {
        console.error("Delete failed:", err);
        alert("Gagal menghapus data!");
      }
    }
  };

  // Skeleton loader rows
  const SkeletonRows = () => (
    <>
      {[...Array(8)].map((_, i) => (
        <tr key={i}>
          {[...Array(8)].map((_, j) => (
            <td key={j}>
              <div
                className="skeleton-pulse"
                style={{
                  height: "1rem",
                  borderRadius: "4px",
                  background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.5s infinite",
                  width: j === 5 ? "160px" : j === 6 ? "50px" : "80px",
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .pagination-btn {
          padding: 0.4rem 0.75rem;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: var(--text-primary, #fff);
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }
        .pagination-btn:hover:not(:disabled) {
          background: var(--primary);
          border-color: var(--primary);
        }
        .pagination-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .pagination-btn.active {
          background: var(--primary);
          border-color: var(--primary);
          font-weight: 600;
        }
      `}</style>

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
              onChange={(e) => onFilterLecturerChange(e.target.value)}
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
              onChange={(e) => onFilterCourseChange(e.target.value)}
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

          {/* Kelas filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{lang === "id" ? "Kelas" : "Class"}</label>
            <select
              className="form-control"
              value={filterKelas}
              onChange={(e) => onFilterKelasChange(e.target.value)}
              style={{ background: "#0b0f19" }}
            >
              <option value="">{lang === "id" ? "Semua Kelas" : "All Classes"}</option>
              {availableClasses.map((kls) => (
                <option key={kls} value={kls}>
                  {kls}
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
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>

          {/* End date */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t.endDate}</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
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
            <span>
              {t.report} ({attendance.length} records)
              {loading && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>⟳ {lang === "id" ? "Memuat..." : "Loading..."}</span>}
            </span>
            {fetchError && (
              <div style={{ marginTop: "0.5rem", padding: "0.6rem 1rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#f87171", fontSize: "0.8rem", wordBreak: "break-all" }}>
                ⚠️ {lang === "id" ? "Gagal memuat data:" : "Failed to load data:"} <code>{fetchError}</code>
              </div>
            )}
          </h3>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-primary btn-sm" onClick={handlePreviewClick}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              <span>{lang === "id" ? "Pratinjau & Cetak" : "Preview & Print"}</span>
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
                <th style={{ minWidth: "220px" }}>{t.subject}</th>
                <th>{t.status}</th>
                <th>{lang === "id" ? "Aksi" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {loading && attendance.length === 0 ? (
                <SkeletonRows />
              ) : paginatedData.length > 0 ? (
                paginatedData.map((item, idx) => (
                  <tr key={item.id || idx} style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}>
                    <td>
                      <div>{formatTanggalStr(item.tanggal, lang)}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {item.waktu_absen ? new Date(item.waktu_absen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </div>
                    </td>
                    <td>
                      <strong>{item.dosen_nama}</strong>
                    </td>
                    <td>
                      <span className="badge badge-warning" style={{ marginRight: "0.5rem", fontSize: "0.7rem" }}>{item.mk_kode}</span>
                      {item.mk_nama}
                    </td>
                    <td>{item.kelas}</td>
                    <td style={{ fontWeight: "bold" }}>#{item.pertemuan_ke}</td>
                    <td style={{ minWidth: "220px", wordBreak: "break-word", whiteSpace: "normal", lineHeight: "1.5" }}>
                      {item.materi}
                    </td>
                    <td>
                      <span className={`badge ${item.status === 'hadir' ? 'badge-success' : item.status === 'izin' ? 'badge-warning' : item.status === 'pending' ? 'badge-secondary' : 'badge-danger'}`}>
                        {(item.status || '').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEditClick(item)} title={lang === "id" ? "Edit" : "Edit"}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)} title={lang === "id" ? "Hapus" : "Delete"}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ 
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "1rem 0.5rem 0", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "1rem"
          }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {lang === "id" 
                ? `Menampilkan ${((currentPage - 1) * PAGE_SIZE) + 1}–${Math.min(currentPage * PAGE_SIZE, attendance.length)} dari ${attendance.length}`
                : `Showing ${((currentPage - 1) * PAGE_SIZE) + 1}–${Math.min(currentPage * PAGE_SIZE, attendance.length)} of ${attendance.length}`
              }
            </span>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                «
              </button>
              <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                ‹
              </button>
              {/* Show page numbers */}
              {(() => {
                const pages = [];
                let start = Math.max(1, currentPage - 2);
                let end = Math.min(totalPages, currentPage + 2);
                if (end - start < 4) {
                  if (start === 1) end = Math.min(totalPages, start + 4);
                  else start = Math.max(1, end - 4);
                }
                for (let i = start; i <= end; i++) {
                  pages.push(
                    <button
                      key={i}
                      className={`pagination-btn ${i === currentPage ? 'active' : ''}`}
                      onClick={() => setCurrentPage(i)}
                    >
                      {i}
                    </button>
                  );
                }
                return pages;
              })()}
              <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                ›
              </button>
              <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Materi Perkuliahan Dosen Section */}
      {filterLecturer && filterCourse && (
        <div className="glass-panel dashboard-panel">
          <div className="panel-header" style={{ marginBottom: "1.5rem" }}>
            <h3 className="panel-title">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20, color: "var(--primary)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span>{t.materiPerkuliahanDosen} ({materiList.length} records)</span>
            </h3>
          </div>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{t.date}</th>
                  <th>{t.materiTitle}</th>
                  <th>File</th>
                  <th>{lang === "id" ? "Aksi" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {materiList.length > 0 ? (
                  materiList.map(materi => (
                    <tr key={materi.id}>
                      <td>{new Date(materi.uploaded_at).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td>{materi.judul}</td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)" }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                          {materi.file_name}
                        </span>
                      </td>
                      <td>
                        <a href={materi.file_url || materi.file_data} target="_blank" rel="noopener noreferrer" download={materi.file_name} className="btn btn-primary btn-sm" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          {t.printMateri}
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                      {lang === "id" ? "Tidak ada materi perkuliahan untuk dosen dan mata kuliah ini." : "No lecture materials for this lecturer and course."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        title={lang === "id" ? "Edit Data Pertemuan" : "Edit Meeting Data"}
        onClose={() => setIsEditModalOpen(false)}
      >
        <form onSubmit={handleSaveEdit}>
          <div className="form-group">
            <label className="form-label">{lang === "id" ? "Pertemuan Ke" : "Meeting No"} <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              type="number"
              className="form-control"
              value={editPertemuan}
              onChange={(e) => setEditPertemuan(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === "id" ? "Materi / Topik" : "Subject / Topic"} <span style={{ color: "var(--danger)" }}>*</span></label>
            <textarea
              className="form-control"
              rows={4}
              value={editMateri}
              onChange={(e) => setEditMateri(e.target.value)}
              required
            />
          </div>
          <div className="modal-footer" style={{ border: "none", padding: 0, marginTop: "2rem" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              {t.cancel}
            </button>
            <button type="submit" className="btn btn-primary">
              {t.saveChanges}
            </button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        title={lang === "id" ? "Pratinjau Ekspor Laporan" : "Export Report Preview"}
        onClose={() => setIsPreviewModalOpen(false)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "8px" }}>
            <div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>{lang === "id" ? "Total Pertemuan" : "Total Meetings"}</p>
              <h4 style={{ fontSize: "1.2rem", margin: 0 }}>{attendance.length}</h4>
            </div>
            <div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>{lang === "id" ? "Tingkat Kehadiran" : "Attendance Rate"}</p>
              <h4 style={{ fontSize: "1.2rem", margin: 0, color: "var(--success)" }}>
                {attendance.length > 0 ? Math.round((attendance.filter(d => d.status === 'hadir').length / attendance.length) * 100) : 0}%
              </h4>
            </div>
          </div>

          <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            <table className="custom-table" style={{ margin: 0 }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 1 }}>
                <tr>
                  <th style={{ fontSize: "0.75rem", padding: "0.5rem" }}>{t.date}</th>
                  <th style={{ fontSize: "0.75rem", padding: "0.5rem" }}>{t.course}</th>
                  <th style={{ fontSize: "0.75rem", padding: "0.5rem" }}>{t.lecturerName}</th>
                  <th style={{ fontSize: "0.75rem", padding: "0.5rem", textAlign: "center" }}>{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: "0.8rem", padding: "0.5rem" }}>{formatTanggalStr(item.tanggal, lang)}</td>
                    <td style={{ fontSize: "0.8rem", padding: "0.5rem" }}>{item.mk_kode} - {item.kelas}</td>
                    <td style={{ fontSize: "0.8rem", padding: "0.5rem" }}>{item.dosen_nama}</td>
                    <td style={{ fontSize: "0.8rem", padding: "0.5rem", textAlign: "center" }}>
                      <span className={`badge ${item.status === 'hadir' ? 'badge-success' : item.status === 'izin' ? 'badge-warning' : item.status === 'pending' ? 'badge-secondary' : 'badge-danger'}`} style={{ padding: "0.2rem 0.4rem", fontSize: "0.6rem" }}>
                        {(item.status || '').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" }}>
            <button className="btn btn-success" onClick={() => { handleExportExcel(); setIsPreviewModalOpen(false); }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span>{t.exportExcel}</span>
            </button>
            <button className="btn btn-primary" onClick={() => { handleExportPDF(); setIsPreviewModalOpen(false); }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span>{t.exportPdf}</span>
            </button>
          </div>
        </div>
      </Modal>

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
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img 
              src={selectedPhoto} 
              alt="Zoomed Photo" 
              style={{ 
                maxWidth: '100%', maxHeight: '90vh', 
                objectFit: 'contain',
                borderRadius: '12px', border: '2px solid var(--primary)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                display: 'block', margin: 'auto'
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
