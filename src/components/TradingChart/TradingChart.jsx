import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CandlestickSeries, LineSeries, BarSeries, AreaSeries, HistogramSeries } from 'lightweight-charts';
import { Maximize, ChevronDown, LineChart } from 'lucide-react';
import { dataManager } from '../../services/dataManager';
import {
    calcSMA, calcEMA, calcWMA, calcBollingerBands, calcVWAP,
    calcSAR, calcSupertrend, calcTRIX,
    calcMACD, calcRSI, calcStochRSI, calcKDJ,
    calcOBV, calcCCI, calcWR, calcMFI, calcVolume
} from '../../utils/indicators';
import IndicatorModal from './IndicatorModal';
import IndicatorPanel from './IndicatorPanel';
import DrawingToolbar from './DrawingToolbar';
import useDrawingTools from './useDrawingTools';

// ─── Default indicator config (MA enabled at startup) ─────────────────────────
const DEFAULT_CONFIG = {
    MA: {
        enabled: true,
        params: {
            lines: [
                { enabled: true,  period: 7,  source: 'close', lineWidth: 1, color: '#FCD535' },
                { enabled: true,  period: 25, source: 'close', lineWidth: 1, color: '#E040FB' },
                { enabled: true,  period: 99, source: 'close', lineWidth: 1, color: '#AB47BC' },
                { enabled: false, period: 0,  source: 'close', lineWidth: 1, color: '#F6465D' },
                { enabled: false, period: 0,  source: 'close', lineWidth: 1, color: '#0ECB81' },
                { enabled: false, period: 0,  source: 'close', lineWidth: 1, color: '#FF9800' },
            ]
        }
    }
};

// ─── Sub-indicator data computer ──────────────────────────────────────────────
function computeSubData(key, candles, params) {
    switch (key) {
        case 'VOL': {
            const volume = calcVolume(candles);
            const volCandles = candles.map(c => ({ ...c, close: c.volume ?? 0 }));
            const ma1 = candles.length >= (params.maVolPeriod1 || 7)  ? calcSMA(volCandles, params.maVolPeriod1 || 7)  : [];
            const ma2 = candles.length >= (params.maVolPeriod2 || 14) ? calcSMA(volCandles, params.maVolPeriod2 || 14) : [];
            return { volume, ma1, ma2 };
        }
        case 'MACD':     return calcMACD(candles, params.fast || 12, params.slow || 26, params.signal || 9);
        case 'RSI':      return calcRSI(candles, params.period || 14);
        case 'KDJ':      return calcKDJ(candles, params.period || 9);
        case 'OBV':      return calcOBV(candles);
        case 'CCI':      return calcCCI(candles, params.period || 20);
        case 'StochRSI': return calcStochRSI(candles, params.rsiPeriod || 14, params.stochPeriod || 14);
        case 'WR':       return calcWR(candles, params.period || 14);
        case 'MFI':      return calcMFI(candles, params.period || 14);
        default:         return null;
    }
}

