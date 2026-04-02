import React, { useState, useEffect } from "react";
import { Mail, Lock, User, ArrowRight, Zap } from "lucide-react";
import { useAuthStore } from "../../store";
import { login, register } from "../../services/api/authApi";

/* Inject keyframe animations once */
const STYLE_ID = "auth-modal-keyframes";
if (!document.getElementById(STYLE_ID)) {
  const st = document.createElement("style");
  st.id = STYLE_ID;
  st.textContent = `
    @keyframes authGlow   { 0%,100%{opacity:.6} 50%{opacity:1} }
    @keyframes authScan   { 0%{top:-100%} 100%{top:120%} }
    @keyframes authPulse  { 0%,100%{box-shadow:0 0 8px #5AF2B5,0 0 20px rgba(90,242,181,.3)} 50%{box-shadow:0 0 16px #5AF2B5,0 0 40px rgba(90,242,181,.5)} }
    @keyframes authSlide  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes authShake  { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
    .auth-input:focus { border-color: #5AF2B5 !important; box-shadow: 0 0 0 3px rgba(90,242,181,0.12) !important; }
    .auth-input::placeholder { color: rgba(255,255,255,0.2); }
    .auth-btn:hover:not(:disabled) { background: linear-gradient(135deg,#4adba2,#2ec98a) !important; box-shadow: 0 6px 24px rgba(90,242,181,0.4) !important; transform: translateY(-1px); }
    .auth-btn:active:not(:disabled) { transform: translateY(1px); }
    .auth-close:hover { color: #fff !important; background: rgba(255,255,255,0.1) !important; }
    .auth-switch:hover { color: #5AF2B5 !important; text-shadow: 0 0 12px rgba(90,242,181,0.5) !important; }
  `;
  document.head.appendChild(st);
}

