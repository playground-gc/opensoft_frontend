import React, { useState, useEffect } from 'react';
import { useOrderSubmit } from '../../hooks/useOrderSubmit';
import { usePortfolio } from '../../hooks/usePortfolio';
import { dataManager } from '../../services/dataManager';

export default function PlaceOrder({ symbol, isAuthenticated }) {
    const { submit, isSubmitting, error: submitError } = useOrderSubmit();
    const { cashBalance, holdings } = usePortfolio(isAuthenticated);
    const [marginMode, setMarginMode] = useState('Spot');
    const [orderType, setOrderType] = useState('Limit');
    const [price, setPrice] = useState('');
    const [amountBuy, setAmountBuy] = useState('');
    const [amountSell, setAmountSell] = useState('');

    const [currentPrice, setCurrentPrice] = useState(0);
    const [buyError, setBuyError] = useState('');
    const [sellError, setSellError] = useState('');

    const availableBalanceUSD = cashBalance;
    const heldPosition = holdings.find(h => h.symbol === symbol);
    const availableBalanceCrypto = heldPosition ? heldPosition.quantity : 0;

    useEffect(() => {
        const unsub = dataManager.subscribe(symbol, (data) => {
             setCurrentPrice(data.ticker.price);
             if (orderType === 'Limit' && price === '') {
                 setPrice(data.ticker.price.toFixed(2));
             }
        });
        return unsub;
    }, [symbol, orderType]);

    const handleBuyPct = (pct) => {
        const activePrice = orderType === 'Market' ? currentPrice : (parseFloat(price) || currentPrice);
        const maxSpend = availableBalanceUSD * (pct / 100);
        const calculatedAmt = maxSpend / activePrice;
        setAmountBuy(calculatedAmt.toFixed(4));
    };

    const handleSellPct = (pct) => {
        const maxSpend = availableBalanceCrypto * (pct / 100);
        setAmountSell(maxSpend.toFixed(4));
    };

    const placeBuy = async () => {
        setBuyError('');
        const qty = parseFloat(amountBuy);
        if (!qty || qty <= 0) { setBuyError('Enter a valid amount'); return; }
        if (orderType !== 'Market' && (!parseFloat(price) || parseFloat(price) <= 0)) {
            setBuyError('Enter a valid price'); return;
        }
        const typeMap = { 'Limit': 'limit', 'Market': 'market', 'Stop Limit': 'stop_limit' };
        const result = await submit({
            symbol,
            type: typeMap[orderType] || 'limit',
            side: 'buy',
            price: orderType === 'Market' ? null : price,
            quantity: qty
        });
        if (result.success) {
            alert('Buy Order Placed Successfully!');
            setAmountBuy('');
        } else {
            setBuyError(result.error || 'Order failed');
        }
    };

    const placeSell = async () => {
        setSellError('');
        const qty = parseFloat(amountSell);
        if (!qty || qty <= 0) { setSellError('Enter a valid amount'); return; }
        if (orderType !== 'Market' && (!parseFloat(price) || parseFloat(price) <= 0)) {
            setSellError('Enter a valid price'); return;
        }
        const typeMap = { 'Limit': 'limit', 'Market': 'market', 'Stop Limit': 'stop_limit' };
        const result = await submit({
            symbol,
            type: typeMap[orderType] || 'limit',
            side: 'sell',
            price: orderType === 'Market' ? null : price,
            quantity: qty
        });
        if (result.success) {
            alert('Sell Order Placed Successfully!');
            setAmountSell('');
        } else {
            setSellError(result.error || 'Order failed');
        }
    };

    const baseAsset = symbol.replace('_S', '');
    const quoteAsset = 'USD';

    return (
        <div style={styles.container}>

            {/* Second Row: Limit / Market / Stop Limit */}
            <div style={styles.tabsStrip}>
                {['Limit', 'Market', 'Stop Limit'].map(t => (
                    <span 
                       key={t}
                       style={{...styles.tab, color: orderType === t ? '#FCD535' : 'var(--color-text-muted)'}}
                       onClick={() => setOrderType(t)}
                    >
                       {t}
                    </span>
                 ))}
            </div>

            <div style={styles.formsContainer}>
                {/* BUY COLUMN */}
                <div style={styles.formCol}>
                    <div style={styles.balanceRow}>
                        <span style={styles.balanceAvbl}>Avbl</span>
                        <span>{availableBalanceUSD.toLocaleString()} {quoteAsset}</span>
                    </div>

                    <div style={styles.inputGroup}>
                        <span style={styles.prefix}>Price</span>
                        <input 
                            style={styles.input} 
                            disabled={orderType === 'Market'} 
                            placeholder={orderType === 'Market' ? 'Market' : ''}
                            value={orderType === 'Market' ? '' : price}
                            onChange={(e) => setPrice(e.target.value)}
                        />
                        <span style={styles.suffix}>{quoteAsset}</span>
                    </div>

                    <div style={styles.inputGroup}>
                        <span style={styles.prefix}>Amount</span>
                        <input 
                            style={styles.input}
                            value={amountBuy}
                            onChange={(e) => setAmountBuy(e.target.value)}
                        />
                        <span style={styles.suffix}>{baseAsset}</span>
                    </div>

                    <div style={styles.sliderContainer}>
                        <div style={styles.sliderLine} />
                        {[0, 25, 50, 75, 100].map(pct => (
                            <div 
                                key={`buy-pct-${pct}`} 
                                style={styles.diamond} 
                                onClick={() => handleBuyPct(pct)}
                                title={`${pct}%`}
                            />
                        ))}
                    </div>

                    <div style={styles.chkRow}>
                        <input type="checkbox" id="tpslBuy" style={styles.chk} />
                        <label htmlFor="tpslBuy" style={styles.chkLabel}>TP/SL</label>
                    </div>

                    {buyError && <div style={styles.errorMsg}>{buyError}</div>}
                    <button
                        style={{...styles.buyBtn, opacity: (isSubmitting || !isAuthenticated) ? 0.5 : 1, cursor: (isSubmitting || !isAuthenticated) ? 'not-allowed' : 'pointer'}}
                        onClick={isAuthenticated ? placeBuy : undefined}
                        disabled={isSubmitting || !isAuthenticated}
                        title={!isAuthenticated ? 'Please log in to trade' : ''}
                    >
                        {isSubmitting ? 'Placing...' : !isAuthenticated ? 'Login to Buy' : `Buy ${baseAsset}`}
                    </button>
                </div>

                {/* SELL COLUMN */}
                <div style={styles.formCol}>
                    <div style={styles.balanceRow}>
                        <span style={styles.balanceAvbl}>Avbl</span>
                        <span>{availableBalanceCrypto.toLocaleString()} {baseAsset}</span>
                    </div>

                    <div style={styles.inputGroup}>
                        <span style={styles.prefix}>Price</span>
                        <input
                            style={styles.input}
                            disabled={orderType === 'Market'}
                            placeholder={orderType === 'Market' ? 'Market' : ''}
                            value={orderType === 'Market' ? '' : price}
                            onChange={(e) => setPrice(e.target.value)}
                        />
                        <span style={styles.suffix}>{quoteAsset}</span>
                    </div>

                    <div style={styles.inputGroup}>
                        <span style={styles.prefix}>Amount</span>
                        <input
                           style={styles.input}
                           value={amountSell}
                           onChange={(e) => setAmountSell(e.target.value)}
                        />
                        <span style={styles.suffix}>{baseAsset}</span>
                    </div>

                    <div style={styles.sliderContainer}>
                        <div style={styles.sliderLine} />
                        {[0, 25, 50, 75, 100].map(pct => (
                            <div
                                key={`sell-pct-${pct}`}
                                style={styles.diamond}
                                onClick={() => handleSellPct(pct)}
                                title={`${pct}%`}
                            />
                        ))}
                    </div>

                    <div style={styles.chkRow}>
                        <input type="checkbox" id="tpslSell" style={styles.chk} />
                        <label htmlFor="tpslSell" style={styles.chkLabel}>TP/SL</label>
                    </div>

                    {sellError && <div style={styles.errorMsg}>{sellError}</div>}
                    <button
                        style={{...styles.sellBtn, opacity: (isSubmitting || !isAuthenticated) ? 0.5 : 1, cursor: (isSubmitting || !isAuthenticated) ? 'not-allowed' : 'pointer'}}
                        onClick={isAuthenticated ? placeSell : undefined}
                        disabled={isSubmitting || !isAuthenticated}
                        title={!isAuthenticated ? 'Please log in to trade' : ''}
                    >
                        {isSubmitting ? 'Placing...' : !isAuthenticated ? 'Login to Sell' : `Sell ${baseAsset}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: { padding: '12px 16px', display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none' },
    marginStrip: { display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px' },
    marginTab: { cursor: 'pointer' },
    tabsStrip: { display: 'flex', gap: '16px', fontWeight: 'bold', fontSize: '11px', marginBottom: '12px' },
    tab: { cursor: 'pointer' },
    formsContainer: { display: 'flex', gap: '12px', flex: 1 },
    formCol: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' },
    balanceRow: { display: 'flex', justifyContent: 'space-between', fontSize: '10px' },
    balanceAvbl: { color: 'var(--color-text-muted)' },
    inputGroup: { display: 'flex', alignItems: 'center', backgroundColor: '#2B3139', borderRadius: '4px', padding: '6px 8px', height: '32px' },
    prefix: { color: 'var(--color-text-muted)', fontSize: '11px', width: '45px' },
    input: { flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none', textAlign: 'right', fontFamily: 'inherit', fontSize: '11px', width: '100%' },
    suffix: { color: 'white', fontSize: '11px', marginLeft: '8px' },
    sliderContainer: { position: 'relative', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0' },
    sliderLine: { position: 'absolute', top: '5px', left: '4px', right: '4px', height: '2px', backgroundColor: '#2B3139', zIndex: 0 },
    diamond: { width: '8px', height: '8px', transform: 'rotate(45deg)', backgroundColor: '#848E9C', zIndex: 1, cursor: 'pointer' },
    chkRow: { display: 'flex', alignItems: 'center', fontSize: '11px', margin: '4px 0', gap: '6px' },
    chk: { accentColor: '#FCD535', cursor: 'pointer' },
    chkLabel: { color: 'var(--color-text-muted)', cursor: 'pointer' },
    buyBtn: { backgroundColor: '#0ECB81', color: 'white', border: 'none', borderRadius: '4px', height: '36px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: 'auto' },
    sellBtn: { backgroundColor: '#F6465D', color: 'white', border: 'none', borderRadius: '4px', height: '36px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: 'auto' },
    errorMsg: { color: '#F6465D', fontSize: '10px', textAlign: 'center' }
};
