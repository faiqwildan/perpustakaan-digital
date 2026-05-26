import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useSchool } from '../../context/SchoolContext';

const actionLabel = (a) => ({ login:'🔑 Login', logout:'🚪 Logout', view:'📖 Baca', download:'⬇️ Download' }[a] || a);
const actionBadge = (a) => ({ login:'badge-success', logout:'badge-secondary', view:'badge-primary', download:'badge-warning' }[a] || 'badge-secondary');

const fmtDT = (d) => new Date(d).toLocaleString('id-ID',{
  day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'
});

const Dashboard = () => {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const { schools, selectedSchoolId: globalSchoolId } = useSchool();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const p = globalSchoolId ? `?school_id=${globalSchoolId}` : '';
      const r = await api.get(`/logs/stats/dashboard${p}`);
      setStats(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, [globalSchoolId]);

  if (loading) return (
    <div className="loading-center" style={{ minHeight:'60vh' }}>
      <div className="loading-spin" />
    </div>
  );

  const statCards = [
    { icon:'📚', label:'Total Buku',     value: stats?.stats.total_buku     || 0, bg:'#dbeafe', ic:'#1e40af' },
    { icon:'🗂️', label:'Kategori',       value: stats?.stats.total_kategori || 0, bg:'#dcfce7', ic:'#166534' },
    { icon:'👥', label:'Siswa Aktif',    value: stats?.stats.total_siswa    || 0, bg:'#fef3c7', ic:'#92400e' },
    { icon:'📊', label:'Total Aktivitas',value: stats?.stats.total_aktivitas|| 0, bg:'#fce7f3', ic:'#9d174d' },
    { icon:'⬇️', label:'Total Download', value: stats?.stats.total_download || 0, bg:'#ede9fe', ic:'#5b21b6' },
    { icon:'📖', label:'Total Baca',     value: stats?.stats.total_view     || 0, bg:'#e0f2fe', ic:'#075985' },
  ];

  return (
    <div className="page-fade">
      <div className="page-header" style={{ display:'flex', alignItems:'flex-start',
        justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Selamat datang di Perpustakaan Digital
            {globalSchoolId && schools.length > 1 && (
              <span style={{ marginLeft:8, color:'var(--primary-light)', fontWeight: 600 }}>
                — {schools.find(s=>s.id===Number(globalSchoolId))?.nama_sekolah}
              </span>
            )}
          </p>
        </div>
        {/* Filter sekolah dikelola dari sidebar, tidak ada dropdown di sini */}
      </div>

      {/* Stat Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:14, marginBottom:24 }}>
        {statCards.map((s,i) => (
          <div key={i} className="stat-card" style={{ animation:`slideUp .3s ease ${i*0.05}s both` }}>
            <div className="stat-icon" style={{ background:s.bg }}>
              <span>{s.icon}</span>
            </div>
            <div style={{ minWidth:0 }}>
              <div className="stat-value">{s.value.toLocaleString()}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:18 }}>

        {/* Buku Terpopuler */}
        <div className="card">
          <div className="card-header">🔥 Buku Terpopuler</div>
          {!stats?.popularBooks?.length ? (
            <div className="empty-state" style={{ padding:28 }}>
              <div className="empty-state-icon" style={{ fontSize:36 }}>📚</div>
              <div className="empty-state-title">Belum ada data</div>
            </div>
          ) : (
            <div style={{ padding:0 }}>
              {stats.popularBooks.map((b, i) => (
                <div key={b.id} style={{
                  display:'flex', alignItems:'center', gap:11,
                  padding:'11px 16px',
                  borderBottom: i < stats.popularBooks.length-1 ? '1px solid #f1f5f9' : 'none',
                  transition:'background .15s',
                }} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                   onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <div style={{ width:28, height:28, borderRadius:8, background:'var(--primary)',
                    color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:12, fontWeight:800, flexShrink:0 }}>
                    #{i+1}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13,
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {b.judul}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{b.penulis}</div>
                  </div>
                  <span className="badge badge-primary" style={{ flexShrink:0 }}>
                    {b.total_akses} akses
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aktivitas Terbaru */}
        <div className="card">
          <div className="card-header">🕐 Aktivitas Terbaru</div>
          {!stats?.recentActivity?.length ? (
            <div className="empty-state" style={{ padding:28 }}>
              <div className="empty-state-icon" style={{ fontSize:36 }}>📋</div>
              <div className="empty-state-title">Belum ada aktivitas</div>
            </div>
          ) : (
            <div style={{ maxHeight:340, overflowY:'auto' }}>
              {stats.recentActivity.map((log, i) => (
                <div key={log.id} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between', gap:10,
                  padding:'10px 16px',
                  borderBottom:'1px solid #f1f5f9',
                  transition:'background .15s',
                }} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                   onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>
                      {log.user_nama || 'Tidak diketahui'}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-muted)',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:160 }}>
                      {log.book_judul ? `📖 ${log.book_judul}` : log.detail || '-'}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <span className={`badge ${actionBadge(log.action)}`} style={{ fontSize:10 }}>
                      {actionLabel(log.action)}
                    </span>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>
                      {fmtDT(log.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;