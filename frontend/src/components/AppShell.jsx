import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as API from '../utils/api';
import * as faceapi from 'face-api.js';
import FaceRegistration from './FaceRegistration';

// ── THEME ─────────────────────────────────────────────────────────────────────
function getStyles(dm) {
  return {
    bg: dm ? '#0a0c13' : '#f0f2f7', card: dm ? '#131620' : '#ffffff',
    card2: dm ? '#1a1e2e' : '#f8f9fc', border: dm ? '#252840' : '#e2e8f0',
    text: dm ? '#e2e8f0' : '#1a202c', textMuted: dm ? '#7a85a3' : '#718096',
    accent: '#6366f1', sidebar: dm ? '#0d1018' : '#1e2235',
    success: '#10b981', danger: '#ef4444', warning: '#f59e0b',
  };
}

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',sans-serif}
  input,select,textarea{outline:none;font-family:'DM Sans',sans-serif}
  button{cursor:pointer;font-family:'DM Sans',sans-serif}
  .syne{font-family:'Syne',sans-serif}
  .fade-in{animation:fadeIn 0.35s ease}
  @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  .pulse{animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
  .spin{animation:spin 1.2s linear infinite}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-thumb{background:#252840;border-radius:3px}
  ::-webkit-scrollbar-track{background:transparent}
  @media(max-width:768px){
    .desktop-sidebar{display:none !important}
    .desktop-sidebar.mobile-open{display:flex !important;position:fixed;top:0;left:0;z-index:9998;width:230px;height:100vh}
    .mobile-overlay{display:block !important;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9997}
    .stat-grid-4{grid-template-columns:repeat(2,1fr) !important}
    .form-grid-5{grid-template-columns:1fr !important}
  }
  @media(min-width:769px){
    .mobile-hamburger{display:none !important}
    .mobile-overlay{display:none !important}
  }
  @media print {
    .print-hide, .desktop-sidebar, .mobile-hamburger, .top-bar-container { display: none !important; }
    body { background: #fff !important; color: #000 !important; }
    .fade-in { animation: none !important; transform: none !important; }
    div { box-shadow: none !important; }
    table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #000 !important; }
    th, td { border: 1px solid #000 !important; color: #000 !important; background: #fff !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
`;

// ── SMALL REUSABLE COMPONENTS ─────────────────────────────────────────────────
function Badge({ color, children }) {
  return (
    <span style={{ padding: '2px 9px', borderRadius: 20, background: `${color}18`, color, fontSize: 10, fontWeight: 700, border: `1px solid ${color}30` }}>
      {children}
    </span>
  );
}

function Card({ s, title, children, action }) {
  return (
    <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
      {title && (
        <div style={{ padding: '13px 17px', borderBottom: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="syne" style={{ fontSize: 14, fontWeight: 700, color: s.text }}>{title}</div>
          {action}
        </div>
      )}
      <div style={{ padding: 17 }}>{children}</div>
    </div>
  );
}

function StatCard({ s, icon, label, value, color }) {
  return (
    <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 13, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -8, right: -8, width: 52, height: 52, borderRadius: '50%', background: `${color}12` }} />
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div className="syne" style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: s.textMuted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Btn({ color = '#6366f1', onClick, children, small, outline, className }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={onClick}
      className={className}
      style={{
        padding: small ? '6px 14px' : '9px 18px',
        borderRadius: 9, border: outline ? `1.5px solid ${color}` : 'none',
        background: outline ? (hov ? `${color}18` : 'transparent') : (hov ? color + 'dd' : color),
        color: outline ? color : '#fff', fontSize: small ? 12 : 13, fontWeight: 600,
        transition: 'all 0.18s',
      }}>
      {children}
    </button>
  );
}

function Input({ s, label, value, onChange, type = 'text', placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>{label}</label>}
      <input type={type} value={value} placeholder={placeholder} onChange={onChange}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }} />
    </div>
  );
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function Sidebar({ s, currentUser, activeTab, setActiveTab, onLogout, mobileOpen, setMobileOpen }) {
  const adminTabs = [
    { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
    { id: 'timetable', icon: '📅', label: 'Timetable' },
    { id: 'facescan',  icon: '📸', label: 'Face Scan Att.', hot: true },
    { id: 'courses',   icon: '📚', label: 'Courses' },
    { id: 'subjects',  icon: '📖', label: 'Subjects' },
    { id: 'faculty',   icon: '👩‍🏫', label: 'Faculty' },
    { id: 'classrooms',icon: '🏫', label: 'Classrooms' },
    { id: 'students',  icon: '👨‍🎓', label: 'Students' },
    { id: 'results',   icon: '📊', label: 'Results' },
    { id: 'fees',      icon: '💰', label: 'Fees' },
    { id: 'announcements', icon: '📣', label: 'Announcements' },
  ];
  const facultyTabs = [
    { id: 'dashboard',     icon: '⊞', label: 'Dashboard' },
    { id: 'timetable',     icon: '📅', label: 'My Schedule' },
    { id: 'students',      icon: '👨‍🎓', label: 'Students' },
    { id: 'results',       icon: '📝', label: 'Upload Marks' },
    { id: 'attendance',    icon: '✅', label: 'Attendance' },
    { id: 'announcements', icon: '📣', label: 'Announcements' },
  ];
  const studentTabs = [
    { id: 'dashboard',     icon: '⊞', label: 'Dashboard' },
    { id: 'timetable',     icon: '📅', label: 'My Timetable' },
    { id: 'facescan',      icon: '📸', label: 'Submit Attendance', hot: true },
    { id: 'results',       icon: '📊', label: 'My Results' },
    { id: 'fees',          icon: '💰', label: 'My Fees' },
    { id: 'attendance',    icon: '✅', label: 'My Attendance' },
    { id: 'notifications', icon: '🔔', label: 'Notifications' },
  ];
  const tabs = currentUser.role === 'admin' ? adminTabs : currentUser.role === 'faculty' ? facultyTabs : studentTabs;

  return (
    <div className={`desktop-sidebar print-hide ${mobileOpen ? 'mobile-open' : ''}`} style={{ width: 230, background: s.sidebar, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
      <div style={{ padding: '22px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="syne" style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>
          <span style={{ color: '#6366f1' }}>⬡</span> EduSync
        </div>
        <div style={{ fontSize: 10, color: '#4a5578', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{currentUser.role} Portal</div>
      </div>
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); if(setMobileOpen) setMobileOpen(false); }} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 11px', borderRadius: 9, border: 'none',
              background: isActive ? 'linear-gradient(135deg,rgba(99,102,241,0.22),rgba(0,212,255,0.08))' : 'transparent',
              color: isActive ? '#a5b4fc' : '#6b7899',
              fontSize: 12.5, fontWeight: isActive ? 600 : 400,
              marginBottom: 1, transition: 'all 0.18s', textAlign: 'left',
              borderLeft: isActive ? '2.5px solid #6366f1' : '2.5px solid transparent',
            }}>
              <span style={{ fontSize: 15 }}>{tab.icon}</span>
              <span style={{ flex: 1 }}>{tab.label}</span>
              {tab.hot && <span style={{ fontSize: 9, background: 'linear-gradient(90deg,#00d4ff,#6366f1)', color: '#fff', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>NEW</span>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
            {currentUser.avatar || currentUser.name?.slice(0,2).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#c8d0e7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.name?.split(' ')[0]}</div>
            <div style={{ fontSize: 10, color: '#4a5578', textTransform: 'capitalize' }}>{currentUser.role}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width: '100%', padding: '7px 11px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, fontWeight: 600 }}>
          ← Sign Out
        </button>
      </div>
    </div>
  );
}

// ── TOPBAR ─────────────────────────────────────────────────────────────────────
function TopBar({ s, currentUser, darkMode, setDarkMode }) {
  const now = new Date();
  const gr = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <div style={{ height: 62, background: s.card, borderBottom: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', padding: '0 22px', gap: 14, flexShrink: 0 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: s.textMuted }}>{gr}, <strong style={{ color: s.text }}>{currentUser.name?.split(' ')[0]}</strong></div>
      </div>
      <div style={{ fontSize: 11.5, color: s.textMuted, background: s.card2, padding: '5px 10px', borderRadius: 7, border: `1px solid ${s.border}` }}>
        {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
      </div>
      <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '7px 12px', borderRadius: 7, border: `1px solid ${s.border}`, background: s.card2, color: s.textMuted, fontSize: 13 }}>
        {darkMode ? '☀️' : '🌙'}
      </button>
    </div>
  );
}

// ── DASHBOARD VIEWS ───────────────────────────────────────────────────────────
function AdminDashboard({ s, dbData, notify, setActiveTab }) {
  const { users = [], courses = [], subjects = [], classrooms = [], timetable = [], attendance = [], fees = [], announcements = [] } = dbData;
  const students = users.filter(u => u.role === 'student');
  const faculty = users.filter(u => u.role === 'faculty');
  const paidFees = fees.filter(f => f.status === 'paid').length;

  return (
    <div className="fade-in">
      <div className="syne" style={{ fontSize: 22, fontWeight: 800, color: s.text, marginBottom: 20 }}>Admin Dashboard</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard s={s} icon="👨‍🎓" label="Students"   value={students.length}  color="#6366f1" />
        <StatCard s={s} icon="👩‍🏫" label="Faculty"    value={faculty.length}   color="#f59e0b" />
        <StatCard s={s} icon="📖" label="Subjects"   value={subjects.length}  color="#10b981" />
        <StatCard s={s} icon="📅" label="TT Slots"   value={timetable.length} color="#00d4ff" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard s={s} icon="📚" label="Courses"    value={courses.length}    color="#8b5cf6" />
        <StatCard s={s} icon="🏫" label="Classrooms" value={classrooms.length} color="#ec4899" />
        <StatCard s={s} icon="💰" label="Fees Paid"  value={paidFees}          color="#10b981" />
      </div>
      <Card s={s} title="Quick Actions">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: '📅 Generate Timetable', tab: 'timetable' },
            { label: '📸 Face Scan', tab: 'facescan' },
            { label: '📣 Announcement', tab: 'announcements' },
            { label: '👨‍🎓 Students', tab: 'students' },
            { label: '📊 Results', tab: 'results' },
            { label: '💰 Fees', tab: 'fees' },
          ].map(a => <Btn key={a.tab} onClick={() => setActiveTab(a.tab)} outline color="#6366f1">{a.label}</Btn>)}
        </div>
      </Card>
    </div>
  );
}

function FacultyDashboard({ s, dbData, currentUser, notify, setActiveTab }) {
  const mySubjects = (dbData.subjects || []).filter(sub => sub.facultyId?._id === currentUser._id || sub.facultyId === currentUser._id);
  const myTT = (dbData.timetable || []).filter(t => t.facultyId?._id === currentUser._id || t.facultyId === currentUser._id);
  return (
    <div className="fade-in">
      <div className="syne" style={{ fontSize: 22, fontWeight: 800, color: s.text, marginBottom: 20 }}>Faculty Dashboard</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard s={s} icon="📖" label="My Subjects"    value={mySubjects.length} color="#f59e0b" />
        <StatCard s={s} icon="📅" label="Classes/Week"   value={myTT.length}       color="#6366f1" />
        <StatCard s={s} icon="📣" label="Announcements"  value={(dbData.announcements||[]).length} color="#10b981" />
      </div>
      <Card s={s} title="My Subjects">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mySubjects.length === 0 && <p style={{ color: s.textMuted, fontSize: 13 }}>No subjects assigned yet.</p>}
          {mySubjects.map(sub => (
            <div key={sub._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: s.card2, borderRadius: 10, border: `1px solid ${s.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: s.text }}>{sub.name}</div>
                <div style={{ fontSize: 11, color: s.textMuted }}>{sub.code} · Sem {sub.semester}</div>
              </div>
              <Badge color="#f59e0b">{sub.credits} credits</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StudentDashboard({ s, dbData, currentUser, notify, setActiveTab }) {
  const myAtt = (dbData.attendance || []).filter(a => a.studentId?._id === currentUser._id || a.studentId === currentUser._id);
  const myResults = (dbData.results || []).filter(r => r.studentId?._id === currentUser._id || r.studentId === currentUser._id);
  const myFees = (dbData.fees || []).filter(f => f.studentId?._id === currentUser._id || f.studentId === currentUser._id);
  const avgAtt = myAtt.length ? Math.round(myAtt.reduce((a, x) => a + (x.total > 0 ? (x.present / x.total) * 100 : 0), 0) / myAtt.length) : 0;
  const unpaid = myFees.filter(f => f.status !== 'paid').length;

  return (
    <div className="fade-in">
      <div className="syne" style={{ fontSize: 22, fontWeight: 800, color: s.text, marginBottom: 20 }}>Student Dashboard</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard s={s} icon="✅" label="Avg Attendance" value={`${avgAtt}%`}       color={avgAtt >= 75 ? '#10b981' : '#ef4444'} />
        <StatCard s={s} icon="📊" label="Subjects"       value={myResults.length}   color="#6366f1" />
        <StatCard s={s} icon="💰" label="Fee Pending"    value={unpaid}             color={unpaid > 0 ? '#ef4444' : '#10b981'} />
        <StatCard s={s} icon="📖" label="Semester"       value={`Sem ${currentUser.semester || '—'}`} color="#f59e0b" />
      </div>
      <Card s={s} title="Quick Actions">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[{ label: '📸 Mark Attendance', tab: 'facescan' }, { label: '📅 Timetable', tab: 'timetable' }, { label: '📊 Results', tab: 'results' }, { label: '💰 Fees', tab: 'fees' }].map(a => (
            <Btn key={a.tab} onClick={() => setActiveTab(a.tab)} outline color="#6366f1">{a.label}</Btn>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── TIMETABLE VIEW ─────────────────────────────────────────────────────────────
const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316'];

function TimetableView({ s, dbData, loadData, notify, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    days: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    startTime: '09:00', endTime: '15:00',
    teaStart: '11:00', teaEnd: '11:15',
    lunchStart: '13:15', lunchEnd: '14:00',
    departmentId: 'All', semester: 'All'
  });
  const [filters, setFilters] = useState({
    departmentId: 'All',
    courseId: 'All',
    semester: 'All',
    sectionId: 'All',
    facultyId: currentUser.role === 'faculty' ? currentUser._id : 'All'
  });

  const timetable = dbData.timetable || [];
  const subjects = dbData.subjects || [];
  const sections = dbData.sections || [];
  const departments = dbData.departments || [];
  const courses = dbData.courses || [];

  const colorMap = {};
  subjects.forEach((sub, i) => { colorMap[sub._id] = COLORS[i % COLORS.length]; });

  const orderMap = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
  
  // Filtering Logic
  const filteredTimetable = timetable.filter(t => {
    const dMatch = filters.departmentId === 'All' || t.departmentId?._id === filters.departmentId || t.departmentId === filters.departmentId;
    const cMatch = filters.courseId === 'All' || t.courseId?._id === filters.courseId || t.courseId === filters.courseId;
    const sMatch = filters.semester === 'All' || t.semester === Number(filters.semester);
    const secMatch = filters.sectionId === 'All' || t.sectionId?._id === filters.sectionId || t.sectionId === filters.sectionId;
    const fMatch = filters.facultyId === 'All' || t.facultyId?._id === filters.facultyId || t.facultyId === filters.facultyId;

    if (currentUser.role === 'student') {
       const tSecId = String(t.sectionId?._id || t.sectionId || '');
       const uSecId = String(currentUser.sectionId?._id || currentUser.sectionId || '');
       return tSecId === uSecId;
    }
    return dMatch && cMatch && sMatch && secMatch && fMatch;
  });

  const dDays = filteredTimetable.length > 0 
    ? Array.from(new Set(filteredTimetable.map(t => t.day))).sort((a,b) => orderMap[a] - orderMap[b]) 
    : [];
  const dTimes = filteredTimetable.length > 0 
    ? Array.from(new Set(filteredTimetable.map(t => t.time))).sort() 
    : [];

  const handleDayToggle = (d) => {
    setConfig(p => ({
      ...p, days: p.days.includes(d) ? p.days.filter(x => x !== d) : [...p.days, d].sort((a,b) => orderMap[a]-orderMap[b])
    }));
  };

  const generate = async () => {
    setLoading(true);
    try {
      const payload = {
         days: config.days,
         startTime: config.startTime,
         endTime: config.endTime,
         teaBreak: { start: config.teaStart, end: config.teaEnd },
         lunchBreak: { start: config.lunchStart, end: config.lunchEnd },
         departmentId: config.departmentId,
         semester: config.semester
      };
      const res = await API.generateTimetable(payload);
      notify(`✅ Generated ${res.data.count} slots! ${res.data.unplaced?.length ? `(${res.data.unplaced.length} conflicts)` : ''}`);
      if (res.data.unplaced?.length > 0) {
        console.warn('Unplaced Subjects:', res.data.unplaced);
      }
      setShowConfig(false);
      await loadData();
    } catch (err) { notify(err.response?.data?.message || 'Failed', 'error'); }
    setLoading(false);
  };

  const clear = async () => {
    if (!window.confirm('Are you sure you want to clear the timetable?')) return;
    await API.clearTimetable();
    notify('Timetable cleared');
    await loadData();
  };

  const getSlot = (day, time) => {
    return filteredTimetable.filter(t => t.day === day && t.time === time);
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="syne" style={{ fontSize: 21, fontWeight: 800, color: s.text }}>📅 Timetable</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {currentUser.role === 'admin' && (
            <>
              <Btn className="print-hide" onClick={() => setShowConfig(!showConfig)} color="#6366f1">{showConfig ? 'Cancel' : '⚙ Builder Settings'}</Btn>
              {timetable.length > 0 && <Btn className="print-hide" onClick={clear} color="#ef4444" outline>🗑 Clear All</Btn>}
            </>
          )}
          {timetable.length > 0 && (
            <Btn className="print-hide" onClick={() => window.print()} color="#6366f1" outline>🖨 Print Timetable</Btn>
          )}
        </div>
      </div>

      <div className="print-hide" style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 14, padding: '14px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: s.textMuted }}>BROWSE:</span>
          <select value={filters.departmentId} onChange={e => setFilters(p => ({ ...p, departmentId: e.target.value, courseId: 'All', sectionId: 'All' }))} 
            style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13, minWidth: 140 }}>
            <option value="All">All Departments</option>
            {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select value={filters.courseId} onChange={e => setFilters(p => ({ ...p, courseId: e.target.value, sectionId: 'All' }))} 
            style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13, minWidth: 140 }}>
            <option value="All">All Courses</option>
            {courses.filter(c => filters.departmentId === 'All' || c.departmentId?._id === filters.departmentId || c.departmentId === filters.departmentId).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select value={filters.semester} onChange={e => setFilters(p => ({ ...p, semester: e.target.value, sectionId: 'All' }))} 
            style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13, minWidth: 120 }}>
            <option value="All">All Semesters</option>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
          </select>
          <select value={filters.sectionId} onChange={e => setFilters(p => ({ ...p, sectionId: e.target.value }))} 
            style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13, minWidth: 120 }}>
            <option value="All">All Sections</option>
            {sections.filter(sec => (filters.courseId === 'All' || sec.courseId?._id === filters.courseId || sec.courseId === filters.courseId) && (filters.semester === 'All' || sec.semester === Number(filters.semester))).map(sec => <option key={sec._id} value={sec._id}>{sec.name}</option>)}
          </select>
          {currentUser.role === 'admin' && (
            <select value={filters.facultyId} onChange={e => setFilters(p => ({ ...p, facultyId: e.target.value }))} 
              style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13, minWidth: 140 }}>
              <option value="All">All Faculty</option>
              {(dbData.users || []).filter(u => u.role === 'faculty').map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
            </select>
          )}
        </div>
        <Btn small outline onClick={() => setFilters({ departmentId: 'All', courseId: 'All', semester: 'All', sectionId: 'All', facultyId: currentUser.role === 'faculty' ? currentUser._id : 'All' })} color={s.textMuted}>RESET</Btn>
      </div>

      {showConfig && currentUser.role === 'admin' && (
        <Card s={s} title="AI Timetable Builder Configurations">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <Input s={s} label="Start Time" value={config.startTime} onChange={e => setConfig(p => ({ ...p, startTime: e.target.value }))} type="time" />
            <Input s={s} label="End Time" value={config.endTime} onChange={e => setConfig(p => ({ ...p, endTime: e.target.value }))} type="time" />
            <div>
               <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Department Filter</label>
               <select value={config.departmentId} onChange={e => setConfig(p => ({ ...p, departmentId: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                  <option value="All">All Departments</option>
                  {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
               </select>
            </div>
            <div>
               <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Semester Filter</label>
               <select value={config.semester} onChange={e => setConfig(p => ({ ...p, semester: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                  <option value="All">All Semesters</option>
                  {[1,2,3,4,5,6,7,8].map(sem => <option key={sem} value={sem}>Semester {sem}</option>)}
               </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <Input s={s} label="Tea Break Start" value={config.teaStart} onChange={e => setConfig(p => ({ ...p, teaStart: e.target.value }))} type="time" />
            <Input s={s} label="Tea Break End" value={config.teaEnd} onChange={e => setConfig(p => ({ ...p, teaEnd: e.target.value }))} type="time" />
            <Input s={s} label="Lunch Break Start" value={config.lunchStart} onChange={e => setConfig(p => ({ ...p, lunchStart: e.target.value }))} type="time" />
            <Input s={s} label="Lunch Break End" value={config.lunchEnd} onChange={e => setConfig(p => ({ ...p, lunchEnd: e.target.value }))} type="time" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Included Days</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {Object.keys(orderMap).map(d => (
                <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: s.text, cursor: 'pointer' }}>
                  <input type="checkbox" checked={config.days.includes(d)} onChange={() => handleDayToggle(d)} /> {d}
                </label>
              ))}
            </div>
          </div>
          <Btn onClick={generate} color="#10b981">{loading ? '⚙ Generating...' : '⚡ Generate Timetable'}</Btn>
        </Card>
      )}

      {filteredTimetable.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: s.card, borderRadius: 14, border: `1px solid ${s.border}` }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <div className="syne" style={{ fontSize: 16, fontWeight: 700, color: s.text, marginBottom: 8 }}>No Timetable Yet</div>
          <p style={{ color: s.textMuted, fontSize: 13, marginBottom: 20 }}>{currentUser.role === 'admin' ? 'Configure settings above to generate schedules.' : 'No schedule found for your section/department.'}</p>
          {currentUser.role === 'admin' && !showConfig && <Btn onClick={() => setShowConfig(true)} color="#6366f1">⚡ Configure & Generate</Btn>}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 14, border: `1px solid ${s.border}`, background: s.card }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', background: s.card2, color: s.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, borderBottom: `2px solid ${s.border}`, borderRight: `1px solid ${s.border}`, width: 100, position: 'sticky', left: 0, zIndex: 10 }}>TIME</th>
                {dDays.map(d => (
                  <th key={d} style={{ padding: '12px 16px', background: s.card2, color: s.text, fontSize: 13, fontWeight: 800, borderBottom: `2px solid ${s.border}`, borderRight: `1px solid ${s.border}`, textAlign: 'center' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dTimes.map(time => (
                <tr key={time}>
                  <td style={{ padding: '16px', background: s.card2, color: s.text, fontSize: 11, fontWeight: 800, borderBottom: `1px solid ${s.border}`, borderRight: `1px solid ${s.border}`, whiteSpace: 'nowrap', textAlign: 'center', position: 'sticky', left: 0, zIndex: 5 }}>{time}</td>
                  {dDays.map(day => {
                    const slots = getSlot(day, time);
                    return (
                      <td key={day} style={{ padding: 8, borderBottom: `1px solid ${s.border}`, borderRight: `1px solid ${s.border}`, background: s.card, verticalAlign: 'top', minWidth: 160 }}>
                        {slots.length === 0 ? (
                          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.25, padding: '15px 0' }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: s.textMuted, letterSpacing: '0.15em' }}>LIBRARY</div>
                          </div>
                        ) : slots.map(slot => {
                          const sub = slot.subjectId;
                          const room = slot.roomId;
                          const fac = slot.facultyId;
                          const sec = slot.sectionId;
                          const color = colorMap[sub?._id || sub] || '#6366f1';
                          return (
                            <div key={slot._id} style={{ 
                              background: `linear-gradient(135deg, ${color}10, ${color}05)`, 
                              borderLeft: `4px solid ${color}`,
                              borderRadius: '4px 8px 8px 4px',
                              padding: '10px 12px', 
                              marginBottom: 8,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                              transition: 'transform 0.2s',
                              cursor: 'pointer'
                            }} className="slot-card">
                              <div style={{ fontSize: 12, fontWeight: 800, color: s.text, marginBottom: 4, lineHeight: 1.2 }}>{sub?.name || sub}</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <div style={{ fontSize: 10, fontWeight: 600, color: s.textMuted }}>👨‍🏫 {fac?.name || 'Faculty'}</div>
                                <div style={{ fontSize: 10, fontWeight: 600, color: s.textMuted }}>🏫 {room?.name || 'Room'}</div>
                              </div>
                              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Badge color={color}>{sec?.name || 'Section'}</Badge>
                                <div style={{ fontSize: 9, fontWeight: 800, opacity: 0.6 }}>{sub?.type === 'lab' ? '🔬 LAB' : '📖 LEC'}</div>
                              </div>
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── FACE SCAN ATTENDANCE ───────────────────────────────────────────────────────
function FaceScanView({ s, dbData, loadData, notify, currentUser }) {
  const [phase, setPhase] = useState('idle');
  const [selSub, setSelSub] = useState('');
  const [selStudent, setSelStudent] = useState(currentUser.role === 'student' ? currentUser._id : '');
  const [selDate, setSelDate] = useState(new Date().toISOString().split('T')[0]);
  const [confidence, setConfidence] = useState(0);
  const [camStream, setCamStream] = useState(null);
  const videoRef = useRef(null);

  const isStudent = currentUser.role === 'student';
  const logs = dbData.faceScanLogs || [];
  const students = (dbData.users || []).filter(u => u.role === 'student');

  const availableSubs = isStudent
    ? (dbData.subjects || []).filter(s => s.semester === currentUser.semester)
    : currentUser.role === 'faculty'
    ? (dbData.subjects || []).filter(s => s.facultyId?._id === currentUser._id || s.facultyId === currentUser._id)
    : dbData.subjects || [];

  useEffect(() => () => { if (camStream && camStream !== 'sim') camStream.getTracks().forEach(t => t.stop()); }, [camStream]);

  const loadModels = async () => {
    setPhase('loading');
    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      await startCam();
    } catch {
      notify('Failed to load neural net. Check internet connection.', 'error');
      setPhase('idle');
    }
  };

  const startCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCamStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setPhase('ready');
    } catch { 
      notify('Webcam denied', 'error');
      setPhase('idle'); 
    }
  };

  const stopCam = () => {
    if (camStream && camStream !== 'sim') camStream.getTracks().forEach(t => t.stop());
    setCamStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const scan = async () => {
    setPhase('scanning');
    try {
      if (!videoRef.current) throw new Error('Video not active');
      
      const detection = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        setPhase('ready');
        return notify('No face detected! Look directly at camera.', 'error');
      }

      const descriptorArray = Array.from(detection.descriptor);
      const studentId = isStudent ? currentUser._id : selStudent;

      const payload = {
        studentId,
        subjectId: selSub,
        date: selDate,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        descriptor: descriptorArray, // Authentic descriptor for server-side Euclidean verification!
        method: 'face'
      };

      const res = await API.addFaceScanLog(payload);
      const conf = Math.round(res.data.confidence * 100);
      setConfidence(conf);
      setPhase('matched');
      stopCam();
      notify(`✅ Identity Verified! Secure Match: ${conf}%`);
      await loadData();
    } catch (err) {
      setPhase('ready');
      notify(err.response?.data?.message || err.message, 'error');
    }
  };

  const ringColor = phase === 'matched' ? '#10b981' : phase === 'scanning' || phase === 'ready' ? '#f59e0b' : '#6366f1';

  return (
    <div className="fade-in">
      <div className="syne" style={{ fontSize: 21, fontWeight: 800, color: s.text, marginBottom: 20 }}>📸 Face Scan Attendance</div>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card s={s} title="Setup">
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Subject *</label>
              <select value={selSub} onChange={e => setSelSub(e.target.value)} disabled={phase !== 'idle'}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                <option value="">— Select Subject —</option>
                {availableSubs.map(sub => <option key={sub._id} value={sub._id}>{sub.name} ({sub.code})</option>)}
              </select>
            </div>
            {!isStudent && (
              <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Student *</label>
                <select value={selStudent} onChange={e => setSelStudent(e.target.value)} disabled={phase !== 'idle'}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                  <option value="">— Select Student —</option>
                  {students.map(st => <option key={st._id} value={st._id}>{st.name} ({st.rollNo}) {st.faceRegistered ? '✅' : '❌'}</option>)}
                </select>
              </div>
              <div style={{ borderTop: `1px solid ${s.border}`, paddingTop: 12, marginTop: 4 }}>
                <Btn onClick={async () => {
                   if (!selSub) return notify('Please select a Subject first.', 'error');
                   try {
                     const res = await API.logAttendanceSession({ subjectId: selSub });
                     notify(`✅ Session Logged! Expected ${res.data.count} students.`);
                     loadData();
                   } catch(e) { notify('Error logging session', 'error'); }
                }} color="#f59e0b" outline style={{ width: '100%' }}>⏰ Create Class Session</Btn>
                <p style={{ fontSize: 10.5, color: s.textMuted, marginTop: 6, lineHeight: 1.4 }}>Create a class session to increment the total required classes <b>before</b> students begin scanning their face.</p>
              </div>
              </>
            )}
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Date</label>
              <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)} disabled={phase !== 'idle'}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }} />
            </div>
          </Card>

          {/* Camera box */}
          <div style={{ background: s.card, border: `2px solid ${ringColor}40`, borderRadius: 16, padding: 16, textAlign: 'center' }}>
            <div style={{ aspectRatio: '4/3', background: '#000', borderRadius: 12, overflow: 'hidden', position: 'relative', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: (camStream && camStream !== 'sim') ? 'block' : 'none' }} />
              {(!camStream || camStream === 'sim') && (
                <div style={{ color: s.textMuted, fontSize: 13 }}>
                  {phase === 'idle' && <div style={{ textAlign: 'center' }}><div style={{ fontSize: 40, opacity: 0.3 }}>📷</div><div style={{ fontSize: 11, marginTop: 8 }}>Camera is off</div></div>}
                  {phase === 'loading' && <div className="spin" style={{ fontSize: 28, color: '#6366f1' }}>⚙</div>}
                  {(phase === 'ready' || phase === 'scanning') && <div style={{ textAlign: 'center' }}><div style={{ fontSize: 48, lineHeight: 1 }}>🙂</div><div style={{ fontSize: 11, marginTop: 8, color: ringColor }}>{phase === 'scanning' ? 'Scanning...' : 'Ready'}</div></div>}
                  {phase === 'matched' && <div style={{ textAlign: 'center' }}><div style={{ fontSize: 48 }}>✅</div><div style={{ fontSize: 14, color: '#10b981', fontWeight: 700, marginTop: 6 }}>{confidence}% match</div></div>}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {phase === 'idle' && <Btn onClick={loadModels} color="#6366f1">📷 Open Camera</Btn>}
              {phase === 'ready' && <><Btn onClick={scan} color="#10b981">🔍 Scan Authentic Face</Btn><Btn onClick={() => { stopCam(); setPhase('idle'); }} color="#ef4444" outline>Cancel</Btn></>}
              {phase === 'matched' && <Btn onClick={() => { setPhase('idle'); setConfidence(0); setSelStudent(isStudent ? currentUser._id : ''); }} color="#6366f1">🔄 Scan Again</Btn>}
            </div>
          </div>
        </div>

        {/* Logs table */}
        <Card s={s} title={`📸 Face Scan Logs (${logs.length})`}>
          <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead style={{ position: 'sticky', top: 0 }}>
                <tr style={{ background: s.card2 }}>
                  {['Student','Subject','Date','Time','Match %','Status'].map(h => (
                    <th key={h} style={{ padding: '9px 13px', textAlign: 'left', color: s.textMuted, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...logs].reverse().map(log => {
                  const st = log.studentId;
                  const sub = log.subjectId;
                  return (
                    <tr key={log._id} style={{ borderBottom: `1px solid ${s.border}` }}>
                      <td style={{ padding: '10px 13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                            {st?.avatar || (typeof st === 'string' ? '?' : '?')}
                          </div>
                          <span style={{ color: s.text, fontWeight: 600 }}>{st?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 13px', color: s.textMuted }}>{sub?.code || '—'}</td>
                      <td style={{ padding: '10px 13px', color: s.textMuted }}>{log.date}</td>
                      <td style={{ padding: '10px 13px', color: s.text, fontWeight: 600 }}>{log.time}</td>
                      <td style={{ padding: '10px 13px' }}>
                        <span style={{ color: '#6366f1', fontWeight: 700 }}>{log.confidence}%</span>
                      </td>
                      <td style={{ padding: '10px 13px' }}>
                        <Badge color="#10b981">✓ verified</Badge>
                        {currentUser?.role === 'admin' && (
                          <button onClick={async () => {
                            if(!window.confirm('Delete log?')) return;
                            try { await API.deleteFaceScanLog(log._id); notify('Deleted'); loadData(); } catch(e) { notify('Error', 'error'); }
                          }} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 13, marginLeft: 8, cursor: 'pointer' }}>🗑</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && <tr><td colSpan={6} style={{ padding: 36, textAlign: 'center', color: s.textMuted }}>No face scans recorded yet</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── ATTENDANCE VIEW ────────────────────────────────────────────────────────────
function AttendanceView({ s, dbData, currentUser, notify, loadData }) {
  const [selSub, setSelSub] = useState('');
  const [loading, setLoading] = useState(false);
  
  const allAtt = dbData.attendance || [];
  const att = currentUser.role === 'student'
    ? allAtt.filter(a => a.studentId?._id === currentUser._id || a.studentId === currentUser._id)
    : allAtt;

  const availableSubs = currentUser.role === 'faculty'
    ? (dbData.subjects || []).filter(sub => sub.facultyId?._id === currentUser._id || sub.facultyId === currentUser._id)
    : (dbData.subjects || []);

  const handleCreateSession = async () => {
    if (!selSub) return notify('Select a subject first', 'error');
    setLoading(true);
    try {
      const res = await API.logAttendanceSession({ subjectId: selSub });
      notify(`✅ Session Logged! Incremented denominator for ${res.data.count} students.`);
      await loadData();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to log session', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="syne" style={{ fontSize: 21, fontWeight: 800, color: s.text }}>✅ Attendance</div>
        {currentUser.role === 'faculty' && <Badge color="#6366f1">Faculty Mode</Badge>}
      </div>

      {currentUser.role === 'faculty' && (
        <Card s={s} title="⏰ Log New Class Session">
           <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
             <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Select Subject</label>
                <select value={selSub} onChange={e => setSelSub(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                  <option value="">— Choose Subject —</option>
                  {availableSubs.map(sub => <option key={sub._id} value={sub._id}>{sub.name} ({sub.code})</option>)}
                </select>
             </div>
             <Btn onClick={handleCreateSession} color="#f59e0b">{loading ? 'Logging...' : '⚡ Create Session'}</Btn>
           </div>
           <p style={{ fontSize: 11, color: s.textMuted, marginTop: 10 }}>
             This will increment the <b>total classes</b> count for all students enrolled in this subject's semester. 
             Students can then mark themselves present via Face Scan.
           </p>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {att.map(a => {
          const sub = a.subjectId;
          const st = a.studentId;
          const pct = a.total > 0 ? Math.round((a.present / a.total) * 100) : 0;
          const color = pct >= 75 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
          return (
            <div key={a._id} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 13, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: s.text }}>{sub?.name || 'Unknown Subject'} {st?.name && <span style={{ color: s.textMuted, fontWeight: 400 }}>— {st.name}</span>}</div>
                  <div style={{ fontSize: 11, color: s.textMuted }}>{a.present} / {a.total} classes attended</div>
                </div>
                <div className="syne" style={{ fontSize: 22, fontWeight: 800, color }}>{pct}%</div>
              </div>
              <div style={{ height: 7, background: s.border, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: s.textMuted }}>
                <span>Min required: 75%</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Badge color={color}>{pct >= 75 ? '✓ Eligible' : '⚠ Below Limit'}</Badge>
                  {currentUser?.role === 'admin' && (
                    <button onClick={async () => {
                      if(!window.confirm('Delete attendance?')) return;
                      try { await API.deleteAttendance(a._id); notify('Deleted'); loadData(); } catch(e) { notify('Error', 'error'); }
                    }} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer' }}>🗑</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {att.length === 0 && <div style={{ textAlign: 'center', padding: 60, background: s.card, borderRadius: 14, border: `1px solid ${s.border}`, color: s.textMuted }}>No attendance records</div>}
      </div>
    </div>
  );
}

// ── RESULTS VIEW ──────────────────────────────────────────────────────────────
function ResultsView({ s, dbData, currentUser, notify, loadData }) {
  const [form, setForm] = useState({ studentId: '', subjectId: '', internal: '', external: '', semester: '' });
  const allResults = dbData.results || [];
  const results = currentUser.role === 'student'
    ? allResults.filter(r => r.studentId?._id === currentUser._id || r.studentId === currentUser._id)
    : allResults;
  const gc = g => ({ 'A+': '#10b981', A: '#10b981', 'B+': '#6366f1', B: '#8b5cf6', C: '#f59e0b', F: '#ef4444' }[g] || '#7a85a3');

  const save = async () => {
    const i = +form.internal, e = +form.external;
    if (i < 0 || i > 50) return notify('Internal marks must be 0-50', 'error');
    if (e < 0 || e > 100) return notify('External marks must be 0-100', 'error');
    if (!form.studentId || !form.subjectId) return notify('Select student and subject', 'error');
    try {
      await API.saveResult({ ...form, internal: i, external: e, semester: +form.semester });
      notify('✅ Result saved!');
      setForm({ studentId: '', subjectId: '', internal: '', external: '', semester: '' });
      loadData();
    } catch (err) { notify(err.response?.data?.message || 'Error', 'error'); }
  };

  return (
    <div className="fade-in">
      <div className="syne" style={{ fontSize: 21, fontWeight: 800, color: s.text, marginBottom: 20 }}>📊 Results</div>
      {(currentUser.role === 'admin' || currentUser.role === 'faculty') && (
        <Card s={s} title="Add / Update Result">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Student</label>
              <select value={form.studentId} onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                <option value="">—</option>
                {(dbData.users || []).filter(u => u.role === 'student').map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Subject</label>
              <select value={form.subjectId} onChange={e => setForm(p => ({ ...p, subjectId: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                <option value="">—</option>
                {(dbData.subjects || []).map(sub => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
              </select>
            </div>
            <Input s={s} label="Internal /50" value={form.internal} onChange={e => setForm(p => ({ ...p, internal: e.target.value }))} type="number" placeholder="0-50" />
            <Input s={s} label="External /100" value={form.external} onChange={e => setForm(p => ({ ...p, external: e.target.value }))} type="number" placeholder="0-100" />
            <Input s={s} label="Semester" value={form.semester} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))} type="number" placeholder="1-8" />
          </div>
          <Btn onClick={save} color="#6366f1">💾 Save Result</Btn>
        </Card>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: s.card2 }}>
              {['Student','Subject','Internal','External','Total','Grade'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: s.textMuted, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', border: `1px solid ${s.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr key={r._id} style={{ borderBottom: `1px solid ${s.border}`, background: s.card }}>
                <td style={{ padding: '10px 14px', color: s.text, fontWeight: 600, border: `1px solid ${s.border}` }}>{r.studentId?.name || '—'}</td>
                <td style={{ padding: '10px 14px', color: s.textMuted, border: `1px solid ${s.border}` }}>{r.subjectId?.name || '—'}</td>
                <td style={{ padding: '10px 14px', color: s.text, border: `1px solid ${s.border}` }}>{r.internal}/50</td>
                <td style={{ padding: '10px 14px', color: s.text, border: `1px solid ${s.border}` }}>{r.external}/100</td>
                <td style={{ padding: '10px 14px', color: s.text, fontWeight: 700, border: `1px solid ${s.border}` }}>{r.total}/150</td>
                <td style={{ padding: '10px 14px', border: `1px solid ${s.border}` }}>
                  <Badge color={gc(r.grade)}>{r.grade}</Badge>
                  {currentUser?.role === 'admin' && (
                    <button onClick={async () => {
                      if(!window.confirm('Delete result?')) return;
                      try { await API.deleteResult(r._id); notify('Deleted'); loadData(); } catch(e) { notify('Error', 'error'); }
                    }} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 13, marginLeft: 8, cursor: 'pointer' }}>🗑</button>
                  )}
                </td>
              </tr>
            ))}
            {results.length === 0 && <tr><td colSpan={6} style={{ padding: 36, textAlign: 'center', color: s.textMuted }}>No results yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── FEES VIEW ─────────────────────────────────────────────────────────────────
function FeesView({ s, dbData, currentUser, notify, loadData }) {
  const allFees = dbData.fees || [];
  const fees = currentUser.role === 'student'
    ? allFees.filter(f => f.studentId?._id === currentUser._id || f.studentId === currentUser._id)
    : allFees;
  const sc = st => ({ paid: '#10b981', partial: '#f59e0b', unpaid: '#ef4444' }[st]);
  const [feeForm, setFeeForm] = useState({ studentId: '', semester: '', amount: '', paid: '0', dueDate: '', status: 'unpaid' });

  const addFee = async () => {
    if (!feeForm.studentId || !feeForm.amount) return notify('Student and amount required', 'error');
    try {
      await API.createFee({ ...feeForm, amount: +feeForm.amount, paid: +feeForm.paid, semester: +feeForm.semester });
      notify('✅ Fee record added!');
      setFeeForm({ studentId: '', semester: '', amount: '', paid: '0', dueDate: '', status: 'unpaid' });
      loadData();
    } catch (err) { notify(err.response?.data?.message || 'Error', 'error'); }
  };

  const markPaid = async (f) => {
    try {
      await API.updateFee(f._id, { status: 'paid', paid: f.amount });
      notify('✅ Marked as paid!'); loadData();
    } catch (err) { notify('Error', 'error'); }
  };
  return (
    <div className="fade-in">
      <div className="syne" style={{ fontSize: 21, fontWeight: 800, color: s.text, marginBottom: 20 }}>💰 Fees</div>
      {currentUser.role === 'admin' && (
        <Card s={s} title="Add Fee Record">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Student</label>
              <select value={feeForm.studentId} onChange={e => setFeeForm(p => ({ ...p, studentId: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                <option value="">—</option>
                {(dbData.users || []).filter(u => u.role === 'student').map(u => (
                  <option key={u._id} value={u._id}>
                    {u.name} {u.rollNo ? `— ${u.rollNo}` : ''} {u.courseId?.code ? `(${u.courseId.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <Input s={s} label="Semester" value={feeForm.semester} onChange={e => setFeeForm(p => ({ ...p, semester: e.target.value }))} type="number" placeholder="1-8" />
            <Input s={s} label="Amount (₹)" value={feeForm.amount} onChange={e => setFeeForm(p => ({ ...p, amount: e.target.value }))} type="number" placeholder="50000" />
            <Input s={s} label="Due Date" value={feeForm.dueDate} onChange={e => setFeeForm(p => ({ ...p, dueDate: e.target.value }))} placeholder="2026-05-01" />
          </div>
          {feeForm.studentId && (
            <div style={{ background: s.bg, padding: '10px 14px', borderRadius: 10, border: `1px solid ${s.border}`, marginBottom: 14, display: 'inline-block' }}>
              <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Locked Student Confirmation</div>
              <div style={{ fontSize: 13, color: s.text, fontWeight: 700 }}>
                {(() => {
                  const sel = (dbData.users || []).find(u => u._id === feeForm.studentId);
                  return sel ? `${sel.name} | ${sel.rollNo || '-'} | ${sel.courseId?.name || 'No Course'}` : '—';
                })()}
              </div>
            </div>
          )}
          <Btn onClick={addFee} color="#6366f1">+ Add Fee</Btn>
        </Card>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fees.map(f => (
          <div key={f._id} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 13, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${sc(f.status)}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              {f.status === 'paid' ? '✅' : f.status === 'partial' ? '⚠️' : '❌'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: s.text }}>Semester {f.semester} Fee {f.studentId?.name ? `— ${f.studentId.name}` : ''}</div>
              <div style={{ fontSize: 11, color: s.textMuted }}>Due: {f.dueDate}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: s.text }}>₹{f.paid?.toLocaleString()} / ₹{f.amount?.toLocaleString()}</div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
                <Badge color={sc(f.status)}>{f.status}</Badge>
                {currentUser?.role === 'admin' && f.status !== 'paid' && (
                  <button onClick={() => markPaid(f)} style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✓ Paid</button>
                )}
                {currentUser?.role === 'admin' && (
                  <button onClick={async () => {
                    if(!window.confirm('Delete fee record?')) return;
                    try { await API.deleteFee(f._id); notify('Deleted'); loadData(); } catch(e) { notify('Error', 'error'); }
                  }} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer' }}>🗑</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {fees.length === 0 && <div style={{ textAlign: 'center', padding: 60, background: s.card, borderRadius: 14, border: `1px solid ${s.border}`, color: s.textMuted }}>No fee records</div>}
      </div>
    </div>
  );
}

// ── ANNOUNCEMENTS VIEW ────────────────────────────────────────────────────────
function AnnouncementsView({ s, dbData, currentUser, notify, loadData }) {
  const [form, setForm] = useState({ title: '', message: '', batch: 'CS-A' });
  const announcements = dbData.announcements || [];

  const post = async () => {
    if (!form.title || !form.message) return notify('Title and message required', 'error');
    try {
      await API.createAnnouncement(form);
      notify('📣 Announcement posted!');
      setForm({ title: '', message: '', batch: 'CS-A' });
      loadData();
    } catch (err) { notify(err.response?.data?.message || 'Error', 'error'); }
  };

  return (
    <div className="fade-in">
      <div className="syne" style={{ fontSize: 21, fontWeight: 800, color: s.text, marginBottom: 20 }}>📣 Announcements</div>
      {(currentUser.role === 'admin' || currentUser.role === 'faculty') && (
        <Card s={s} title="New Announcement">
          <Input s={s} label="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Assignment due, Quiz, etc." />
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Message</label>
            <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Write announcement here..."
              rows={3} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Batch</label>
              <select value={form.batch} onChange={e => setForm(p => ({ ...p, batch: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                {['CS-A','CS-B','MATH-A','All'].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <Btn onClick={post} color="#6366f1">📣 Post</Btn>
          </div>
        </Card>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {announcements.map(a => {
          const fac = a.facultyId;
          return (
            <div key={a._id} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 13, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11 }}>
                  {fac?.avatar || 'AD'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: s.text }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: s.textMuted }}>{fac?.name} · {a.date}</div>
                </div>
              </div>
              <p style={{ fontSize: 12.5, color: s.textMuted, lineHeight: 1.6 }}>{a.message}</p>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge color="#6366f1">{a.batch}</Badge>
                {currentUser?.role === 'admin' && (
                  <button onClick={async () => {
                    if(!window.confirm('Delete announcement?')) return;
                    try { await API.deleteAnnouncement(a._id); notify('Deleted'); loadData(); } catch(e) { notify('Error', 'error'); }
                  }} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer' }}>🗑 Delete</button>
                )}
              </div>
            </div>
          );
        })}
        {announcements.length === 0 && <div style={{ textAlign: 'center', padding: 60, background: s.card, borderRadius: 14, border: `1px solid ${s.border}`, color: s.textMuted }}>No announcements</div>}
      </div>
    </div>
  );
}

// ── SIMPLE CRUD VIEWS ─────────────────────────────────────────────────────────
function UsersListView({ s, dbData, role, title, icon, currentUser, notify, loadData }) {
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', courseId: '', rollNo: '', batch: '', semester: 1, department: '', workingHoursPerWeek: 40 });
  
  const users = (dbData.users || []).filter(u => u.role === role);
  const courses = dbData.courses || [];
  
  const filtered = users.filter(u => {
    const matchSearch = JSON.stringify(u).toLowerCase().includes(search.toLowerCase());
    const userCourseId = u.courseId?._id || u.courseId;
    const matchCourse = filterCourse ? userCourseId === filterCourse : true;
    return matchSearch && matchCourse;
  });

  const save = async () => {
    if (!form.name || !form.email) return notify('Name and Email required', 'error');
    if (role === 'student' && (!form.courseId || !form.rollNo)) return notify('Course and RollNo are required for students', 'error');
    
    try {
      const payload = { ...form, role };
      if (!payload.courseId || payload.courseId === '') delete payload.courseId;
      
      if (form._id) {
        await API.updateUser(form._id, payload);
        notify(`✅ ${role} updated!`);
      } else {
        await API.createUser(payload);
        notify(`✅ ${role} added!`); 
      }
      setForm({ name: '', email: '', password: '', courseId: '', rollNo: '', sectionId: '', semester: 1, departmentId: '', workingHoursPerWeek: 40 }); 
      loadData();
    } catch(err) { notify(err.response?.data?.message || 'Error', 'error'); }
  };

  const startEdit = (user) => {
    setForm({
      _id: user._id,
      name: user.name,
      email: user.email,
      password: '', // Leave blank for security, only update if provided
      role: user.role,
      courseId: user.courseId?._id || user.courseId || '',
      rollNo: user.rollNo || '',
      sectionId: user.sectionId?._id || user.sectionId || '',
      semester: user.semester || 1,
      departmentId: user.departmentId?._id || user.departmentId || '',
      workingHoursPerWeek: user.workingHoursPerWeek || 40
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="syne" style={{ fontSize: 21, fontWeight: 800, color: s.text }}>{icon} {title}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {role === 'student' && (
             <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} style={{ width: 180, padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${s.border}`, background: s.card, color: s.text, fontSize: 13 }}>
                <option value="">All Courses</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
             </select>
          )}
          <input type="text" placeholder={`Search ${title}...`} value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 240, padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${s.border}`, background: s.card, color: s.text, fontSize: 13 }} />
        </div>
      </div>

      {currentUser?.role === 'admin' && (
        <Card s={s} title={form._id ? `Edit ${title.slice(0, -1)}: ${form.name}` : `Add New ${title.slice(0, -1)}`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
            <Input s={s} label="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" />
            <Input s={s} label="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} type="email" placeholder="john@example.com" />
            <Input s={s} label={form._id ? "New Password (optional)" : "Password"} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} type="password" placeholder={form._id ? "Leave blank to keep same" : "Min 6 chars"} />
          </div>
          {role === 'student' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
              <div>
                 <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Course *</label>
                 <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                    <option value="">— Select Course —</option>
                    {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                 </select>
              </div>
              <div>
                 <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Section *</label>
                 <select value={form.sectionId} onChange={e => setForm(p => ({ ...p, sectionId: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                    <option value="">— Select Section —</option>
                    {dbData.sections
                      .filter(sec => (sec.courseId?._id === form.courseId || sec.courseId === form.courseId) && sec.semester === form.semester)
                      .map(sec => <option key={sec._id} value={sec._id}>{sec.name}</option>)}
                 </select>
              </div>
              <Input s={s} label="Roll No *" value={form.rollNo} onChange={e => setForm(p => ({ ...p, rollNo: e.target.value }))} />
              <Input s={s} label="Semester" value={form.semester} onChange={e => setForm(p => ({ ...p, semester: +e.target.value }))} type="number" />
            </div>
          )}
          {role === 'faculty' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
              <div>
                 <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Department</label>
                 <select value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                    <option value="">— Select Dept —</option>
                    {dbData.departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                 </select>
              </div>
              <Input s={s} label="Working Hours / Week" value={form.workingHoursPerWeek} type="number" onChange={e => setForm(p => ({ ...p, workingHoursPerWeek: +e.target.value }))} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={save} color="#6366f1">{form._id ? '💾 Update User' : `+ Add ${title.slice(0, -1)}`}</Btn>
            {form._id && <Btn outline color={s.textMuted} onClick={() => setForm({ name: '', email: '', password: '', courseId: '', rollNo: '', batch: '', semester: 1, department: '', workingHoursPerWeek: 40 })}>Cancel</Btn>}
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 14 }}>
        {filtered.map(u => (
          <div key={u._id} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15 }}>{u.avatar || u.name?.slice(0,2)}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: s.text }}>{u.name}</div>
                <div style={{ fontSize: 11, color: s.textMuted }}>{u.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {u.courseId && <Badge color="#6366f1">{u.courseId.name || u.courseId}</Badge>}
              {u.department && <Badge color="#f59e0b">{u.department}</Badge>}
              {u.workingHoursPerWeek && <Badge color="#10b981">{u.workingHoursPerWeek} hrs/wk</Badge>}
              {u.batch && <Badge color="#10b981">{u.batch}</Badge>}
              {u.semester && <Badge color="#6366f1">Sem {u.semester}</Badge>}
              {u.rollNo && <Badge color="#8b5cf6">{u.rollNo}</Badge>}
              {u.faceRegistered !== undefined && <Badge color={u.faceRegistered ? '#10b981' : '#ef4444'}>{u.faceRegistered ? '👁 Face ✓' : '👁 No Face'}</Badge>}
            </div>
            {currentUser?.role === 'admin' && (
              <div style={{ marginTop: 12, textAlign: 'right', borderTop: `1px solid ${s.border}`, paddingTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Btn small outline color="#6366f1" onClick={() => startEdit(u)}>✏ Edit</Btn>
                <Btn small outline color="#ef4444" onClick={async () => {
                  if(!window.confirm('Delete this user?')) return;
                  try { await API.deleteUser(u._id); notify('Deleted'); loadData(); } catch(e) { notify('Error', 'error'); }
                }}>🗑 Delete</Btn>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: s.textMuted, padding: 20 }}>No {role}s found matching "{search}"</div>}
      </div>
    </div>
  );
}

function CoursesView({ s, dbData, notify, loadData, currentUser }) {
  const [search, setSearch] = useState('');
  const courses = dbData.courses || [];
  const filtered = courses.filter(c => JSON.stringify(c).toLowerCase().includes(search.toLowerCase()));
  const [form, setForm] = useState({ name: '', code: '', duration: 4, departmentId: '', sectionNames: '' });

  const save = async () => {
    try {
      const payload = { ...form, sectionNames: (typeof form.sectionNames === 'string' ? form.sectionNames.split(',') : form.sectionNames).map(s => s.trim()).filter(Boolean) };
      if (form._id) {
        await API.updateCourse(form._id, payload);
        notify('✅ Course updated!');
      } else {
        await API.createCourse(payload);
        notify('✅ Course added!'); 
      }
      setForm({ name: '', code: '', duration: 4, departmentId: '', sectionNames: '' }); 
      loadData();
    } catch (err) { notify(err.response?.data?.message || 'Error', 'error'); }
  };

  const startEdit = (c) => {
    setForm({
      _id: c._id,
      name: c.name,
      code: c.code,
      duration: c.duration,
      departmentId: c.departmentId?._id || c.departmentId || '',
      sectionNames: (c.sectionNames || []).join(', ')
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="syne" style={{ fontSize: 21, fontWeight: 800, color: s.text }}>📚 Courses</div>
        <input type="text" placeholder="Search Courses..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: 240, padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${s.border}`, background: s.card, color: s.text, fontSize: 13 }} />
      </div>
      
      {currentUser?.role === 'admin' && (
        <Card s={s} title="Add Course">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 2fr', gap: 12 }}>
            <Input s={s} label="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="B.Tech CS" />
            <Input s={s} label="Code" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="BTCS" />
            <Input s={s} label="Duration (yrs)" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} type="number" />
            <div>
               <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Department</label>
               <select value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                  <option value="">— Select Dept —</option>
                  {dbData.departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
               </select>
            </div>
            <Input s={s} label="Sections (e.g. A, B)" value={form.sectionNames} onChange={e => setForm(p => ({ ...p, sectionNames: e.target.value }))} placeholder="A, B" />
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
            <Btn onClick={save} color="#6366f1">{form._id ? '💾 Update Course' : '+ Add Course'}</Btn>
            {form._id && <Btn outline color={s.textMuted} onClick={() => setForm({ name: '', code: '', duration: 4, departmentId: '', sectionNames: '' })}>Cancel</Btn>}
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(c => (
          <div key={c._id} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.text }}>{c.name}</div>
              <div style={{ fontSize: 11, color: s.textMuted }}>{c.code} · {c.duration} years {c.department ? `· ${c.department}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {(c.sectionNames || []).map(b => <Badge key={b} color="#6366f1">{b}</Badge>)}
              {currentUser?.role === 'admin' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => startEdit(c)} style={{ background: 'transparent', border: 'none', color: '#6366f1', fontSize: 13, cursor: 'pointer' }}>✏</button>
                  <button onClick={async () => {
                    if(!window.confirm('Delete course?')) return;
                    try { await API.deleteCourse(c._id); notify('Deleted'); loadData(); } catch(e) { notify('Error', 'error'); }
                  }} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer' }}>🗑</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassroomsView({ s, dbData, notify, loadData, currentUser }) {
  const [search, setSearch] = useState('');
  const classrooms = dbData.classrooms || [];
  const filtered = classrooms.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
  const [form, setForm] = useState({ name: '', capacity: '', type: 'lecture', building: '', departmentId: '' });

  const save = async () => {
    try {
      await API.createClassroom({ ...form, capacity: +form.capacity });
      notify('✅ Classroom added!'); setForm({ name: '', capacity: '', type: 'lecture', building: '' }); loadData();
    } catch (err) { notify(err.response?.data?.message || 'Error', 'error'); }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="syne" style={{ fontSize: 21, fontWeight: 800, color: s.text }}>🏫 Classrooms</div>
        <input type="text" placeholder="Search Classrooms..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: 240, padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${s.border}`, background: s.card, color: s.text, fontSize: 13 }} />
      </div>

      {currentUser?.role === 'admin' && (
        <Card s={s} title="Add Classroom">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <Input s={s} label="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Room 101" />
            <Input s={s} label="Capacity" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} type="number" placeholder="60" />
            <Input s={s} label="Building" value={form.building} onChange={e => setForm(p => ({ ...p, building: e.target.value }))} placeholder="Main Block" />
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                <option value="lecture">Lecture Hall</option>
                <option value="lab">Computer Lab</option>
                <option value="seminar">Seminar Room</option>
              </select>
            </div>
          </div>
          <Btn onClick={save} color="#6366f1">+ Add Classroom</Btn>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
        {filtered.map(r => (
          <div key={r._id} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 13, padding: 18 }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>🏫</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: s.text }}>{r.name}</div>
            <div style={{ fontSize: 11, color: s.textMuted, marginTop: 4 }}>{r.building} · {r.type}</div>
            <div style={{ marginTop: 8 }}><Badge color="#6366f1">Cap: {r.capacity}</Badge></div>
            {currentUser?.role === 'admin' && (
              <button onClick={async () => {
                if(!window.confirm('Delete classroom?')) return;
                try { await API.deleteClassroom(r._id); notify('Deleted'); loadData(); } catch(e) { notify('Error', 'error'); }
              }} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 13, padding: '4px 0', marginTop: 8, cursor: 'pointer' }}>🗑 Delete</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SubjectsView({ s, dbData, notify, loadData, currentUser }) {
  const [search, setSearch] = useState('');
  const subjects = dbData.subjects || [];
  const filtered = subjects.filter(sub => JSON.stringify(sub).toLowerCase().includes(search.toLowerCase()));
  const courses = dbData.courses || [];
  const faculty = (dbData.users || []).filter(u => u.role === 'faculty');
  const [form, setForm] = useState({ name: '', code: '', credits: 3, hoursPerWeek: 3, courseId: '', semester: 1, facultyId: '', type: 'theory' });

  const save = async () => {
    try {
      await API.createSubject(form);
      notify('✅ Subject added!'); setForm({ name: '', code: '', credits: 3, hoursPerWeek: 3, courseId: '', semester: 1, facultyId: '' }); loadData();
    } catch (err) { notify(err.response?.data?.message || 'Error', 'error'); }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="syne" style={{ fontSize: 21, fontWeight: 800, color: s.text }}>📖 Subjects</div>
        <input type="text" placeholder="Search Subjects..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: 240, padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${s.border}`, background: s.card, color: s.text, fontSize: 13 }} />
      </div>

      {currentUser?.role === 'admin' && (
        <Card s={s} title="Add Subject">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <Input s={s} label="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Data Structures" />
            <Input s={s} label="Code" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="CS101" />
            <Input s={s} label="Credits" value={form.credits} onChange={e => setForm(p => ({ ...p, credits: +e.target.value }))} type="number" />
            <Input s={s} label="Hours/Week" value={form.hoursPerWeek} onChange={e => setForm(p => ({ ...p, hoursPerWeek: +e.target.value }))} type="number" />
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                <option value="theory">Theory</option>
                <option value="lab">Lab / Practical</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Course</label>
              <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                <option value="">— Select Course —</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <Input s={s} label="Semester" value={form.semester} onChange={e => setForm(p => ({ ...p, semester: +e.target.value }))} type="number" />
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Faculty Instructor</label>
              <select value={form.facultyId} onChange={e => setForm(p => ({ ...p, facultyId: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${s.border}`, background: s.card2, color: s.text, fontSize: 13 }}>
                <option value="">— Select Faculty —</option>
                {faculty.map(f => <option key={f._id} value={f._id}>{f.name} ({f.department || 'General'})</option>)}
              </select>
            </div>
          </div>
          <Btn onClick={save} color="#6366f1">+ Add Subject</Btn>
        </Card>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: s.card2 }}>
              {['Subject','Code','Course','Credits','Hours/Week','Semester','Faculty'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: s.textMuted, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', border: `1px solid ${s.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(sub => (
              <tr key={sub._id} style={{ borderBottom: `1px solid ${s.border}`, background: s.card }}>
                <td style={{ padding: '10px 14px', color: s.text, fontWeight: 600, border: `1px solid ${s.border}` }}>{sub.name}</td>
                <td style={{ padding: '10px 14px', border: `1px solid ${s.border}` }}><Badge color="#6366f1">{sub.code}</Badge></td>
                <td style={{ padding: '10px 14px', color: s.text, border: `1px solid ${s.border}` }}>{sub.courseId?.code || '—'}</td>
                <td style={{ padding: '10px 14px', color: s.text, border: `1px solid ${s.border}` }}>{sub.credits}</td>
                <td style={{ padding: '10px 14px', color: s.text, border: `1px solid ${s.border}` }}>{sub.hoursPerWeek}</td>
                <td style={{ padding: '10px 14px', color: s.text, border: `1px solid ${s.border}` }}>Sem {sub.semester}</td>
                <td style={{ padding: '10px 14px', color: s.textMuted, border: `1px solid ${s.border}` }}>
                  {sub.facultyId?.name || '—'}
                  {currentUser?.role === 'admin' && (
                    <button onClick={async () => {
                      if(!window.confirm('Delete subject?')) return;
                      try { await API.deleteSubject(sub._id); notify('Deleted'); loadData(); } catch(e) { notify('Error', 'error'); }
                    }} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 13, marginLeft: 8, cursor: 'pointer' }}>🗑</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── MAIN APP SHELL ─────────────────────────────────────────────────────────────
export default function AppShell() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dbData, setDbData] = useState({
    users: [], courses: [], subjects: [], classrooms: [],
    timetable: [], attendance: [], faceScanLogs: [], wifiSessions: [],
    results: [], fees: [], announcements: [],
    departments: [], sections: [],
  });

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      // Role-scoped loading: only fetch what each role needs
      const role = currentUser?.role;
      let calls, keys;
      if (role === 'student') {
        calls = [API.getCourses(), API.getSubjects(), API.getTimetable(), API.getAttendance(), API.getResults(), API.getFees(), API.getAnnouncements()];
        keys = ['courses','subjects','timetable','attendance','results','fees','announcements'];
      } else if (role === 'faculty') {
        calls = [API.getUsers(), API.getCourses(), API.getSubjects(), API.getTimetable(), API.getAttendance(), API.getResults(), API.getAnnouncements()];
        keys = ['users','courses','subjects','timetable','attendance','results','announcements'];
      } else {
        calls = [API.getUsers(), API.getCourses(), API.getSubjects(), API.getClassrooms(), API.getTimetable(), API.getAttendance(), API.getFaceScanLogs(), API.getWifiSessions(), API.getResults(), API.getFees(), API.getAnnouncements(), API.getDepartments(), API.getSections()];
        keys = ['users','courses','subjects','classrooms','timetable','attendance','faceScanLogs','wifiSessions','results','fees','announcements', 'departments', 'sections'];
      }
      const results = await Promise.allSettled(calls);
      const newData = { users: [], courses: [], subjects: [], classrooms: [], timetable: [], attendance: [], faceScanLogs: [], wifiSessions: [], results: [], fees: [], announcements: [], departments: [], sections: [] };
      keys.forEach((key, i) => { newData[key] = results[i].value?.data || []; });
      setDbData(newData);
    } catch (err) { console.error('Load error:', err); }
    finally { setDataLoading(false); }
  }, [currentUser]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const s = getStyles(darkMode);

  const renderContent = () => {
    if (dataLoading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
          <div className="spin" style={{ fontSize: 36, color: '#6366f1', marginBottom: 16 }}>⚙</div>
          <div className="syne" style={{ fontSize: 16, fontWeight: 700, color: s.text }}>Loading data...</div>
          <div style={{ fontSize: 12, color: s.textMuted, marginTop: 6 }}>Fetching your dashboard</div>
        </div>
      );
    }
    const props = { s, dbData, notify, loadData, currentUser };
    switch (activeTab) {
      case 'dashboard':
        if (currentUser.role === 'admin') return <AdminDashboard {...props} setActiveTab={setActiveTab} />;
        if (currentUser.role === 'faculty') return <FacultyDashboard {...props} setActiveTab={setActiveTab} />;
        return <StudentDashboard {...props} setActiveTab={setActiveTab} />;
      case 'timetable': return <TimetableView {...props} />;
      case 'facescan': return <FaceScanView {...props} />;
      case 'attendance': return <AttendanceView {...props} />;
      case 'results': return <ResultsView {...props} />;
      case 'fees': return <FeesView {...props} />;
      case 'announcements': case 'notifications': return <AnnouncementsView {...props} />;
      case 'courses': return <CoursesView {...props} />;
      case 'students': return <UsersListView {...props} role="student" title="Students" icon="👨‍🎓" />;
      case 'faculty': return <UsersListView {...props} role="faculty" title="Faculty" icon="👩‍🏫" />;
      case 'classrooms': return <ClassroomsView {...props} />;
      case 'subjects': return <SubjectsView {...props} />;
      default: return <div style={{ color: s.textMuted, padding: 40 }}>Coming soon...</div>;
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: s.bg }}>
      <style>{GLOBAL_CSS}</style>
      
      {/* FACE REGISTRATION FUNNEL INTERCEPTOR */}
      {currentUser?.role === 'student' && currentUser.faceRegistered === false && (
        <FaceRegistration onSuccess={(descriptor) => {
          // Unblock student and refresh automatically
          window.location.reload(); 
        }} />
      )}

      {sidebarOpen && <div className="mobile-overlay" style={{ display: 'none' }} onClick={() => setSidebarOpen(false)} />}
      <Sidebar s={s} currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="print-hide" style={{ display: 'flex', alignItems: 'center' }}>
          <button className="mobile-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: s.text, fontSize: 22, padding: '12px 14px', cursor: 'pointer' }}>☰</button>
          <div style={{ flex: 1 }}><TopBar s={s} currentUser={currentUser} darkMode={darkMode} setDarkMode={setDarkMode} /></div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }} className="fade-in">
          {notification && (
            <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 9999, background: notification.type === 'success' ? s.success : s.danger, color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'fadeIn 0.3s ease', maxWidth: 360 }}>
              {notification.msg}
            </div>
          )}
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
