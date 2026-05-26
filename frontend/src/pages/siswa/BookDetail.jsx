import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  MdArrowBack, MdDownload, MdMenuBook,
  MdPerson, MdBusiness, MdCalendarToday,
  MdCategory, MdBookmark, MdBookmarkBorder
} from 'react-icons/md';

const COLORS = [
  'linear-gradient(135deg,#1a5276,#2e86c1)',
  'linear-gradient(135deg,#1e8449,#27ae60)',
  'linear-gradient(135deg,#7d3c98,#9b59b6)',
  'linear-gradient(135deg,#c0392b,#e74c3c)',
  'linear-gradient(135deg,#d35400,#e67e22)',
  'linear-gradient(135deg,#1a252f,#2c3e50)',
];

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [bookmarked, setBookmarked]   = useState(false);
  const [bmLoading, setBmLoading]     = useState(false);
  const loggedRef = useRef(false);

  useEffect(() => {
    api.get(`/books/${id}`)
      .then(res => {
        setBook(res.data.data);
        setBookmarked(res.data.data.is_bookmarked);
      })
      .catch(() => { toast.error('Buku tidak ditemukan'); navigate('/siswa'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleReadOnline = async () => {
    if (!loggedRef.current) {
      loggedRef.current = true;
      try { await api.post(`/books/${id}/log-view`); } catch (_) {}
    }
    navigate(`/siswa/read/${id}`);
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`/api/books/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${book.judul}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Download berhasil!');
    } catch { toast.error('Gagal mengunduh file PDF'); }
    finally { setDownloading(false); }
  };

  const handleBookmark = async () => {
    if (bmLoading) return;
    setBmLoading(true);
    try {
      const res = await api.post(`/bookmarks/${id}`);
      setBookmarked(res.data.bookmarked);
      toast.success(res.data.message);
    } catch { toast.error('Gagal menyimpan bookmark'); }
    finally { setBmLoading(false); }
  };

  if (loading) return (
    <div className="loading-center" style={{ minHeight:'60vh' }}>
      <div className="loading-spin" />
    </div>
  );
  if (!book) return null;

  const colorIdx = book.id % COLORS.length;

  const coverSrc = (cover) => {
  if (!cover) return null;

  // URL Supabase
  if (cover.startsWith('http')) {
    return cover;
  }

  // fallback lokal lama
  return `/uploads/covers/${cover}`;
};
  
  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'20px 16px' }} className="page-fade">
      <button className="btn btn-outline btn-sm" onClick={() => navigate('/siswa')}
        style={{ marginBottom:20 }}>
        <MdArrowBack /> Kembali
      </button>

      {/* ── Layout: stack di mobile, side-by-side di desktop ── */}
      <div style={{
        display:'flex', gap:28, alignItems:'flex-start',
        flexWrap:'wrap',
      }}>
        {/* Cover */}
        <div style={{ width:200, flexShrink:0, margin:'0 auto' }}>
          <div style={{
            aspectRatio:'3/4', background: book.cover_image ? undefined : COLORS[colorIdx],
            borderRadius:14, overflow:'hidden',
            boxShadow:'0 16px 48px rgba(0,0,0,0.18)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {book.cover_image
              ? <img src={coverSrc(book.cover_image)} alt={book.judul}
                  style={{ width:'100%', height:'100%', objectFit:'cover' }}
                  onError={e => e.target.style.display='none'} />
              : <div style={{ textAlign:'center', color:'#fff', padding:20 }}>
                  <div style={{ fontSize:44, marginBottom:10 }}>📖</div>
                  <div style={{ fontSize:12, fontWeight:700, lineHeight:1.5 }}>{book.judul}</div>
                  <div style={{ fontSize:11, opacity:.72, marginTop:5 }}>{book.penulis}</div>
                </div>}
          </div>

          {/* Action buttons */}
          <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:9 }}>
            <button className="btn btn-primary" style={{ justifyContent:'center', width:'100%' }}
              onClick={handleReadOnline}>
              <MdMenuBook /> Baca Online
            </button>
            <button className="btn btn-outline" style={{ justifyContent:'center', width:'100%' }}
              onClick={handleDownload} disabled={downloading}>
              <MdDownload /> {downloading ? 'Mengunduh...' : 'Download PDF'}
            </button>
            <button onClick={handleBookmark} disabled={bmLoading}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                padding:'9px', borderRadius:9, width:'100%',
                border:`2px solid ${bookmarked ? '#f59e0b' : 'var(--border)'}`,
                background: bookmarked ? '#fef3c7' : '#fff',
                color: bookmarked ? '#92400e' : 'var(--text-muted)',
                cursor:'pointer', fontFamily:'var(--font)', fontWeight:600, fontSize:13,
                transition:'all .2s' }}>
              {bookmarked
                ? <MdBookmark style={{ fontSize:18, color:'#f59e0b' }} />
                : <MdBookmarkBorder style={{ fontSize:18 }} />}
              {bookmarked ? 'Tersimpan' : 'Simpan Bookmark'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div style={{ flex:1, minWidth:220 }}>
          {book.kategori_nama && (
            <span className="badge badge-primary" style={{ marginBottom:10, fontSize:12 }}>
              {book.kategori_nama}
            </span>
          )}
          <h1 style={{ fontSize:'clamp(18px,4vw,24px)', fontWeight:800, lineHeight:1.3, marginBottom:6 }}>
            {book.judul}
          </h1>

          <div style={{ display:'flex', flexDirection:'column', gap:10, margin:'18px 0' }}>
            {[
              { icon:<MdPerson />,        label:'Penulis',      value: book.penulis },
              { icon:<MdBusiness />,      label:'Penerbit',     value: book.penerbit||'-' },
              { icon:<MdCalendarToday />, label:'Tahun Terbit', value: book.tahun_terbit||'-' },
              { icon:<MdCategory />,      label:'Kategori',     value: book.kategori_nama||'-' },
            ].map((item,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:11 }}>
                <div style={{ width:34, height:34, borderRadius:8, background:'#f0f4f8',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'var(--primary)', fontSize:17, flexShrink:0 }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700,
                    textTransform:'uppercase', letterSpacing:'.5px' }}>{item.label}</div>
                  <div style={{ fontWeight:600, fontSize:14 }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>

          {book.deskripsi && (
            <div>
              <div style={{ fontWeight:700, marginBottom:7, fontSize:13, color:'var(--text-muted)',
                textTransform:'uppercase', letterSpacing:'.5px' }}>
                Deskripsi
              </div>
              <div style={{ fontSize:13, lineHeight:1.75, color:'var(--text-muted)',
                background:'#f8fafc', padding:'13px 15px', borderRadius:10,
                borderLeft:'4px solid var(--primary-light)' }}>
                {book.deskripsi}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
