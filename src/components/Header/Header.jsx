import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dataManager } from "../../services/dataManager";
import { useAuthStore } from "../../store";
import AuthModal from "../AuthModal/AuthModal";

export default function Header({ symbol }) {
  const { token, username, clearAuth } = useAuthStore();
  const [ticker, setTicker] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!token);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userName, setUserName] = useState(username || "");

  useEffect(() => {
    const unsub = dataManager.subscribe(symbol, (data) => {
      setTicker(data.ticker);
    });
    return unsub;
  }, [symbol]);

  useEffect(() => {
    setIsLoggedIn(!!token);
    if (username) setUserName(username);
  }, [token, username]);

  if (!ticker) return <div style={styles.header}>Loading...</div>;

  const isUp = ticker.change >= 0;

  return (
    <div style={styles.header}>
      <div style={styles.leftGroup}>
        <div style={styles.symbolGroup}>
          <h1 style={styles.symbol}>{ticker.symbol}</h1>
          <a href="#" style={styles.link}>
            Synthetic Asset
          </a>
        </div>

        <div style={styles.statGroup}>
          <div style={styles.statValue}>
            <span
              className={isUp ? "up-color" : "down-color"}
              style={styles.price}
            >
              {ticker.price.toFixed(2)}
            </span>
          </div>
          <div style={styles.statLabel}>$ {ticker.price.toFixed(2)}</div>
        </div>

        <div style={styles.statGroup}>
          <div style={styles.statLabel}>24h Change</div>
          <div
            className={isUp ? "up-color" : "down-color"}
            style={styles.statValue}
          >
            {isUp ? "+" : ""}
            {ticker.change.toFixed(2)}%
          </div>
        </div>

        <div style={styles.statGroup}>
          <div style={styles.statLabel}>24h High</div>
          <div style={styles.statValue}>{ticker.high.toFixed(4)}</div>
        </div>

        <div style={styles.statGroup}>
          <div style={styles.statLabel}>24h Low</div>
          <div style={styles.statValue}>{ticker.low.toFixed(4)}</div>
        </div>

        <div style={styles.statGroup}>
          <div style={styles.statLabel}>24h Vol</div>
          <div style={styles.statValue}>{ticker.volume.toLocaleString()}</div>
        </div>
      </div>

      <div style={styles.rightGroup}>
        {userName ? (
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                color: "#e8a020",
                fontWeight: "600",
                textShadow: "0 0 8px rgba(232, 160, 32, 0.4)",
                letterSpacing: "1px",
                textTransform: "uppercase",
                fontSize: "13px",
              }}
            >
              {userName}
            </div>
            <Link to="/portfolio" style={styles.profileBtn}>
              Profile
            </Link>
            <button
              onClick={() => {
                clearAuth();
                window.location.reload();
              }}
              style={styles.logoutBtn}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div
            style={{
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Guest Mode
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    height: "100%",
    width: "100%",
  },
  leftGroup: { display: "flex", alignItems: "center", gap: "32px" },
  rightGroup: { display: "flex", alignItems: "center", gap: "16px" },
  symbolGroup: { display: "flex", flexDirection: "column" },
  symbol: {
    fontSize: "24px",
    fontWeight: "800",
    margin: 0,
    color: "#fff",
    textShadow: "0 0 10px rgba(255, 255, 255, 0.2)",
  },
  link: {
    fontSize: "11px",
    color: "rgba(255, 255, 255, 0.5)",
    textDecoration: "none",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  statGroup: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: "11px",
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: "4px",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  statValue: { fontSize: "14px", fontWeight: "600", color: "#fff" },
  price: { fontSize: "18px", fontWeight: "bold" },
  loginBtn: {
    backgroundColor: "transparent",
    color: "#e8a020",
    border: "1px solid rgba(232, 160, 32, 0.3)",
    borderRadius: "6px",
    fontWeight: "600",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  signupBtn: {
    backgroundColor: "rgba(232, 160, 32, 0.1)",
    color: "#e8a020",
    border: "1px solid rgba(232, 160, 32, 0.3)",
    borderRadius: "6px",
    fontWeight: "600",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  profileBtn: {
    backgroundColor: "rgba(232, 160, 32, 0.1)",
    color: "#e8a020",
    border: "1px solid rgba(232, 160, 32, 0.3)",
    borderRadius: "6px",
    fontWeight: "600",
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: "12px",
    textDecoration: "none",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  logoutBtn: {
    backgroundColor: "rgba(246, 70, 93, 0.1)",
    color: "#f6465d",
    border: "1px solid rgba(246, 70, 93, 0.3)",
    borderRadius: "6px",
    fontWeight: "600",
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
};
