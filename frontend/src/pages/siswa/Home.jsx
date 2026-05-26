import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { MdSearch, MdClear } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';

const COLORS = [
  'linear-gradient(135deg,#1a5276,#2e86c1)',
  'linear-gradient(135deg,#1e8449,#27ae60)',
  'linear-gradient(135deg,#7d3c98,#9b59b6)',
  'linear-gradient(135deg,#c0392b,#e74c3c)',
  'linear-gradient(135deg,#d35400,#e67e22)',
  'linear-gradient(135deg,#1a252f,#2c3e50)',
];

const coverSrc = (cover) => {
  if (!cover) return null;

  // URL Supabase
  if (cover.startsWith('http')) {
    return cover;
  }

  // fallback lokal lama
  return `/uploads/covers/${cover}`;
};

const BookCard = ({ book, onClick }) => {
  const colorIdx = book.id % COLORS.length;
  return (
    <div className="book-card" onClick={onClick} style={{ animation:'slideUp .3s ease' }}>
      <div className="book-cover" style={{ background: !book.cover_image ? COLORS[colorIdx] : undefined }}>
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
          {formatAuthor(book.penulis)}
        </div>
        {book.kategori_nama && <div className="book-category">{book.kategori_nama}</div>}
      </div>
    </div>
  );
};

const formatAuthor = (penulis) => {
  if (!penulis) return '-';

  const list = penulis.split(',').map(p => p.trim());

  return list.length > 1
    ? `${list[0]}, dkk.`
    : list[0];
};

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

const Home = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [books, setBooks]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]         = useState('');
  const [filterKat, setFilterKat]   = useState('');
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState({});
  const [suggestions, setSuggestions] = useState([]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 12 });
      if (search)    p.append('search', search);
      if (filterKat) p.append('kategori_id', filterKat);
      const res = await api.get(`/books?${p}`);
      setBooks(res.data.data);
      setPagination(res.data.pagination);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchBooks(); }, [page, search, filterKat]);

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

  const clearSearch = () => { setSearchInput(''); setSearch(''); setSuggestions([]); setPage(1); };

  const handleCat = (id) => { setFilterKat(id === filterKat ? '' : id); setPage(1); };

  const resetAll = () => { setSearch(''); setSearchInput(''); setFilterKat(''); setPage(1); };

  useEffect(() => {
  const close = () => setSuggestions([]);

  window.addEventListener('click', close);

  return () => window.removeEventListener('click', close);
  }, []);

  return (
    <div>
      {/* Hero */}
      <div className="search-hero">
        <h1>Halo, {user?.nama?.split(' ')[0]}!</h1>
        <p>Temukan dan baca e-book pelajaran</p>
        <form className="search-box" onSubmit={handleSearch} onClick={(e) => e.stopPropagation()}>
          <MdSearch style={{ fontSize:20, color:'var(--text-muted)', marginLeft:10, flexShrink:0 }} />
          <input
            type="text"
            placeholder="Cari judul, penulis, penerbit..."
            value={searchInput}
            enterKeyHint="search"
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
                  key.includes(lower) || val.toLowerCase().includes(lower)
                )
                .map(([key, val]) => val);

              const titleSuggestions = books
              .filter(book =>
                book.judul.toLowerCase().includes(lower) ||
                book.kategori_nama?.toLowerCase().includes(lower)
              )
              .map(book => book.judul);

              const unique = [...new Set([
                ...aliasSuggestions,
                ...titleSuggestions
              ])].slice(0, 5);

              setSuggestions(unique);
            }}
          />
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
          <button
            type={search ? 'button' : 'submit'}
            onClick={search ? clearSearch : undefined}
          >
            {search ? <MdClear /> : 'Cari'}
          </button>
        </form>
      </div>

      <div style={{ padding:'20px 16px' }}>
        {/* Kategori pills — horizontal scroll di mobile */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)',
            marginBottom:9, textTransform:'uppercase', letterSpacing:'.5px' }}>
            Filter Kategori
          </div>
          <div style={{ display:'flex', gap:7, overflowX:'auto', paddingBottom:4,
            scrollbarWidth:'none', WebkitOverflowScrolling:'touch' }}>
            <button className={`btn btn-sm ${!filterKat ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleCat('')} style={{ flexShrink:0 }}>
              Semua
            </button>
            {categories.map(cat => (
              <button key={cat.id} style={{ flexShrink:0 }}
                className={`btn btn-sm ${filterKat == cat.id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleCat(cat.id)}>
                {cat.nama}
                <span style={{ background:'rgba(255,255,255,.2)', borderRadius:99,
                  padding:'0 5px', fontSize:10, marginLeft:2 }}>
                  {cat.jumlah_buku}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Result info */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          marginBottom:16, flexWrap:'wrap', gap:8 }}>
          <div>
            <span style={{ fontWeight:700, fontSize:16 }}>
              {search
                ? `Hasil: "${search}"`
                : filterKat
                  ? categories.find(c => c.id == filterKat)?.nama || 'Kategori'
                  : 'Semua E-Book'}
            </span>
            <span style={{ color:'var(--text-muted)', fontSize:13, marginLeft:6 }}>
              ({pagination.total || 0} buku)
            </span>
          </div>
          {(search || filterKat) && (
            <button className="btn btn-sm btn-outline" onClick={resetAll}>
              <MdClear /> Reset
            </button>
          )}
        </div>

        {/* Books grid */}
        {loading ? (
          <div className="loading-center"><div className="loading-spin" /></div>
        ) : books.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <div className="empty-state-title">Tidak ada buku ditemukan</div>
            <div className="empty-state-desc">Coba kata kunci atau kategori lain</div>
            <button className="btn btn-primary" style={{ marginTop:16 }} onClick={resetAll}>
              Tampilkan Semua
            </button>
          </div>
        ) : (
          <div className="grid-books">
            {books.map(book => (
              <BookCard key={book.id} book={book} onClick={() => navigate(`/siswa/book/${book.id}`)} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}>‹</button>
            {Array.from({ length: pagination.totalPages }, (_, i)=>i+1)
              .filter(p=>p===1||p===pagination.totalPages||Math.abs(p-page)<=1)
              .reduce((acc,p,i,arr)=>{
                if(i>0&&arr[i-1]!==p-1) acc.push('...');
                acc.push(p); return acc;
              },[])
              .map((p,i)=> p==='...'
                ? <span key={`e${i}`} style={{ padding:'0 2px', color:'var(--text-muted)' }}>…</span>
                : <button key={p} className={`page-btn${page===p?' active':''}`}
                    onClick={()=>setPage(p)}>{p}</button>
              )}
            <button className="page-btn" disabled={page===pagination.totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
