import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SchoolProvider } from './context/SchoolContext';
import ProtectedRoute from './components/ProtectedRoute';

import AdminLayout from './layouts/AdminLayout';
import SiswaLayout from './layouts/SiswaLayout';

import Login        from './pages/Login';
import AdminDashboard  from './pages/admin/Dashboard';
import AdminBooks      from './pages/admin/Books';
import AdminCategories from './pages/admin/Categories';
import AdminUsers      from './pages/admin/Users';
import AdminLogs       from './pages/admin/Logs';
import AdminSchools    from './pages/admin/Schools';
import SiswaHome    from './pages/siswa/Home';
import BookDetail   from './pages/siswa/BookDetail';
import ReadBook     from './pages/siswa/ReadBook';
import Bookmarks    from './pages/siswa/Bookmarks';
import History      from './pages/siswa/History';

function App() {
  return (
    <AuthProvider>
      <SchoolProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: 500 },
          success: { style: { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' } },
          error:   { style: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' } }
        }} />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"  element={<AdminDashboard />} />
            <Route path="books"      element={<AdminBooks />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="users"      element={<AdminUsers />} />
            <Route path="logs"       element={<AdminLogs />} />
            <Route path="schools"    element={<AdminSchools />} />
          </Route>

          {/* Siswa */}
          <Route path="/siswa" element={<ProtectedRoute><SiswaLayout /></ProtectedRoute>}>
            <Route index          element={<SiswaHome />} />
            <Route path="book/:id"  element={<BookDetail />} />
            <Route path="read/:id"  element={<ReadBook />} />
            <Route path="bookmarks" element={<Bookmarks />} />
            <Route path="history"   element={<History />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      </SchoolProvider>
    </AuthProvider>
  );
}

export default App;