import { db, storage } from './firebase';
import { getLocalDB, saveLocalDB } from './mockData';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  query,
  where,
  limit
} from "firebase/firestore";
import { ref, uploadString, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// Helper to standardise collection names
const TABLES = {
  USERS: 'tabel_user',
  COURSES: 'tabel_matakuliah',
  SCHEDULES: 'tabel_jadwal',
  ATTENDANCE: 'tabel_kehadiran',
  STUDENTS: 'tabel_siswa',
  STUDENT_ATTENDANCE: 'tabel_absensi_siswa',
  STUDENT_EVALUATION: 'tabel_penilaian',
  MATERI: 'tabel_materi'
};

// Toggle to use Firebase vs MockData locally (set true to use Firebase)
const USE_FIREBASE = true;

// Convert Excel serial date number to ISO date string (for CSV-imported data)
// Pass dateOnly=true to get YYYY-MM-DD, false to get full ISO datetime
function excelDateToISO(value, dateOnly = false) {
  if (!value || typeof value === 'string') return value;
  if (typeof value === 'number') {
    // Excel serial number (days since 1900-01-00, with a leap year bug)
    const date = new Date(Math.round((value - 25569) * 86400) * 1000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    if (dateOnly) return `${y}-${m}-${d}`;
    return date.toISOString();
  }
  return value;
}

// --- USER CRUD ---
export async function getUsers() {
  if (USE_FIREBASE) {
    const querySnapshot = await getDocs(collection(db, TABLES.USERS));
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    return users;
  } else {
    return getLocalDB().users;
  }
}

// Fast login: query by email directly (no need to fetch all users)
export async function getUserByEmail(email) {
  if (USE_FIREBASE) {
    const emailLower = email.trim().toLowerCase();
    const emailOriginal = email.trim();

    // Try lowercase first
    const q1 = query(
      collection(db, TABLES.USERS),
      where('email', '==', emailLower),
      limit(1)
    );
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const d = snap1.docs[0];
      return { id: d.id, ...d.data() };
    }

    // Fallback: try original casing (some emails may be stored with capitals)
    if (emailOriginal !== emailLower) {
      const q2 = query(
        collection(db, TABLES.USERS),
        where('email', '==', emailOriginal),
        limit(1)
      );
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        const d = snap2.docs[0];
        return { id: d.id, ...d.data() };
      }
    }

    // Fallback: Check if the user is a student in tabel_siswa
    const nimCandidate = emailLower.includes("@") ? emailLower.split("@")[0] : emailLower;
    const qSiswa = query(
      collection(db, TABLES.STUDENTS),
      where('nim', '==', nimCandidate.toUpperCase()),
      limit(1)
    );
    const snapSiswa = await getDocs(qSiswa);
    if (!snapSiswa.empty) {
      const d = snapSiswa.docs[0];
      const studentData = d.data();
      return {
        id: d.id,
        email: emailLower,
        nim: studentData.nim,
        nama_lengkap: studentData.nama_lengkap || studentData.nama,
        kelas: studentData.kelas,
        angkatan: studentData.angkatan,
        password: studentData.nim, // Student password defaults to NIM
        role: "siswa"
      };
    }

    return null;
  } else {
    const localDb = getLocalDB();
    const matchedUser = localDb.users.find(u => 
      (u.email || '').trim().toLowerCase() === email.trim().toLowerCase()
    );
    if (matchedUser) return matchedUser;

    // Check local student db
    const nimCandidate = email.includes("@") ? email.split("@")[0] : email;
    const matchedStudent = (localDb.siswa || []).find(s => 
      s.nim.toUpperCase() === nimCandidate.toUpperCase()
    );
    if (matchedStudent) {
      return {
        id: matchedStudent.id,
        email: email.trim().toLowerCase(),
        nim: matchedStudent.nim,
        nama_lengkap: matchedStudent.nama_lengkap || matchedStudent.nama,
        kelas: matchedStudent.kelas,
        angkatan: matchedStudent.angkatan,
        password: matchedStudent.nim,
        role: "siswa"
      };
    }
    return null;
  }
}

export async function saveUser(user) {
  if (USE_FIREBASE) {
    await setDoc(doc(db, TABLES.USERS, user.id), user);
  } else {
    const localDb = getLocalDB();
    const idx = localDb.users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      localDb.users[idx] = user;
    } else {
      localDb.users.push(user);
    }
    saveLocalDB(localDb);
  }
}

