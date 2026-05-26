import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { MdArrowBack, MdDownload, MdFullscreen, MdFullscreenExit, MdOpenInNew } from 'react-icons/md';

const ReadBook = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get(`/books/${id}`)
      .then(res => setBook(res.data.data))
      .catch(() => { toast.error('Buku tidak ditemukan'); navigate('/siswa'); })
      .finally(() => setLoading(false));
  }, [id]);

  // Fullscreen: lock body scroll
  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [fullscreen]);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`/api/books/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('gagal');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${book?.judul || 'buku'}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Download berhasil!');
    } catch { toast.error('Gagal mengunduh file PDF'); }
    finally { setDownloading(false); }
  };

  if (loading) return (
    <div className="loading-center" style={{ minHeight:'80vh' }}>
      <div className="loading-spin" />
    </div>
  );
  if (!book) return null;

  const pdfUrl = `/uploads/pdf/${book.file_pdf}`;

  const formatAuthor = (penulis) => {
  if (!penulis) return '-';

  const list = penulis.split(',').map(p => p.trim());

  return list.length > 1
    ? `${list[0]}, dkk.`
    : list[0];
  };

  /* Tinggi konten: full-height saat fullscreen, sisanya kurangi navbar (64px) */
  const containerH = fullscreen ? '100vh' : 'calc(100vh - 64px)';

  return (
    <div style={{
      position: fullscreen ? 'fixed' : 'relative',
      inset: fullscreen ? 0 : undefined,
      zIndex: fullscreen ? 400 : undefined,
      display: 'flex', flexDirection: 'column',
      height: containerH,
      background: '#111827',
      overflow: 'hidden',
    }}>

      {/* ── Reader topbar ── */}
      <div style={{
        background: '#0d1117',
        borderBottom: '1px solid rgba(255,255,255,.08)',
        padding: '0 12px', height: 50, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        {/* Left: back + title */}
        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0, flex:1 }}>
          <button className="btn btn-sm"
            onClick={() => navigate(`/siswa/book/${id}`)}
            style={{ background:'rgba(255,255,255,.1)', color:'#fff', border:'none', flexShrink:0 }}>
            <MdArrowBack />
          </button>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#fff',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {book.judul}
            </div>
            <div
              style={{
                fontSize:11,
                opacity:.55,
                color:'#fff',
                whiteSpace:'nowrap',
                overflow:'hidden',
                textOverflow:'ellipsis'
              }}
            >
              {formatAuthor(book.penulis)}
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          <button className="btn btn-sm"
            onClick={handleDownload} disabled={downloading}
            style={{ background:'rgba(255,255,255,.1)', color:'#fff', border:'none' }}>
            <MdDownload />
            <span className="hide-sm">{downloading ? 'Mengunduh...' : 'Download'}</span>
          </button>
          <a href={pdfUrl} target="_blank" rel="noreferrer"
            className="btn btn-sm"
            style={{ background:'rgba(255,255,255,.1)', color:'#fff', border:'none' }}>
            <MdOpenInNew />
            <span className="hide-sm">Tab Baru</span>
          </a>
          <button className="btn btn-sm"
            onClick={() => setFullscreen(f => !f)}
            style={{ background:'rgba(255,255,255,.1)', color:'#fff', border:'none' }}>
            {fullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
            <span className="hide-sm">{fullscreen ? 'Keluar' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* ── PDF area ── */}
      <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
        {/* iframe lebih baik di mobile dibanding object */}
        <iframe
          src={`${pdfUrl}#toolbar=1&navpanes=0`}
          title={book.judul}
          style={{ width:'100%', height:'100%', border:'none', display:'block' }}
        />

        {/* Fallback overlay jika iframe blank (beberapa mobile browser) */}
        <noscript>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', color:'#fff', gap:16, padding:24, textAlign:'center' }}>
            <div style={{ fontSize:56 }}>📄</div>
            <p>Browser Anda tidak mendukung tampilan PDF inline.</p>
            <button className="btn btn-primary" onClick={handleDownload}>
              <MdDownload /> Download PDF
            </button>
          </div>
        </noscript>
      </div>
      <style>{`
        @media (max-width: 600px) {
          .hide-sm { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ReadBook;