import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  MdAdd, MdEdit, MdDelete, MdSearch, MdClose,
  MdPictureAsPdf, MdImage, MdClear, MdVisibility,
  MdCheckCircle, MdCancel, MdOpenInNew
} from 'react-icons/md';

const initialForm = {
  judul:'', penulis:'', penerbit:'', tahun_terbit:'',
  kategori_id:'', deskripsi:'', file_pdf:null, cover_image:null
};

const TAHUN_LIST = Array.from(
  { length: new Date().getFullYear() - 1979 },
  (_, i) => new Date().getFullYear() - i
);

const SEARCH_ALIASES = {
  ipa: 'Ilmu Pengetahuan Alam',
  ips: 'Ilmu Pengetahuan Sosial',
  pjok: 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
  ski: 'Sejarah Kebudayaan Islam',
  tik: 'Informatika',
  mtk: 'Matematika',
  indonesia: 'Bahasa Indonesia',
  inggris: 'Bahasa Inggris',
  arab: 'Bahasa Arab',

  pkn: 'Pendidikan Pancasila',
  ppkn: 'Pendidikan Pancasila',

  quran: 'Al-Qur’an Hadis',
  hadis: 'Al-Qur’an Hadis',

  akidah: 'Akidah Akhlak',
  akhlak: 'Akidah Akhlak',

  fikih: 'Fikih',
  fiqih: 'Fikih',

  coding: 'Koding dan Kecerdasan Artifisial',
  ai: 'Koding dan Kecerdasan Artifisial',
};

/* ── Thumbnail cover ── */
const CoverThumb = ({ book, size = 48 }) => {
  const [err, setErr] = useState(false);
  if (book.cover_image && !err) {
    return (
      <img
        src={coverSrc(book.cover_image)}
        alt={book.judul}
        onError={() => setErr(true)}
        style={{ width:size, height:size, objectFit:'cover',
          borderRadius:6, border:'1px solid var(--border)', flexShrink:0 }}
      />
    );
  }
  return (
    <div style={{ width:size, height:size, borderRadius:6, background:'#f0f4f8',
      display:'flex', alignItems:'center', justifyContent:'center',
      border:'1px dashed #cbd5e1', flexShrink:0 }}>
      <MdImage style={{ fontSize:22, color:'#94a3b8' }} />
    </div>
  );
};

const coverSrc = (cover) => {
  if (!cover) return null;

  if (cover.startsWith('http')) {
    return cover;
  }

  return `/uploads/covers/${cover}`;
};

const pdfSrc = (file) => {
  if (!file) return '';

  if (file.startsWith('http')) {
    return file;
  }

  return `/uploads/pdf/${file}`;
};

/* ── Badge status PDF ── */
const PdfBadge = ({ filename }) => {
  if (!filename) {
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11,
        background:'#fee2e2', color:'#991b1b', padding:'2px 8px', borderRadius:99, fontWeight:600 }}>
        <MdCancel style={{ fontSize:13 }} /> Belum ada PDF
      </span>
    );
  }
  const short = filename.length > 22
    ? filename.slice(0, 10) + '…' + filename.slice(-8)
    : filename;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11,
        background:'#dcfce7', color:'#166534', padding:'2px 8px', borderRadius:99, fontWeight:600 }}>
        <MdCheckCircle style={{ fontSize:13 }} /> PDF tersedia
      </span>
      <a href={pdfSrc(filename)} target="_blank" rel="noreferrer"
        title={`Preview: ${filename}`}
        style={{ display:'inline-flex', alignItems:'center', color:'var(--primary)',
          fontSize:13, textDecoration:'none' }}
        onClick={e => e.stopPropagation()}>
        <MdOpenInNew />
      </a>
      <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace' }}
        title={filename}>
        {short}
      </span>
    </div>
  );
};

