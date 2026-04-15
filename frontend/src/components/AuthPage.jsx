import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DARK = {
  bg: '#0a0c13', card: '#131620', card2: '#1a1e2e',
  border: '#252840', text: '#e2e8f0', textMuted: '#7a85a3',
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',sans-serif;background:#0a0c13;color:#e2e8f0}
  input,select{outline:none;font-family:'DM Sans',sans-serif}
  button{cursor:pointer;font-family:'DM Sans',sans-serif}
  .syne{font-family:'Syne',sans-serif}
  .fade-in{animation:fadeIn 0.35s ease}
  @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  ::-webkit-scrollbar{width:5px}
  ::-webkit-scrollbar-thumb{background:#252840;border-radius:3px}
`;

const roleIcons  = { student: '👨‍🎓', faculty: '👩‍🏫', admin: '🛡' };
const demos = [
  { label: 'Admin',   email: 'admin@school.edu',  password: 'admin123',   color: '#6366f1' },
  { label: 'Faculty', email: 'riya@school.edu',   password: 'faculty123', color: '#f59e0b' },
  { label: 'Student', email: 'rahul@school.edu',  password: 'student123', color: '#10b981' },
];

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [page, setPage]     = useState('login');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [showPass, setShowPass] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'admin'
  });

  const s = DARK;

  const inputStyle = {
    width: '100%', padding: '10px 13px', borderRadius: 9,
    border: `1.5px solid ${s.border}`, background: s.card2,
    color: s.text, fontSize: 13,
  };
  const labelStyle = {
    fontSize: 10.5, fontWeight: 700, color: s.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    display: 'block', marginBottom: 5,
  };

  const handleLogin = async () => {
    setError(''); setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally { setLoading(false); }
  };

  const handleSignup = async () => {
    setError('');
    const { name, email, password, confirmPassword } = signupForm;
    if (!name.trim()) return setError('Full name is required.');
    if (!email.includes('@')) return setError('Enter a valid email.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await register(signupForm);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{css}</style>

      {/* BG glow */}
      <div style={{ position: 'fixed', top: '20%', left: '30%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="fade-in" style={{ width: '100%', maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="syne" style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>
            <span style={{ color: '#6366f1' }}>⬡</span> EduSync
          </div>
          <div style={{ fontSize: 12, color: s.textMuted, marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Smart Class Scheduler</div>
        </div>

        <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 18, padding: 28 }}>
          
          {page === 'login' ? (
            <>
              <div className="syne" style={{ fontSize: 20, fontWeight: 800, color: s.text, marginBottom: 4 }}>Welcome back</div>
              <p style={{ color: s.textMuted, fontSize: 13, marginBottom: 22 }}>Sign in to your portal</p>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Email</label>
                <input value={loginForm.email} type="email" placeholder="you@school.edu"
                  onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  style={inputStyle} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input value={loginForm.password} type={showPass ? 'text' : 'password'} placeholder="••••••••"
                    onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    style={{ ...inputStyle, paddingRight: 38 }} />
                  <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: s.textMuted, fontSize: 14, padding: 0 }}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {error && <div style={{ color: '#ef4444', fontSize: 12.5, padding: '9px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(239,68,68,0.2)' }}>⚠ {error}</div>}

              <button onClick={handleLogin} disabled={loading}
                style={{ width: '100%', padding: 13, borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 15, fontWeight: 700, boxShadow: '0 4px 20px rgba(99,102,241,0.5)', marginBottom: 20, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1.5, background: `${s.border}80` }} />
                <span style={{ fontSize: 11, color: s.textMuted, fontWeight: 600 }}>QUICK DEMO ACCESS</span>
                <div style={{ flex: 1, height: 1.5, background: `${s.border}80` }} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {demos.map(d => (
                  <button key={d.label} onClick={() => setLoginForm({ email: d.email, password: d.password })}
                    onMouseEnter={() => setHovered(d.label)} onMouseLeave={() => setHovered(null)}
                    style={{ flex: 1, padding: '10px 6px', borderRadius: 10, border: `1.5px solid ${hovered === d.label ? d.color : s.border}`, background: hovered === d.label ? `${d.color}18` : 'transparent', color: hovered === d.label ? d.color : s.textMuted, fontSize: 12.5, fontWeight: 600, transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 18 }}>{roleIcons[d.label.toLowerCase()]}</span>
                    <span>{d.label}</span>
                  </button>
                ))}
              </div>
              
              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: s.textMuted }}>
                New Administrator?{' '}
                <button onClick={() => { setPage('signup'); setError(''); }} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 700, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>Create Admin Account</button>
              </p>
            </>
          ) : (
            <>
              <div className="syne" style={{ fontSize: 20, fontWeight: 800, color: s.text, marginBottom: 4 }}>Admin Registration</div>
              <p style={{ color: s.textMuted, fontSize: 13, marginBottom: 20 }}>Setup your administrator account</p>

              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Full Name</label>
                <input value={signupForm.name} placeholder="Admin Name"
                  onChange={e => setSignupForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Email Address</label>
                <input type="email" value={signupForm.email} placeholder="admin@school.edu"
                  onChange={e => setSignupForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input type="password" value={signupForm.password} placeholder="••••••••"
                    onChange={e => setSignupForm(p => ({ ...p, password: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Confirm</label>
                  <input type="password" value={signupForm.confirmPassword} placeholder="••••••••"
                    onChange={e => setSignupForm(p => ({ ...p, confirmPassword: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              {error && <div style={{ color: '#ef4444', fontSize: 12.5, padding: '9px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(239,68,68,0.2)' }}>⚠ {error}</div>}

              <button onClick={handleSignup} disabled={loading}
                style={{ width: '100%', padding: 13, borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 15, fontWeight: 700, boxShadow: '0 4px 20px rgba(99,102,241,0.5)', marginBottom: 20, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Processing...' : '🛡 Create Admin Account →'}
              </button>

              <p style={{ textAlign: 'center', fontSize: 13, color: s.textMuted }}>
                Return to{' '}
                <button onClick={() => { setPage('login'); setError(''); }} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 700, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>Sign In</button>
              </p>
            </>
          )}
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 18, flexWrap: 'wrap' }}>
          {[{ icon: '👁', label: 'Face Scan' }, { icon: '📶', label: 'WiFi Auto' }, { icon: '⚡', label: 'AI Schedule' }, { icon: '🔒', label: 'JWT Secure' }].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: s.textMuted }}>
              <span>{f.icon}</span><span>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
