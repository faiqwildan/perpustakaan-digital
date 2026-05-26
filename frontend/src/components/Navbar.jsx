import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';
import {
  MdPerson, MdLogout, MdBookmark, MdHistory,
  MdKeyboardArrowDown, MdClose, MdVisibility, MdVisibilityOff
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

/* ── Modal Profil Siswa ── */
const ProfileModal = ({ onClose }) => {
  const { user } = useAuth();
  const [tab, setTab]   = useState('profil');
  const [form, setForm] = useState({ old_password:'', new_password:'', confirm:'' });
  const [show, setShow] = useState({ old:false, new:false, confirm:false });
  const [loading, setLoading] = useState(false);
  const [err, setErr]   = useState('');

  const validate = () => {
    if (!form.old_password) return 'Password lama wajib diisi.';
    if (form.new_password.length < 8) return 'Password baru minimal 8 karakter.';
    if (!/[A-Za-z]/.test(form.new_password) || !/[0-9]/.test(form.new_password))
      return 'Password baru harus mengandung huruf dan angka.';
    if (form.new_password !== form.confirm) return 'Konfirmasi password tidak cocok.';
    return '';
  };

  const handleChangePass = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setErr(msg); return; }
    setErr(''); setLoading(true);
    try {
      await api.put('/auth/change-password', {
        old_password: form.old_password,
        new_password: form.new_password
      });
      toast.success('Password berhasil diubah!');
      setForm({ old_password:'', new_password:'', confirm:'' });
      onClose();
    } catch (e) {
      // Tampilkan pesan error, JANGAN logout
      setErr(e.response?.data?.message || 'Gagal mengubah password.');
    } finally { setLoading(false); }
  };

  const pwFields = [
    { key:'old_password', label:'Password Lama',            sk:'old' },
    { key:'new_password', label:'Password Baru (min. 8 karakter)', sk:'new' },
    { key:'confirm',      label:'Konfirmasi Password Baru', sk:'confirm' },
  ];

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:420 }}>
        <div className="modal-header">
          <span className="modal-title">👤 Profil Saya</span>
          <button className="modal-close" onClick={onClose}><MdClose /></button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)' }}>
          {[['profil','👤 Profil'],['password','🔒 Ubah Password']].map(([k,lbl])=>(
            <button key={k} onClick={()=>{ setTab(k); setErr(''); }}
              style={{ flex:1, padding:'10px', border:'none', background:'none',
                fontFamily:'var(--font)', fontWeight:600, fontSize:13, cursor:'pointer',
                color: tab===k?'var(--primary)':'var(--text-muted)',
                borderBottom: tab===k?'2px solid var(--primary)':'2px solid transparent',
                transition:'color .2s' }}>
              {lbl}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {tab === 'profil' ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Avatar */}
              <div style={{ textAlign:'center', marginBottom:6 }}>
                <div style={{ width:64, height:64, borderRadius:'50%',
                  background:'var(--primary)', display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:26, color:'#fff',
                  margin:'0 auto 10px', fontWeight:800 }}>
                  {user?.nama?.[0]?.toUpperCase()}
                </div>
                <div style={{ fontWeight:800, fontSize:17 }}>{user?.nama}</div>
                <span className="badge badge-primary" style={{ marginTop:4 }}>Siswa</span>
              </div>
              {[
                { label:'Nama Lengkap', value:user?.nama   },
                { label:'NISN',         value:user?.nisn   },
                { label:'Kelas',        value:user?.kelas || '-' },
              ].map((f,i)=>(
                <div key={i} style={{ background:'#f8fafc', borderRadius:10, padding:'11px 14px' }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
                    textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3 }}>
                    {f.label}
                  </div>
                  <div style={{ fontWeight:600, fontSize:14 }}>{f.value}</div>
                </div>
              ))}
              <p style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>
                Data profil hanya dapat diubah oleh admin sekolah.
              </p>
            </div>
          ) : (
            <form onSubmit={handleChangePass} noValidate>
              {err && <div className="alert alert-danger" style={{ fontSize:13 }}>{err}</div>}
              {pwFields.map(f=>(
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <div style={{ position:'relative' }}>
                    <input
                      type={show[f.sk]?'text':'password'}
                      className="form-control"
                      value={form[f.key]}
                      onChange={e=>{ setForm({...form,[f.key]:e.target.value}); setErr(''); }}
                      placeholder={f.label}
                      style={{ paddingRight:42 }}
                      required
                    />
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
                style={{ width:'100%', justifyContent:'center' }} disabled={loading}>
                {loading?'Menyimpan...':'Simpan Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Navbar ── */
const Navbar = () => {
  const { user, logout } = useAuth();
  const { getSchool }    = useSchool();
  const navigate = useNavigate();
  const [dropOpen, setDropOpen]       = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const dropRef = useRef();

  // Data sekolah user saat ini
  const school = user?.school_id ? getSchool(user.school_id) : null;
  const schoolLogo = logoSrc(user?.school_logo || school?.logo);
  const schoolName = user?.nama_sekolah || school?.nama_sekolah || 'MTs Nurul Islam Randudongkal';

  useEffect(() => {
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = async () => {
    setDropOpen(false);
    await logout();
    toast.success('Berhasil logout');
    navigate('/login');
  };

  const menuItems = [
    { icon:<MdPerson />,  label:'Profil',        action:()=>{ setDropOpen(false); setShowProfile(true); } },
    { icon:<MdBookmark />,label:'Bookmark',       action:()=>{ setDropOpen(false); navigate('/siswa/bookmarks'); } },
    { icon:<MdHistory />, label:'Riwayat Baca',  action:()=>{ setDropOpen(false); navigate('/siswa/history'); } },
  ];

  return (
    <>
      <header
        style={{
          background:'#fff',
          borderBottom:'1px solid #e2e8f0',
          padding:'0 clamp(12px,4vw,20px)',
          height:60,
          display:'flex',
          alignItems:'center',
          justifyContent:'space-between',
          position:'sticky',
          top:0,
          zIndex:50,
          boxShadow:'0 1px 8px rgba(0,0,0,0.06)',
        }}
      >

        {/* Logo — dinamis dari database */}
        <NavLink to="/siswa" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' }}>
          <img
            src={schoolLogo}
            alt="Logo"
            style={{ width:40, height:40, objectFit:'contain' }}
            onError={e => { e.target.src = '/logo_mts.png'; }}
          />
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:'var(--primary-dark)', lineHeight:1.2 }}>
              E-Library
            </div>
            <div style={{ fontSize:10, color:'var(--text-muted)', lineHeight:1.2,
              maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {schoolName}
            </div>
          </div>
        </NavLink>

        {/* User dropdown */}
        <div style={{ position:'relative' }} ref={dropRef}>
          <button onClick={()=>setDropOpen(v=>!v)}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 11px',
              background: dropOpen?'#f0f4f8':'#f8fafc',
              borderRadius:10, border:'1px solid var(--border)',
              cursor:'pointer', fontFamily:'var(--font)', transition:'var(--transition)' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--primary)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, color:'#fff', fontWeight:800, flexShrink:0 }}>
              {user?.nama?.[0]?.toUpperCase()}
            </div>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>
                {user?.nama?.split(' ')[0]}
              </div>
              <div style={{ fontSize:10, color:'var(--text-muted)' }}>
                Kelas {user?.kelas || '-'}
              </div>
            </div>
            <MdKeyboardArrowDown style={{ color:'var(--text-muted)', fontSize:17,
              transform: dropOpen?'rotate(180deg)':'none', transition:'transform .2s' }} />
          </button>

          {/* Dropdown */}
          {dropOpen && (
            <div className="dropdown-enter"
              style={{ position:'absolute', right:0, top:'calc(100% + 7px)', width:190,
                background:'#fff', borderRadius:12, boxShadow:'0 8px 30px rgba(0,0,0,0.12)',
                border:'1px solid var(--border)', overflow:'hidden', zIndex:200 }}>
              {/* User info */}
              <div style={{ padding:'11px 14px', borderBottom:'1px solid var(--border)',
                background:'#f8fafc' }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{user?.nama}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>NISN: {user?.nisn}</div>
              </div>
              {/* Menu items */}
              {menuItems.map((item,i)=>(
                <button key={i} onClick={item.action}
                  style={{ width:'100%', padding:'10px 14px', background:'none', border:'none',
                    display:'flex', alignItems:'center', gap:9, cursor:'pointer',
                    fontFamily:'var(--font)', fontSize:13, color:'var(--text)',
                    transition:'background .15s', textAlign:'left' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f0f4f8'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <span style={{ color:'var(--primary)', fontSize:17 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              {/* Logout */}
              <div style={{ borderTop:'1px solid var(--border)' }}>
                <button onClick={handleLogout}
                  style={{ width:'100%', padding:'10px 14px', background:'none', border:'none',
                    display:'flex', alignItems:'center', gap:9, cursor:'pointer',
                    fontFamily:'var(--font)', fontSize:13, color:'var(--danger)',
                    transition:'background .15s', textAlign:'left' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#fee2e2'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <MdLogout style={{ fontSize:17 }} /> Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {showProfile && <ProfileModal onClose={()=>setShowProfile(false)} />}
    </>
  );
};

export default Navbar;
