-- ----------------------------------------------------
-- SQL Schema untuk Sistem Informasi Kehadiran Dosen (SIKAD)
-- Triesakti Institute of Airlines Makassar
-- ----------------------------------------------------

-- Hapus tabel jika sudah ada (Opsional untuk reset)
DROP TABLE IF EXISTS tabel_kehadiran;
DROP TABLE IF EXISTS tabel_jadwal;
DROP TABLE IF EXISTS tabel_matakuliah;
DROP TABLE IF EXISTS tabel_user;

-- 1. Tabel User (Admin & Dosen)
CREATE TABLE tabel_user (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    nama_lengkap VARCHAR(150) NOT NULL,
    nip VARCHAR(50) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'dosen')) NOT NULL,
    foto_profil TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Mata Kuliah
CREATE TABLE tabel_matakuliah (
    id VARCHAR(50) PRIMARY KEY,
    kode_mk VARCHAR(20) UNIQUE NOT NULL,
    nama_mk VARCHAR(150) NOT NULL,
    sks INT NOT NULL,
    semester VARCHAR(10) NOT NULL
);

-- 3. Tabel Jadwal
CREATE TABLE tabel_jadwal (
    id VARCHAR(50) PRIMARY KEY,
    dosen_id VARCHAR(50) REFERENCES tabel_user(id) ON DELETE CASCADE,
    mk_id VARCHAR(50) REFERENCES tabel_matakuliah(id) ON DELETE CASCADE,
    kelas VARCHAR(50) NOT NULL,
    hari VARCHAR(20) NOT NULL,
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    ruangan VARCHAR(50) NOT NULL
);

-- 4. Tabel Kehadiran
CREATE TABLE tabel_kehadiran (
    id VARCHAR(50) PRIMARY KEY,
    jadwal_id VARCHAR(50) REFERENCES tabel_jadwal(id) ON DELETE CASCADE,
    dosen_id VARCHAR(50) REFERENCES tabel_user(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    pertemuan_ke INT NOT NULL,
    materi TEXT NOT NULL,
    foto_bukti TEXT,
    tanda_tangan TEXT NOT NULL, -- Menyimpan Base64 PNG TTD
    status VARCHAR(20) CHECK (status IN ('hadir', 'izin', 'alpha')) DEFAULT 'hadir',
    waktu_absen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    catatan TEXT
);

-- ----------------------------------------------------
-- Data Awal (Seeding Data)
-- ----------------------------------------------------

-- Seed Users
INSERT INTO tabel_user (id, email, password, nama_lengkap, nip, role, foto_profil) VALUES
('u1', 'dosen1@triesakti.ac.id', 'dosen', 'Capt. Andi Wijaya, M.T.', 'NIP. 198504122010121001', 'dosen', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'),
('u2', 'dosen2@triesakti.ac.id', 'dosen', 'Dr. Rina Astuti, S.Si., M.Sc.', 'NIP. 199008232015042002', 'dosen', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=100'),
('u3', 'dosen3@triesakti.ac.id', 'dosen', 'Herman Susilo, S.T., M.M.', 'NIP. 197811052005011003', 'dosen', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100'),
('admin_triesakti', 'admin@triesakti.ac.id', 'admin', 'Admin Akademik Triesakti', 'NIP. 199201012018011001', 'admin', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=100');

-- Seed Mata Kuliah
INSERT INTO tabel_matakuliah (id, kode_mk, nama_mk, sks, semester) VALUES
('mk1', 'AV-101', 'Introduction to Aviation & Airline Operations', 3, '1'),
('mk2', 'AV-204', 'Aviation Safety & Human Factors', 3, '3'),
('mk3', 'AV-308', 'Air Traffic Management Systems', 4, '5'),
('mk4', 'AV-401', 'Airline Flight Dispatch & Planning', 3, '7');

-- Seed Jadwal
INSERT INTO tabel_jadwal (id, dosen_id, mk_id, kelas, hari, jam_mulai, jam_selesai, ruangan) VALUES
('j1', 'u1', 'mk1', 'Aero-A', 'Kamis', '08:00:00', '10:30:00', 'R. Cockpit 1'),
('j2', 'u1', 'mk2', 'Aero-B', 'Kamis', '11:00:00', '13:30:00', 'R. Simulator'),
('j3', 'u2', 'mk3', 'ATC-A', 'Kamis', '08:30:00', '11:50:00', 'Lab Tower'),
('j4', 'u2', 'mk4', 'ATC-B', 'Jumat', '09:00:00', '11:30:00', 'R. Briefing'),
('j5', 'u3', 'mk1', 'Aero-C', 'Senin', '13:00:00', '15:30:00', 'R. Cockpit 2');

-- Seed Kehadiran (History)
INSERT INTO tabel_kehadiran (id, jadwal_id, dosen_id, tanggal, pertemuan_ke, materi, foto_bukti, tanda_tangan, status, waktu_absen, catatan) VALUES
('kh1', 'j1', 'u1', '2026-05-28', 10, 'Basic Flight Instruments & Cockpit Checks', 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&q=80&w=400', 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><path d="M 10 80 Q 52.5 10, 95 80 T 180 80" stroke="blue" fill="none"/></svg>', 'hadir', '2026-05-28 08:05:00+08', 'Kelas berjalan kondusif, semua mahasiswa hadir.'),
('kh2', 'j2', 'u1', '2026-05-28', 10, 'Emergency Procedures Simulation - Engine Failure', 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=400', 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><path d="M 20 20 L 100 80 L 180 20" stroke="blue" fill="none"/></svg>', 'hadir', '2026-05-28 11:02:10+08', 'Sesi simulator berhasil diselesaikan.'),
('kh3', 'j3', 'u2', '2026-05-28', 8, 'Radar Vectoring and Separation Standards', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400', 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><path d="M 10 50 C 20 20, 40 20, 50 50 S 80 80, 100 50" stroke="purple" fill="none"/></svg>', 'hadir', '2026-05-28 08:35:12+08', 'Praktikum di lab radar berjalan lancar.');
