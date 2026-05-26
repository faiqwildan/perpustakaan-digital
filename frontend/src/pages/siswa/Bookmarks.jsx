import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { MdArrowBack, MdBookmark, MdDelete } from 'react-icons/md';

const COLORS = [
  'linear-gradient(135deg,#1a5276,#2e86c1)',
  'linear-gradient(135deg,#1e8449,#27ae60)',
  'linear-gradient(135deg,#7d3c98,#9b59b6)',
  'linear-gradient(135deg,#c0392b,#e74c3c)',
  'linear-gradient(135deg,#d35400,#e67e22)',
];

const Bookmarks = () => {
  const navigate = useNavigate();
  const [books, setBooks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bookmarks')
      .then(r => setBooks(r.data.data))
      .catch(() => toast.error('Gagal memuat bookmark'))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (bookId, e) => {
    e.stopPropagation();
    try {
      await api.post(`/bookmarks/${bookId}`);
      setBooks(prev => prev.filter(b => b.id !== bookId));
      toast.success('Bookmark dihapus');
    } catch { toast.error('Gagal menghapus bookmark'); }
  };

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
    <div style={{ maxWidth:1000, margin:'0 auto', padding:'20px 16px' }} className="page-fade">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22, flexWrap:'wrap' }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/siswa')}>
          <MdArrowBack /> Kembali
        </button>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, display:'flex', alignItems:'center', gap:7 }}>
            <MdBookmark style={{ color:'#f59e0b', fontSize:22 }} /> Bookmark Saya
          </h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>
            {books.length} Buku yang sudah Anda simpan sebagai bookmark
          </p>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="loading-spin" /></div>
      ) : books.length === 0 ? (
        <div className="empty-state" style={{ padding:'64px 20px' }}>
          <div className="empty-state-icon">🔖</div>
          <div className="empty-state-title">Belum ada bookmark</div>
          <div className="empty-state-desc">Simpan buku favorit dari halaman detail buku</div>
          <button className="btn btn-primary" style={{ marginTop:18 }} onClick={() => navigate('/siswa')}>
            Jelajahi Buku
          </button>
        </div>
      ) : (
        <div className="grid-books">
          {books.map(book => {
            const colorIdx = book.id % COLORS.length;
            return (
              <div key={book.id} className="book-card"
                style={{ position:'relative', animation:'slideUp .25s ease' }}
                onClick={() => navigate(`/siswa/book/${book.id}`)}>

                {/* Hapus bookmark */}
                <button
                  onClick={e => handleRemove(book.id, e)}
                  title="Hapus bookmark"
                  style={{ position:'absolute', top:7, right:7, zIndex:2,
                    width:28, height:28, borderRadius:7, border:'none',
                    background:'rgba(0,0,0,.42)', color:'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer', fontSize:15, transition:'background .2s' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(192,57,43,.85)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,.42)'}>
                  <MdDelete />
                </button>

                <div className="book-cover"
                  style={{ background: !book.cover_image ? COLORS[colorIdx] : undefined }}>
                  {book.cover_image
                    ? <img src={coverSrc(book.cover_image)} alt={book.judul}
                        onError={e => e.target.style.display='none'} />
                    : <div style={{ textAlign:'center', padding:12, color:'rgba(255,255,255,.92)' }}>
                        <div style={{ fontSize:32, marginBottom:7 }}>📖</div>
                        <div style={{ fontSize:11, fontWeight:600, lineHeight:1.35 }}>{book.judul}</div>
                      </div>}
                </div>
                <div className="book-info">
                  <div className="book-title">{book.judul}</div>
                  <div className="book-author">
                    {book.penulis?.includes(',')
                      ? `${book.penulis.split(',')[0]}, dkk`
                      : book.penulis}
                  </div>
                  {book.kategori_nama && <div className="book-category">{book.kategori_nama}</div>}
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:5 }}>
                    🔖 {new Date(book.bookmarked_at).toLocaleDateString('id-ID', {
                      day:'2-digit', month:'short', year:'numeric'
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Bookmarks;
