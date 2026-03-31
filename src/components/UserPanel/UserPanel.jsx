import React, { useState } from 'react';
import { usePortfolio } from '../../hooks/usePortfolio';

export default function UserPanel({ isAuthenticated }) {
    const [activeTab, setActiveTab] = useState('Holdings');
    const { holdings, orders, trades, unrealisedPnL, totalEquity, cashBalance, loading } = usePortfolio(isAuthenticated);
    
    const tabs = [`Open Orders(${orders.length})`, 'Holdings', `Trade History(${trades.length})`, 'Bots'];
    
    return (
        <div style={styles.container}>
            <div style={styles.tabsStrip}>
                {tabs.map(tab => (
                    <div 
                        key={tab} 
                        style={{
                            ...styles.tab, 
                            color: activeTab.startsWith(tab.split('(')[0]) ? '#FCD535' : 'var(--color-text-muted)',
                            borderBottom: activeTab.startsWith(tab.split('(')[0]) ? '2px solid #FCD535' : '2px solid transparent'
                        }}
                        onClick={() => setActiveTab(tab.split('(')[0])}
                    >
                        {tab}
                    </div>
                ))}
            </div>
            
            <div style={styles.content}>
                {!isAuthenticated ? (
                    <div style={styles.empty}>Please log in to view portfolio</div>
                ) : loading ? (
                    <div style={styles.empty}>Loading...</div>
                ) : (
                    <>
                        {activeTab === 'Holdings' && (
                            <div style={styles.table}>
                                <div style={styles.headerRow}>
                                    <div style={{...styles.cell, flex: 2}}>Symbol</div>
                                    <div style={{...styles.cell, flex: 1}}>Quantity</div>
                                    <div style={{...styles.cell, flex: 1}}>Avg Cost</div>
                                    <div style={{...styles.cell, flex: 1}}>Price</div>
                                    <div style={{...styles.cell, flex: 1, textAlign: 'right'}}>P&L</div>
                                </div>
                                <div style={styles.list}>
                                    {holdings.map((h, i) => (
                                        <div key={h.symbol} style={styles.row}>
                                            <div style={{...styles.cell, flex: 2, fontWeight: 'bold'}}>{h.symbol}</div>
                                            <div style={{...styles.cell, flex: 1}}>{h.quantity.toFixed(2)}</div>
                                            <div style={{...styles.cell, flex: 1}}>${h.avg_cost.toFixed(2)}</div>
                                            <div style={{...styles.cell, flex: 1}}>${h.currentPrice.toFixed(2)}</div>
                                            <div style={{...styles.cell, flex: 1, textAlign: 'right', color: h.pnl >= 0 ? 'var(--color-neon-green)' : 'var(--color-coral-red)'}}>
                                                {h.pnl >= 0 ? '+' : ''}{h.pnl.toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                    {holdings.length === 0 && <div style={styles.empty}>No holdings yet</div>}
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'Open Orders' && (
                            <div style={styles.table}>
                                <div style={styles.headerRow}>
                                    <div style={{...styles.cell, flex: 1}}>Symbol</div>
                                    <div style={{...styles.cell, flex: 1}}>Side</div>
                                    <div style={{...styles.cell, flex: 1}}>Price</div>
                                    <div style={{...styles.cell, flex: 1}}>Quantity</div>
                                    <div style={{...styles.cell, flex: 1, textAlign: 'right'}}>Status</div>
                                </div>
                                <div style={styles.list}>
                                    {orders.map((o) => (
                                        <div key={o.id} style={styles.row}>
                                            <div style={{...styles.cell, flex: 1}}>{o.symbol}</div>
                                            <div style={{...styles.cell, flex: 1, color: o.side === 'buy' ? 'var(--color-neon-green)' : 'var(--color-coral-red)'}}>{o.side.toUpperCase()}</div>
                                            <div style={{...styles.cell, flex: 1}}>{o.price ? o.price.toFixed(2) : 'Market'}</div>
                                            <div style={{...styles.cell, flex: 1}}>{o.quantity}</div>
                                            <div style={{...styles.cell, flex: 1, textAlign: 'right', color: 'var(--color-text-muted)'}}>{o.status}</div>
                                        </div>
                                    ))}
                                    {orders.length === 0 && <div style={styles.empty}>No open orders</div>}
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'Trade History' && (
                            <div style={styles.table}>
                                <div style={styles.headerRow}>
                                    <div style={{...styles.cell, flex: 2}}>Symbol</div>
                                    <div style={{...styles.cell, flex: 1}}>Side</div>
                                    <div style={{...styles.cell, flex: 1}}>Price</div>
                                    <div style={{...styles.cell, flex: 1}}>Qty</div>
                                    <div style={{...styles.cell, flex: 2, textAlign: 'right'}}>Time</div>
                                </div>
                                <div style={styles.list}>
                                    {trades.map((t, i) => {
                                        const ts = t.timestamp || t.created_at || t.time;
                                        const timeStr = ts ? new Date(ts).toLocaleTimeString() : '—';
                                        const price = t.price ?? t.fill_price ?? t.executed_price;
                                        const qty = t.quantity ?? t.qty ?? t.amount;
                                        return (
                                            <div key={t.id || t.trade_id || i} style={styles.row}>
                                                <div style={{...styles.cell, flex: 2, fontWeight: 'bold'}}>{t.symbol}</div>
                                                <div style={{...styles.cell, flex: 1, color: t.side === 'buy' ? 'var(--color-neon-green)' : 'var(--color-coral-red)'}}>
                                                    {t.side?.toUpperCase()}
                                                </div>
                                                <div style={{...styles.cell, flex: 1}}>{price != null ? parseFloat(price).toFixed(2) : '—'}</div>
                                                <div style={{...styles.cell, flex: 1}}>{qty != null ? parseFloat(qty).toFixed(4) : '—'}</div>
                                                <div style={{...styles.cell, flex: 2, textAlign: 'right', color: 'var(--color-text-muted)'}}>{timeStr}</div>
                                            </div>
                                        );
                                    })}
                                    {trades.length === 0 && <div style={styles.empty}>No trades yet</div>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'Bots' && (
                            <div style={styles.empty}>Bots coming soon</div>
                        )}

                        <div style={styles.portfolioSummary}>
                             <div style={styles.balanceCard}>
                                <div style={styles.balanceLabel}>Account Equity</div>
                                <div style={styles.balanceValue}>
                                    $ {totalEquity.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    <span style={{...styles.balanceDim, marginLeft: 8, color: unrealisedPnL >= 0 ? 'var(--color-neon-green)' : 'var(--color-coral-red)'}}>
                                        ({unrealisedPnL >= 0 ? '+' : ''}{unrealisedPnL.toFixed(2)})
                                    </span>
                                </div>
                                <div style={{...styles.balanceLabel, marginTop: 4}}>
                                    Cash: ${cashBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </div>
                             </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: { height: '100%', display: 'flex', flexDirection: 'column', padding: '16px' },
    tabsStrip: { display: 'flex', gap: '24px', borderBottom: '1px solid var(--color-bg-border)', marginBottom: '16px' },
    tab: { fontWeight: 'bold', fontSize: '13px', paddingBottom: '12px', cursor: 'pointer' },
    content: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    table: { display: 'flex', flexDirection: 'column', height: '100%' },
    headerRow: { display: 'flex', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '12px' },
    list: { flex: 1, overflowY: 'auto' },
    row: { display: 'flex', fontSize: '12px', padding: '6px 0', alignItems: 'center' },
    cell: { textAlign: 'left' },
    empty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '13px' },
    portfolio: { display: 'flex', padding: '16px 0' },
    portfolioSummary: { borderTop: '1px solid var(--color-bg-border)', paddingTop: '8px', marginTop: '8px' },
    balanceCard: { display: 'flex', flexDirection: 'column' },
    balanceLabel: { color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '8px' },
    balanceValue: { fontSize: '24px', fontWeight: 'bold' },
    balanceDim: { fontSize: '14px', fontWeight: 'normal' }
};
