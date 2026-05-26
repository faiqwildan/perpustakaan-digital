import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { MdArrowBack, MdHistory, MdMenuBook, MdDownload } from 'react-icons/md';

const COLORS = [
  'linear-gradient(135deg,#1a5276,#2e86c1)',
  'linear-gradient(135deg,#1e8449,#27ae60)',
  'linear-gradient(135deg,#7d3c98,#9b59b6)',
  'linear-gradient(135deg,#c0392b,#e74c3c)',
  'linear-gradient(135deg,#d35400,#e67e22)',
];

const fmtDate = d => new Date(d).toLocaleString('id-ID', {
  day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
});

const History = () => {
  const navigate = useNavigate();
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    setLoading(true);
    api.get(`/history?page=${page}&limit=15`)
      .then(r => { setHistory(r.data.data); setPagination(r.data.pagination); })
      .catch(() => toast.error('Gagal memuat riwayat'))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'20px 16px' }} className="page-fade">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22, flexWrap:'wrap' }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/siswa')}>
          <MdArrowBack /> Kembali
        </button>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, display:'flex', alignItems:'center', gap:7 }}>
            <MdHistory style={{ color:'var(--primary)', fontSize:22 }} /> Riwayat Baca
          </h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>
            Buku yang pernah Anda baca atau unduh
          </p>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="loading-spin" /></div>
      ) : history.length === 0 ? (
        <div className="empty-state" style={{ padding:'64px 20px' }}>
          <div className="empty-state-icon">📖</div>
          <div className="empty-state-title">Belum ada riwayat baca</div>
          <div className="empty-state-desc">Mulai baca buku dan riwayat akan muncul di sini</div>
          <button className="btn btn-primary" style={{ marginTop:18 }} onClick={() => navigate('/siswa')}>
            Mulai Membaca
          </button>
        </div>
      ) : (
        <>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {history.map(book => {
              const colorIdx = book.id % COLORS.length;
              return (
                <div key={book.id}
                  onClick={() => navigate(`/siswa/book/${book.id}`)}
                  style={{ display:'flex', gap:13, background:'#fff', borderRadius:13,
                    border:'1px solid var(--border)', padding:13, cursor:'pointer',
                    boxShadow:'var(--shadow)', transition:'var(--transition)',
                    animation:'slideUp .22s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow='var(--shadow-lg)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow='var(--shadow)'; e.currentTarget.style.transform='none'; }}>

                  {/* Mini cover */}
                  <div
                    style={{
                      width:82,
                      height:112,
                      borderRadius:10,
                      flexShrink:0,
                      overflow:'hidden',
                      background: book.cover_image ? undefined : COLORS[colorIdx],
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center'
                    }}>
                    {book.cover_image
                      ? <img src={`/uploads/covers/${book.cover_image}`} alt={book.judul}
                          style={{ width:'100%', height:'100%', objectFit:'cover' }}
                          onError={e => e.target.style.display='none'} />
                      : <span style={{ fontSize:20 }}>📖</span>}
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:3,
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {book.judul}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>
                      {book.penulis?.includes(',')
                        ? `${book.penulis.split(',')[0]}, dkk`
                        : book.penulis}
                    </div>
                    {book.kategori_nama && (
                      <span className="badge badge-primary" style={{ fontSize:10, marginBottom:6 }}>
                        {book.kategori_nama}
                      </span>
                    )}
                    <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--text-muted)',
                      flexWrap:'wrap', marginTop:4 }}>
                      <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                        <MdMenuBook style={{ color:'var(--primary)' }} />
                        {book.view_count}× dibaca
                      </span>
                      {book.download_count > 0 && (
                        <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                          <MdDownload style={{ color:'var(--success)' }} />
                          {book.download_count}× diunduh
                        </span>
                      )}
                      <span style={{ whiteSpace:'nowrap' }}>
                        🕐 {fmtDate(book.last_accessed)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
              {Array.from({ length: pagination.totalPages }, (_, i)=>i+1).map(p=>(
                <button key={p} className={`page-btn${page===p?' active':''}`}
                  onClick={()=>setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={page===pagination.totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default History;