export async function deleteUser(id) {
  if (USE_FIREBASE) {
    await deleteDoc(doc(db, TABLES.USERS, id));
  } else {
    const localDb = getLocalDB();
    localDb.users = localDb.users.filter(u => u.id !== id);
    saveLocalDB(localDb);
  }
}

// --- COURSES CRUD ---
export async function getCourses() {
  if (USE_FIREBASE) {
    const querySnapshot = await getDocs(collection(db, TABLES.COURSES));
    const courses = [];
    querySnapshot.forEach((doc) => {
      courses.push({ id: doc.id, ...doc.data() });
    });
    return courses;
  } else {
    return getLocalDB().mataKuliah;
  }
}

export async function saveCourse(course) {
  if (USE_FIREBASE) {
    await setDoc(doc(db, TABLES.COURSES, course.id), course);
  } else {
    const localDb = getLocalDB();
    const idx = localDb.mataKuliah.findIndex(m => m.id === course.id);
    if (idx !== -1) {
      localDb.mataKuliah[idx] = course;
    } else {
      localDb.mataKuliah.push(course);
    }
    saveLocalDB(localDb);
  }
}

export async function deleteCourse(id) {
  if (USE_FIREBASE) {
    await deleteDoc(doc(db, TABLES.COURSES, id));
  } else {
    const localDb = getLocalDB();
    localDb.mataKuliah = localDb.mataKuliah.filter(m => m.id !== id);
    saveLocalDB(localDb);
  }
}

// --- SCHEDULES CRUD ---
export async function getSchedules() {
  if (USE_FIREBASE) {
    const querySnapshot = await getDocs(collection(db, TABLES.SCHEDULES));
    const schedules = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Normalize Excel serial date numbers to ISO strings
      // tanggal is date-only (YYYY-MM-DD), waktu_absen is datetime
      if (data.tanggal) data.tanggal = excelDateToISO(data.tanggal, true);
      schedules.push({ id: doc.id, ...data });
    });
    return schedules;
  } else {
    return getLocalDB().jadwal;
  }
}

export async function saveSchedule(schedule) {
  if (USE_FIREBASE) {
    await setDoc(doc(db, TABLES.SCHEDULES, schedule.id), schedule);
  } else {
    const localDb = getLocalDB();
    const idx = localDb.jadwal.findIndex(j => j.id === schedule.id);
    if (idx !== -1) {
      localDb.jadwal[idx] = schedule;
    } else {
      localDb.jadwal.push(schedule);
    }
    saveLocalDB(localDb);
  }
}

export async function deleteSchedule(id) {
  if (USE_FIREBASE) {
    // Cascade delete student attendances linked to this schedule
    const q = query(collection(db, TABLES.STUDENT_ATTENDANCE), where('jadwal_id', '==', id));
    const snap = await getDocs(q);
    const deletePromises = [];
    snap.forEach(d => {
      deletePromises.push(deleteDoc(doc(db, TABLES.STUDENT_ATTENDANCE, d.id)));
    });
    await Promise.all(deletePromises);

    await deleteDoc(doc(db, TABLES.SCHEDULES, id));
  } else {
    const localDb = getLocalDB();
    localDb.jadwal = localDb.jadwal.filter(j => j.id !== id);
    saveLocalDB(localDb);
  }
}

// --- ATTENDANCE CRUD ---
export async function getAttendance() {
  if (USE_FIREBASE) {
    const querySnapshot = await getDocs(collection(db, TABLES.ATTENDANCE));
    const attendance = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Normalize Excel serial date numbers to ISO strings
      if (data.tanggal) data.tanggal = excelDateToISO(data.tanggal, true);
      if (data.waktu_absen) data.waktu_absen = excelDateToISO(data.waktu_absen, false);
      attendance.push({ id: doc.id, ...data });
    });
    return attendance;
  } else {
    return getLocalDB().kehadiran;
  }
}

export async function saveAttendance(att) {
  if (USE_FIREBASE) {
    await setDoc(doc(db, TABLES.ATTENDANCE, att.id), att);
  } else {
    const localDb = getLocalDB();
    const idx = localDb.kehadiran.findIndex(k => k.id === att.id);
    if (idx !== -1) {
      localDb.kehadiran[idx] = att;
    } else {
      localDb.kehadiran.push(att);
    }
    saveLocalDB(localDb);
  }
}

