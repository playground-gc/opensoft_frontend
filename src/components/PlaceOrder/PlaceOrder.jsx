import React, { useState, useEffect } from 'react';
import { useOrderSubmit } from '../../hooks/useOrderSubmit';
import { usePortfolio } from '../../hooks/usePortfolio';
import { dataManager } from '../../services/dataManager';

// Must be defined OUTSIDE the parent component so React doesn't
// treat it as a new component type on every render (which would
// unmount/remount the <input> and kill keyboard focus).
function InputRow({ label, value, onChange, disabled, placeholder, suffix }) {
    return (
        <div style={styles.inputGroup}>
            <span style={styles.prefix}>{label}</span>
            <input
                style={styles.input}
                disabled={disabled}
                placeholder={placeholder || ''}
                value={value}
                onChange={e => onChange(e.target.value)}
            />
            <span style={styles.suffix}>{suffix}</span>
        </div>
    );
}

export default function PlaceOrder({ symbol, isAuthenticated }) {
    const { submit } = useOrderSubmit();
    const { cashBalance, holdings } = usePortfolio(isAuthenticated);
    const [orderType, setOrderType] = useState('Limit');

    // Limit / Market
    const [price, setPrice] = useState('');
    // Stop Limit / Stop Market
    const [stopPrice, setStopPrice] = useState('');
    const [limitPrice, setLimitPrice] = useState('');

    const [amountBuy, setAmountBuy] = useState('');
    const [amountSell, setAmountSell] = useState('');

    const [currentPrice, setCurrentPrice] = useState(0);
    const [buyError, setBuyError] = useState('');
    const [sellError, setSellError] = useState('');
    const [isBuying, setIsBuying] = useState(false);
    const [isSelling, setIsSelling] = useState(false);

    const availableBalanceUSD = cashBalance;
    const heldPosition = holdings.find(h => h.symbol === symbol);
    const availableBalanceCrypto = heldPosition ? heldPosition.quantity : 0;

    const isStopOrder   = orderType === 'Stop Limit' || orderType === 'Stop Market';
    const isStopLimit   = orderType === 'Stop Limit';
    const isMarket      = orderType === 'Market';
    const isLimit       = orderType === 'Limit';

    useEffect(() => {
        const unsub = dataManager.subscribe(symbol, (data) => {
            setCurrentPrice(data.ticker.price);
            if (isLimit && price === '') {
                setPrice(data.ticker.price.toFixed(2));
            }
        });
        return unsub;
    }, [symbol, orderType]);

    const handleBuyPct = (pct) => {
        const activePrice = isMarket
            ? currentPrice
            : isStopOrder
              ? (parseFloat(limitPrice) || parseFloat(stopPrice) || currentPrice)
              : (parseFloat(price) || currentPrice);
        const calculatedAmt = (availableBalanceUSD * (pct / 100)) / activePrice;
        setAmountBuy(calculatedAmt.toFixed(4));
    };

    const handleSellPct = (pct) => {
        setAmountSell((availableBalanceCrypto * (pct / 100)).toFixed(4));
    };

    const validateStopFields = (setter) => {
        if (!parseFloat(stopPrice) || parseFloat(stopPrice) <= 0) {
            setter('Enter a valid stop price'); return false;
        }
        if (isStopLimit && (!parseFloat(limitPrice) || parseFloat(limitPrice) <= 0)) {
            setter('Enter a valid limit price'); return false;
        }
        return true;
    };

    const typeMap = {
        'Limit':       'limit',
        'Market':      'market',
        'Stop Limit':  'stop_limit',
        'Stop Market': 'stop_market',
    };

    const placeBuy = async () => {
        setBuyError('');
        const qty = parseFloat(amountBuy);
        if (!qty || qty <= 0) { setBuyError('Enter a valid amount'); return; }
        if (isLimit && (!parseFloat(price) || parseFloat(price) <= 0)) {
            setBuyError('Enter a valid price'); return;
        }
        if (isStopOrder && !validateStopFields(setBuyError)) return;

        setIsBuying(true);
        const result = await submit({
            symbol,
            type: typeMap[orderType],
            side: 'buy',
            price:       isLimit  ? price     : undefined,
            stop_price:  isStopOrder ? stopPrice  : undefined,
            limit_price: isStopLimit ? limitPrice : undefined,
            quantity: qty,
        });
        setIsBuying(false);
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
        if (isLimit && (!parseFloat(price) || parseFloat(price) <= 0)) {
            setSellError('Enter a valid price'); return;
        }
        if (isStopOrder && !validateStopFields(setSellError)) return;

        setIsSelling(true);
        const result = await submit({
            symbol,
            type: typeMap[orderType],
            side: 'sell',
            price:       isLimit  ? price     : undefined,
            stop_price:  isStopOrder ? stopPrice  : undefined,
            limit_price: isStopLimit ? limitPrice : undefined,
            quantity: qty,
        });
        setIsSelling(false);
        if (result.success) {
            alert('Sell Order Placed Successfully!');
            setAmountSell('');
        } else {
            setSellError(result.error || 'Order failed');
        }
    };

    const baseAsset  = symbol.replace('_S', '');
    const quoteAsset = 'USD';

    return (
        <div style={styles.container}>

            {/* Order-type tabs */}
            <div style={styles.tabsStrip}>
                {['Limit', 'Market', 'Stop Limit', 'Stop Market'].map(t => (
                    <span
                        key={t}
                        style={{
                            ...styles.tab,
                            color: orderType === t ? '#FCD535' : 'var(--color-text-muted)',
                            borderBottom: orderType === t ? '2px solid #FCD535' : '2px solid transparent',
                        }}
                        onClick={() => setOrderType(t)}
                    >
                        {t}
                    </span>
                ))}
            </div>

            <div style={styles.formsContainer}>

                {/* ── BUY COLUMN ── */}
                <div style={styles.formCol}>
                    <div style={styles.balanceRow}>
                        <span style={styles.balanceAvbl}>Avbl</span>
                        <span>{availableBalanceUSD.toLocaleString()} {quoteAsset}</span>
                    </div>

                    {/* Limit price */}
                    {isLimit && (
                        <InputRow label="Price" value={price} onChange={setPrice} suffix={quoteAsset} />
                    )}

                    {/* Market — no price input */}
                    {isMarket && (
                        <InputRow label="Price" value="" onChange={() => {}} disabled placeholder="Market" suffix={quoteAsset} />
                    )}

                    {/* Stop fields */}
                    {isStopOrder && (
                        <>
                            <InputRow
                                label="Stop"
                                value={stopPrice}
                                onChange={setStopPrice}
                                suffix={quoteAsset}
                                placeholder="Trigger price"
                            />
                            {isStopLimit && (
                                <InputRow
                                    label="Limit"
                                    value={limitPrice}
                                    onChange={setLimitPrice}
                                    suffix={quoteAsset}
                                    placeholder="Limit price after trigger"
                                />
                            )}
                        </>
                    )}

                    <InputRow label="Amount" value={amountBuy} onChange={setAmountBuy} suffix={baseAsset} />

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

                    {isStopOrder && (
                        <div style={styles.stopHint}>
                            {orderType === 'Stop Limit'
                                ? 'When market hits Stop → limit order at Limit price'
                                : 'When market hits Stop → market order executes'}
                        </div>
                    )}

                    {buyError && <div style={styles.errorMsg}>{buyError}</div>}
                    <button
                        style={{ ...styles.buyBtn, opacity: (isBuying || !isAuthenticated) ? 0.5 : 1, cursor: (isBuying || !isAuthenticated) ? 'not-allowed' : 'pointer' }}
                        onClick={isAuthenticated ? placeBuy : undefined}
                        disabled={isBuying || !isAuthenticated}
                        title={!isAuthenticated ? 'Please log in to trade' : ''}
                    >
                        {isBuying ? 'Placing…' : !isAuthenticated ? 'Login to Buy' : `Buy ${baseAsset}`}
                    </button>
                </div>

                {/* ── SELL COLUMN ── */}
                <div style={styles.formCol}>
                    <div style={styles.balanceRow}>
                        <span style={styles.balanceAvbl}>Avbl</span>
                        <span>{availableBalanceCrypto.toLocaleString()} {baseAsset}</span>
                    </div>

                    {isLimit && (
                        <InputRow label="Price" value={price} onChange={setPrice} suffix={quoteAsset} />
                    )}

                    {isMarket && (
                        <InputRow label="Price" value="" onChange={() => {}} disabled placeholder="Market" suffix={quoteAsset} />
                    )}

                    {isStopOrder && (
                        <>
                            <InputRow
                                label="Stop"
                                value={stopPrice}
                                onChange={setStopPrice}
                                suffix={quoteAsset}
                                placeholder="Trigger price"
                            />
                            {isStopLimit && (
                                <InputRow
                                    label="Limit"
                                    value={limitPrice}
                                    onChange={setLimitPrice}
                                    suffix={quoteAsset}
                                    placeholder="Limit price after trigger"
                                />
                            )}
                        </>
                    )}

                    <InputRow label="Amount" value={amountSell} onChange={setAmountSell} suffix={baseAsset} />

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

                    {isStopOrder && (
                        <div style={styles.stopHint}>
                            {orderType === 'Stop Limit'
                                ? 'When market hits Stop → limit order at Limit price'
                                : 'When market hits Stop → market order executes'}
                        </div>
                    )}

                    {sellError && <div style={styles.errorMsg}>{sellError}</div>}
                    <button
                        style={{ ...styles.sellBtn, opacity: (isSelling || !isAuthenticated) ? 0.5 : 1, cursor: (isSelling || !isAuthenticated) ? 'not-allowed' : 'pointer' }}
                        onClick={isAuthenticated ? placeSell : undefined}
                        disabled={isSelling || !isAuthenticated}
                        title={!isAuthenticated ? 'Please log in to trade' : ''}
                    >
                        {isSelling ? 'Placing…' : !isAuthenticated ? 'Login to Sell' : `Sell ${baseAsset}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container:      { padding: '12px 16px', display: 'flex', flexDirection: 'column', height: '100%' },
    tabsStrip:      { display: 'flex', gap: '14px', fontWeight: 'bold', fontSize: '11px', marginBottom: '12px', flexWrap: 'wrap' },
    tab:            { cursor: 'pointer', paddingBottom: '4px' },
    formsContainer: { display: 'flex', gap: '12px', flex: 1 },
    formCol:        { flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' },
    balanceRow:     { display: 'flex', justifyContent: 'space-between', fontSize: '10px' },
    balanceAvbl:    { color: 'var(--color-text-muted)' },
    inputGroup:     { display: 'flex', alignItems: 'center', backgroundColor: '#2B3139', borderRadius: '4px', padding: '6px 8px', height: '32px' },
    prefix:         { color: 'var(--color-text-muted)', fontSize: '11px', width: '45px', flexShrink: 0 },
    input:          { flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none', textAlign: 'right', fontFamily: 'inherit', fontSize: '11px', width: '100%', userSelect: 'text', pointerEvents: 'auto' },
    suffix:         { color: 'white', fontSize: '11px', marginLeft: '8px' },
    sliderContainer:{ position: 'relative', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0' },
    sliderLine:     { position: 'absolute', top: '5px', left: '4px', right: '4px', height: '2px', backgroundColor: '#2B3139', zIndex: 0 },
    diamond:        { width: '8px', height: '8px', transform: 'rotate(45deg)', backgroundColor: '#848E9C', zIndex: 1, cursor: 'pointer' },
    stopHint:       { fontSize: '10px', color: 'var(--color-text-muted)', lineHeight: '1.3', marginTop: '2px' },
    buyBtn:         { backgroundColor: '#0ECB81', color: 'white', border: 'none', borderRadius: '4px', height: '36px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: 'auto' },
    sellBtn:        { backgroundColor: '#F6465D', color: 'white', border: 'none', borderRadius: '4px', height: '36px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: 'auto' },
    errorMsg:       { color: '#F6465D', fontSize: '10px', textAlign: 'center' },
};
