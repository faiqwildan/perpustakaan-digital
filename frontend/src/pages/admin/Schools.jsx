import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { useSchool } from '../../context/SchoolContext';
import toast from 'react-hot-toast';
import {
  MdAdd, MdEdit, MdDelete, MdClose,
  MdBusiness, MdImage, MdStar, MdLock
} from 'react-icons/md';

const logoSrc = (logo) => {
  if (!logo) return null;
  if (logo === 'logo_mts.png') return '/logo_mts.png';
  return `/uploads/logos/${logo}`;
};

const initialForm = { nama_sekolah: '', status: 'publish' };

const Schools = () => {
  const { refreshSchools }          = useSchool();
  const [schools, setSchools]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(initialForm);
  const [logoFile, setLogoFile]     = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId]     = useState(null);
  const [deleteNama, setDeleteNama] = useState('');
  const logoRef = useRef();

  const fetchSchools = async () => {
    setLoading(true);

    try {
      const res = await api.get('/schools/all');

      const normalized = res.data.data.map(s => ({
        ...s,
        is_primary: Number(s.is_primary) === 1
      }));

      setSchools(normalized);
    } catch {
      toast.error('Gagal memuat data sekolah');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSchools(); }, []);

  /* ── modal ── */
  const openAdd = () => {
    setEditing(null);
    setForm(initialForm);
    setLogoFile(null); setLogoPreview(null);
    setModal(true);
  };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ nama_sekolah: s.nama_sekolah, status: s.status });
    setLogoFile(null);
    setLogoPreview(logoSrc(s.logo));
    setModal(true);
  };
  const closeModal = () => {
    setModal(false); setEditing(null);
    setLogoFile(null); setLogoPreview(null);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama_sekolah.trim()) { toast.error('Nama sekolah wajib diisi'); return; }

    // Proteksi frontend: sekolah utama tidak bisa di-draft
    if (editing?.is_primary && form.status === 'draft') {
      toast.error('Sekolah utama tidak dapat diubah menjadi draft.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('nama_sekolah', form.nama_sekolah.trim());
      fd.append('status', form.status);
      if (logoFile) fd.append('logo', logoFile);

      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editing) {
        await api.put(`/schools/${editing.id}`, fd, cfg);
        toast.success('Sekolah berhasil diperbarui!');
      } else {
        await api.post('/schools', fd, cfg);
        toast.success('Sekolah berhasil ditambahkan!');
      }
      closeModal();
      fetchSchools();
      refreshSchools();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Terjadi kesalahan');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/schools/${deleteId}`);
      toast.success('Sekolah berhasil dihapus');
      setDeleteId(null);
      fetchSchools();
      refreshSchools();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
      setDeleteId(null);
    }
  };

  return (
    <div className="page-fade">
      {/* Header */}
      <div className="page-header" style={{ display:'flex', alignItems:'flex-start',
        justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 className="page-title">Manajemen Sekolah</h1>
          <p className="page-subtitle">Kelola sekolah yang terdaftar dalam sistem multi-school</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <MdAdd /> Tambah Sekolah
        </button>
      </div>

      {/* Info box konsep sekolah utama */}
      <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10,
        padding:'12px 16px', marginBottom:20, fontSize:13, color:'#1e40af' }}>
        <span style={{ fontWeight:700 }}>⭐ Sekolah Utama</span> adalah pusat sistem.
        Admin berasal dari sekolah utama. Sekolah utama tidak bisa dihapus atau dinonaktifkan.
        Sistem otomatis masuk <strong>mode multi-school</strong> jika ada lebih dari 1 sekolah berstatus
        <strong> Publish</strong>.
      </div>

      {/* Grid kartu sekolah */}
      {loading ? (
        <div className="loading-center"><div className="loading-spin" /></div>
      ) : schools.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏫</div>
          <div className="empty-state-title">Belum ada sekolah terdaftar</div>
          <button className="btn btn-primary" style={{ marginTop:16 }} onClick={openAdd}>
            <MdAdd /> Tambah Sekolah
          </button>
        </div>
      ) : (
        <div style={{ display:'grid',
          gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:18 }}>
          {schools.map(s => (
            <div key={s.id} className="card"
              style={{ animation:'slideUp .25s ease', overflow:'hidden',
                border: s.is_primary ? '2px solid #2e86c1' : '1px solid var(--border)' }}>

              {/* Logo banner */}
              <div style={{ height:120,
                background: s.is_primary
                  ? 'linear-gradient(135deg,#0d2f45,#1a5276)'
                  : 'linear-gradient(135deg,#1e3a5f,#2e86c1)',
                display:'flex', alignItems:'center', justifyContent:'center',
                position:'relative', overflow:'hidden' }}>

                {logoSrc(s.logo) ? (
                  <img src={logoSrc(s.logo)} alt={s.nama_sekolah}
                    style={{ width:80, height:80, objectFit:'contain',
                      filter:'drop-shadow(0 4px 12px rgba(0,0,0,.3))' }}
                    onError={e => e.target.style.display='none'} />
                ) : (
                  <MdBusiness style={{ fontSize:60, color:'rgba(255,255,255,.3)' }} />
                )}

                {/* Badge sekolah utama */}
                {s.is_primary && (
                  <span style={{ position:'absolute', top:8, left:8,
                    background:'#f59e0b', color:'#fff', fontSize:11, fontWeight:800,
                    padding:'3px 10px', borderRadius:99,
                    display:'flex', alignItems:'center', gap:4 }}>
                    <MdStar style={{ fontSize:13 }} /> Sekolah Utama
                  </span>
                )}

                {/* Badge status */}
                <span style={{ position:'absolute', top:8, right:8,
                  background: s.status === 'publish' ? '#dcfce7' : '#fee2e2',
                  color:      s.status === 'publish' ? '#166534' : '#991b1b',
                  fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:99 }}>
                  {s.status === 'publish' ? '✅ Publish' : '⛔ Draft'}
                </span>
              </div>

              {/* Info */}
              <div className="card-body" style={{ padding:16 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                  <h3 style={{ fontWeight:800, fontSize:14, lineHeight:1.3, flex:1 }}>
                    {s.nama_sekolah}
                  </h3>
                  {s.is_primary && (
                    <MdLock style={{ color:'var(--primary-light)', fontSize:16, flexShrink:0, marginTop:2 }}
                      title="Sekolah utama — terlindungi" />
                  )}
                </div>

                <div style={{ display:'flex', gap:12, fontSize:12, color:'var(--text-muted)',
                  marginBottom:14, flexWrap:'wrap' }}>
                  <span>🎓 {s.jumlah_siswa} siswa</span>
                  <span>📅 {new Date(s.created_at).toLocaleDateString('id-ID')}</span>
                </div>

                <div style={{ display:'flex', gap:7 }}>
                  <button className="btn btn-outline btn-sm"
                    style={{ flex:1, justifyContent:'center' }}
                    onClick={() => openEdit(s)}>
                    <MdEdit /> Edit
                  </button>

                  {/* Tombol hapus — disabled & tooltip jika sekolah utama */}
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ flex:1, justifyContent:'center',
                      opacity: s.is_primary ? .45 : 1,
                      cursor: s.is_primary ? 'not-allowed' : 'pointer' }}
                    onClick={() => {
                      if (s.is_primary) {
                        toast.error('Sekolah utama tidak dapat dihapus.');
                        return;
                      }
                      setDeleteId(s.id);
                      setDeleteNama(s.nama_sekolah);
                    }}
                    title={s.is_primary ? 'Sekolah utama tidak dapat dihapus' : 'Hapus sekolah'}>
                    <MdDelete /> {s.is_primary ? 'Terlindungi' : 'Hapus'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Add/Edit ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal" style={{ maxWidth:460 }}>
            <div className="modal-header">
              <span className="modal-title">
                {editing
                  ? (editing.is_primary ? '⭐ Edit Sekolah Utama' : '✏️ Edit Sekolah')
                  : '🏫 Tambah Sekolah'}
              </span>
              <button className="modal-close" onClick={closeModal}><MdClose /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Info sekolah utama di dalam modal */}
                {editing?.is_primary && (
                  <div style={{ background:'#fef3c7', border:'1px solid #fde68a',
                    borderRadius:10, padding:'11px 14px', marginBottom:16, fontSize:13,
                    display:'flex', alignItems:'center', gap:8 }}>
                    <MdStar style={{ color:'#f59e0b', fontSize:18, flexShrink:0 }} />
                    <span>Ini adalah <strong>sekolah utama</strong>. Status tidak bisa diubah ke Draft.</span>
                  </div>
                )}

                {/* Preview & upload logo */}
                <div style={{ textAlign:'center', marginBottom:18 }}>
                  <div style={{ width:90, height:90, borderRadius:16, overflow:'hidden',
                    background:'#f0f4f8', display:'flex', alignItems:'center',
                    justifyContent:'center', margin:'0 auto 10px',
                    border: editing?.is_primary ? '2px solid #2e86c1' : '2px solid var(--border)' }}>
                    {logoPreview
                      ? <img src={logoPreview} alt="preview"
                          style={{ width:'100%', height:'100%', objectFit:'contain' }}
                          onError={e => e.target.style.display='none'} />
                      : <MdBusiness style={{ fontSize:40, color:'#cbd5e1' }} />}
                  </div>
                  <button type="button"
                    onClick={() => logoRef.current.click()}
                    className="btn btn-outline btn-sm">
                    <MdImage /> {logoFile ? 'Ganti Logo' : 'Upload Logo'}
                  </button>
                  <input ref={logoRef} type="file" accept="image/*"
                    style={{ display:'none' }} onChange={handleLogoChange} />
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:5 }}>
                    PNG / JPG / WEBP · Maks. 3MB
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nama Sekolah *</label>
                  <input className="form-control" value={form.nama_sekolah}
                    onChange={e => setForm({...form, nama_sekolah: e.target.value})}
                    placeholder="Nama lengkap sekolah" autoFocus required />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-control" value={form.status}
                    onChange={e => setForm({...form, status: e.target.value})}
                    disabled={!!editing?.is_primary}>
                    <option value="publish">✅ Publish (tampil di halaman login)</option>
                    <option value="draft">⛔ Draft (tidak tampil)</option>
                  </select>
                  {editing?.is_primary && (
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:5 }}>
                      🔒 Status sekolah utama selalu <strong>Publish</strong>.
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : editing ? 'Simpan' : 'Tambah Sekolah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Konfirmasi Hapus ── */}
      {deleteId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteId(null)}>
          <div className="modal" style={{ maxWidth:400 }}>
            <div className="modal-header">
              <span className="modal-title" style={{ color:'var(--danger)' }}>
                ⚠️ Hapus Sekolah
              </span>
              <button className="modal-close" onClick={() => setDeleteId(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-danger">
                Sekolah yang masih memiliki siswa aktif tidak dapat dihapus.
              </div>
              <p style={{ fontSize:14 }}>
                Yakin ingin menghapus sekolah <strong>"{deleteNama}"</strong>?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setDeleteId(null)}>Batal</button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                <MdDelete /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schools;