export async function deleteAttendance(id) {
  if (USE_FIREBASE) {
    await deleteDoc(doc(db, TABLES.ATTENDANCE, id));
  } else {
    const localDb = getLocalDB();
    localDb.kehadiran = localDb.kehadiran.filter(k => k.id !== id);
    saveLocalDB(localDb);
  }
}

// --- HELPER UNTUK SILABUS ---
function getSyllabusSubMateri(course, pertemuan_ke) {
  if (!course || !course.silabus) return null;
  let existingSyllabus = [];
  try {
    if (typeof course.silabus === 'string') {
      const parsed = JSON.parse(course.silabus);
      existingSyllabus = Array.isArray(parsed) ? parsed : [];
    } else if (Array.isArray(course.silabus)) {
      existingSyllabus = course.silabus;
    }
  } catch (e) {}
  
  const syllabusItem = existingSyllabus.find(s => parseInt(s.pertemuan) === parseInt(pertemuan_ke));
  return syllabusItem ? syllabusItem.sub_materi : null;
}

// --- OPTIMIZED REPORT QUERIES ---

export async function getAttendanceReport({ dosenId, mkId, kelas, startDate, endDate } = {}) {
  if (USE_FIREBASE) {
    const attendanceSnapshot = await getDocs(collection(db, TABLES.ATTENDANCE));
    let attendanceList = [];
    attendanceSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status !== "pending") {
        // Normalize Excel serial date numbers to ISO strings
        if (data.tanggal) data.tanggal = excelDateToISO(data.tanggal, true);
        if (data.waktu_absen) data.waktu_absen = excelDateToISO(data.waktu_absen);
        attendanceList.push({ id: doc.id, ...data });
      }
    });

    if (dosenId) attendanceList = attendanceList.filter(a => a.dosen_id === dosenId);
    if (startDate) attendanceList = attendanceList.filter(a => a.tanggal >= startDate);
    if (endDate) attendanceList = attendanceList.filter(a => a.tanggal <= endDate);

    attendanceList.sort((a, b) => new Date(b.waktu_absen) - new Date(a.waktu_absen));

    if (attendanceList.length === 0) return [];

    const [users, schedules, courses] = await Promise.all([
      getUsers(),
      getSchedules(),
      getCourses()
    ]);

    const userMap = {};
    users.forEach(u => userMap[u.id] = u);

    const scheduleMap = {};
    schedules.forEach(s => scheduleMap[s.id] = s);

    const courseMap = {};
    courses.forEach(c => courseMap[c.id] = c);

    let results = attendanceList.map(row => {
      const user = userMap[row.dosen_id];
      const jadwal = scheduleMap[row.jadwal_id];
      let mk = jadwal ? courseMap[jadwal.mk_id] : null;
      
      // Fallback: match course by mk_kode or mk_id directly from the row
      if (!mk) {
        if (row.mk_id) mk = courseMap[row.mk_id];
        else if (row.mk_kode) mk = Object.values(courseMap).find(c => c.kode_mk === row.mk_kode);
      }

      const syllabusSubMateri = getSyllabusSubMateri(mk, row.pertemuan_ke);

      return {
        id: row.id,
        tanggal: row.tanggal,
        pertemuan_ke: row.pertemuan_ke,
        materi: row.materi,
        sub_materi: syllabusSubMateri || row.sub_materi || "", // Priority to syllabus
        status: row.status,
        waktu_absen: row.waktu_absen,
        catatan: row.catatan,
        dosen_id: row.dosen_id,
        tanda_tangan: row.tanda_tangan || null,
        foto_bukti: row.foto_bukti || null,
        dosen_nama: user?.nama_lengkap,
        dosen_nip: user?.nip,
        mk_nama: mk?.nama_mk,
        mk_kode: mk?.kode_mk,
        mk_id: mk?.id,
        kelas: jadwal?.kelas,
        ruangan: jadwal?.ruangan,
      };
    });

    if (mkId) {
      results = results.filter(r => r.mk_id === mkId);
    }
    if (kelas) {
      // Allow partial match and case insensitive
      results = results.filter(r => r.kelas && r.kelas.toLowerCase().includes(kelas.toLowerCase()));
    }

    return results;

  } else {
    // Fallback for local DB (same logic as before)
    const localDb = getLocalDB();
    let mapped = localDb.kehadiran
      .filter(k => k.status !== 'pending')
      .map(k => {
        const lecturer = localDb.users?.find(u => u.id === k.dosen_id);
        const schedule = localDb.jadwal?.find(j => j.id === k.jadwal_id);
        let course = localDb.mataKuliah?.find(m => m.id === schedule?.mk_id);
        
        // Fallback: match course by mk_kode or mk_id directly from the row
        if (!course) {
          if (k.mk_id) course = localDb.mataKuliah?.find(m => m.id === k.mk_id);
          else if (k.mk_kode) course = localDb.mataKuliah?.find(m => m.kode_mk === k.mk_kode);
        }
        
        const syllabusSubMateri = getSyllabusSubMateri(course, k.pertemuan_ke);
        return {
          ...k,
          sub_materi: syllabusSubMateri || k.sub_materi || "", // Priority to syllabus
          dosen_nama: lecturer?.nama_lengkap,
          dosen_nip: lecturer?.nip,
          mk_nama: course?.nama_mk,
          mk_kode: course?.kode_mk,
          mk_id: course?.id,
          kelas: schedule?.kelas,
          ruangan: schedule?.ruangan,
        };
      })
      .sort((a, b) => new Date(b.waktu_absen) - new Date(a.waktu_absen));

    if (dosenId) mapped = mapped.filter(r => r.dosen_id === dosenId);
    if (mkId) mapped = mapped.filter(r => r.mk_id === mkId);
    if (kelas) mapped = mapped.filter(r => r.kelas && r.kelas.toLowerCase().includes(kelas.toLowerCase()));
    if (startDate) mapped = mapped.filter(r => r.tanggal >= startDate);
    if (endDate) mapped = mapped.filter(r => r.tanggal <= endDate);

    return mapped;
  }
}

