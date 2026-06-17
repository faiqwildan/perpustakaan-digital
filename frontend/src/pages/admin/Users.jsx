import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { useSchool } from '../../context/SchoolContext';
import toast from 'react-hot-toast';
import {
  MdAdd, MdEdit, MdDelete, MdSearch, MdClose,
  MdVisibility, MdVisibilityOff, MdUpload, MdDownload,
  MdWarning, MdSchool, MdClear
} from 'react-icons/md';

const KELAS_LIST = ['7A','7B','7C','7D','7E','8A','8B','8C','8D','8E','9A','9B','9C','9D','9E'];
const initialForm = { nama:'', nisn:'', password:'', kelas:'' };

/* ── Password strength validator ── */
const validatePassword = (pwd) => {
  if (!pwd) return '';
  if (pwd.length < 8) return 'Password minimal 8 karakter.';
  if (!/[A-Za-z]/.test(pwd)) return 'Password harus mengandung huruf.';
  if (!/[0-9]/.test(pwd)) return 'Password harus mengandung angka.';
  return '';
};

/* ── NISN validator ── */
const validateNISN = (nisn) => {
  if (!nisn) return '';
  if (!/^\d+$/.test(nisn)) return 'NISN hanya boleh berisi angka.';
  if (nisn.length < 10) return `NISN harus tepat 10 digit (saat ini ${nisn.length} digit).`;
  if (nisn.length > 10) return `NISN harus tepat 10 digit (saat ini ${nisn.length} digit).`;
  return '';
};

