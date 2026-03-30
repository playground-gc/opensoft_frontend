import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, BarSeries, AreaSeries } from 'lightweight-charts';
import { Maximize, ChevronDown } from 'lucide-react';
import { dataManager } from '../../services/dataManager';

export default function TradingChart({ symbol, comparisonSymbols = [] }) {
    const wrapperRef = useRef();
    const chartContainerRef = useRef();
    const chartRef = useRef();
    const seriesRef = useRef();
    const compSeriesRefs = useRef({});

    const [activeTimeframe, setActiveTimeframe] = useState('1m');
    const timeframes = ['1s', '1m', '15m', '1H', '4H', '1D', '1W'];
    const [chartType, setChartType] = useState('Candles');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [hasData, setHasData] = useState(false);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            wrapperRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({ 
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight
                });
            }
        };

        const priceScaleMode = 2; 
        const isComparing = comparisonSymbols.length > 0;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: 'solid', color: '#1E2329' },
                textColor: 'rgba(255, 255, 255, 0.9)',
                fontFamily: 'Inter, system-ui, sans-serif',
            },
            grid: {
                vertLines: { color: '#2B3139' },
                horzLines: { color: '#2B3139' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: activeTimeframe === '1s',
                borderColor: '#2B3139',
            },
            rightPriceScale: {
                borderColor: '#2B3139',
                mode: isComparing ? 2 : 0, 
            },
            crosshair: {
                mode: 0,
            }
        });

        let mainSeries;
        const formatOptions = {
            priceFormat: {
                type: 'price',
                precision: priceScaleMode,
                minMove: 1 / Math.pow(10, priceScaleMode)
            }
        };

        // Initialize Main Series based on selected type
        if (chartType === 'Candles') {
            mainSeries = chart.addSeries(CandlestickSeries, {
                ...formatOptions,
                upColor: '#0ECB81',
                downColor: '#F6465D',
                borderVisible: false,
                wickUpColor: '#0ECB81',
                wickDownColor: '#F6465D',
            });
        } else if (chartType === 'Bar') {
            mainSeries = chart.addSeries(BarSeries, {
                ...formatOptions,
                upColor: '#0ECB81',
                downColor: '#F6465D',
            });
        } else if (chartType === 'Area') {
            mainSeries = chart.addSeries(AreaSeries, {
                ...formatOptions,
                lineColor: '#2962FF',
                topColor: 'rgba(41, 98, 255, 0.4)',
                bottomColor: 'rgba(41, 98, 255, 0.05)',
                crosshairMarkerVisible: true
            });
        } else {
            mainSeries = chart.addSeries(LineSeries, {
                ...formatOptions,
                color: '#FCD535',
                lineWidth: 2,
                crosshairMarkerVisible: true
            });
        }

        chartRef.current = chart;
        seriesRef.current = mainSeries;

        const unsubs = [];
        let currentBar = null;
        let fittedOnce = false; // Tracks if we've auto-zoomed the chart yet

        // Convert OHLC bar to the format the current series type expects
        const toSeriesItem = (bar) => {
            if (chartType === 'Line' || chartType === 'Area') {
                return { time: bar.time, value: bar.close };
            }
            return bar;
        };

        // --- STEP 1: Attempt History Fetch ---
        dataManager.fetchHistoricalKlines(symbol, activeTimeframe).then(historicalData => {
            if (historicalData.length > 0 && seriesRef.current) {
                seriesRef.current.setData(historicalData.map(toSeriesItem));
                currentBar = { ...historicalData[historicalData.length - 1] };
                setHasData(true);
                chartRef.current?.timeScale().fitContent();
                fittedOnce = true;
            }
        });

        // Returns the candle-period bucket (in seconds) for a given epoch second
        const snapToTimeframe = (epochSeconds) => {
            const tfSeconds = {
                '1s': 1, '1m': 60, '15m': 900,
                '1H': 3600, '4H': 14400, '1D': 86400, '1W': 604800
            };
            const period = tfSeconds[activeTimeframe] ?? 60;
            return epochSeconds - (epochSeconds % period);
        };

        // --- STEP 2: Live Data Subscription ---
        // Backend only sends orderbook events; we build candles from the mid-price.
        unsubs.push(dataManager.subscribe(symbol, (data) => {
            if (!seriesRef.current) return;

            const price = data.ticker?.price;
            if (!price || price <= 0) return;

            const snappedTime = snapToTimeframe(Math.floor(Date.now() / 1000));

            if (!currentBar) {
                // First tick — start the first real candle, no fake data
                currentBar = { time: snappedTime, open: price, high: price, low: price, close: price };
                setHasData(true);
                if (!fittedOnce) {
                    chartRef.current?.timeScale().fitContent();
                    fittedOnce = true;
                }
            } else if (snappedTime > currentBar.time) {
                // New candle period — open with previous close
                currentBar = { time: snappedTime, open: currentBar.close, high: price, low: price, close: price };
            } else {
                currentBar.close = price;
                currentBar.high = Math.max(currentBar.high, price);
                currentBar.low  = Math.min(currentBar.low,  price);
            }

            try {
                if (chartType === 'Area' || chartType === 'Line') {
                    seriesRef.current.update({ time: currentBar.time, value: currentBar.close });
                } else {
                    seriesRef.current.update(currentBar);
                }
                // Keep the chart scrolled to the latest candle
                chartRef.current?.timeScale().scrollToRealTime();
            } catch (err) {
                console.error("[CHART] Render Error:", err);
            }
        }));

        // --- STEP 3: Handle Comparisons (if any) ---
        comparisonSymbols.forEach((sym, idx) => {
            const colors = ['#FCD535', '#2962FF', '#E040FB'];
            const lineSeries = chart.addSeries(LineSeries, {
                color: colors[idx % colors.length],
                lineWidth: 2,
            });
            compSeriesRefs.current[sym] = lineSeries;

            dataManager.fetchHistoricalKlines(sym, activeTimeframe).then(hist => {
               if (hist.length > 0) {
                   lineSeries.setData(hist.map(d => ({ time: d.time, value: d.close })));
               }
            });

            // Subscribe comparison symbols to live data
            unsubs.push(dataManager.subscribe(sym, (d) => {
                if (d.ticker?.price > 0 && compSeriesRefs.current[sym]) {
                    const snapped = snapToTimeframe(Math.floor(Date.now() / 1000));
                    compSeriesRefs.current[sym].update({ time: snapped, value: d.ticker.price });
                }
            }));
        });

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
            unsubs.forEach(u => u());
            chart.remove();
            compSeriesRefs.current = {};
        };
    }, [symbol, comparisonSymbols, chartType, activeTimeframe]);

    return (
        <div ref={wrapperRef} style={styles.container}>
            <div style={styles.toolbar}>
                <div style={styles.toolbarLeft}>
                    <div style={{fontWeight: 'bold', color: '#EAECEF', marginRight: 16}}>
                        {symbol}
                    </div>
                    <div style={styles.timeframes}>
                        {timeframes.map(tf => (
                            <span 
                                key={tf}
                                style={{
                                    color: activeTimeframe === tf ? '#FCD535' : '#848E9C', 
                                    cursor: 'pointer', 
                                    fontWeight: '500'
                                }}
                                onClick={() => setActiveTimeframe(tf)}
                            >
                                {tf}
                            </span>
                        ))}
                    </div>

                    <div style={styles.menuWrapper}>
                        <div style={styles.menuLabel} onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            {chartType} <ChevronDown size={14} style={{marginLeft: 4, transform: isMenuOpen ? 'rotate(180deg)' : 'none', transition: '0.2s'}} />
                        </div>
                        {isMenuOpen && (
                            <div style={styles.menuDropdown}>
                                {['Candles', 'Line', 'Bar', 'Area'].map(type => (
                                    <div 
                                        key={type} 
                                        style={styles.menuItem} 
                                        onClick={() => { setChartType(type); setIsMenuOpen(false); }}
                                    >
                                        {type}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={styles.toolbarRight}>
                    <div title="Full Screen" style={styles.iconBtn} onClick={toggleFullScreen}>
                        <Maximize size={16} color="#848E9C" />
                    </div>
                </div>
            </div>
            
            <div style={styles.chartWrapper}>
                {!hasData && (
                    <div style={styles.overlay}>
                        <div style={styles.loaderLine} />
                        Connecting to {symbol} Stream...
                    </div>
                )}
                <div 
                    ref={chartContainerRef} 
                    style={{width: '100%', height: '100%'}}
                />
            </div>
        </div>
    );
}

const styles = {
    container: { 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        backgroundColor: '#1E2329', 
        overflow: 'hidden' 
    },
    toolbar: { 
        height: '36px', 
        borderBottom: '1px solid #2B3139', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0 16px', 
        fontSize: '12px' 
    },
    toolbarLeft: { 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px' 
    },
    toolbarRight: { 
        display: 'flex', 
        alignItems: 'center' 
    },
    timeframes: { 
        display: 'flex', 
        gap: '8px', 
        marginLeft: '12px', 
        paddingRight: '12px', 
        borderRight: '1px solid #2B3139' 
    },
    menuWrapper: { 
        position: 'relative', 
        marginLeft: '12px' 
    },
    menuLabel: { 
        display: 'flex', 
        alignItems: 'center', 
        cursor: 'pointer', 
        color: '#EAECEF' 
    },
    menuDropdown: { 
        position: 'absolute', 
        top: '28px', 
        left: 0, 
        backgroundColor: '#1E2329', 
        border: '1px solid #2B3139', 
        padding: '4px', 
        borderRadius: '4px', 
        zIndex: 100, 
        display: 'flex', 
        flexDirection: 'column', 
        width: '100px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    },
    menuItem: { 
        padding: '8px', 
        cursor: 'pointer', 
        color: '#EAECEF', 
        borderRadius: '4px',
        transition: 'background 0.2s'
    },
    iconBtn: { 
        marginLeft: '12px', 
        cursor: 'pointer', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        opacity: 0.8
    },
    chartWrapper: { 
        flex: 1, 
        width: '100%', 
        position: 'relative', 
        minHeight: 0 
    },
    overlay: { 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: 'rgba(30, 35, 41, 0.9)', 
        color: '#FCD535', 
        zIndex: 20, 
        fontSize: '13px',
        textAlign: 'center'
    },
    loaderLine: { 
        width: '40px', 
        height: '2px', 
        backgroundColor: '#FCD535', 
        marginBottom: '12px',
        borderRadius: '2px'
    }
};