export async function getAttendanceRecordDetail(id) {
  if (USE_FIREBASE) {
    const docRef = doc(db, TABLES.ATTENDANCE, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return { tanda_tangan: data.tanda_tangan, foto_bukti: data.foto_bukti };
    } else {
      return null;
    }
  } else {
    const localDb = getLocalDB();
    const record = localDb.kehadiran.find(k => k.id === id);
    return record ? { tanda_tangan: record.tanda_tangan, foto_bukti: record.foto_bukti } : null;
  }
}

// --- STUDENTS CRUD ---
export async function getStudents() {
  if (USE_FIREBASE) {
    const querySnapshot = await getDocs(collection(db, TABLES.STUDENTS));
    const students = [];
    querySnapshot.forEach((d) => {
      students.push({ id: d.id, ...d.data() });
    });
    // Sort by kelas then nama_lengkap
    students.sort((a, b) => {
      if (a.kelas < b.kelas) return -1;
      if (a.kelas > b.kelas) return 1;
      return (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '');
    });
    return students;
  } else {
    return [];
  }
}

export async function getStudentsByKelas(kelas) {
  if (USE_FIREBASE) {
    const q = query(
      collection(db, TABLES.STUDENTS),
      where('kelas', '==', kelas)
    );
    const snap = await getDocs(q);
    const students = [];
    snap.forEach((d) => students.push({ id: d.id, ...d.data() }));
    students.sort((a, b) => (a.nama_lengkap || '').localeCompare(b.nama_lengkap || ''));
    return students;
  } else {
    return [];
  }
}

export async function saveStudent(student) {
  if (USE_FIREBASE) {
    await setDoc(doc(db, TABLES.STUDENTS, student.id), student);
  }
}

export async function deleteStudent(id) {
  if (USE_FIREBASE) {
    await deleteDoc(doc(db, TABLES.STUDENTS, id));
  }
}

// --- STUDENT ATTENDANCE CRUD ---
export async function getStudentAttendance() {
  if (USE_FIREBASE) {
    const querySnapshot = await getDocs(collection(db, TABLES.STUDENT_ATTENDANCE));
    const records = [];
    querySnapshot.forEach((d) => {
      records.push({ id: d.id, ...d.data() });
    });
    return records;
  } else {
    return [];
  }
}

