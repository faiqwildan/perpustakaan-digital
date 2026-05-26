import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';

const SiswaLayout = () => {
  const { pathname } = useLocation();

  // Scroll ke atas setiap navigasi
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Navbar />
      <Outlet />
    </div>
  );
};

export default SiswaLayout;