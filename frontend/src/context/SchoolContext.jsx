/**
 * SchoolContext
 * - Muat daftar sekolah dari /api/schools saat app pertama kali tampil
 * - Simpan selectedSchool untuk admin (filter global)
 * - isSingleSchool = true jika hanya ada 1 sekolah publish
 */
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const SchoolContext = createContext(null);

export const SchoolProvider = ({ children }) => {
  const [schools, setSchools]               = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  // selectedSchoolId dipakai admin untuk filter global (null = semua)
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);

  useEffect(() => {
    // Muat sekolah publish untuk login page (publik)
    api.get('/schools')
      .then(r => setSchools(r.data.data || []))
      .catch(() => setSchools([]))
      .finally(() => setLoadingSchools(false));
  }, []);

  const isSingleSchool = !loadingSchools && schools.length === 1;
  const isMultiSchool  = !loadingSchools && schools.length > 1;

  // Helper: ambil objek sekolah berdasarkan id
  const getSchool = (id) => schools.find(s => s.id === id || s.id === Number(id)) || null;

  // Refresh daftar sekolah publish (dipanggil setelah CRUD sekolah)
  const refreshSchools = () => {
    api.get('/schools').then(r => setSchools(r.data.data || [])).catch(() => {});
  };

  return (
    <SchoolContext.Provider value={{
      schools, loadingSchools,
      isSingleSchool, isMultiSchool,
      selectedSchoolId, setSelectedSchoolId,
      getSchool, refreshSchools,
    }}>
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = () => useContext(SchoolContext);