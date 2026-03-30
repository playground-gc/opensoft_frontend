import React, { useState, useEffect } from 'react';
import { dataManager } from '../../services/dataManager';

export default function UserPanel() {
    const [activeTab, setActiveTab] = useState('Trade History');
    const tabs = ['Open Orders(0)', 'Order History', 'Trade History', 'Holdings', 'Bots'];
    
    const [trades, setTrades] = useState([]);

    useEffect(() => {
        // Just listening to BTC/USDT trades for demo purposes
        const unsub = dataManager.subscribe('BTC/USDT', (data) => {
            setTrades([...data.latestTrades]);
        });
        return unsub;
    }, []);

    return (
        <div style={styles.container}>
            <div style={styles.tabsStrip}>
                {tabs.map(tab => (
                    <div 
                        key={tab} 
                        style={{
                            ...styles.tab, 
                            color: activeTab === tab ? '#FCD535' : 'var(--color-text-muted)',
                            borderBottom: activeTab === tab ? '2px solid #FCD535' : '2px solid transparent'
                        }}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </div>
                ))}
            </div>
            
            <div style={styles.content}>
                {activeTab === 'Trade History' && (
                    <div style={styles.table}>
                        <div style={styles.headerRow}>
                            <div style={{...styles.cell, flex: 1}}>Date</div>
                            <div style={{...styles.cell, flex: 1}}>Trading Pair</div>
                            <div style={{...styles.cell, flex: 1}}>Side</div>
                            <div style={{...styles.cell, flex: 1}}>Price</div>
                            <div style={{...styles.cell, flex: 1}}>Executed</div>
                            <div style={{...styles.cell, flex: 1}}>Role</div>
                        </div>
                        <div style={styles.list}>
                            {trades.map((trade, i) => {
                                const side = trade.isBuyerMaker ? 'Sell' : 'Buy';
                                const color = side === 'Buy' ? 'var(--color-neon-green)' : 'var(--color-coral-red)';
                                
                                return (
                                    <div key={`trade-${trade.time}-${i}`} style={styles.row}>
                                        <div style={{...styles.cell, flex: 1}}>
                                            {new Date(trade.time).toLocaleTimeString()}
                                        </div>
                                        <div style={{...styles.cell, flex: 1}}>BTC/USDT</div>
                                        <div style={{...styles.cell, flex: 1, color, fontWeight: 'bold'}}>{side}</div>
                                        <div style={{...styles.cell, flex: 1}}>{trade.price.toFixed(2)}</div>
                                        <div style={{...styles.cell, flex: 1}}>{trade.size.toFixed(3)}</div>
                                        <div style={{...styles.cell, flex: 1}}>
                                            {trade.isBuyerMaker ? 'Maker' : 'Taker'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {activeTab === 'Holdings' && (
                    <div style={styles.portfolio}>
                        <div style={styles.balanceCard}>
                            <div style={styles.balanceLabel}>Estimated Balance</div>
                            <div style={styles.balanceValue}>$ 100,000.00 <span style={styles.balanceDim}>USD</span></div>
                        </div>
                    </div>
                )}
                
                {['Open Orders(0)', 'Order History', 'Bots'].includes(activeTab) && (
                    <div style={styles.empty}>
                        No data available
                    </div>
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
    balanceCard: { display: 'flex', flexDirection: 'column' },
    balanceLabel: { color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '8px' },
    balanceValue: { fontSize: '24px', fontWeight: 'bold' },
    balanceDim: { fontSize: '14px', fontWeight: 'normal' }
};