const Users = () => {
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [filterKelas, setFilterKelas]   = useState('');
  const [page, setPage]                 = useState(1);
  const [pagination, setPagination]     = useState({});
  const [modal, setModal]               = useState(false);
  const [editing, setEditing]           = useState(null);
  const [form, setForm]                 = useState(initialForm);
  const [formErr, setFormErr]           = useState({});
  const [submitting, setSubmitting]     = useState(false);
  const [showPass, setShowPass]         = useState(false);
  const [deleteId, setDeleteId]         = useState(null);
  const [deleteNama, setDeleteNama]     = useState('');
  const [confirmText, setConfirmText]   = useState('');
  const [showNaikKelas, setShowNaikKelas] = useState(false);
  const [showImport, setShowImport]     = useState(false);
  const [importFile, setImportFile]     = useState(null);
  const [importSchool, setImportSchool] = useState('');
  const [importing, setImporting]       = useState(false);
  const [importResult, setImportResult] = useState(null);
  const importRef = useRef();

  const handleSearch = (e) => {
  e.preventDefault();

  setSearch(searchInput.trim());
  setSuggestions([]);
  setPage(1);

  document.activeElement.blur();
};

const clearSearch = () => {
  setSearchInput('');
  setSearch('');
  setSuggestions([]);
  setPage(1);
};

  useEffect(() => {
  const close = () => setSuggestions([]);

  window.addEventListener('click', close);

  return () => window.removeEventListener('click', close);
}, []);

  const { schools, isSingleSchool, selectedSchoolId: globalSchoolId } = useSchool();
  useEffect(() => {
    if (globalSchoolId) setImportSchool(String(globalSchoolId));
    else if (isSingleSchool && schools[0]) setImportSchool(String(schools[0].id));
  }, [globalSchoolId, isSingleSchool, schools]);

  /* ── fetch — ikuti filter global dari Sidebar ── */
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 15 });
      if (search)         p.append('search', search);
      if (filterKelas)    p.append('kelas', filterKelas);
      if (globalSchoolId) p.append('school_id', globalSchoolId);
      const res = await api.get(`/users?${p}`);
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Gagal memuat data siswa'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, filterKelas, globalSchoolId]);
  useEffect(() => {
  fetchUsers();
}, [search]);

  /* ── form validation ── */
  const validateForm = () => {
    const e = {};
    if (!form.nama.trim()) e.nama = 'Nama wajib diisi.';
    if (!form.nisn.trim()) e.nisn = 'NISN wajib diisi.';
    else { const n = validateNISN(form.nisn); if (n) e.nisn = n; }
    if (!form.kelas) e.kelas = 'Kelas wajib dipilih.';
    // school_id wajib saat tambah baru
    if (!editing && !form.school_id) e.school_id = 'Sekolah wajib dipilih.';
    if (!editing) {
      if (!form.password) e.password = 'Password wajib diisi.';
      else { const p = validatePassword(form.password); if (p) e.password = p; }
    } else if (form.password) {
      const p = validatePassword(form.password);
      if (p) e.password = p;
    }
    return e;
  };

  /* ── modal ── */
  // school_id default: dari filter global sidebar, atau sekolah pertama jika single
  const defaultSchoolId = globalSchoolId
    ? String(globalSchoolId)
    : (isSingleSchool && schools[0] ? String(schools[0].id) : '');
  const openAdd  = () => {
    setEditing(null);
    setForm({ ...initialForm, school_id: defaultSchoolId });
    setFormErr({}); setShowPass(false); setModal(true);
  };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ nama:u.nama, nisn:u.nisn, password:'', kelas:u.kelas||'', school_id: String(u.school_id||'') });
    setFormErr({}); setShowPass(false); setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); setFormErr({}); };

  const handleChange = (field, val) => {
    setForm(f => ({...f, [field]: val}));
    setFormErr(e => ({...e, [field]: ''}));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErr(errs); return; }
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password;
      if (editing) {
        await api.put(`/users/${editing.id}`, payload);
        toast.success('Data siswa berhasil diperbarui!');
      } else {
        await api.post('/users', payload);
        toast.success('Siswa berhasil ditambahkan!');
      }
      closeModal(); fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Terjadi kesalahan');
    } finally { setSubmitting(false); }
  };

  /* ── delete permanen (konfirmasi ketik "HAPUS") ── */
  const openDelete = (u) => { setDeleteId(u.id); setDeleteNama(u.nama); setConfirmText(''); };
  const handleDelete = async () => {
    if (confirmText !== 'HAPUS') { toast.error('Ketik HAPUS untuk konfirmasi'); return; }
    try {
      await api.delete(`/users/${deleteId}`);
      toast.success('Siswa berhasil dihapus');
      setDeleteId(null); setDeleteNama(''); setConfirmText('');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
      setDeleteId(null);
    }
  };

  /* ── naik kelas ── */
  const handleNaikKelas = async () => {
    try {
      const res = await api.post('/users/naik-kelas');
      toast.success(res.data.message);
      setShowNaikKelas(false); fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal proses naik kelas');
    }
  };

  /* ── import excel ── */
 /* ── download template excel ── */
