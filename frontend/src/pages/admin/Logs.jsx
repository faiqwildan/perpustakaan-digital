import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { useSchool } from '../../context/SchoolContext';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MdRefresh, MdDownload, MdDelete, MdClose, MdFilterList, MdClear } from 'react-icons/md';

const KELAS_LIST = ['7A','7B','7C','7D','7E','8A','8B','8C','8D','8E','9A','9B','9C','9D','9E'];

const actionConfig = {
  login:    { label:'Login',    badge:'badge-success',   icon:'🔑' },
  logout:   { label:'Logout',   badge:'badge-secondary', icon:'🚪' },
  view:     { label:'Baca',     badge:'badge-primary',   icon:'📖' },
  download: { label:'Download', badge:'badge-warning',   icon:'⬇️' },
};

const fmtDT = (d) => new Date(d).toLocaleString('id-ID', {
  day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
});

const fmtIDDate = (d) => new Date(d).toLocaleDateString('id-ID', {
  day:'2-digit', month:'long', year:'numeric'
});
const fmtIDTime = (d) => new Date(d).toLocaleTimeString('id-ID', {
  hour:'2-digit', minute:'2-digit'
});

/* ── Date Picker wrapper ── */
const DateInput = ({ label, value, onChange }) => {
  const inputRef = useRef();
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
      <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600,
        textTransform:'uppercase', letterSpacing:'.5px' }}>{label}</span>
      <input ref={inputRef} type="date" className="form-control"
        style={{ width:150, cursor:'pointer' }} value={value}
        onChange={e => onChange(e.target.value)}
        onClick={() => inputRef.current?.showPicker?.()}
      />
    </div>
  );
};

