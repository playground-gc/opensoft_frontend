import React, { useState } from "react";
import { Mail, Lock, User, LogIn, UserPlus } from "lucide-react";
import { useAuthStore } from "../../store";
import { useGoogleLogin } from "@react-oauth/google";
import { login, register } from "../../services/api/authApi";

export default function AuthModal({ onClose, onSuccess }) {
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNormalLogin = async (e) => {
    e.preventDefault();
    // setError('');
    if (!password || !username || (isSignUp && !email)) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const res = await register({
          username: username || email,
          email,
          password,
        });
        setAuth({
          token: res.access_token,
          username: res.username,
          userId: res.user_id,
        });
        onSuccess({ username: res.username, authType: "signup" });
      } else {
        const res = await login({ username: username || email, password });
        setAuth({
          token: res.access_token,
          username: res.username,
          userId: res.user_id,
        });
        onSuccess({ username: res.username, authType: "login" });
      }
      onClose();
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log("Google Login Successful Token:", tokenResponse);
      onSuccess({ username: "Google User", authType: "google-login" });
    },
    onError: (err) => {
      console.error("Google Login Error:", err);
      setError("Google Authentication Failed.");
    },
  });

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {isSignUp ? "Synthetic-Bull Sign Up" : "Synthetic-Bull Sign In"}
          </h2>
          <div style={styles.closeBtn} onClick={onClose}>
            ✕
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleNormalLogin} style={styles.formMode}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <div style={styles.inputWrapper}>
              <User size={18} style={styles.inputIcon} />
              <input
                type="text"
                style={{ ...styles.input, paddingLeft: "40px" }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
          </div>
          {isSignUp && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  type="email"
                  style={{ ...styles.input, paddingLeft: "40px" }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                />
              </div>
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                style={{ ...styles.input, paddingLeft: "40px" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button type="submit" style={styles.loginBtn} disabled={loading}>
            {loading ? (
              "Please wait..."
            ) : isSignUp ? (
              <>
                <UserPlus
                  size={18}
                  style={{ marginRight: 8, verticalAlign: "middle" }}
                />
                Sign Up
              </>
            ) : (
              <>
                <LogIn
                  size={18}
                  style={{ marginRight: 8, verticalAlign: "middle" }}
                />
                Log In
              </>
            )}
          </button>
          {!isSignUp && (
            <a href="#" style={styles.forgot}>
              Forgot Password?
            </a>
          )}
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine} />
        </div>

        <div
          style={styles.googleBtn}
          onClick={() => {
            setError("");
            googleLogin();
          }}
        >
          <svg style={styles.googleIcon} viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
            <path fill="none" d="M1 1h22v22H1z" />
          </svg>
          Continue with Google
        </div>

        <div style={styles.footerLink}>
          {isSignUp ? (
            <>
              <span style={{ color: "var(--color-text-muted)" }}>
                Already have an account?
              </span>{" "}
              <span
                style={{
                  color: "#ff4500",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
                onClick={() => setIsSignUp(false)}
              >
                Log In
              </span>
            </>
          ) : (
            <>
              <span style={{ color: "var(--color-text-muted)" }}>
                New to Synthetic-Bull?
              </span>{" "}
              <span
                style={{
                  color: "#ff4500",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
                onClick={() => setIsSignUp(true)}
              >
                Create Account
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(2px)",
  },
  modal: {
    backgroundColor: "rgba(10, 10, 10, 0.85)",
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 69, 0, 0.3)",
    boxShadow:
      "0 0 40px rgba(255, 69, 0, 0.15), inset 0 0 20px rgba(255, 69, 0, 0.05)",
    width: "400px",
    borderRadius: "0px",
    padding: "32px",

    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    color: "var(--color-text-main)",
    fontWeight: "bold",
  },
  closeBtn: {
    fontSize: "20px",
    color: "var(--color-text-muted)",
    cursor: "pointer",
  },
  error: {
    backgroundColor: "rgba(246, 70, 93, 0.1)",
    color: "#F6465D",
    padding: "12px",
    borderRadius: "0px",
    marginBottom: "16px",
    fontSize: "13px",
    textAlign: "center",
  },
  formMode: { display: "flex", flexDirection: "column", gap: "20px" },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    position: "relative",
  },
  inputWrapper: { position: "relative", display: "flex", alignItems: "center" },
  inputIcon: {
    position: "absolute",
    left: "12px",
    color: "rgba(255, 255, 255, 0.4)",
  },
  label: { color: "var(--color-text-muted)", fontSize: "14px" },
  input: {
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "white",
    padding: "12px 16px",
    borderRadius: "0px",
    outline: "none",
    fontSize: "16px",
    transition: "border 0.2s",
  },
  loginBtn: {
    backgroundColor: "#ff4500",
    color: "#050505",
    border: "none",
    padding: "14px",
    borderRadius: "0px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "12px",
  },
  forgot: {
    color: "#ff4500",
    fontSize: "13px",
    textDecoration: "none",
    alignSelf: "flex-start",
  },
  divider: { display: "flex", alignItems: "center", margin: "24px 0" },
  dividerLine: {
    flex: 1,
    height: "1px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  dividerText: {
    margin: "0 12px",
    color: "var(--color-text-muted)",
    fontSize: "14px",
  },
  googleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "white",
    padding: "12px",
    borderRadius: "0px",
    fontSize: "16px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  googleIcon: { width: "20px", height: "20px" },
  footerLink: { marginTop: "32px", textAlign: "center", fontSize: "14px" },
};