export default function AuthModal({ onClose, onSuccess }) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // Reset error on mode switch
  useEffect(() => { setError(""); }, [isSignUp]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || (isSignUp && !email)) {
      setError("Please fill in all fields.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (isSignUp) {
        const res = await register({ username, email, password });
        setAuth({ token: res.access_token, username: res.username, userId: res.user_id });
        onSuccess(res.username);
      } else {
        const res = await login({ username, password });
        setAuth({ token: res.access_token, username: res.username, userId: res.user_id });
        onSuccess(res.username);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Authentication failed. Check your credentials.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay}>
      {/* Backdrop blur layer */}
      <div style={s.backdrop} onClick={onClose} />

      <div
        style={{
          ...s.modal,
          animation: 'authSlide 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
          ...(shake ? { animation: 'authShake 0.45s ease' } : {}),
        }}
      >
        {/* Scan-line effect */}
        <div style={s.scanLine} />

        {/* Corner accents */}
        <div style={{ ...s.corner, top: 0, left: 0, borderTop: '2px solid #5AF2B5', borderLeft: '2px solid #5AF2B5' }} />
        <div style={{ ...s.corner, top: 0, right: 0, borderTop: '2px solid #5AF2B5', borderRight: '2px solid #5AF2B5' }} />
        <div style={{ ...s.corner, bottom: 0, left: 0, borderBottom: '2px solid #5AF2B5', borderLeft: '2px solid #5AF2B5' }} />
        <div style={{ ...s.corner, bottom: 0, right: 0, borderBottom: '2px solid #5AF2B5', borderRight: '2px solid #5AF2B5' }} />

        {/* Close button */}
        <button className="auth-close" style={s.closeBtn} onClick={onClose} aria-label="Close">✕</button>

        {/* Logo / Brand */}
        <div style={s.brand}>
          <div style={s.brandIcon}>
            <Zap size={20} color="#5AF2B5" fill="#5AF2B5" />
          </div>
          <div>
            <div style={s.brandName}>SYNTHETIC BULL</div>
            <div style={s.brandTag}>Trading Terminal</div>
          </div>
        </div>

        {/* Title */}
        <div style={s.titleBlock}>
          <h2 style={s.title}>{isSignUp ? "Create Account" : "Welcome Back"}</h2>
          <p style={s.subtitle}>
            {isSignUp
              ? "Start trading synthetic assets today"
              : "Sign in to your trading terminal"}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={s.error}>
            <span style={s.errorDot}>!</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={s.form} autoComplete="off">
          {/* Username */}
          <div style={s.fieldGroup}>
            <label style={s.label}>
              <User size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
              USERNAME
            </label>
            <div style={s.inputWrap}>
              <input
                className="auth-input"
                type="text"
                style={s.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
              />
              <div style={{ ...s.inputLine, width: username ? '100%' : '0%' }} />
            </div>
          </div>

          {/* Email — sign up only */}
          {isSignUp && (
            <div style={s.fieldGroup}>
              <label style={s.label}>
                <Mail size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                EMAIL
              </label>
              <div style={s.inputWrap}>
                <input
                  className="auth-input"
                  type="email"
                  style={s.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                />
                <div style={{ ...s.inputLine, width: email ? '100%' : '0%' }} />
              </div>
            </div>
          )}

          {/* Password */}
          <div style={s.fieldGroup}>
            <label style={s.label}>
              <Lock size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
              PASSWORD
            </label>
            <div style={s.inputWrap}>
              <input
                className="auth-input"
                type="password"
                style={s.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
              <div style={{ ...s.inputLine, width: password ? '100%' : '0%' }} />
            </div>
          </div>

          {/* Submit */}
          <button
            className="auth-btn"
            type="submit"
            disabled={loading}
            style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <span style={s.loadingSpinner}>
                <span style={s.loadingDots}>
                  <span /><span /><span />
                </span>
                Processing…
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {isSignUp ? "Create Account" : "Sign In"}
                <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>

        {/* Switch mode */}
        <div style={s.footer}>
          <span style={s.footerText}>
            {isSignUp ? "Already have an account?" : "New to Synthetic Bull?"}
          </span>
          <span
            className="auth-switch"
            style={s.switchBtn}
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? "Sign In" : "Create Account"}
          </span>
        </div>

        {/* Status bar */}
        <div style={s.statusBar}>
          <span style={s.statusDot} />
          <span style={s.statusText}>Secure connection · AES-256</span>
          <span style={s.statusRight}>SYNTHETIC BULL v2.0</span>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9000,
  },
  backdrop: {
    position: 'absolute', inset: 0,
    background: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(8px)',
  },
  modal: {
    position: 'relative',
    width: 420,
    backgroundColor: 'rgba(6,10,18,0.97)',
    border: '1px solid rgba(90,242,181,0.2)',
    boxShadow: '0 0 60px rgba(90,242,181,0.08), 0 0 120px rgba(0,0,0,0.8), inset 0 0 40px rgba(90,242,181,0.02)',
    padding: '36px 36px 24px',
    overflow: 'hidden',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 1,
    background: 'linear-gradient(90deg,transparent,rgba(90,242,181,0.15),transparent)',
    animation: 'authScan 4s linear infinite',
    pointerEvents: 'none',
  },
  corner: {
    position: 'absolute', width: 14, height: 14,
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16,
    background: 'transparent', border: 'none',
    color: 'rgba(255,255,255,0.35)',
    fontSize: 16, cursor: 'pointer',
    width: 28, height: 28,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 4,
    transition: 'color 0.2s, background 0.2s',
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28,
  },
  brandIcon: {
    width: 40, height: 40,
    background: 'rgba(90,242,181,0.07)',
    border: '1px solid rgba(90,242,181,0.25)',
    borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'authPulse 3s ease-in-out infinite',
  },
  brandName: {
    fontSize: 13, fontWeight: 800, color: '#fff',
    letterSpacing: '0.12em',
  },
  brandTag: {
    fontSize: 10, color: 'rgba(90,242,181,0.6)',
    letterSpacing: '0.08em', marginTop: 1,
  },
  titleBlock: { marginBottom: 24 },
  title: {
    margin: 0, fontSize: 26, fontWeight: 700, color: '#fff',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: '6px 0 0', fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(246,70,93,0.08)',
    border: '1px solid rgba(246,70,93,0.25)',
    color: '#F6465D', padding: '10px 14px',
    borderRadius: 6, marginBottom: 18, fontSize: 13,
  },
  errorDot: {
    width: 20, height: 20, borderRadius: '50%',
    background: 'rgba(246,70,93,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontWeight: 700, fontSize: 12, lineHeight: '20px', textAlign: 'center',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
  },
  inputWrap: { position: 'relative' },
  input: {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff', padding: '12px 16px',
    borderRadius: 6, outline: 'none',
    fontSize: 14, fontFamily: 'inherit',
    transition: 'border 0.2s, box-shadow 0.2s',
  },
  inputLine: {
    position: 'absolute', bottom: 0, left: 0, height: 2,
    background: 'linear-gradient(90deg, #5AF2B5, rgba(90,242,181,0.3))',
    borderRadius: '0 0 6px 6px',
    transition: 'width 0.4s ease',
    pointerEvents: 'none',
  },
  submitBtn: {
    width: '100%', padding: '13px',
    background: 'linear-gradient(135deg, #5AF2B5, #38d49a)',
    border: 'none', borderRadius: 6,
    color: '#030f09', fontSize: 14, fontWeight: 800,
    cursor: 'pointer', marginTop: 6,
    transition: 'background 0.2s, box-shadow 0.2s, transform 0.15s',
    letterSpacing: '0.02em',
    boxShadow: '0 4px 20px rgba(90,242,181,0.25)',
  },
  loadingSpinner: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  loadingDots: {},
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 24, fontSize: 13,
  },
  footerText: { color: 'rgba(255,255,255,0.3)' },
  switchBtn: {
    color: 'rgba(90,242,181,0.8)', cursor: 'pointer', fontWeight: 600,
    transition: 'color 0.2s, text-shadow 0.2s',
  },
  statusBar: {
    display: 'flex', alignItems: 'center', gap: 7,
    marginTop: 20, paddingTop: 14,
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  statusDot: {
    width: 6, height: 6, borderRadius: '50%',
    backgroundColor: '#5AF2B5',
    boxShadow: '0 0 6px #5AF2B5',
    flexShrink: 0,
  },
  statusText: { fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' },
  statusRight: { marginLeft: 'auto', fontSize: 9, color: 'rgba(90,242,181,0.3)', letterSpacing: '0.08em' },
};
