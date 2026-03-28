import React, { useEffect, useState } from 'react';
import { dataManager } from '../../services/dataManager';

export default function OrderBook({ symbol }) {
    const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
    const [price, setPrice] = useState(0);
    const [isUp, setIsUp] = useState(true);

    useEffect(() => {
        let lastPrice = 0;
        const unsub = dataManager.subscribe(symbol, (data) => {
            setOrderBook(data.orderBook);
            setPrice(data.ticker.price);
            if (data.ticker.price !== lastPrice) {
                setIsUp(data.ticker.price >= lastPrice);
                lastPrice = data.ticker.price;
            }
        });
        return unsub;
    }, [symbol]);

    const askRows = [...orderBook.asks].reverse().slice(0, 15);
    const bidRows = orderBook.bids.slice(0, 15);

    const maxTotal = Math.max(
        (askRows[0]?.total || 0), 
        (bidRows[bidRows.length - 1]?.total || 0)
    ) * 1.5;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={{flex: 1, color: 'var(--color-text-muted)'}}>Price(USD)</div>
                <div style={{flex: 1, textAlign: 'right', color: 'var(--color-text-muted)'}}>Size</div>
                <div style={{flex: 1, textAlign: 'right', color: 'var(--color-text-muted)'}}>Total</div>
            </div>

            <div style={styles.orderList}>
                {askRows.map((ask, i) => {
                    const depthWidth = `${(ask.total / maxTotal) * 100}%`;
                    return (
                        <div key={`ask-${i}`} style={styles.row}>
                            <div style={styles.depthBarRed(depthWidth)} />
                            <div style={{...styles.cell, width: '33.3%', color: 'var(--color-coral-red)'}}>{ask.price.toFixed(4)}</div>
                            <div style={{...styles.cell, width: '33.3%', textAlign: 'right'}}>{ask.size.toFixed(3)}</div>
                            <div style={{...styles.cell, width: '33.3%', textAlign: 'right'}}>{ask.total.toFixed(3)}</div>
                        </div>
                    );
                })}

                <div style={styles.spreadRow}>
                    <span style={{ 
                        fontSize: '16px', 
                        fontWeight: 'bold',
                        color: isUp ? 'var(--color-neon-green)' : 'var(--color-coral-red)'
                    }}>
                        {price.toFixed(4)} {isUp ? '↑' : '↓'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textDecoration: 'underline' }}>
                        More Data
                    </span>
                </div>

                {bidRows.map((bid, i) => {
                    const depthWidth = `${(bid.total / maxTotal) * 100}%`;
                    return (
                        <div key={`bid-${i}`} style={styles.row}>
                            <div style={styles.depthBarGreen(depthWidth)} />
                            <div style={{...styles.cell, width: '33.3%', color: 'var(--color-neon-green)'}}>{bid.price.toFixed(4)}</div>
                            <div style={{...styles.cell, width: '33.3%', textAlign: 'right'}}>{bid.size.toFixed(3)}</div>
                            <div style={{...styles.cell, width: '33.3%', textAlign: 'right'}}>{bid.total.toFixed(3)}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const styles = {
    container: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '8px 0',
        fontSize: '11px',
        userSelect: 'none'
    },
    header: {
        display: 'flex',
        padding: '0 16px 8px 16px',
    },
    orderList: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    row: {
        display: 'flex',
        position: 'relative',
        padding: '2px 16px',
        cursor: 'pointer',
        alignItems: 'center',
    },
    cell: { zIndex: 1 },
    depthBarRed: (width) => ({ position: 'absolute', right: 0, top: 0, bottom: 0, width, backgroundColor: 'rgba(246, 70, 93, 0.1)', zIndex: 0 }),
    depthBarGreen: (width) => ({ position: 'absolute', right: 0, top: 0, bottom: 0, width, backgroundColor: 'rgba(14, 203, 129, 0.1)', zIndex: 0 }),
    spreadRow: { padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #2B3139', borderBottom: '1px solid #2B3139', margin: '4px 0' }
};