const Books = () => {
  const [books, setBooks]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [filterKat, setFilterKat]   = useState('');
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState({});
  const [modal, setModal]           = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId]     = useState(null);
  const [deleteJudul, setDeleteJudul] = useState('');
  const [coverPreview, setCoverPreview] = useState(null);
  const [publisherHistory, setPublisherHistory] = useState([]);
  const pdfRef   = useRef();
  const coverRef = useRef();

  const handleSearch = (e) => {
  e.preventDefault();

  const keyword = searchInput.trim().toLowerCase();

  const finalSearch =
    SEARCH_ALIASES[keyword] || searchInput;

  setSearch(finalSearch);
  setSearchInput(finalSearch);
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

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit:10 });
      if (search)    p.append('search', search);
      if (filterKat) p.append('kategori_id', filterKat);
      const res = await api.get(`/books?${p}`);
      setBooks(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Gagal memuat data buku'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.data)).catch(() => {});
  }, []);
  useEffect(() => {
  fetchBooks();
}, [page, filterKat, search]);
    useEffect(() => {
    api.get('/books/publishers')
      .then((res) => {
        setPublisherHistory(res.data.data);
      })
      .catch(() => {
        toast.error('Gagal memuat daftar penerbit');
      });
  }, []);

  const openAdd = () => {
    setEditing(null); setForm(initialForm); setCoverPreview(null); setModal(true);
  };
  const openEdit = (b) => {
    setEditing(b);
    setForm({ judul:b.judul, penulis:b.penulis, penerbit:b.penerbit||'',
      tahun_terbit:b.tahun_terbit||'', kategori_id:b.kategori_id||'',
      deskripsi:b.deskripsi||'', file_pdf:null, cover_image:null });
    setCoverPreview(b.cover_image ? coverSrc(b.cover_image) : null);
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); setCoverPreview(null); };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(f => ({...f, cover_image: file}));
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.judul || !form.penulis) { toast.error('Judul dan penulis wajib diisi'); return; }
    if (!editing && !form.file_pdf)   { toast.error('File PDF wajib diunggah'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => { if (v !== null && v !== '') fd.append(k,v); });
      const cfg = { headers:{ 'Content-Type':'multipart/form-data' } };
      if (editing) { await api.put(`/books/${editing.id}`, fd, cfg); toast.success('Buku diperbarui!'); }
      else         { await api.post('/books', fd, cfg);               toast.success('Buku ditambahkan!'); }
      closeModal(); fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Terjadi kesalahan');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/books/${deleteId}`);
      toast.success('Buku berhasil dihapus');
      setDeleteId(null); fetchBooks();
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
          <h1 className="page-title">Manajemen Buku</h1>
          <p className="page-subtitle">Kelola koleksi e-book perpustakaan digital</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <MdAdd /> Tambah Buku
        </button>
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-body" style={{ padding:'12px 14px', display:'flex', gap:10, flexWrap:'wrap' }}>
          <form
  onSubmit={handleSearch}
  onClick={(e) => e.stopPropagation()}
  style={{ flex:1, minWidth:220, position:'relative' }}
>
  <div className="input-group">
    <input
      className="form-control"
      placeholder="Cari judul, penulis, penerbit..."
      value={searchInput}
      onChange={(e) => {
        const value = e.target.value;

        setSearchInput(value);

        if (!value.trim()) {
          setSuggestions([]);
          return;
        }

        const lower = value.toLowerCase();

        const aliasSuggestions = Object.entries(SEARCH_ALIASES)
          .filter(([key, val]) =>
            key.includes(lower) ||
            val.toLowerCase().includes(lower)
          )
          .map(([_, val]) => val);

        const titleSuggestions = books
          .filter(book =>
            book.judul.toLowerCase().includes(lower) ||
            book.penulis.toLowerCase().includes(lower) ||
            (book.penerbit || '').toLowerCase().includes(lower)
          )
          .map(book => book.judul);

        const unique = [...new Set([
          ...aliasSuggestions,
          ...titleSuggestions
        ])].slice(0, 5);

        setSuggestions(unique);
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
      {suggestions.map((item, idx) => (
        <div
          key={idx}
          className="search-suggestion-item"
          onClick={() => {
            setSearchInput(item);
            setSearch(item);
            setSuggestions([]);
            setPage(1);
          }}
        >
          <MdSearch size={16} />
          {item}
        </div>
      ))}
    </div>
  )}
</form>
          <select className="form-control" style={{ width:160 }}
            value={filterKat} onChange={e => { setFilterKat(e.target.value); setPage(1); }}>
            <option value="">Semua Kategori</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
          </select>
          {(search || filterKat) && (
            <button className="btn btn-outline btn-sm"
              onClick={() => {
  setSearch('');
  setSearchInput('');
  setSuggestions([]);
  setFilterKat('');
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
          ) : books.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <div className="empty-state-title">Tidak ada buku ditemukan</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width:50 }}>#</th>
                  <th>Judul & Info</th>
                  <th>Kategori</th>
                  <th>File PDF</th>
                  <th style={{ width:90 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {books.map((b, i) => (
                  <tr key={b.id} style={{ animation:'fadeIn .2s ease' }}>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>
                      {(page - 1) * 10 + i + 1}
                    </td>

                    {/* Judul & info */}
                    <td>
                      <div style={{ fontWeight:700, fontSize:13, marginBottom:2,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {b.judul}
                      </div>
                      <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                        {b.penulis}
                        {b.penerbit && <span> · {b.penerbit}</span>}
                        {b.tahun_terbit && <span> · {b.tahun_terbit}</span>}
                      </div>
                    </td>

                    {/* Kategori */}
                    <td>
                      {b.kategori_nama
                        ? <span className="badge badge-primary">{b.kategori_nama}</span>
                        : <span style={{ color:'var(--text-muted)', fontSize:12 }}>-</span>}
                    </td>

                    {/* PDF status */}
                    <td>
                      <PdfBadge filename={b.file_pdf} />
                    </td>

                    {/* Aksi */}
                    <td>
                      <div style={{ display:'flex', gap:5 }}>
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(b)} title="Edit">
                          <MdEdit />
                        </button>
                        <button className="btn btn-sm btn-danger"
                          onClick={() => { setDeleteId(b.id); setDeleteJudul(b.judul); }}
                          title="Hapus">
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
              Total {pagination.total} buku
            </span>
            <div className="pagination" style={{ marginTop:0 }}>
              <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}>‹</button>
              {Array.from({length:pagination.totalPages},(_,i)=>i+1)
                .filter(p=>p===1||p===pagination.totalPages||Math.abs(p-page)<=1)
                .reduce((acc,p,i,arr)=>{
                  if(i>0&&arr[i-1]!==p-1) acc.push('...');
                  acc.push(p); return acc;
                },[])
                .map((p,i)=>p==='...'
                  ?<span key={`e${i}`} style={{padding:'0 3px',color:'var(--text-muted)'}}>…</span>
                  :<button key={p} className={`page-btn${page===p?' active':''}`}
                     onClick={()=>setPage(p)}>{p}</button>)}
              <button className="page-btn" disabled={page===pagination.totalPages}
                onClick={() => setPage(p=>p+1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Add/Edit ── */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal" style={{ maxWidth:600 }}>
            <div className="modal-header">
              <span className="modal-title">{editing?'✏️ Edit Buku':'📚 Tambah Buku Baru'}</span>
              <button className="modal-close" onClick={closeModal}><MdClose /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
                  <div className="form-group" style={{ gridColumn:'1/-1' }}>
                    <label className="form-label">Judul Buku *</label>
                    <input className="form-control" value={form.judul}
                      onChange={e=>setForm({...form,judul:e.target.value})}
                      placeholder="Judul buku" autoFocus required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Penulis *</label>
                    <input className="form-control" value={form.penulis}
                      onChange={e=>setForm({...form,penulis:e.target.value})}
                      placeholder="Nama penulis" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Penerbit</label>
                    <input
                      type="text"
                      list="publisher-list"
                      className="form-control"
                      value={form.penerbit}
                      onChange={(e)=>setForm({...form,penerbit:e.target.value})}
                  />
                  
                  <datalist id="publisher-list">
                      {publisherHistory.map((publisher) => (
                          <option
                              key={publisher}
                              value={publisher}
                          />
                      ))}
                  </datalist>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tahun Terbit</label>

                    <input
                      type="text"
                      className="form-control"
                      list="tahun-list"
                      placeholder="Pilih / ketik tahun"
                      value={form.tahun_terbit}
                      onChange={e =>
                        setForm({
                          ...form,
                          tahun_terbit: e.target.value
                        })
                      }
                    />

                    <datalist id="tahun-list">
                      {TAHUN_LIST.map(tahun => (
                        <option key={tahun} value={tahun} />
                      ))}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <select className="form-control" value={form.kategori_id}
                      onChange={e=>setForm({...form,kategori_id:e.target.value})}>
                      <option value="">-- Pilih Kategori --</option>
                      {categories.map(c=><option key={c.id} value={c.id}>{c.nama}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn:'1/-1' }}>
                    <label className="form-label">Deskripsi</label>
                    <textarea className="form-control" value={form.deskripsi} rows={3}
                      onChange={e=>setForm({...form,deskripsi:e.target.value})}
                      placeholder="Deskripsi singkat buku" />
                  </div>
                </div>

                {/* Cover upload + preview */}
                <div className="form-group">
                  <label className="form-label">Cover Buku</label>
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    {/* Preview */}
                    <div style={{ width:72, height:96, borderRadius:8, overflow:'hidden',
                      background:'#f0f4f8', border:'1px solid var(--border)',
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {coverPreview
                        ? <img src={coverPreview} alt="preview"
                            style={{ width:'100%', height:'100%', objectFit:'cover' }}
                            onError={e=>e.target.style.display='none'} />
                        : <MdImage style={{ fontSize:28, color:'#94a3b8' }} />}
                    </div>
                    {/* Upload area */}
                    <div className="file-upload-area" style={{ flex:1 }}
                      onClick={() => coverRef.current.click()}>
                      <input ref={coverRef} type="file" accept="image/*" style={{ display:'none' }}
                        onChange={handleCoverChange} />
                      {form.cover_image ? (
                        <div className="file-selected">
                          <MdImage style={{ fontSize:16 }} /> {form.cover_image.name}
                        </div>
                      ) : (
                        <>
                          <div className="file-upload-icon" style={{ fontSize:24 }}>🖼️</div>
                          <div className="file-upload-text">
                            {editing && editing.cover_image
                              ? 'Klik untuk ganti cover'
                              : 'Klik upload cover'}
                            <br /><small>JPG/PNG/WEBP · Maks 5MB</small>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Tampilkan nama file cover lama jika ada */}
                  {editing?.cover_image && !form.cover_image && (
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:5,
                      display:'flex', alignItems:'center', gap:4 }}>
                      <MdCheckCircle style={{ color:'var(--success)', fontSize:13 }} />
                      Cover saat ini: <code style={{ fontSize:11 }}>{editing.cover_image.slice(0,28)}</code>
                    </div>
                  )}
                </div>

                {/* PDF upload */}
                <div className="form-group">
                  <label className="form-label">File PDF {!editing && '*'}</label>
                  <div className="file-upload-area" onClick={() => pdfRef.current.click()}>
                    <input ref={pdfRef} type="file" accept=".pdf" style={{ display:'none' }}
                      onChange={e => setForm({...form, file_pdf:e.target.files[0]})} />
                    {form.file_pdf ? (
                      <div className="file-selected">
                        <MdPictureAsPdf style={{ fontSize:18, color:'var(--danger)' }} />
                        {form.file_pdf.name}
                      </div>
                    ) : (
                      <>
                        <div className="file-upload-icon">📄</div>
                        <div className="file-upload-text">
                          {editing
                            ? (editing.file_pdf
                                ? `PDF saat ini: ${editing.file_pdf.slice(0,28)} — klik untuk ganti`
                                : 'Klik untuk upload PDF')
                            : 'Klik untuk upload PDF'}
                          <br /><small>Maks. 50MB</small>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Status PDF buku yang diedit */}
                  {editing && (
                    <div style={{ marginTop:6 }}>
                      <PdfBadge filename={form.file_pdf ? form.file_pdf.name : editing.file_pdf} />
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" onClick={closeModal}>Batal</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah Buku'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Hapus ── */}
      {deleteId && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setDeleteId(null)}>
          <div className="modal" style={{ maxWidth:400 }}>
            <div className="modal-header">
              <span className="modal-title">Konfirmasi Hapus</span>
              <button className="modal-close" onClick={()=>setDeleteId(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize:14 }}>
                Yakin ingin menghapus buku <strong>"{deleteJudul}"</strong>?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={()=>setDeleteId(null)}>Batal</button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                <MdDelete /> Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Books;