export async function getStudentAttendanceByJadwal(jadwalId, tanggal) {
  if (USE_FIREBASE) {
    let q = query(
      collection(db, TABLES.STUDENT_ATTENDANCE),
      where('jadwal_id', '==', jadwalId)
    );
    if (tanggal) {
      q = query(
        collection(db, TABLES.STUDENT_ATTENDANCE),
        where('jadwal_id', '==', jadwalId),
        where('tanggal', '==', tanggal)
      );
    }
    const snap = await getDocs(q);
    const records = [];
    snap.forEach((d) => records.push({ id: d.id, ...d.data() }));
    return records;
  } else {
    return [];
  }
}

export async function saveStudentAttendance(record) {
  if (USE_FIREBASE) {
    await setDoc(doc(db, TABLES.STUDENT_ATTENDANCE, record.id), record);
  }
}

export async function deleteStudentAttendance(id) {
  if (USE_FIREBASE) {
    await deleteDoc(doc(db, TABLES.STUDENT_ATTENDANCE, id));
  }
}

// ─── Student Evaluations ────────────────────────────────────────────────────────
export async function getStudentEvaluations() {
  if (USE_FIREBASE && db) {
    try {
      const q = query(collection(db, TABLES.STUDENT_EVALUATION));
      const querySnapshot = await getDocs(q);
      const evals = [];
      querySnapshot.forEach((doc) => {
        evals.push({ id: doc.id, ...doc.data() });
      });
      return evals;
    } catch (e) {
      console.error("Error getStudentEvaluations: ", e);
      return [];
    }
  }
  return [];
}

export async function getStudentEvaluationByMkAndKelas(mkId, kelas) {
  if (USE_FIREBASE && db) {
    try {
      const q = query(
        collection(db, TABLES.STUDENT_EVALUATION),
        where("mk_id", "==", mkId),
        where("kelas", "==", kelas)
      );
      const querySnapshot = await getDocs(q);
      let evals = null;
      querySnapshot.forEach((doc) => {
        evals = { id: doc.id, ...doc.data() };
      });
      return evals;
    } catch (e) {
      console.error("Error getStudentEvaluationByMkAndKelas: ", e);
      return null;
    }
  }
  return null;
}

export async function saveStudentEvaluation(record) {
  if (USE_FIREBASE && db) {
    try {
      let docRef;
      if (record.id) {
        docRef = doc(db, TABLES.STUDENT_EVALUATION, record.id);
        await setDoc(docRef, record, { merge: true });
      } else {
        docRef = doc(collection(db, TABLES.STUDENT_EVALUATION));
        await setDoc(docRef, { ...record, id: docRef.id });
      }
      return true;
    } catch (e) {
      console.error("Error saving student evaluation: ", e);
      return false;
    }
  }
  return false;
}

// --- MATERI PERKULIAHAN CRUD ---
export async function getMateri(dosenId, mkId) {
  if (USE_FIREBASE) {
    let qRef = collection(db, TABLES.MATERI);
    if (dosenId && mkId) {
      qRef = query(qRef, where("dosen_id", "==", dosenId), where("mk_id", "==", mkId));
    } else if (dosenId) {
      qRef = query(qRef, where("dosen_id", "==", dosenId));
    } else if (mkId) {
      qRef = query(qRef, where("mk_id", "==", mkId));
    }
    
    const querySnapshot = await getDocs(qRef);
    const materi = [];
    
    for (const docSnap of querySnapshot.docs) {
      const item = { id: docSnap.id, ...docSnap.data() };
      
      // Rekonstruksi file jika disimpan secara chunked di Firestore
      if (item.file_url === "chunked") {
        try {
          const chunksSnap = await getDocs(collection(db, TABLES.MATERI, item.id, "chunks"));
          const chunks = [];
          chunksSnap.forEach(cDoc => chunks.push(cDoc.data()));
          chunks.sort((a, b) => a.index - b.index);
          item.file_url = chunks.map(c => c.data).join("");
        } catch (e) {
          console.error("Gagal merekonstruksi file chunked:", e);
        }
      }
      
      materi.push(item);
    }
    
    return materi;
  } else {
    let localMateri = getLocalDB().materi || [];
    if (dosenId) {
      localMateri = localMateri.filter(m => m.dosen_id === dosenId);
    }
    if (mkId) {
      localMateri = localMateri.filter(m => m.mk_id === mkId);
    }
    return localMateri;
  }
}

