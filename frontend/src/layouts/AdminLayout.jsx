import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { MdMenu, MdClose } from 'react-icons/md';

const AdminLayout = () => {
  const [sideOpen, setSideOpen] = useState(false);
  const location = useLocation();

  // Tutup sidebar saat navigasi (mobile) + scroll ke atas
  useEffect(() => {
    setSideOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Tutup sidebar saat resize ke desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setSideOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>

      {/* Overlay gelap — mobile only, dikontrol via CSS class */}
      <div
        className="admin-overlay"
        onClick={() => setSideOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 250,
          background: 'rgba(0,0,0,0.52)',
          opacity: sideOpen ? 1 : 0,
          pointerEvents: sideOpen ? 'auto' : 'none',
          transition: 'opacity 0.26s ease',
          display: 'none',   /* aktif via CSS media query */
        }}
      />

      {/* Sidebar — prop isOpen & onClose untuk mobile toggle */}
      <Sidebar isOpen={sideOpen} onClose={() => setSideOpen(false)} />

      {/* Main area */}
      <main
        className="admin-main"
        style={{
          flex: 1, minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
          marginLeft: 'var(--sidebar-w)',
          transition: 'margin-left 0.26s ease',
          minWidth: 0,
        }}
      >
        {/* ── Mobile topbar ── */}
        <div
          className="admin-topbar-mobile"
          style={{
            display: 'none',  /* aktif via CSS media query */
            alignItems: 'center', justifyContent: 'space-between',
            padding: '0 14px', height: 54, background: '#fff',
            borderBottom: '1px solid var(--border)',
            position: 'sticky', top: 0, zIndex: 150,
            boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
          }}
        >
          <button
            onClick={() => setSideOpen(v => !v)}
            style={{
              background: sideOpen ? '#f0f4f8' : 'none',
              border: 'none', cursor: 'pointer', fontSize: 24,
              display: 'flex', alignItems: 'center', padding: '6px 8px',
              color: 'var(--primary-dark)', borderRadius: 8,
              transition: 'background 0.15s',
            }}
            aria-label="Toggle sidebar"
          >
            {sideOpen ? <MdClose /> : <MdMenu />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--primary-dark)' }}>
              E-Library Admin
            </span>
          </div>

          <div style={{ width: 40 }} /> {/* spacer */}
        </div>

        {/* Page content */}
        <div className="page-content page-fade" style={{ flex: 1 }}>
          <Outlet />
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .admin-overlay        { display: block !important; }
          .admin-topbar-mobile  { display: flex !important; }
          .admin-main           { margin-left: 0 !important; }
          /* Sembunyikan logo MTs di mobile topbar */
          .admin-topbar-logo    { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;