const handleDownloadTemplate = async () => {
  try {
    const res = await api.get('/users/template-excel', {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(res.data);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-import-siswa.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);

  } catch (err) {
    console.error(err);
    toast.error('Gagal download template');
  }
};
  const handleImport = async (ev) => {
    ev.preventDefault();
    if (!importFile) { toast.error('Pilih file Excel terlebih dahulu'); return; }
    if (!importSchool) { toast.error('Pilih sekolah terlebih dahulu'); return; }
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      // Kirim school_id via query string (sesuai backend)
      const res = await api.post(`/users/import?school_id=${importSchool}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(res.data);
      toast.success(res.data.message);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal import');
    } finally { setImporting(false); }
  };

  const closeImport = () => {
    setShowImport(false); setImportFile(null); setImportResult(null);
  };

  /* ── render ── */
  return (
    <div className="page-fade">
      {/* Header */}
      <div className="page-header" style={{ display:'flex', alignItems:'flex-start',
        justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 className="page-title">Manajemen Siswa</h1>
          <p className="page-subtitle">
            Kelola akun siswa
            {globalSchoolId && schools.length > 1 && (
              <span
                style={{
                  marginLeft: 6,
                  color: 'var(--primary-light)',
                  fontWeight: 600
                }}
              >
                — {schools.find(s => s.id === Number(globalSchoolId))?.nama_sekolah}
              </span>
            )}
          </p>
        </div>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={handleDownloadTemplate}>
            <MdDownload /> Template
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowImport(true)}>
            <MdUpload /> Import
          </button>
          <button className="btn btn-sm"
            style={{ borderColor:'#f59e0b', color:'#92400e', border:'2px solid #f59e0b', background:'none',
              fontFamily:'var(--font)', fontWeight:600, fontSize:13, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8 }}
            onClick={() => setShowNaikKelas(true)}>
            <MdSchool /> Naik Kelas
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <MdAdd /> Tambah Siswa
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-body" style={{ padding:'12px 14px', display:'flex', gap:10, flexWrap:'wrap' }}>
          <form
    onSubmit={handleSearch}
    onClick={(e) => e.stopPropagation()}
    style={{ flex:1, minWidth:180, position:'relative' }}
>
    <div className="input-group">

        <input
            className="form-control"
            placeholder="Cari nama atau NISN..."
            value={searchInput}
            onChange={(e)=>{

                const value = e.target.value;

                setSearchInput(value);

                if(!value.trim()){
                    setSuggestions([]);
                    return;
                }

                const lower = value.toLowerCase();

                const result = users
                    .filter(u =>
                        u.nama.toLowerCase().includes(lower) ||
                        u.nisn.includes(lower)
                    )
                    .flatMap(u => [u.nama, u.nisn]);

                setSuggestions([...new Set(result)].slice(0,5));

            }}
        />

        <button
            className="btn btn-primary"
            type={search ? 'button' : 'submit'}
            onClick={search ? clearSearch : undefined}
        >
            {search ? <MdClear /> : <MdSearch />}
        </button>

    </div>

    {suggestions.length > 0 && (
        <div className="search-suggestions">

            {suggestions.map((item,index)=>(

                <div
                    key={index}
                    className="search-suggestion-item"
                    onClick={()=>{
                        setSearchInput(item);
                        setSearch(item);
                        setSuggestions([]);
                        setPage(1);
                    }}
                >
                    <MdSearch size={16}/>
                    {item}
                </div>

            ))}

        </div>
    )}

</form>
          <select className="form-control" style={{ width:140 }}
            value={filterKelas} onChange={e => { setFilterKelas(e.target.value); setPage(1); }}>
            <option value="">Semua Kelas</option>
            {KELAS_LIST.map(k => <option key={k} value={k}>Kelas {k}</option>)}
          </select>
          {/* Info filter sekolah aktif (dari sidebar) */}
          {globalSchoolId && schools.length > 1 && (
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px',
              background:'#dbeafe', borderRadius:8, fontSize:12, color:'#1e40af', fontWeight:600 }}>
               {schools.find(s=>s.id===Number(globalSchoolId))?.nama_sekolah || 'Sekolah terpilih'}
              <span style={{ opacity:.7, fontWeight:400 }}>— filter dari sidebar</span>
            </div>
          )}
          {(search || filterKelas) && (
            <button className="btn btn-outline btn-sm"
              onClick={() => {
    setSearch('');
    setSearchInput('');
    setFilterKelas('');
    setPage(1);
}}>
              <MdClear /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="loading-center"><div className="loading-spin" /></div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">Tidak ada siswa ditemukan</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nama Siswa</th>
                  <th>NISN</th>
                  <th>Kelas</th>
                  <th>Status</th>
                  <th>Terdaftar</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ animation:'fadeIn .2s ease' }}>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>
                      {(pagination.page-1)*15+i+1}
                    </td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%',
                          background:'var(--primary)', color:'#fff',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontWeight:800, fontSize:13, flexShrink:0 }}>
                          {u.nama[0].toUpperCase()}
                        </div>
                        <span style={{ fontWeight:600, fontSize:13 }}>{u.nama}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily:'monospace', fontSize:12 }}>{u.nisn}</td>
                    <td>
                      {u.kelas
                        ? <span className="badge badge-primary">Kelas {u.kelas}</span>
                        : <span style={{ color:'var(--text-muted)' }}>-</span>}
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success':'badge-danger'}`}>
                        {u.is_active ? 'Aktif':'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>
                      {new Date(u.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:5 }}>
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(u)} title="Edit">
                          <MdEdit />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => openDelete(u)} title="Hapus">
                          <MdDelete />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="card-footer" style={{ display:'flex', alignItems:'center',
            justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>
              Total {pagination.total} siswa
            </span>
            <div className="pagination" style={{ marginTop:0 }}>
              <button className="page-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
              {Array.from({length:pagination.totalPages},(_,i)=>i+1)
                .filter(p=>p===1||p===pagination.totalPages||Math.abs(p-page)<=1)
                .reduce((acc,p,i,arr)=>{
                  if(i>0&&arr[i-1]!==p-1) acc.push('...');
                  acc.push(p); return acc;
                },[])
                .map((p,i)=>p==='...'
                  ?<span key={`e${i}`} style={{padding:'0 3px',color:'var(--text-muted)'}}>…</span>
                  :<button key={p} className={`page-btn${page===p?' active':''}`} onClick={()=>setPage(p)}>{p}</button>
                )}
              <button className="page-btn" disabled={page===pagination.totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Add/Edit ── */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal" style={{ maxWidth:460 }}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</span>
              <button className="modal-close" onClick={closeModal}><MdClose /></button>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body">
                {/* Nama */}
                <div className="form-group">
                  <label className="form-label">Nama Lengkap *</label>
                  <input className={`form-control${formErr.nama?' is-error':''}`}
                    value={form.nama} onChange={e=>handleChange('nama',e.target.value)}
                    placeholder="Nama lengkap siswa" autoFocus />
                  {formErr.nama && <div className="form-error-msg">{formErr.nama}</div>}
                </div>
                {/* NISN */}
                <div className="form-group">
                  <label className="form-label">NISN * <span style={{fontWeight:400,textTransform:'none',fontSize:11}}>(hanya angka)</span></label>
                  <input className={`form-control${formErr.nisn?' is-error':''}`}
                    value={form.nisn}
                    onChange={e=>handleChange('nisn',e.target.value.replace(/\D/g,'').slice(0,10))}
                    placeholder="10 digit NISN"
                    inputMode="numeric"
                    maxLength={10} />
                  {formErr.nisn && <div className="form-error-msg">{formErr.nisn}</div>}
                </div>
                {/* Password */}
                <div className="form-group">
                  <label className="form-label">
                    Password {editing
                      ? <span style={{fontWeight:400,textTransform:'none',fontSize:11}}>(kosongkan jika tidak diubah)</span>
                      : '*'}
                  </label>
                  <div style={{ position:'relative' }}>
                    <input
                      type={showPass?'text':'password'}
                      className={`form-control${formErr.password?' is-error':''}`}
                      value={form.password}
                      onChange={e=>handleChange('password',e.target.value)}
                      placeholder={editing?'Isi untuk ubah password':'Min. 8 karakter (huruf+angka)'}
                      style={{ paddingRight:42 }}
                    />
                    <button type="button" onClick={()=>setShowPass(!showPass)}
                      style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                        background:'none', border:'none', cursor:'pointer',
                        color:'var(--text-muted)', fontSize:19, display:'flex' }}>
                      {showPass?<MdVisibilityOff/>:<MdVisibility/>}
                    </button>
                  </div>
                  {formErr.password && <div className="form-error-msg">{formErr.password}</div>}
                </div>
                {/* Kelas */}
                <div className="form-group">
                  <label className="form-label">Kelas *</label>
                  <select className={`form-control${formErr.kelas?' is-error':''}`}
                    value={form.kelas} onChange={e=>handleChange('kelas',e.target.value)}>
                    <option value="">-- Pilih Kelas --</option>
                    {KELAS_LIST.map(k=><option key={k} value={k}>Kelas {k}</option>)}
                  </select>
                  {formErr.kelas && <div className="form-error-msg">{formErr.kelas}</div>}
                </div>
                {/* Sekolah — tampil jika ada lebih dari 1 sekolah */}
                {schools.length > 1 && (
                  <div className="form-group">
                    <label className="form-label">Sekolah *</label>
                    <select className={`form-control${formErr.school_id?' is-error':''}`}
                      value={form.school_id||''}
                      onChange={e=>handleChange('school_id', e.target.value)}>
                      <option value="">-- Pilih Sekolah --</option>
                      {schools.map(s=><option key={s.id} value={s.id}>{s.nama_sekolah}</option>)}
                    </select>
                    {formErr.school_id && <div className="form-error-msg">{formErr.school_id}</div>}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" onClick={closeModal}>Batal</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  {submitting?'Menyimpan...': editing?'Simpan':'Tambah Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Hapus Permanen ── */}
      {deleteId && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setDeleteId(null)}>
          <div className="modal" style={{ maxWidth:420 }}>
            <div className="modal-header">
              <span className="modal-title" style={{ color:'var(--danger)', display:'flex', alignItems:'center', gap:7 }}>
                <MdWarning /> Hapus Permanen
              </span>
              <button className="modal-close" onClick={()=>setDeleteId(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-danger">
                ⚠️ Tindakan ini <strong>tidak dapat dibatalkan</strong>.
              </div>
              <p style={{ fontSize:14, marginBottom:14 }}>
                Anda akan menghapus data siswa <strong>{deleteNama}</strong> beserta
                seluruh riwayat dan bookmark-nya.
              </p>
              <div className="form-group">
                <label className="form-label">
                  Ketik <strong style={{ color:'var(--danger)' }}>HAPUS</strong> untuk konfirmasi
                </label>
                <input className="form-control" value={confirmText}
                  onChange={e=>setConfirmText(e.target.value)}
                  placeholder="Ketik HAPUS" autoComplete="off" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={()=>setDeleteId(null)}>Batal</button>
              <button className="btn btn-danger btn-sm"
                onClick={handleDelete}
                disabled={confirmText !== 'HAPUS'}
                style={{ opacity: confirmText==='HAPUS'?1:0.45 }}>
                <MdDelete /> Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Import Excel ── */}
      {showImport && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeImport()}>
          <div className="modal" style={{ maxWidth:480 }}>
            <div className="modal-header">
              <span className="modal-title">📊 Import Data Siswa (Excel)</span>
              <button className="modal-close" onClick={closeImport}><MdClose /></button>
            </div>
            <div className="modal-body">
              {!importResult ? (
                <>
                  <div style={{ background:'#f0f4f8', borderRadius:10, padding:13, marginBottom:14, fontSize:13 }}>
                    <strong>Format kolom (baris 1 = header, data mulai baris 2):</strong>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5, marginTop:8 }}>
                      {['A: Nama','B: NISN','C: Kelas','D: Password'].map(col=>(
                        <div key={col} style={{ background:'#fff', borderRadius:6, padding:'5px 7px',
                          fontFamily:'monospace', fontSize:11, border:'1px solid var(--border)',
                          textAlign:'center' }}>{col}</div>
                      ))}
                    </div>
                    <div style={{ marginTop:8, fontSize:12, color:'var(--text-muted)' }}>
                      Kelas: 7A–7E, 8A–8E, 9A–9E · Password min. 8 karakter (huruf+angka)
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" style={{ marginBottom:13 }}
                    onClick={handleDownloadTemplate}>
                    <MdDownload /> Download Template
                  </button>
                  {/* Pilih sekolah untuk import — tampil jika multi-school */}
                  {schools.length > 1 && (
                    <div className="form-group">
                      <label className="form-label">Sekolah Tujuan Import *</label>
                      <select className="form-control" value={importSchool}
                        onChange={e => setImportSchool(e.target.value)}>
                        <option value="">-- Pilih Sekolah --</option>
                        {schools.map(s => (
                          <option key={s.id} value={s.id}>{s.nama_sekolah}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <form onSubmit={handleImport}>
                    <div className="file-upload-area" onClick={()=>importRef.current.click()}>
                      <input ref={importRef} type="file" accept=".xlsx,.xls"
                        onChange={e=>setImportFile(e.target.files[0])} style={{ display:'none' }} />
                      {importFile ? (
                        <div className="file-selected">📊 {importFile.name}</div>
                      ) : (
                        <>
                          <div className="file-upload-icon">📊</div>
                          <div className="file-upload-text">Klik pilih file .xlsx / .xls (maks 10MB)</div>
                        </>
                      )}
                    </div>
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:14 }}>
                      <button type="button" className="btn btn-outline btn-sm" onClick={closeImport}>Batal</button>
                      <button type="submit" className="btn btn-primary btn-sm"
                        disabled={importing||!importFile}>
                        {importing?'Mengimpor...':'Import'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div>
                  <div style={{ textAlign:'center', marginBottom:18 }}>
                    <div style={{ fontSize:44, marginBottom:7 }}>
                      {importResult.skipped===0?'✅':'⚠️'}
                    </div>
                    <div style={{ fontWeight:700, fontSize:15 }}>{importResult.message}</div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                    {[
                      { label:'Berhasil', val:importResult.inserted, bg:'#dcfce7', c:'#166534' },
                      { label:'Dilewati', val:importResult.skipped,  bg:'#fee2e2', c:'#991b1b' },
                    ].map(({label,val,bg,c})=>(
                      <div key={label} style={{ background:bg, borderRadius:10, padding:'11px 14px', textAlign:'center' }}>
                        <div style={{ fontSize:26, fontWeight:800, color:c }}>{val}</div>
                        <div style={{ fontSize:12, color:c }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  {importResult.errors?.length > 0 && (
                    <div style={{ background:'#fef3c7', borderRadius:10, padding:'11px 13px',
                      maxHeight:130, overflowY:'auto', fontSize:12 }}>
                      <div style={{ fontWeight:700, marginBottom:5 }}>Detail error:</div>
                      {importResult.errors.map((e,i)=>(
                        <div key={i} style={{ color:'#92400e', marginBottom:2 }}>• {e}</div>
                      ))}
                    </div>
                  )}
                  <div style={{ textAlign:'right', marginTop:14 }}>
                    <button className="btn btn-primary btn-sm" onClick={closeImport}>Selesai</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Naik Kelas ── */}
      {showNaikKelas && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowNaikKelas(false)}>
          <div className="modal" style={{ maxWidth:440 }}>
            <div className="modal-header">
              <span className="modal-title">🎓 Proses Tahun Ajaran Baru</span>
              <button className="modal-close" onClick={()=>setShowNaikKelas(false)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-danger">
                ⚠️ Proses ini <strong>tidak dapat dibatalkan</strong>.
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:9, marginTop:4 }}>
                {[
                  {icon:'⬆️',label:'Kelas 7A–7E → Kelas 8A–8E',bg:'#dcfce7',border:'#bbf7d0'},
                  {icon:'⬆️',label:'Kelas 8A–8E → Kelas 9A–9E',bg:'#dbeafe',border:'#bfdbfe'},
                  {icon:'🎓',label:'Kelas 9A–9E → Dihapus (lulus)',bg:'#fee2e2',border:'#fecaca'},
                ].map((r,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10,
                    background:r.bg, border:`1px solid ${r.border}`,
                    borderRadius:10, padding:'10px 13px' }}>
                    <span style={{ fontSize:20 }}>{r.icon}</span>
                    <span style={{ fontWeight:600, fontSize:13 }}>{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={()=>setShowNaikKelas(false)}>Batal</button>
              <button className="btn btn-accent btn-sm" onClick={handleNaikKelas}>
                <MdSchool /> Proses Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
