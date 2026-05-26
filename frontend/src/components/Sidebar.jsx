import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';
import {
  MdDashboard, MdMenuBook, MdCategory,
  MdPeople, MdBarChart, MdLogout,
  MdEdit, MdClose, MdVisibility, MdVisibilityOff,
  MdBusiness, MdExpandMore, MdExpandLess
} from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../api/axios';

/* ── URL logo helper ── */
const logoSrc = (logo) => {
  if (!logo) return '/logo_mts.png';

  // kalau URL Supabase
  if (logo.startsWith('http')) {
    return logo;
  }

  // fallback lama
  if (logo === 'logo_mts.png') {
    return '/logo_mts.png';
  }

  return `/uploads/logos/${logo}`;
};

/* ── Modal profil admin ────────────────────────────── */
const AdminProfileModal = ({ onClose }) => {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('info');

  const [nama, setNama]             = useState(user?.nama || '');
  const [namaLoading, setNamaLoading] = useState(false);
  const [namaErr, setNamaErr]       = useState('');

  const [pw, setPw]     = useState({ old_password:'', new_password:'', confirm:'' });
  const [show, setShow] = useState({ old:false, new:false, confirm:false });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwErr, setPwErr]         = useState('');

  const handleNama = async (e) => {
    e.preventDefault();
    if (!nama.trim())            { setNamaErr('Nama tidak boleh kosong.'); return; }
    if (nama.trim()===user?.nama){ setNamaErr('Nama tidak berubah.'); return; }
    setNamaErr(''); setNamaLoading(true);
    try {
      await api.put(`/users/${user.id}`, { nama: nama.trim() });
      updateUser({ nama: nama.trim() });
      toast.success('Nama berhasil diperbarui!');
    } catch (e) { setNamaErr(e.response?.data?.message || 'Gagal memperbarui nama.'); }
    finally { setNamaLoading(false); }
  };

  const validatePw = () => {
    if (!pw.old_password)          return 'Password lama wajib diisi.';
    if (pw.new_password.length < 8) return 'Password baru minimal 8 karakter.';
    if (!/[A-Za-z]/.test(pw.new_password)||!/[0-9]/.test(pw.new_password))
      return 'Password baru harus mengandung huruf dan angka.';
    if (pw.new_password !== pw.confirm) return 'Konfirmasi password tidak cocok.';
    return '';
  };

  const handlePw = async (e) => {
    e.preventDefault();
    const msg = validatePw();
    if (msg) { setPwErr(msg); return; }
    setPwErr(''); setPwLoading(true);
    try {
      await api.put('/auth/change-password', { old_password:pw.old_password, new_password:pw.new_password });
      toast.success('Password berhasil diubah!');
      setPw({ old_password:'', new_password:'', confirm:'' });
      onClose();
    } catch (e) { setPwErr(e.response?.data?.message || 'Gagal mengubah password.'); }
    finally { setPwLoading(false); }
  };

  const tabs = [['info','👤 Info'],['nama','✏️ Edit Nama'],['password','🔒 Password']];
  const pwFields = [
    { key:'old_password', label:'Password Lama',           sk:'old' },
    { key:'new_password', label:'Password Baru (min. 8 karakter)', sk:'new' },
    { key:'confirm',      label:'Konfirmasi Password',     sk:'confirm' },
  ];

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:430 }}>
        <div className="modal-header">
          <span className="modal-title">⚙️ Profil Admin</span>
          <button className="modal-close" onClick={onClose}><MdClose /></button>
        </div>
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', overflowX:'auto' }}>
          {tabs.map(([k,lbl])=>(
            <button key={k} onClick={()=>{ setTab(k); setNamaErr(''); setPwErr(''); }}
              style={{ flex:1, padding:'10px 6px', border:'none', background:'none',
                fontFamily:'var(--font)', fontWeight:600, fontSize:12, cursor:'pointer',
                whiteSpace:'nowrap', minWidth:80,
                color:tab===k?'var(--primary)':'var(--text-muted)',
                borderBottom:tab===k?'2px solid var(--primary)':'2px solid transparent',
                transition:'color .2s' }}>
              {lbl}
            </button>
          ))}
        </div>
        <div className="modal-body">
          {tab==='info' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ textAlign:'center', marginBottom:6 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--primary)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:26, color:'#fff', margin:'0 auto 10px', fontWeight:800 }}>
                  {user?.nama?.[0]?.toUpperCase()}
                </div>
                <div style={{ fontWeight:800, fontSize:17 }}>{user?.nama}</div>
                <span className="badge badge-warning" style={{ marginTop:4 }}>Administrator</span>
              </div>
              <div style={{ background:'#f8fafc', borderRadius:10, padding:'12px 14px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
                  textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3 }}>Nama</div>
                <div style={{ fontWeight:600, fontSize:14 }}>{user?.nama}</div>
              </div>
              <div style={{ background:'#f1f5f9', borderRadius:10, padding:'12px 14px', border:'1px dashed #cbd5e1' }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
                  textTransform:'none', letterSpacing:'.5px', marginBottom:3,
                  display:'flex', alignItems:'center', gap:5 }}>
                  ID Admin
                  <span style={{ background:'#e2e8f0', color:'#475569', fontSize:10,
                    padding:'1px 7px', borderRadius:99, fontWeight:600 }}>Terkunci</span>
                </div>
                <div style={{ fontWeight:600, fontSize:14, fontFamily:'monospace', color:'#64748b' }}>
                  {user?.nisn}
                </div>
              </div>
              <p style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>
                ID Admin tidak dapat diubah. Gunakan tab <strong>Edit Nama</strong> atau <strong>Password</strong>.
              </p>
            </div>
          )}
          {tab==='nama' && (
            <form onSubmit={handleNama} noValidate>
              {namaErr && <div className="alert alert-danger" style={{ fontSize:13 }}>{namaErr}</div>}
              <div className="form-group">
                <label className="form-label">Nama Baru</label>
                <input className="form-control" value={nama}
                  onChange={e=>{ setNama(e.target.value); setNamaErr(''); }}
                  placeholder="Masukkan nama baru" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ textTransform:'none' }}>
                  ID Admin
                  <span style={{ background:'#e2e8f0', color:'#475569', fontSize:10,
                    padding:'1px 7px', borderRadius:99, fontWeight:600, marginLeft:6,
                    textTransform:'none', letterSpacing:0 }}>Tidak dapat diubah</span>
                </label>
                <input className="form-control" value={user?.nisn||''} readOnly
                  style={{ background:'#f1f5f9', color:'#64748b', cursor:'not-allowed', fontFamily:'monospace' }} />
              </div>
              <button type="submit" className="btn btn-primary"
                style={{ width:'100%', justifyContent:'center' }} disabled={namaLoading}>
                {namaLoading?'Menyimpan...':'💾 Simpan Nama'}
              </button>
            </form>
          )}
          {tab==='password' && (
            <form onSubmit={handlePw} noValidate>
              {pwErr && <div className="alert alert-danger" style={{ fontSize:13 }}>{pwErr}</div>}
              {pwFields.map(f=>(
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <div style={{ position:'relative' }}>
                    <input type={show[f.sk]?'text':'password'} className="form-control"
                      value={pw[f.key]}
                      onChange={e=>{ setPw({...pw,[f.key]:e.target.value}); setPwErr(''); }}
                      placeholder={f.label} style={{ paddingRight:42 }} required />
                    <button type="button"
                      onClick={()=>setShow({...show,[f.sk]:!show[f.sk]})}
                      style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                        background:'none', border:'none', cursor:'pointer',
                        color:'var(--text-muted)', fontSize:19, display:'flex' }}>
                      {show[f.sk]?<MdVisibilityOff/>:<MdVisibility/>}
                    </button>
                  </div>
                </div>
              ))}
              <button type="submit" className="btn btn-primary"
                style={{ width:'100%', justifyContent:'center' }} disabled={pwLoading}>
                {pwLoading?'Menyimpan...':'🔒 Simpan Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Sidebar utama ─────────────────────────────────── */
const Sidebar = ({ isOpen = true, onClose = () => {} }) => {
  const { user, logout }               = useAuth();
  const { schools, isMultiSchool,
          selectedSchoolId, setSelectedSchoolId } = useSchool();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = async () => {
    onClose();
    await logout();
    toast.success('Berhasil logout');
    navigate('/login');
  };

  // Logo & nama sekolah: ikuti selectedSchool jika multi-school, else school publish pertama
  const isSingle     = !isMultiSchool;
  const currentSchool = isSingle
    ? schools.find(s => s.status === 'publish') || schools[0]
    : schools.find(s => s.id === Number(selectedSchoolId));

  const navItems = [
    { to:'/admin/dashboard',  icon:<MdDashboard />, label:'Dashboard' },
    { to:'/admin/books',      icon:<MdMenuBook />,  label:'Manajemen Buku' },
    { to:'/admin/categories', icon:<MdCategory />,  label:'Manajemen Kategori' },
    { to:'/admin/users',      icon:<MdPeople />,    label:'Manajemen Siswa' },
    { to:'/admin/logs',       icon:<MdBarChart />,  label:'Laporan Aktivitas' },
    { to:'/admin/schools',    icon:<MdBusiness />,  label:'Manajemen Sekolah' },
  ];

  return (
    <>
      <aside
        className={`admin-sidebar${isOpen?' is-open':''}`}
        style={{ position:'fixed', top:0, left:0, bottom:0,
          width:'var(--sidebar-w)', zIndex:300,
          background:'var(--primary-dark)', color:'#fff',
          display:'flex', flexDirection:'column', overflow:'hidden',
          transition:'transform 0.28s cubic-bezier(.4,0,.2,1)' }}
      >
        {/* Logo — dinamis dari API sekolah */}
        <div style={{ padding:'18px 16px', borderBottom:'1px solid rgba(255,255,255,.08)',
          display:'flex', alignItems:'center', gap:11, flexShrink:0 }}>
          {currentSchool?.logo ? (
            <img src={logoSrc(currentSchool.logo)} alt="Logo"
              style={{ width:42, height:42, objectFit:'contain', flexShrink:0, borderRadius:8 }}
              onError={e=>e.target.style.display='none'} />
          ) : (
            <div style={{ width:42, height:42, display:'flex', alignItems:'center',
              justifyContent:'center', flexShrink:0 }}>
              <MdMenuBook style={{ fontSize:36 }} />
            </div>
          )}
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:800, lineHeight:1.2 }}>E-Library</div>
            <div style={{ fontSize:10, opacity:.6, whiteSpace:'nowrap',
              overflow:'hidden', textOverflow:'ellipsis', maxWidth:160 }}>
              {currentSchool?.nama_sekolah || 'Perpustakaan Digital'}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'12px 10px', overflowY:'auto' }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'1.2px',
            textTransform:'uppercase', color:'rgba(255,255,255,.4)', padding:'8px 8px 5px' }}>
            Menu Utama
          </div>
          {navItems.map(item=>(
            <NavLink key={item.to} to={item.to} onClick={onClose}
              className={({isActive})=>`nav-item${isActive?' active':''}`}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* Filter sekolah — hanya tampil jika multi-school */}
          {isMultiSchool && (
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'1.2px',
                textTransform:'uppercase', color:'rgba(255,255,255,.4)', padding:'8px 8px 5px' }}>
                Filter Sekolah
              </div>
              {/* Semua sekolah */}
              <button onClick={()=>{ setSelectedSchoolId(null); onClose(); }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:9,
                  padding:'9px 13px', borderRadius:9, border:'none', cursor:'pointer',
                  fontFamily:'var(--font)', fontSize:13, fontWeight:500,
                  background:!selectedSchoolId?'rgba(255,255,255,.18)':'none',
                  color:!selectedSchoolId?'#fff':'rgba(255,255,255,.65)',
                  transition:'background .18s', marginBottom:2 }}>
                <MdBusiness style={{ fontSize:17, flexShrink:0 }} />
                <span style={{ flex:1, textAlign:'left' }}>Semua Sekolah</span>
                {!selectedSchoolId && (
                  <span style={{ fontSize:10, background:'rgba(255,255,255,.3)',
                    padding:'1px 7px', borderRadius:99 }}>Aktif</span>
                )}
              </button>
              {/* Daftar sekolah publish */}
              {schools.map(s=>(
                <button key={s.id}
                  onClick={()=>{ setSelectedSchoolId(s.id); onClose(); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:9,
                    padding:'9px 13px', borderRadius:9, border:'none', cursor:'pointer',
                    fontFamily:'var(--font)', fontSize:12, fontWeight:500,
                    background:selectedSchoolId===s.id?'rgba(255,255,255,.18)':'none',
                    color:selectedSchoolId===s.id?'#fff':'rgba(255,255,255,.65)',
                    transition:'background .18s', marginBottom:2 }}>
                  <div style={{ width:22, height:22, borderRadius:5, overflow:'hidden',
                    background:'rgba(255,255,255,.15)', flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {s.logo
                      ? <img src={logoSrc(s.logo)} alt={s.nama_sekolah}
                          style={{ width:'100%', height:'100%', objectFit:'contain' }}
                          onError={e=>e.target.style.display='none'} />
                      : <span style={{ fontSize:12 }}>🏫</span>}
                  </div>
                  <span style={{ flex:1, textAlign:'left', whiteSpace:'nowrap',
                    overflow:'hidden', textOverflow:'ellipsis' }}>
                    {s.nama_sekolah}
                  </span>
                  {selectedSchoolId===s.id && (
                    <span style={{ fontSize:10, background:'rgba(255,255,255,.3)',
                      padding:'1px 7px', borderRadius:99, flexShrink:0 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* User footer */}
        <div style={{ padding:'12px 14px', borderTop:'1px solid rgba(255,255,255,.08)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{ width:34, height:34, borderRadius:'50%',
              background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:15, fontWeight:800, flexShrink:0 }}>
              {user?.nama?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:13,
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {user?.nama}
              </div>
              <div style={{ fontSize:11, opacity:.6 }}>Administrator</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={()=>setShowProfile(true)}
              title="Edit Profil & Password"
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                background:'rgba(255,255,255,.1)', border:'none', borderRadius:8,
                color:'#fff', cursor:'pointer', padding:'7px 0', fontSize:12, fontWeight:600,
                fontFamily:'var(--font)', transition:'background .2s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.2)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.1)'}>
              <MdEdit style={{ fontSize:15 }} /> Profil
            </button>
            <button onClick={handleLogout} title="Logout"
              style={{ display:'flex', alignItems:'center', justifyContent:'center',
                background:'rgba(192,57,43,.3)', border:'none', borderRadius:8,
                color:'#fff', cursor:'pointer', padding:'7px 12px', fontSize:18,
                transition:'background .2s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(192,57,43,.6)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(192,57,43,.3)'}>
              <MdLogout />
            </button>
          </div>
        </div>
      </aside>

      {showProfile && <AdminProfileModal onClose={()=>setShowProfile(false)} />}

      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar          { transform: translateX(-100%); }
          .admin-sidebar.is-open  { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default Sidebar;
