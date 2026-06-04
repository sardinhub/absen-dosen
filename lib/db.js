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
