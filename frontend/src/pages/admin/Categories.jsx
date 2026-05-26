import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { MdAdd, MdEdit, MdDelete, MdClose } from 'react-icons/md';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState({ nama:'', deskripsi:'' });
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId]     = useState(null);
  const [deleteNama, setDeleteNama] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data);
    } catch { toast.error('Gagal memuat kategori'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openAdd  = () => { setEditing(null); setForm({ nama:'', deskripsi:'' }); setModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ nama:c.nama, deskripsi:c.deskripsi||'' }); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama.trim()) { toast.error('Nama kategori wajib diisi'); return; }
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, form);
        toast.success('Kategori berhasil diperbarui!');
      } else {
        await api.post('/categories', form);
        toast.success('Kategori berhasil ditambahkan!');
      }
      closeModal(); fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Terjadi kesalahan');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/categories/${deleteId}`);
      toast.success('Kategori berhasil dihapus');
      setDeleteId(null); fetchCategories();
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
          <h1 className="page-title">Manajemen Kategori</h1>
          <p className="page-subtitle">Kelola kategori buku perpustakaan</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <MdAdd /> Tambah Kategori
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="loading-center"><div className="loading-spin" /></div>
          ) : categories.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🗂️</div>
              <div className="empty-state-title">Belum ada kategori</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nama Kategori</th>
                  <th>Deskripsi</th>
                  <th>Jumlah Buku</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c,i) => (
                  <tr key={c.id} style={{ animation:'fadeIn .2s ease' }}>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>{i+1}</td>
                    <td>
                      <div style={{ fontWeight:700, fontSize:13 }}>{c.nama}</div>
                    </td>
                    <td style={{ color:'var(--text-muted)', maxWidth:240, fontSize:12 }}>
                      {c.deskripsi || <span style={{ fontStyle:'italic', opacity:.5 }}>-</span>}
                    </td>
                    <td>
                      <span className="badge badge-primary">{c.jumlah_buku} buku</span>
                    </td>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>
                      {new Date(c.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:5 }}>
                        <button className="btn btn-sm btn-outline" onClick={()=>openEdit(c)} title="Edit">
                          <MdEdit />
                        </button>
                        <button className="btn btn-sm btn-danger"
                          onClick={()=>{ setDeleteId(c.id); setDeleteNama(c.nama); }} title="Hapus">
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
      </div>

      {/* ── Modal Add/Edit ── */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal" style={{ maxWidth:440 }}>
            <div className="modal-header">
              <span className="modal-title">{editing?'Edit Kategori':'Tambah Kategori'}</span>
              <button className="modal-close" onClick={closeModal}><MdClose /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nama Kategori *</label>
                  <input className="form-control" value={form.nama}
                    onChange={e=>setForm({...form,nama:e.target.value})}
                    placeholder="cth: Matematika, IPA, IPS..." autoFocus required />
                </div>
                <div className="form-group">
                  <label className="form-label">Deskripsi</label>
                  <textarea className="form-control" value={form.deskripsi} rows={3}
                    onChange={e=>setForm({...form,deskripsi:e.target.value})}
                    placeholder="Deskripsi singkat (opsional)" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" onClick={closeModal}>Batal</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  {submitting?'Menyimpan...': editing?'Simpan':'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Konfirmasi Hapus ── */}
      {deleteId && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setDeleteId(null)}>
          <div className="modal" style={{ maxWidth:400 }}>
            <div className="modal-header">
              <span className="modal-title">Konfirmasi Hapus</span>
              <button className="modal-close" onClick={()=>setDeleteId(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize:14 }}>
                Yakin ingin menghapus kategori <strong>"{deleteNama}"</strong>?<br />
                <span style={{ fontSize:12, color:'var(--text-muted)', marginTop:6, display:'block' }}>
                  Kategori yang masih digunakan oleh buku tidak dapat dihapus.
                </span>
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={()=>setDeleteId(null)}>Batal</button>
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

export default Categories;