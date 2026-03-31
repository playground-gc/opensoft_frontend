import React, { useEffect, useState } from 'react';
import { dataManager } from '../../services/dataManager';
import { useAuthStore } from '../../store';
import AuthModal from '../AuthModal/AuthModal';

export default function Header({ symbol }) {
  const { token, username } = useAuthStore();
  const [ticker, setTicker] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!token);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userName, setUserName] = useState(username || '');

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
            <a href="#" style={styles.link}>Synthetic Asset</a>
          </div>
          
          <div style={styles.statGroup}>
            <div style={styles.statValue}>
                <span className={isUp ? 'up-color' : 'down-color'} style={styles.price}>
                    {ticker.price.toFixed(2)}
                </span>
            </div>
            <div style={styles.statLabel}>$ {ticker.price.toFixed(2)}</div>
          </div>
          
          <div style={styles.statGroup}>
            <div style={styles.statLabel}>24h Change</div>
            <div className={isUp ? 'up-color' : 'down-color'} style={styles.statValue}>
                {isUp ? '+' : ''}{ticker.change.toFixed(2)}%
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
              <div style={{color: '#FCD535', fontWeight: 'bold'}}>{userName}</div>
          ) : (
             <div style={{color: 'var(--color-text-muted)', fontSize: '12px'}}>Guest Mode</div>
          )}
      </div>
    </div>
  );
}

const styles = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: '100%', width: '100%' },
  leftGroup: { display: 'flex', alignItems: 'center', gap: '24px' },
  rightGroup: { display: 'flex', alignItems: 'center', gap: '12px' },
  symbolGroup: { display: 'flex', flexDirection: 'column' },
  symbol: { fontSize: '20px', fontWeight: 'bold', margin: 0, color: 'var(--color-text-main)' },
  link: { fontSize: '11px', color: 'var(--color-text-muted)', textDecoration: 'underline' },
  statGroup: { display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  statLabel: { fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '2px' },
  statValue: { fontSize: '12px', fontWeight: '500' },
  price: { fontSize: '16px', fontWeight: 'bold' },
  loginBtn: { backgroundColor: 'transparent', color: '#FCD535', border: 'none', fontWeight: 'bold', padding: '6px 16px', cursor: 'pointer', fontSize: '14px' },
  signupBtn: { backgroundColor: '#FCD535', color: '#1E2329', border: 'none', borderRadius: '4px', fontWeight: 'bold', padding: '6px 16px', cursor: 'pointer', fontSize: '14px' }
};