// ─── Apply main overlay series onto the chart ─────────────────────────────────
function applyMainOverlays(chart, candles, indicatorConfig, overlaySeriesRef) {
    const addLine = (data, color, lineWidth = 1, opts = {}) => {
        if (!data || data.length === 0) return null;
        const s = chart.addSeries(LineSeries, {
            color, lineWidth, priceLineVisible: false, lastValueVisible: true, ...opts
        });
        s.setData(data);
        return s;
    };

    // Multi-line indicators: MA, EMA, WMA
    ['MA', 'EMA', 'WMA'].forEach(key => {
        if (!indicatorConfig[key]?.enabled) return;
        const p = indicatorConfig[key].params;
        const calcFn = key === 'MA' ? calcSMA : key === 'EMA' ? calcEMA : calcWMA;
        const seriesList = [];
        (p.lines || []).forEach(line => {
            if (line.enabled && line.period > 0) {
                const data = calcFn(candles, line.period, line.source || 'close');
                const s = addLine(data, line.color, line.lineWidth || 1);
                if (s) seriesList.push(s);
            }
        });
        if (seriesList.length > 0) overlaySeriesRef.current[key] = seriesList;
    });

    // Bollinger Bands
    if (indicatorConfig.BOLL?.enabled) {
        const p = indicatorConfig.BOLL.params;
        const { upper, middle, lower } = calcBollingerBands(candles, p.period || 20, p.stdDev || 2);
        const uS = addLine(upper,  p.upperColor  || '#2962FF', 1);
        const mS = addLine(middle, p.middleColor || '#FCD535', 1, { lineStyle: 1 });
        const lS = addLine(lower,  p.lowerColor  || '#2962FF', 1);
        overlaySeriesRef.current['BOLL'] = [uS, mS, lS].filter(Boolean);
    }

    // VWAP
    if (indicatorConfig.VWAP?.enabled) {
        const s = addLine(calcVWAP(candles), indicatorConfig.VWAP.params?.color || '#00BCD4', 1, { lineStyle: 2 });
        if (s) overlaySeriesRef.current['VWAP'] = s;
    }

    // Parabolic SAR
    if (indicatorConfig.SAR?.enabled) {
        const p = indicatorConfig.SAR.params;
        const sarData = calcSAR(candles, p.step || 0.02, p.max || 0.2);
        if (sarData.length > 0) {
            const s = chart.addSeries(LineSeries, { color: 'transparent', priceLineVisible: false, lastValueVisible: false });
            s.setData(sarData.map(d => ({ time: d.time, value: d.value })));
            s.setMarkers(sarData.map(d => ({
                time: d.time,
                position: d.color === '#0ECB81' ? 'belowBar' : 'aboveBar',
                shape: 'circle', color: d.color, size: 0.5
            })));
            overlaySeriesRef.current['SAR'] = s;
        }
    }

    // Supertrend
    if (indicatorConfig.SUPER?.enabled) {
        const p = indicatorConfig.SUPER.params;
        const stData = calcSupertrend(candles, p.period || 10, p.multiplier || 3);
        if (stData.length > 0) {
            const s = addLine(stData.map(d => ({ time: d.time, value: d.value })), '#0ECB81', 2);
            if (s) overlaySeriesRef.current['SUPER'] = s;
        }
    }

    // TRIX
    if (indicatorConfig.TRIX?.enabled) {
        const p = indicatorConfig.TRIX.params;
        const s = addLine(calcTRIX(candles, p.period || 14), p.color || '#00E5FF', 1);
        if (s) overlaySeriesRef.current['TRIX'] = s;
    }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TradingChart({ symbol, comparisonSymbols = [] }) {
    const wrapperRef        = useRef();
    const chartContainerRef = useRef();
    const chartRef          = useRef();
    const seriesRef         = useRef();
    const overlaySeriesRef  = useRef({});
    const compSeriesRefs    = useRef({});
    const volumeSeriesRef   = useRef();
    const canvasRef         = useRef();
    const historyLoadedRef  = useRef(false); // tracks whether we've seeded chart with REST history

    const [toastMsg, setToastMsg] = useState('');
    const showToast = useCallback((msg) => {
        if (!msg) return;
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 2500);
    }, []);

    const {
        activeTool, setActiveTool,
        handleAction, resizeCanvas,
        drawings, selectedId,
    } = useDrawingTools(canvasRef, chartRef, showToast);

    const [activeTimeframe, setActiveTimeframe] = useState('1m');
    const timeframes = ['1s', '10s', '1m'];

    // Map UI timeframe label → backend interval string (backend supports 1s, 10s, 1m only)
    const tfToInterval = { '1s': '1s', '10s': '10s', '1m': '1m' };

    const [chartType, setChartType]   = useState('Candles');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [hasData, setHasData] = useState(false);

    const [showIndicatorModal, setShowIndicatorModal] = useState(false);
    const [indicatorConfig, setIndicatorConfig]       = useState(DEFAULT_CONFIG);
    // chartVersion increments every time the chart is recreated, reliably triggering the config effect
    const [chartVersion, setChartVersion] = useState(0);

    const SUB_KEYS  = ['VOL', 'MACD', 'RSI', 'MFI', 'KDJ', 'OBV', 'CCI', 'StochRSI', 'WR'];
    const activeSubIndicators = SUB_KEYS.filter(k => indicatorConfig[k]?.enabled);

    const [subData, setSubData] = useState({});

    // Recompute sub data when config or symbol changes
    useEffect(() => {
        const candles = dataManager.getCandles(symbol);
        if (!candles || candles.length === 0) return;
        const next = {};
        for (const key of SUB_KEYS) {
            if (indicatorConfig[key]?.enabled) {
                next[key] = computeSubData(key, candles, indicatorConfig[key]?.params ?? {});
            }
        }
        setSubData(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbol, indicatorConfig]);

    const handleSaveConfig   = useCallback((cfg) => setIndicatorConfig(cfg), []);
    const handleLiveChange   = useCallback((cfg) => setIndicatorConfig(cfg), []);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            wrapperRef.current.requestFullscreen().catch(err =>
                console.error(`Fullscreen error: ${err.message}`)
            );
        } else {
            document.exitFullscreen();
        }
    };

    // ── Main chart creation ──────────────────────────────────────────────────
    useEffect(() => {
        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({
                    width:  chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight
                });
            }
            resizeCanvas();
        };

        const isCrypto     = symbol.includes('USDT') && symbol !== 'BTC/USDT';
        const priceScale   = isCrypto ? 4 : 2;
        const isComparing  = comparisonSymbols.length > 0;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: 'solid', color: '#1E2329' },
                textColor: 'rgba(255,255,255,0.9)',
                fontFamily: 'Roboto Mono',
            },
            grid: {
                vertLines: { color: '#2B3139' },
                horzLines: { color: '#2B3139' },
            },
            timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#2B3139' },
            rightPriceScale: { borderColor: '#2B3139', mode: isComparing ? 2 : 0 },
            crosshair: { mode: 0 }
        });

        const fmt = {
            priceFormat: {
                type: 'price', precision: priceScale,
                minMove: 1 / Math.pow(10, priceScale)
            }
        };

        let mainSeries;
        if (chartType === 'Candles') {
            mainSeries = chart.addSeries(CandlestickSeries, {
                ...fmt, upColor: '#0ECB81', downColor: '#F6465D',
                borderVisible: false, wickUpColor: '#0ECB81', wickDownColor: '#F6465D',
            });
        } else if (chartType === 'Bar') {
            mainSeries = chart.addSeries(BarSeries, { ...fmt, upColor: '#0ECB81', downColor: '#F6465D' });
        } else if (chartType === 'Area') {
            mainSeries = chart.addSeries(AreaSeries, {
                ...fmt, lineColor: '#2962FF',
                topColor: 'rgba(41,98,255,0.4)', bottomColor: 'rgba(41,98,255,0.05)',
                crosshairMarkerVisible: true
            });
        } else {
            mainSeries = chart.addSeries(LineSeries, { ...fmt, color: '#FCD535', lineWidth: 2, crosshairMarkerVisible: true });
        }

        chartRef.current    = chart;
        seriesRef.current   = mainSeries;
        overlaySeriesRef.current = {};

        const volSeries = chart.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: '', // set as an overlay
        });
        volSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });
        volumeSeriesRef.current = volSeries;

        // Seed with history
        const candles = dataManager.getCandles(symbol);
        if (candles && candles.length > 0) {
            if (chartType === 'Area' || chartType === 'Line') {
                mainSeries.setData(candles.map(c => ({ time: c.time, value: c.close })));
            } else {
                mainSeries.setData(candles);
            }
            
            volSeries.setData(candles.map(c => ({
                time: c.time,
                value: c.volume || 0,
                color: c.close >= (c.open ?? c.close) ? '#0ECB81' : '#F6465D'
            })));
            // ⚠ Do NOT apply overlays here — let the [indicatorConfig, chartReady] effect own that.
        }

        // Comparison symbols
        const compColors = ['#FCD535', '#2962FF', '#E040FB'];
        comparisonSymbols.forEach((sym, idx) => {
            const ls = chart.addSeries(LineSeries, {
                color: compColors[idx % compColors.length], lineWidth: 2, crosshairMarkerVisible: true
            });
            compSeriesRefs.current[sym] = ls;
        });

        const loadSeriesData = (candles) => {
            if (!candles || candles.length === 0) return;
            try {
                if (seriesRef.current) {
                    if (chartType === 'Area' || chartType === 'Line') {
                        seriesRef.current.setData(candles.map(c => ({ time: c.time, value: c.close })));
                    } else {
                        seriesRef.current.setData(candles);
                    }
                }
                if (volumeSeriesRef.current) {
                    volumeSeriesRef.current.setData(candles.map(c => ({
                        time: c.time, value: c.volume || 0,
                        color: c.close >= (c.open ?? c.close) ? '#0ECB81' : '#F6465D',
                    })));
                }
            } catch (_) {}
        };

        const unsubs = [];
        unsubs.push(dataManager.subscribe(symbol, (data) => {
            // When backend history first arrives, seed the full series
            if (data.historyLoaded && !historyLoadedRef.current) {
                historyLoadedRef.current = true;
                const candles = dataManager.getCandles(symbol);
                loadSeriesData(candles);
                setChartVersion(v => v + 1); // re-apply overlays
            }

            // Live candle tick update
            const c = data.chartCandle;
            if (c && c.time > 0) {
                try {
                    if (seriesRef.current) {
                        if (chartType === 'Area' || chartType === 'Line') {
                            seriesRef.current.update({ time: c.time, value: c.close });
                        } else {
                            seriesRef.current.update(c);
                        }
                    }
                    if (volumeSeriesRef.current) {
                        volumeSeriesRef.current.update({
                            time:  c.time,
                            value: c.volume || 0,
                            color: c.close >= (c.open ?? c.close) ? '#0ECB81' : '#F6465D',
                        });
                    }
                } catch (_) {}
            }
        }));
        comparisonSymbols.forEach(sym => {
            unsubs.push(dataManager.subscribe(sym, (data) => {
                if (compSeriesRefs.current[sym]) {
                    try {
                        compSeriesRefs.current[sym].update({ time: data.chartCandle.time, value: data.chartCandle.close });
                    } catch (_) {}
                }
            }));
        });

        window.addEventListener('resize', handleResize);
        handleResize();
        // Increment version → reliably triggers the [indicatorConfig, chartVersion] effect
        setChartVersion(v => v + 1);

        return () => {
            window.removeEventListener('resize', handleResize);
            unsubs.forEach(u => u());
            chart.remove();
            compSeriesRefs.current   = {};
            overlaySeriesRef.current = {};
            historyLoadedRef.current = false; // reset so next symbol/interval load triggers reload
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbol, comparisonSymbols, chartType]);

    // ── Re-apply overlays when config changes OR a new chart is created (chartVersion) ──
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;
        const candles = dataManager.getCandles(symbol);
        if (!candles || candles.length === 0) return;

        // Remove all current overlay series
        const remove = (s) => { try { chart.removeSeries(s); } catch (_) {} };
        Object.values(overlaySeriesRef.current).forEach(s => {
            Array.isArray(s) ? s.forEach(remove) : remove(s);
        });
        overlaySeriesRef.current = {};

        applyMainOverlays(chart, candles, indicatorConfig, overlaySeriesRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [indicatorConfig, chartVersion]);

    const activeCount = Object.values(indicatorConfig).filter(v => v?.enabled).length;
    const compColors  = ['#FCD535', '#2962FF', '#E040FB'];

    // Cursor style based on active tool
    const toolCursor = {
        pointer: 'crosshair',
        'cursor-arrow': 'default',
        move:    'move',
        text:    'text',
        pen:     'crosshair',
        hline:   'crosshair',
        vline:   'crosshair',
    }[activeTool] || 'crosshair';

    return (
        <div ref={wrapperRef} style={s.container}>
            {/* Toolbar */}
            <div style={s.toolbar}>
                <div style={s.toolbarLeft}>
                    <div style={{ fontWeight: 'bold', color: 'var(--color-text-main)', marginRight: 16 }}>
                        {symbol}
                    </div>
                    {comparisonSymbols.map((sym, idx) => (
                        <div key={sym} style={{ color: compColors[idx % compColors.length], fontWeight: 'bold', fontSize: '10px' }}>
                            + {sym}
                        </div>
                    ))}

                    {/* Timeframes */}
                    <div style={s.timeframes}>
                        {timeframes.map(tf => (
                            <span
                                key={tf}
                                style={{ color: activeTimeframe === tf ? '#FCD535' : 'var(--color-text-muted)', cursor: 'pointer', fontWeight: '500' }}
                                onClick={() => {
                                    if (tf !== activeTimeframe) {
                                        setActiveTimeframe(tf);
                                        historyLoadedRef.current = false;
                                        dataManager.changeInterval(symbol, tfToInterval[tf] || '1m');
                                    }
                                }}
                            >
                                {tf}
                            </span>
                        ))}
                    </div>

                    {/* Chart type */}
                    <div style={s.menuWrapper}>
                        <div style={s.menuLabel} onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            {chartType}
                            <ChevronDown size={14} style={{ marginLeft: 4, transform: isMenuOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                        </div>
                        {isMenuOpen && (
                            <div style={s.menuDropdown}>
                                {['Candles', 'Line', 'Bar', 'Area'].map(type => (
                                    <div key={type} style={s.menuItem}
                                        onClick={() => { setChartType(type); setIsMenuOpen(false); }}>
                                        {type}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Indicators — icon only, tooltip on hover */}
                    <button
                        style={s.indicatorBtn}
                        onClick={() => setShowIndicatorModal(true)}
                        title="Technical Indicators"
                    >
                        <LineChart size={14} />
                        {activeCount > 0 && (
                            <span style={s.badge}>{activeCount}</span>
                        )}
                    </button>
                </div>

                <div style={s.toolbarRight}>
                    <div title="Full Screen" style={s.iconBtn} onClick={toggleFullScreen}>
                        <Maximize size={16} color="var(--color-text-muted)" />
                    </div>
                </div>
            </div>

            {/* Body: sidebar + chart */}
            <div style={s.body}>
                {/* Drawing tools sidebar */}
                <DrawingToolbar
                    activeTool={activeTool}
                    onToolChange={setActiveTool}
                    onAction={handleAction}
                    drawings={drawings}
                    selectedId={selectedId}
                />

                {/* Chart area with canvas overlay */}
                <div style={s.chartArea}>
                    <div ref={chartContainerRef} style={s.chartWrapper} />
                    {/* Drawing canvas — pointer-events only when not in pointer/move mode */}
                    <canvas
                        ref={canvasRef}
                        style={{
                            ...s.drawingCanvas,
                            cursor: toolCursor,
                            pointerEvents: activeTool === 'pointer' ? 'none' : 'auto',
                        }}
                    />
                </div>
            </div>

            {/* Sub-indicator panels — outside the body flex row */}
            {activeSubIndicators.length > 0 && (
                <div style={s.subPanels}>
                    {activeSubIndicators.map(key =>
                        subData[key] ? (
                            <IndicatorPanel
                                key={key}
                                indicatorKey={key}
                                data={subData[key]}
                                params={indicatorConfig[key]?.params}
                                height={110}
                            />
                        ) : null
                    )}
                </div>
            )}

            {/* Indicator Modal */}
            {showIndicatorModal && (
                <IndicatorModal
                    initialConfig={indicatorConfig}
                    onSave={handleSaveConfig}
                    onClose={() => setShowIndicatorModal(false)}
                    onLiveChange={handleLiveChange}
                />
            )}

            {/* Toast Notification */}
            {toastMsg && (
                <div style={s.toast}>
                    {toastMsg}
                </div>
            )}
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
    container:    { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#1E2329', overflow: 'hidden' },
    toolbar:      { height: '36px', borderBottom: '1px solid #2B3139', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', fontSize: '12px', flexShrink: 0 },
    toolbarLeft:  { display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-muted)' },
    toolbarRight: { display: 'flex', alignItems: 'center' },
    timeframes:   { display: 'flex', gap: '8px', marginLeft: '12px', paddingRight: '12px', borderRight: '1px solid #2B3139' },
    menuWrapper:  { position: 'relative', marginLeft: '4px' },
    menuLabel:    { display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--color-text-main)' },
    menuDropdown: { position: 'absolute', top: '24px', left: 0, backgroundColor: '#1E2329', border: '1px solid #2B3139', padding: '4px', borderRadius: '4px', zIndex: 10, display: 'flex', flexDirection: 'column' },
    menuItem:     { padding: '4px 8px', cursor: 'pointer', color: 'var(--color-text-main)', borderRadius: '4px' },
    iconBtn:      { marginLeft: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' },
    // ── New layout ──
    body:         { flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0 },
    chartArea:    { flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 },
    chartWrapper: { flex: 1, width: '100%', position: 'relative', overflow: 'hidden', minHeight: 0 },
    drawingCanvas:{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 5,
    },
    subPanels:    { flexShrink: 0, width: '100%', display: 'flex', flexDirection: 'column', maxHeight: '45%', overflowY: 'auto' },
    indicatorBtn: {
        display: 'flex', alignItems: 'center', gap: '4px',
        background: 'none', border: '1px solid #2B3139',
        color: 'var(--color-text-muted)', borderRadius: '4px', padding: '3px 7px',
        cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px',
        transition: 'border-color 0.2s, color 0.2s',
        position: 'relative'
    },
    badge: {
        background: '#FCD535', color: '#1E2329', borderRadius: '8px',
        padding: '0 5px', fontSize: '10px', fontWeight: '700',
        marginLeft: '2px'
    },
    toast: {
        position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        backgroundColor: 'rgba(30,35,41,0.95)', color: '#fff', padding: '8px 16px',
        borderRadius: '6px', border: '1px solid #FCD535', zIndex: 100000,
        fontSize: '13px', pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    },
};
