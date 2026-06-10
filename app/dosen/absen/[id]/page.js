"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getSchedules, getCourses, getAttendance, saveAttendance } from "../../../../lib/db";
import { translations } from "../../../../lib/translations";

export default function AbsenPage() {
  const router = useRouter();
  const { id: scheduleId } = useParams();

  const [lang, setLang] = useState("id");
  const [schedule, setSchedule] = useState(null);
  const [materi, setMateri] = useState("");
  const [catatan, setCatatan] = useState("");
  const [fotoBukti, setFotoBukti] = useState(null);
  const [tandaTangan, setTandaTangan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);

  // Sync language and data
  const syncData = async () => {
    setLang(localStorage.getItem("sikad_lang") || "id");

    try {
      const rawSchedules = await getSchedules();
      const rawCourses = await getCourses();
      const foundSchedule = rawSchedules.find((j) => j.id === scheduleId);
      if (foundSchedule) {
        const mk = rawCourses.find((m) => m.id === foundSchedule.mk_id);
        setSchedule({
          ...foundSchedule,
          mk_kode: mk?.kode_mk,
          mk_nama: mk?.nama_mk,
          sks: mk?.sks
        });
      }
    } catch (err) {
      console.error("Error loading schedule data:", err);
    }
  };

  useEffect(() => {
    syncData();
    window.addEventListener("storage", syncData);
    return () => window.removeEventListener("storage", syncData);
  }, [scheduleId]);

  if (!schedule) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading class schedule details...</p>
      </div>
    );
  }

  const t = translations[lang];

  // Handle Photo Upload
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoBukti(reader.result); // Base64 representation
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setFotoBukti(null);
  };

  // Handle Selfie Camera Capture
  const handleSelfieChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.src = reader.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 400; // Compress selfie to 400px to save DB space
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setTandaTangan(compressedBase64);
          setSignatureSaved(true);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelfie = () => {
    setTandaTangan(null);
    setSignatureSaved(false);
  };

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!materi.trim()) {
      alert(t.subjectRequired);
      return;
    }

    if (!tandaTangan) {
      alert(lang === "id" ? "Harap ambil foto selfie kehadiran Anda!" : "Please take your attendance selfie!");
      return;
    }

    setSubmitting(true);

    try {
      const loggedInUser = JSON.parse(localStorage.getItem("sikad_logged_in_user"));
      const rawAttendance = await getAttendance();
      
      // Determine the next meeting number based on existing records
      const previousMeetings = rawAttendance.filter(
        (k) => k.jadwal_id === scheduleId
      );
      const nextMeetingNo = previousMeetings.length + 1;

      // Create new attendance record
      const newRecord = {
        id: "kh_" + Math.random().toString(36).substr(2, 9),
        jadwal_id: scheduleId,
        dosen_id: loggedInUser.id,
        tanggal: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
        pertemuan_ke: nextMeetingNo,
        materi: materi,
        foto_bukti: fotoBukti || "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&q=80&w=400", // Default aviation teaching mockup
        tanda_tangan: tandaTangan,
        status: "pending",
        waktu_absen: new Date().toISOString(),
        catatan: catatan
      };

      await saveAttendance(newRecord);

      setTimeout(() => {
        setSubmitting(false);
        alert(t.successCheckIn);
        router.push("/dosen/dashboard");
      }, 500);
    } catch (err) {
      setSubmitting(false);
      alert(lang === "id" ? "Gagal menyimpan absensi!" : "Failed to record attendance!");
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/dosen/dashboard" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
          &larr; {t.backToDashboard}
        </Link>
      </div>

      <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
        <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
          <span className="badge badge-warning" style={{ marginBottom: "0.5rem" }}>{schedule.mk_kode}</span>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{schedule.mk_nama}</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            {t.class}: {schedule.kelas} | {t.room}: {schedule.ruangan} | {t.time}: {schedule.jam_mulai} - {schedule.jam_selesai}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Topic Input */}
          <div className="form-group">
            <label className="form-label">{t.subject} <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder={lang === "id" ? "Contoh: Pengenalan struktur kabin Boeing 737" : "e.g. Introduction to Boeing 737 cabin structure"}
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
              required
            />
          </div>

          {/* Notes Input */}
          <div className="form-group">
            <label className="form-label">{t.notes}</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder={lang === "id" ? "Catatan tambahan untuk pertemuan ini (opsional)" : "Additional notes for this session (optional)"}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </div>

          {/* Photo Evidence Upload */}
          <div className="form-group" style={{ marginBottom: "2rem" }}>
            <label className="form-label">{t.proofPhoto}</label>
            {fotoBukti ? (
              <div className="photo-preview-container">
                <img src={fotoBukti} alt="Bukti mengajar" className="photo-preview" />
                <button type="button" className="remove-photo-btn" onClick={removePhoto}>
                  &times;
                </button>
              </div>
            ) : (
              <div className="photo-upload-wrapper" onClick={() => document.getElementById("photo-input").click()}>
                <div className="photo-upload-placeholder">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                  <span>{t.uploadImage}</span>
                  <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>PNG, JPG up to 5MB</span>
                </div>
                <input
                  type="file"
                  id="photo-input"
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
              </div>
            )}
          </div>

          {/* Selfie Camera Capture */}
          <div className="form-group" style={{ marginBottom: "2rem" }}>
            <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{lang === "id" ? "Foto Selfie Kehadiran" : "Attendance Selfie"} <span style={{ color: "var(--danger)" }}>*</span></span>
              {signatureSaved && <span style={{ color: "var(--success)", fontSize: "0.8rem", fontWeight: "bold" }}>✓ Verified</span>}
            </label>
            
            {tandaTangan ? (
              <div className="photo-preview-container" style={{ maxWidth: "300px", margin: "0 auto" }}>
                <img 
                  src={tandaTangan} 
                  alt="Selfie Kehadiran" 
                  className="photo-preview" 
                  style={{ borderRadius: "12px", width: "100%", height: "300px", objectFit: "cover", objectPosition: "top center" }} 
                />
                <button type="button" className="remove-photo-btn" onClick={removeSelfie}>
                  &times;
                </button>
              </div>
            ) : (
              <div className="photo-upload-wrapper" onClick={() => document.getElementById("selfie-input").click()} style={{ padding: "3rem 1rem", background: "rgba(59, 130, 246, 0.05)", borderColor: "rgba(59, 130, 246, 0.3)" }}>
                <div className="photo-upload-placeholder" style={{ gap: "0.75rem" }}>
                  <div style={{ background: "var(--primary)", padding: "1rem", borderRadius: "50%", color: "white", marginBottom: "0.5rem", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.4)" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: "2rem", height: "2rem" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                    </svg>
                  </div>
                  <span style={{ fontWeight: "bold", fontSize: "1.1rem", color: "var(--text-primary)" }}>
                    {lang === "id" ? "Buka Kamera Depan" : "Open Front Camera"}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {lang === "id" ? "Ketuk untuk mengambil foto selfie" : "Tap to capture a selfie"}
                  </span>
                </div>
                {/* 'capture="user"' forces front-facing camera on mobile devices natively */}
                <input
                  type="file"
                  id="selfie-input"
                  style={{ display: "none" }}
                  accept="image/*"
                  capture="user"
                  onChange={handleSelfieChange}
                />
              </div>
            )}
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "1rem" }}
            disabled={submitting || !signatureSaved}
          >
            {submitting ? "Submitting attendance log..." : t.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
