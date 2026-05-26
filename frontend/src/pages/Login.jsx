import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';
import toast from 'react-hot-toast';
import { MdVisibility, MdVisibilityOff, MdLock, MdBadge, MdArrowBack, MdMenuBook } from 'react-icons/md';

/* ── URL helper logo sekolah ── */
const logoUrl = (logo) => {
  if (!logo) return '/logo_mts.png';
  return logo;
};

const Login = () => {
  const { login, user }              = useAuth();
  const { schools, loadingSchools, isSingleSchool } = useSchool();
  const navigate                     = useNavigate();

  const [selectedSchool, setSelectedSchool] = useState(null);
  const [form, setForm]         = useState({ nisn: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Jika hanya 1 sekolah publish, langsung pilih otomatis
  useEffect(() => {
    if (isSingleSchool) setSelectedSchool(schools[0]);
  }, [isSingleSchool, schools]);

  // Redirect jika sudah login — scroll ke atas dulu
  if (user) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    navigate(user.role === 'admin' ? '/admin/dashboard' : '/siswa', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const nisnVal = form.nisn.trim();
    const passVal = form.password.trim();

    if (!nisnVal)  { setError('NISN atau ID wajib diisi.'); return; }
    if (!passVal)  { setError('Password wajib diisi.'); return; }

    setLoading(true);
    try {
      const u = await login(nisnVal, form.password, selectedSchool?.id);
      window.scrollTo({ top: 0, behavior: 'instant' });
      toast.success(`Selamat datang, ${u.nama}!`);
      navigate(u.role === 'admin' ? '/admin/dashboard' : '/siswa', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal. Periksa NISN atau ID dan password.');
    } finally { setLoading(false); }
  };

  /* ── Tampilan loading awal ── */
  if (loadingSchools) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:"url('/bg.jpeg') no-repeat center center / cover", position:'relative' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(13,47,69,.8)' }} />
      <div className="loading-spin" style={{ position:'relative', zIndex:1 }} />
    </div>
  );

  return (
    <>
      <div style={{
        minHeight: '100vh',
        background: "url('/bg.jpeg') no-repeat center center / cover",
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px', position: 'relative',
      }}>
        {/* Overlay */}
        <div style={{ position:'absolute', inset:0,
          background:'linear-gradient(135deg,rgba(13,47,69,.88) 0%,rgba(26,82,118,.78) 100%)' }} />

        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 60, width: '100%', maxWidth: 1000, flexWrap: 'wrap',
        }}>
          {/* ── Kiri: Branding ── */}
          <div style={{ color:'#fff', textAlign:'center', flex:'1 1 280px', maxWidth:360 }}>
            {/* Logo: tampilkan logo sekolah terpilih (atau logo_mts jika single) */}
            {selectedSchool && !isSingleSchool && logoUrl(selectedSchool.logo) ? (
              <img
                src={logoUrl(selectedSchool.logo)}
                alt="Logo"
                style={{ width:88, marginBottom:16, borderRadius:12 }}
              />
            ) : (
              <MdMenuBook style={{ fontSize: 72, color: '#ffffff', marginBottom:16 }} />
            )}
            <h1 style={{ fontSize:'clamp(20px,4vw,30px)', fontWeight:800,
              marginBottom:8, lineHeight:1.25, textShadow:'0 2px 8px rgba(0,0,0,.3)' }}>
              {selectedSchool && !isSingleSchool
                ? selectedSchool.nama_sekolah
                : 'Perpustakaan Digital'}
            </h1>
            <p style={{ fontSize:13, opacity:.65, maxWidth:260, margin:'8px auto 0' }}>
              Akses e-book pelajaran kapan saja, di mana saja.
            </p>

            <div style={{ display:'flex', flexDirection:'column', gap:9, maxWidth:240,
              margin:'24px auto 0' }} className="login-features">
              {[['📖','Koleksi e-book lengkap'],['🔍','Pencarian mudah & cepat'],['💾','Download & baca online']]
                .map(([icon, text], i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10,
                    background:'rgba(255,255,255,.12)', backdropFilter:'blur(6px)',
                    padding:'9px 13px', borderRadius:10, border:'1px solid rgba(255,255,255,.15)',
                    animation:`slideIn .3s ease ${i*.08}s both`, fontSize:13 }}>
                    <span style={{ fontSize:18 }}>{icon}</span>{text}
                  </div>
                ))}
            </div>
          </div>

          {/* ── Kanan: Card ── */}
          <div style={{ background:'#fff', borderRadius:20,
            padding:'clamp(22px,5vw,38px)', width:'100%', maxWidth:390,
            flex:'1 1 320px', boxShadow:'0 24px 64px rgba(0,0,0,.3)',
            animation:'slideUp .35s ease' }}>

            {/* MODE A: MULTI-SCHOOL — pilih sekolah (grid logo) */}
            {!selectedSchool && schools.length > 1 && (
              <>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <h2 style={{ fontSize:18, fontWeight:800, color:'var(--text)', marginBottom:4 }}>
                    Pilih Sekolah Anda
                  </h2>
                  <p style={{ fontSize:13, color:'var(--text-muted)' }}>
                    Klik logo sekolah untuk melanjutkan
                  </p>
                </div>

                <div style={{ display:'grid',
                  gridTemplateColumns: schools.length > 2 ? 'repeat(auto-fill,minmax(120px,1fr))' : 'repeat(2,1fr)',
                  gap:12, maxHeight:360, overflowY:'auto', paddingTop:4, paddingRight:2 }}>
                  {schools.map(school => (
                    <button key={school.id}
                      onClick={() => { setSelectedSchool(school); setError(''); }}
                      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10,
                        padding:'16px 12px', borderRadius:14, border:'2px solid var(--border)',
                        background:'#fafafa', cursor:'pointer',
                        fontFamily:'var(--font)', transition:'all .2s', textAlign:'center' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor='var(--primary)';
                        e.currentTarget.style.background='#eff6ff';
                        e.currentTarget.style.transform='translateY(-3px)';
                        e.currentTarget.style.boxShadow='0 8px 24px rgba(26,82,118,.15)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor='var(--border)';
                        e.currentTarget.style.background='#fafafa';
                        e.currentTarget.style.transform='none';
                        e.currentTarget.style.boxShadow='none';
                      }}>
                      <div style={{ width:64, height:64, borderRadius:12, overflow:'hidden',
                        background:'#f0f4f8', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {logoUrl(school.logo)
                          ? <img src={logoUrl(school.logo)} alt={school.nama_sekolah}
                              style={{ width:'100%', height:'100%', objectFit:'contain' }}
                              onError={e => { e.target.style.display='none'; }} />
                          : <span style={{ fontSize:28 }}>🏫</span>}
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--text)',
                        lineHeight:1.35, wordBreak:'break-word' }}>
                        {school.nama_sekolah}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                        {school.jumlah_siswa} siswa
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* MODE B: FORM LOGIN */}
            {(selectedSchool || schools.length === 0) && (
              <>
                <div style={{ textAlign:'center', marginBottom:22 }}>
                  {logoUrl(selectedSchool?.logo)
                    ? <img src={logoUrl(selectedSchool.logo)} alt="Logo"
                        style={{ width:50, height:50, objectFit:'contain', borderRadius:10, marginBottom:10 }}
                        onError={e => e.target.style.display='none'} />
                    : <img src="/logo_mts.png" alt="Logo" style={{ width:50, marginBottom:10 }} />}
                  <h2 style={{ fontSize:19, fontWeight:800, color:'var(--text)', marginBottom:4 }}>
                    Masuk ke Akun
                  </h2>
                  <p style={{ color:'var(--text-muted)', fontSize:13 }}>
                    {selectedSchool ? selectedSchool.nama_sekolah : 'Masukkan NISN atau ID dan password Anda'}
                  </p>
                </div>

                {/* Tombol ganti sekolah */}
                {schools.length > 1 && !isSingleSchool && (
                  <button
                    onClick={() => { setSelectedSchool(null); setError(''); setForm({nisn:'',password:''}); }}
                    style={{ display:'flex', alignItems:'center', gap:6, background:'#f0f4f8',
                      border:'none', borderRadius:8, padding:'7px 12px', cursor:'pointer',
                      fontSize:12, fontFamily:'var(--font)', color:'var(--text-muted)',
                      marginBottom:16, transition:'background .2s', fontWeight:600 }}
                    onMouseEnter={e => e.currentTarget.style.background='#e2e8f0'}
                    onMouseLeave={e => e.currentTarget.style.background='#f0f4f8'}>
                    <MdArrowBack style={{ fontSize:15 }} /> Ganti Sekolah
                  </button>
                )}

                {error && (
                  <div className="alert alert-danger" style={{ animation:'slideUp .2s ease' }}>
                    <span>⚠️</span> {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="form-group">
                    <label className="form-label">NISN / ID</label>
                    <div style={{ position:'relative' }}>
                      <MdBadge style={{ position:'absolute', left:12, top:'50%',
                        transform:'translateY(-50%)', fontSize:18, color:'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Masukkan NISN atau ID"
                        value={form.nisn}
                        onChange={e => {
                          setForm({ ...form, nisn: e.target.value });
                          setError('');
                        }}
                        style={{ paddingLeft: 38 }}
                        autoFocus
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div style={{ position:'relative' }}>
                      <MdLock style={{ position:'absolute', left:12, top:'50%',
                        transform:'translateY(-50%)', fontSize:18, color:'var(--text-muted)' }} />
                      <input type={showPass?'text':'password'} className="form-control"
                        placeholder="Masukkan Password" value={form.password}
                        onChange={e => { setForm({...form, password:e.target.value}); setError(''); }}
                        style={{ paddingLeft:38, paddingRight:42 }} autoComplete="current-password" />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)',
                          background:'none', border:'none', cursor:'pointer',
                          color:'var(--text-muted)', fontSize:19, display:'flex' }}>
                        {showPass ? <MdVisibilityOff /> : <MdVisibility />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg"
                    style={{ width:'100%', justifyContent:'center', marginTop:4 }} disabled={loading}>
                    {loading
                      ? <><span className="loading-spin" style={{ width:18, height:18, borderWidth:2 }} /> Memproses...</>
                      : 'Masuk'}
                  </button>

                  <div style={{
                    marginTop: 14,
                    textAlign: 'center',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5
                  }}>
                    Lupa password? Silakan hubungi admin sekolah.
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) { .login-features { display: none !important; } }
      `}</style>
    </>
  );
};

export default Login;
