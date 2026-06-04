import '../styles/globals.css';
import '../styles/auth.css';
import '../styles/dashboard.css';
import '../styles/signature.css';

export const metadata = {
  title: 'SIKAD - Triesakti Institute of Airlines',
  description: 'Sistem Informasi Kehadiran Dosen Triesakti Institute of Airlines Makassar',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        {children}
      </body>
    </html>
  );
}
