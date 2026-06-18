import { db } from './firebase';
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

// Helper to standardise collection names
const TABLES = {
  USERS: 'tabel_user',
  COURSES: 'tabel_matakuliah',
  SCHEDULES: 'tabel_jadwal',
  ATTENDANCE: 'tabel_kehadiran'
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

    return null;
  } else {
    const localDb = getLocalDB();
    return localDb.users.find(u => 
      (u.email || '').trim().toLowerCase() === email.trim().toLowerCase()
    ) || null;
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

// --- OPTIMIZED REPORT QUERIES ---

export async function getAttendanceReport({ dosenId, mkId, kelas, startDate, endDate } = {}) {
  if (USE_FIREBASE) {
    const attendanceSnapshot = await getDocs(collection(db, TABLES.ATTENDANCE));
    let attendanceList = [];
    attendanceSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status !== "pending") {
        // Normalize Excel serial date numbers to ISO strings
        if (data.tanggal) data.tanggal = excelDateToISO(data.tanggal);
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
      const mk = jadwal ? courseMap[jadwal.mk_id] : null;

      return {
        id: row.id,
        tanggal: row.tanggal,
        pertemuan_ke: row.pertemuan_ke,
        materi: row.materi,
        sub_materi: row.sub_materi || "", // Added sub_materi
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
        const course = localDb.mataKuliah?.find(m => m.id === schedule?.mk_id);
        return {
          ...k,
          sub_materi: k.sub_materi || "", // Added sub_materi
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