export async function saveMateri(materi, onProgress) {
  if (USE_FIREBASE) {
    let docRef;
    if (materi.id) {
      docRef = doc(db, TABLES.MATERI, materi.id);
    } else {
      docRef = doc(collection(db, TABLES.MATERI));
      materi.id = docRef.id;
    }

    if (materi.raw_file) {
      if (onProgress) onProgress(10);

      let uploadSuccess = false;

      // 1. Coba Cloudinary (Timeout cepat 3 detik agar tidak menggantung)
      try {
        const formData = new FormData();
        formData.append("file", materi.raw_file);
        formData.append("upload_preset", "sikad_preset");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch("https://api.cloudinary.com/v1_1/kxyydjjm/auto/upload", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (response.ok && data.secure_url) {
          if (onProgress) onProgress(100);
          materi.file_url = data.secure_url;
          materi.storage_path = data.public_id;
          uploadSuccess = true;
        }
      } catch (e) {
        // Cepat lanjut ke fallback jika Cloudinary gagal/timeout
      }

      // 2. Jika Cloudinary gagal, gunakan Firestore Chunked Storage (Super Cepat & Bebas Limit Size)
      if (!uploadSuccess) {
        if (onProgress) onProgress(30);

        // Baca file ke Base64
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(materi.raw_file);
        });

        if (onProgress) onProgress(50);

        const CHUNK_SIZE = 400 * 1024; // 400KB per chunk untuk keamanan limit 1MB Firestore
        if (base64Data.length <= CHUNK_SIZE) {
          materi.file_url = base64Data;
        } else {
          materi.file_url = "chunked";
          const chunks = [];
          for (let i = 0; i < base64Data.length; i += CHUNK_SIZE) {
            chunks.push(base64Data.slice(i, i + CHUNK_SIZE));
          }

          materi.total_chunks = chunks.length;

          // Simpan potongan file ke subcollection "chunks"
          for (let i = 0; i < chunks.length; i++) {
            const chunkRef = doc(db, TABLES.MATERI, materi.id, "chunks", `chunk_${i}`);
            await setDoc(chunkRef, { index: i, data: chunks[i] });
            if (onProgress) {
              onProgress(50 + Math.round(((i + 1) / chunks.length) * 45));
            }
          }
        }
      }

      delete materi.raw_file;
      delete materi.file_data;
    }

    delete materi.raw_file;
    await setDoc(docRef, materi, { merge: true });
    if (onProgress) onProgress(100);
    return true;
  } else {
    // Convert raw_file to base64 if needed for local mock DB
    if (materi.raw_file && !materi.file_data) {
      materi.file_data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(materi.raw_file);
      });
    }

    if (materi.file_data && onProgress) {
      for (let i = 0; i <= 100; i += 10) {
        onProgress(i);
        await new Promise(r => setTimeout(r, 100));
      }
    }

    const localDb = getLocalDB();
    if (!localDb.materi) localDb.materi = [];
    
    if (!materi.file_url && materi.file_data) {
      materi.file_url = materi.file_data;
    }

    delete materi.raw_file;

    if (materi.id) {
      const idx = localDb.materi.findIndex(m => m.id === materi.id);
      if (idx !== -1) {
        localDb.materi[idx] = materi;
      } else {
        localDb.materi.push(materi);
      }
    } else {
      const newMateri = { ...materi, id: `materi_${Date.now()}` };
      localDb.materi.push(newMateri);
    }
    saveLocalDB(localDb);
    return true;
  }
}

export async function deleteMateri(id) {
  if (USE_FIREBASE) {
    const docRef = doc(db, TABLES.MATERI, id);
    // Hapus subcollection chunks jika ada
    try {
      const chunksSnap = await getDocs(collection(db, TABLES.MATERI, id, "chunks"));
      for (const cDoc of chunksSnap.docs) {
        await deleteDoc(cDoc.ref);
      }
    } catch (e) {
      console.warn("Gagal menghapus chunks:", e);
    }
    await deleteDoc(docRef);
  } else {
    const localDb = getLocalDB();
    if (localDb.materi) {
      localDb.materi = localDb.materi.filter(m => m.id !== id);
      saveLocalDB(localDb);
    }
  }
}
