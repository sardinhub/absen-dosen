import { supabase, isSupabaseConfigured } from './supabase';
import { getLocalDB, saveLocalDB } from './mockData';

// Helper to standardise table names
const TABLES = {
  USERS: 'tabel_user',
  COURSES: 'tabel_matakuliah',
  SCHEDULES: 'tabel_jadwal',
  ATTENDANCE: 'tabel_kehadiran'
};

// --- USER CRUD ---
export async function getUsers() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*');
    if (error) {
      console.error('Error fetching users from Supabase:', error);
      throw error;
    }
    return data;
  } else {
    return getLocalDB().users;
  }
}

export async function saveUser(user) {
  if (isSupabaseConfigured) {
    // Check if user exists to decide insert or update
    const { data: existing } = await supabase
      .from(TABLES.USERS)
      .select('id')
      .eq('id', user.id);
    
    if (existing && existing.length > 0) {
      // Update
      const { error } = await supabase
        .from(TABLES.USERS)
        .update(user)
        .eq('id', user.id);
      if (error) throw error;
    } else {
      // Insert
      const { error } = await supabase
        .from(TABLES.USERS)
        .insert([user]);
      if (error) throw error;
    }
  } else {
    const db = getLocalDB();
    const idx = db.users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      db.users[idx] = user;
    } else {
      db.users.push(user);
    }
    saveLocalDB(db);
  }
}

export async function deleteUser(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from(TABLES.USERS)
      .delete()
      .eq('id', id);
    if (error) throw error;
  } else {
    const db = getLocalDB();
    db.users = db.users.filter(u => u.id !== id);
    saveLocalDB(db);
  }
}

// --- COURSES CRUD ---
export async function getCourses() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from(TABLES.COURSES)
      .select('*');
    if (error) {
      console.error('Error fetching courses from Supabase:', error);
      throw error;
    }
    return data;
  } else {
    return getLocalDB().mataKuliah;
  }
}

export async function saveCourse(course) {
  if (isSupabaseConfigured) {
    const { data: existing } = await supabase
      .from(TABLES.COURSES)
      .select('id')
      .eq('id', course.id);
    
    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from(TABLES.COURSES)
        .update(course)
        .eq('id', course.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from(TABLES.COURSES)
        .insert([course]);
      if (error) throw error;
    }
  } else {
    const db = getLocalDB();
    const idx = db.mataKuliah.findIndex(m => m.id === course.id);
    if (idx !== -1) {
      db.mataKuliah[idx] = course;
    } else {
      db.mataKuliah.push(course);
    }
    saveLocalDB(db);
  }
}

export async function deleteCourse(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from(TABLES.COURSES)
      .delete()
      .eq('id', id);
    if (error) throw error;
  } else {
    const db = getLocalDB();
    db.mataKuliah = db.mataKuliah.filter(m => m.id !== id);
    saveLocalDB(db);
  }
}

// --- SCHEDULES CRUD ---
export async function getSchedules() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from(TABLES.SCHEDULES)
      .select('*');
    if (error) {
      console.error('Error fetching schedules from Supabase:', error);
      throw error;
    }
    return data;
  } else {
    return getLocalDB().jadwal;
  }
}

export async function saveSchedule(schedule) {
  if (isSupabaseConfigured) {
    const { data: existing } = await supabase
      .from(TABLES.SCHEDULES)
      .select('id')
      .eq('id', schedule.id);
    
    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from(TABLES.SCHEDULES)
        .update(schedule)
        .eq('id', schedule.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from(TABLES.SCHEDULES)
        .insert([schedule]);
      if (error) throw error;
    }
  } else {
    const db = getLocalDB();
    const idx = db.jadwal.findIndex(j => j.id === schedule.id);
    if (idx !== -1) {
      db.jadwal[idx] = schedule;
    } else {
      db.jadwal.push(schedule);
    }
    saveLocalDB(db);
  }
}

export async function deleteSchedule(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from(TABLES.SCHEDULES)
      .delete()
      .eq('id', id);
    if (error) throw error;
  } else {
    const db = getLocalDB();
    db.jadwal = db.jadwal.filter(j => j.id !== id);
    saveLocalDB(db);
  }
}

// --- ATTENDANCE CRUD ---
export async function getAttendance() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from(TABLES.ATTENDANCE)
      .select('*');
    if (error) {
      console.error('Error fetching attendance from Supabase:', error);
      throw error;
    }
    return data;
  } else {
    return getLocalDB().kehadiran;
  }
}