const Logs = () => {
  const [logs, setLogs]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterKelas, setFilterKelas]   = useState('');
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');
  const [page, setPage]                 = useState(1);
  const [pagination, setPagination]     = useState({});
  const [showClear, setShowClear]       = useState(false);
  const [clearDate, setClearDate]       = useState('');
  const [exporting, setExporting]       = useState(false);

  const { schools, isSingleSchool, selectedSchoolId: globalSchoolId } = useSchool();

  // ── Nama sekolah aktif untuk header export ─────────────────
  // Prioritas:
  //   1. Filter sidebar aktif (globalSchoolId) → nama sekolah terpilih
  //   2. Single-school               → nama satu-satunya sekolah publish
  //   3. Multi-school tanpa filter   → "Semua Sekolah"
  const activeSchoolName = (() => {
    if (globalSchoolId) {
      return schools.find(s => s.id === Number(globalSchoolId))?.nama_sekolah
             || 'Sekolah Terpilih';
    }
    if (isSingleSchool && schools[0]) {
      return schools[0].nama_sekolah;
    }
    return 'Semua Sekolah';
  })();

  const toIDFmt = (v) => {
    if (!v) return '';
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y}`;
  };

  const buildParams = (extra = {}) => {
    const p = new URLSearchParams({ page, limit: 25, ...extra });
    if (globalSchoolId) p.append('school_id',  globalSchoolId);
    if (filterAction)   p.append('action',     filterAction);
    if (filterKelas)    p.append('kelas',      filterKelas);
    if (startDate)      p.append('start_date', toIDFmt(startDate));
    if (endDate)        p.append('end_date',   toIDFmt(endDate));
    return p;
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/logs?${buildParams()}`);
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Gagal memuat log'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [page, filterAction, filterKelas, globalSchoolId, startDate, endDate]);

  const resetFilter = () => {
    setFilterAction(''); setFilterKelas(''); setStartDate(''); setEndDate(''); setPage(1);
  };
  const hasFilter = filterAction || filterKelas || startDate || endDate;

  /* ── Export Excel ── */
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const p = buildParams({ page: 1, limit: 99999 });
      p.append('school_name', encodeURIComponent(activeSchoolName));
      const res = await fetch(`/api/logs/export/excel?${p}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `laporan-aktivitas-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export Excel berhasil!');
    } catch { toast.error('Gagal export Excel'); }
    finally { setExporting(false); }
  };

  /* ── Export PDF ── */
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const p = buildParams({ page: 1, limit: 99999 });
      p.append('school_name', encodeURIComponent(activeSchoolName));
      const res  = await api.get(`/logs/export/pdf?${p}`);
      const data = res.data.data  || [];
      const meta = res.data.meta  || {};

      if (!data.length) {
        toast.error('Tidak ada data untuk diekspor.');
        setExporting(false);
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W   = doc.internal.pageSize.width;

      // Ambil field meta dengan fallback aman
      const namaSekolah = meta.nama_sekolah || meta.label_sekolah || activeSchoolName || 'Semua Sekolah';
      const tglCetak    = meta.tgl_cetak    || new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
      const jamCetak    = meta.jam_cetak    || new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
      const total       = meta.total        ?? data.length;

      // ── Header baris 1 — judul ──
      doc.setFillColor(13, 47, 69);
      doc.rect(0, 0, W, 14, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('LAPORAN AKTIVITAS SISTEM PERPUSTAKAAN DIGITAL', W / 2, 9, { align: 'center' });

      // ── Header baris 2 — nama sekolah ──
      doc.setFillColor(26, 82, 118);
      doc.rect(0, 14, W, 10, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      doc.text(namaSekolah, W / 2, 20, { align: 'center' });

      // ── Header baris 3 — tanggal cetak ──
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 24, W, 8, 'F');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Dicetak: ${tglCetak} ${jamCetak} WIB   |   Total: ${total} data`,
        W / 2, 29, { align: 'center' }
      );

      // ── Tabel data ──
      autoTable(doc, {
        head: [['No', 'Nama Siswa', 'NISN', 'Kelas', 'Aktivitas', 'Judul Buku', 'Waktu']],
        body: data.map((log, i) => [
          i + 1,
          log.user_nama  || '-',
          log.nisn       || '-',
          log.kelas      || '-',
          actionConfig[log.action]?.label || log.action || '-',
          log.book_judul || '-',
          fmtDT(log.created_at),
        ]),
        startY: 34,
        styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica' },
        headStyles: {
          fillColor: [26, 82, 118], textColor: 255,
          fontStyle: 'bold', halign: 'center'
        },
        alternateRowStyles: { fillColor: [240, 244, 248] },
        columnStyles: {
          0: { cellWidth: 12,  halign: 'center' },
          1: { cellWidth: 42 },
          2: { cellWidth: 26, halign: 'center' },
          3: { cellWidth: 14, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 66 },
          6: { cellWidth: 36 },
        },
        didDrawPage: (hookData) => {
          const pageH = doc.internal.pageSize.height;
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.setFont('helvetica', 'normal');
          doc.text(
            `Halaman ${hookData.pageNumber}`,
            W / 2, pageH - 5, { align: 'center' }
          );
        }
      });

      doc.save(`laporan-aktivitas-${Date.now()}.pdf`);
      toast.success('Export PDF berhasil!');
    } catch (err) {
      console.error('Export PDF error:', err);
      toast.error('Gagal export PDF. Coba lagi atau gunakan export Excel.');
    } finally { setExporting(false); }
  };

  /* ── Clear Log ── */
  const handleClear = async () => {
    try {
      await api.delete('/logs/clear', {
        data: { before_date: clearDate ? toIDFmt(clearDate) : undefined }
      });
      toast.success('Log berhasil dibersihkan');
      setShowClear(false); setClearDate(''); setPage(1); fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membersihkan log');
    }
  };

  return (
    <div className="page-fade">
      {/* Header */}
      <div className="page-header" style={{ display:'flex', alignItems:'flex-start',
        justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 className="page-title">Laporan Aktivitas</h1>
          <p className="page-subtitle">
            Monitoring login, baca, dan download
            {/* Tampilkan nama sekolah aktif: filter sidebar ATAU single-school */}
            {globalSchoolId && schools.length > 1 && (
              <span style={{ marginLeft:6, color:'var(--primary-light)', fontWeight:600 }}>
                — {activeSchoolName}
              </span>
            )}
          </p>
        </div>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
          <button className="btn btn-sm btn-outline" onClick={fetchLogs} title="Refresh">
            <MdRefresh />
          </button>
          <button className="btn btn-sm" disabled={exporting}
            style={{ background:'#1e8449', color:'#fff', border:'none',
              fontFamily:'var(--font)', fontWeight:600, fontSize:13,
              display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
              borderRadius:8, cursor:'pointer', transition:'var(--transition)',
              opacity: exporting ? .6 : 1 }}
            onMouseEnter={e => !exporting && (e.currentTarget.style.background='#166534')}
            onMouseLeave={e => (e.currentTarget.style.background='#1e8449')}
            onClick={handleExportExcel}>
            <MdDownload /> Excel
          </button>
          <button className="btn btn-sm" disabled={exporting}
            style={{ background:'#c0392b', color:'#fff', border:'none',
              fontFamily:'var(--font)', fontWeight:600, fontSize:13,
              display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
              borderRadius:8, cursor:'pointer', transition:'var(--transition)',
              opacity: exporting ? .6 : 1 }}
            onMouseEnter={e => !exporting && (e.currentTarget.style.background='#a93226')}
            onMouseLeave={e => (e.currentTarget.style.background='#c0392b')}
            onClick={handleExportPDF}>
            <MdDownload /> PDF
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => setShowClear(true)}>
            <MdDelete /> Bersihkan
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-body" style={{ padding:'14px 16px' }}>
          <div style={{ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap' }}>
            {/* Filter Aktivitas */}
            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
              <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600,
                textTransform:'uppercase', letterSpacing:'.5px' }}>Aktivitas</span>
              <select className="form-control" style={{ width:150 }}
                value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}>
                <option value="">Semua</option>
                <option value="login">🔑 Login</option>
                <option value="logout">🚪 Logout</option>
                <option value="view">📖 Baca Buku</option>
                <option value="download">⬇️ Download</option>
              </select>
            </div>

            {/* Filter Kelas */}
            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
              <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600,
                textTransform:'uppercase', letterSpacing:'.5px' }}>Kelas</span>
              <select className="form-control" style={{ width:130 }}
                value={filterKelas} onChange={e => { setFilterKelas(e.target.value); setPage(1); }}>
                <option value="">Semua Kelas</option>
                {KELAS_LIST.map(k => <option key={k} value={k}>Kelas {k}</option>)}
              </select>
            </div>

            {/* Date pickers */}
            <DateInput label="Dari Tanggal" value={startDate}
              onChange={v => { setStartDate(v); setPage(1); }} />
            <DateInput label="Sampai Tanggal" value={endDate}
              onChange={v => { setEndDate(v); setPage(1); }} />

            {hasFilter && (
              <button className="btn btn-outline btn-sm" style={{ alignSelf:'flex-end' }}
                onClick={resetFilter}>
                <MdClear /> Reset
              </button>
            )}
          </div>

          {/* Info sekolah aktif */}
          {globalSchoolId && schools.length > 1 && (
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10,
              padding:'6px 10px', background:'#dbeafe', borderRadius:8,
              fontSize:12, color:'#1e40af', fontWeight:600, width:'fit-content' }}>
              Filter sekolah: <strong>{activeSchoolName}</strong>
              <span style={{ opacity:.7, fontWeight:400 }}>— diatur dari sidebar</span>
            </div>
          )}

          {/* Filter tags */}
          {hasFilter && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
              {filterAction && (
                <span className="badge badge-primary">
                  {actionConfig[filterAction]?.icon} {actionConfig[filterAction]?.label}
                  <button onClick={() => setFilterAction('')}
                    style={{ background:'none', border:'none', cursor:'pointer',
                      padding:'0 0 0 4px', fontSize:13, lineHeight:1, color:'inherit' }}>×</button>
                </span>
              )}
              {filterKelas && (
                <span className="badge badge-primary">
                  Kelas {filterKelas}
                  <button onClick={() => setFilterKelas('')}
                    style={{ background:'none', border:'none', cursor:'pointer',
                      padding:'0 0 0 4px', fontSize:13, lineHeight:1, color:'inherit' }}>×</button>
                </span>
              )}
              {startDate && (
                <span className="badge badge-secondary">
                  Dari: {fmtIDDate(startDate)}
                  <button onClick={() => setStartDate('')}
                    style={{ background:'none', border:'none', cursor:'pointer',
                      padding:'0 0 0 4px', fontSize:13, lineHeight:1, color:'inherit' }}>×</button>
                </span>
              )}
              {endDate && (
                <span className="badge badge-secondary">
                  S/d: {fmtIDDate(endDate)}
                  <button onClick={() => setEndDate('')}
                    style={{ background:'none', border:'none', cursor:'pointer',
                      padding:'0 0 0 4px', fontSize:13, lineHeight:1, color:'inherit' }}>×</button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="loading-center"><div className="loading-spin" /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">Tidak ada log ditemukan</div>
              <div className="empty-state-desc">Coba ubah filter pencarian</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Nama Siswa</th><th>NISN</th>
                  <th>Kelas</th><th>Aktivitas</th><th>Judul Buku</th><th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const cfg = actionConfig[log.action] || { label:log.action, badge:'badge-secondary', icon:'•' };
                  return (
                    <tr key={log.id} style={{ animation:'fadeIn .2s ease' }}>
                      <td style={{ color:'var(--text-muted)', fontSize:12 }}>
                        {(pagination.page - 1) * 25 + i + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight:600, fontSize:13 }}>
                          {log.user_nama || <span style={{ color:'var(--text-muted)', fontStyle:'italic' }}>Dihapus</span>}
                        </div>
                      </td>
                      <td style={{ fontFamily:'monospace', fontSize:12, color:'var(--text-muted)' }}>
                        {log.user_nisn || '-'}
                      </td>
                      <td>
                        {log.user_kelas
                          ? <span className="badge badge-primary">Kelas {log.user_kelas}</span>
                          : <span style={{ color:'var(--text-muted)' }}>-</span>}
                      </td>
                      <td>
                        <span className={`badge ${cfg.badge}`}>{cfg.icon} {cfg.label}</span>
                      </td>
                      <td style={{ fontSize:12, maxWidth:220 }}>
                        {log.book_judul
                          ? <span style={{ fontWeight:500 }}>📖 {log.book_judul}</span>
                          : <span style={{ color:'var(--text-muted)' }}>-</span>}
                      </td>
                      <td style={{ fontSize:11, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                        {fmtDT(log.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div
            className="card-footer"
            style={{
              display:'flex',
              justifyContent:'space-between',
              alignItems:'center',
              flexWrap:'wrap',
              gap:8
            }}
          >
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>
              Total {pagination.total?.toLocaleString()} aktivitas
            </span>

            <div className="pagination" style={{ marginTop:0 }}>
              <button
                className="page-btn"
                disabled={page===1}
                onClick={() => setPage(p=>p-1)}
              >
                ‹
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i)=>i+1)
                .filter(
                  p =>
                    p===1 ||
                    p===pagination.totalPages ||
                    Math.abs(p-page)<=1
                )
                .reduce((acc,p,i,arr)=>{
                  if(i>0 && arr[i-1]!==p-1) acc.push('...');
                  acc.push(p);
                  return acc;
                },[])
                .map((p,i)=>
                  p==='...'
                    ? (
                      <span
                        key={`e${i}`}
                        style={{
                          padding:'0 2px',
                          color:'var(--text-muted)'
                        }}
                      >
                        …
                      </span>
                    )
                    : (
                      <button
                        key={p}
                        className={`page-btn${page===p?' active':''}`}
                        onClick={()=>setPage(p)}
                      >
                        {p}
                      </button>
                    )
                )}

              <button
                className="page-btn"
                disabled={page===pagination.totalPages}
                onClick={()=>setPage(p=>p+1)}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Bersihkan Log ── */}
      {showClear && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowClear(false)}>
          <div className="modal" style={{ maxWidth:420 }}>
            <div className="modal-header">
              <span className="modal-title">🗑️ Bersihkan Log</span>
              <button className="modal-close" onClick={() => setShowClear(false)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-danger">
                ⚠️ Log yang dihapus <strong>tidak dapat dikembalikan</strong>.
              </div>
              <div className="form-group">
                <label className="form-label">
                  Hapus log sebelum tanggal
                  <span style={{ fontWeight:400, textTransform:'none', fontSize:11, marginLeft:4 }}>
                    (kosongkan = hapus semua)
                  </span>
                </label>
                <input type="date" className="form-control" value={clearDate}
                  onChange={e => setClearDate(e.target.value)} style={{ cursor:'pointer' }}
                  onClick={e => e.target.showPicker?.()}
                />
                {clearDate && (
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:5 }}>
                    Hapus log sebelum: <strong>{fmtIDDate(clearDate)}</strong>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setShowClear(false)}>Batal</button>
              <button className="btn btn-danger btn-sm" onClick={handleClear}>
                <MdDelete /> {clearDate ? 'Hapus Log Lama' : 'Hapus Semua Log'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logs;