export async function saveAttendance(att) {
  if (isSupabaseConfigured) {
    const { data: existing } = await supabase
      .from(TABLES.ATTENDANCE)
      .select('id')
      .eq('id', att.id);
    
    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from(TABLES.ATTENDANCE)
        .update(att)
        .eq('id', att.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from(TABLES.ATTENDANCE)
        .insert([att]);
      if (error) throw error;
    }
  } else {
    const db = getLocalDB();
    const idx = db.kehadiran.findIndex(k => k.id === att.id);
    if (idx !== -1) {
      db.kehadiran[idx] = att;
    } else {
      db.kehadiran.push(att);
    }
    saveLocalDB(db);
  }
}

export async function deleteAttendance(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from(TABLES.ATTENDANCE)
      .delete()
      .eq('id', id);
    if (error) throw error;
  } else {
    const db = getLocalDB();
    db.kehadiran = db.kehadiran.filter(k => k.id !== id);
    saveLocalDB(db);
  }
}

// --- OPTIMIZED REPORT QUERIES ---

// Lightweight columns for the report table (exclude heavy base64 data)
const REPORT_SELECT_LIGHT = `
  id,
  tanggal,
  pertemuan_ke,
  materi,
  status,
  waktu_absen,
  catatan,
  dosen_id,
  tabel_user!tabel_kehadiran_dosen_id_fkey ( id, nama_lengkap, nip ),
  tabel_jadwal!tabel_kehadiran_jadwal_id_fkey ( id, kelas, ruangan, mk_id, tabel_matakuliah!tabel_jadwal_mk_id_fkey ( id, kode_mk, nama_mk ) )
`;

// Full columns including signature (for detail/zoom view)
const REPORT_SELECT_FULL = `
  *,
  tabel_user!tabel_kehadiran_dosen_id_fkey ( id, nama_lengkap, nip ),
  tabel_jadwal!tabel_kehadiran_jadwal_id_fkey ( id, kelas, ruangan, mk_id, tabel_matakuliah!tabel_jadwal_mk_id_fkey ( id, kode_mk, nama_mk ) )
`;

function flattenReportRow(row) {
  const user = row.tabel_user;
  const jadwal = row.tabel_jadwal;
  const mk = jadwal?.tabel_matakuliah;
  return {
    id: row.id,
    tanggal: row.tanggal,
    pertemuan_ke: row.pertemuan_ke,
    materi: row.materi,
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
}

/**
 * Fetch attendance report data with server-side JOIN.
 * Single query replaces the previous 4 separate queries + client-side join.
 * Filters are applied server-side to reduce data transfer.
 */
export async function getAttendanceReport({ dosenId, mkId, startDate, endDate } = {}) {
  if (isSupabaseConfigured) {
    let query = supabase
      .from(TABLES.ATTENDANCE)
      .select(REPORT_SELECT_FULL)
      .neq('status', 'pending')
      .order('waktu_absen', { ascending: false });

    // Apply server-side filters
    if (dosenId) query = query.eq('dosen_id', dosenId);
    if (startDate) query = query.gte('tanggal', startDate);
    if (endDate) query = query.lte('tanggal', endDate);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching attendance report from Supabase:', error);
      throw error;
    }

    // Flatten nested join objects for the UI
    let results = data.map(flattenReportRow);

    // mk_id filter (applied post-query since it's nested)
    if (mkId) {
      results = results.filter(r => r.mk_id === mkId);
    }

    return results;
  } else {
    // Fallback for local DB (same logic as before)
    const db = getLocalDB();
    let mapped = db.kehadiran
      .filter(k => k.status !== 'pending')
      .map(k => {
        const lecturer = db.users?.find(u => u.id === k.dosen_id);
        const schedule = db.jadwal?.find(j => j.id === k.jadwal_id);
        const course = db.mataKuliah?.find(m => m.id === schedule?.mk_id);
        return {
          ...k,
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
    if (startDate) mapped = mapped.filter(r => r.tanggal >= startDate);
    if (endDate) mapped = mapped.filter(r => r.tanggal <= endDate);

    return mapped;
  }
}

/**
 * Fetch a single attendance record with full detail (including signature).
 */
export async function getAttendanceRecordDetail(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from(TABLES.ATTENDANCE)
      .select('tanda_tangan, foto_bukti')
      .eq('id', id)
      .single();
    if (error) {
      console.error('Error fetching attendance detail:', error);
      throw error;
    }
    return data;
  } else {
    const db = getLocalDB();
    const record = db.kehadiran.find(k => k.id === id);
    return record ? { tanda_tangan: record.tanda_tangan, foto_bukti: record.foto_bukti } : null;
  }
}
