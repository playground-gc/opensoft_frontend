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

    const [activeTimeframe, setActiveTimeframe] = useState('1D');
    const timeframes = ['1s', '15m', '1H', '4H', '1D', '1W'];

    // Options: 'Candles', 'Line', 'Bar', 'Area'
    const [chartType, setChartType] = useState('Candles');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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

        const isCrypto = symbol.includes('USDT') && symbol !== 'BTC/USDT';
        const priceScaleMode = isCrypto ? 4 : 2;
        const isComparing = comparisonSymbols.length > 0;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: 'solid', color: '#1E2329' },
                textColor: 'rgba(255, 255, 255, 0.9)',
                fontFamily: 'Roboto Mono',
            },
            grid: {
                vertLines: { color: '#2B3139' },
                horzLines: { color: '#2B3139' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
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

        // Instantiate selected series format
        let mainSeries;
        const formatOptions = {
             priceFormat: {
                 type: 'price',
                 precision: priceScaleMode,
                 minMove: 1 / Math.pow(10, priceScaleMode)
             }
        };

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

        const colors = ['#FCD535', '#2962FF', '#E040FB'];

        comparisonSymbols.forEach((sym, idx) => {
            const lineSeries = chart.addLineSeries({
                color: colors[idx % colors.length],
                lineWidth: 2,
                crosshairMarkerVisible: true
            });
            compSeriesRefs.current[sym] = lineSeries;
        });

        const unsubs = [];
        let currentBar = null;

        dataManager.fetchHistoricalKlines(symbol, activeTimeframe).then(historicalData => {
            if (historicalData.length > 0 && seriesRef.current) {
                seriesRef.current.setData(historicalData);
                currentBar = { ...historicalData[historicalData.length - 1] };
            }
        });

        unsubs.push(dataManager.subscribe(symbol, (data) => {
            if (seriesRef.current && currentBar) {
                 const price = data.ticker.price;
                 currentBar.close = price;
                 currentBar.high = Math.max(currentBar.high, price);
                 currentBar.low = Math.min(currentBar.low, price);
                 
                 if (chartType === 'Area' || chartType === 'Line') {
                     seriesRef.current.update({ time: currentBar.time, value: currentBar.close });
                 } else {
                     seriesRef.current.update(currentBar);
                 }
            }
        }));

        const compCurrentBars = {};
        comparisonSymbols.forEach(sym => {
            dataManager.fetchHistoricalKlines(sym, activeTimeframe).then(historicalData => {
               if (historicalData.length > 0 && compSeriesRefs.current[sym]) {
                   const closeOnly = historicalData.map(d => ({ time: d.time, value: d.close }));
                   compSeriesRefs.current[sym].setData(closeOnly);
                   compCurrentBars[sym] = { ...closeOnly[closeOnly.length - 1] };
               }
            });

            unsubs.push(dataManager.subscribe(sym, (data) => {
                if (compSeriesRefs.current[sym] && compCurrentBars[sym]) {
                    compCurrentBars[sym].value = data.ticker.price;
                    compSeriesRefs.current[sym].update(compCurrentBars[sym]);
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

    const colors = ['#FCD535', '#2962FF', '#E040FB'];

    return (
        <div ref={wrapperRef} style={styles.container}>
            <div style={styles.toolbar}>
                <div style={styles.toolbarLeft}>
                    <div style={{fontWeight: 'bold', color: 'var(--color-text-main)', marginRight: 16}}>
                        {symbol}
                    </div>
                    {comparisonSymbols.map((sym, idx) => (
                        <div key={sym} style={{color: colors[idx % colors.length], fontWeight: 'bold', fontSize: '10px'}}>
                            + {sym}
                        </div>
                    ))}
                    
                    <div style={styles.timeframes}>
                        {timeframes.map(tf => (
                            <span 
                                key={tf}
                                style={{color: activeTimeframe === tf ? '#FCD535' : 'var(--color-text-muted)', cursor: 'pointer', fontWeight: '500'}}
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
                        <Maximize size={16} color="var(--color-text-muted)" />
                    </div>
                </div>
            </div>
            
            <div 
                ref={chartContainerRef} 
                style={styles.chartWrapper}
            />
        </div>
    );
}

const styles = {
    container: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#1E2329', overflow: 'hidden' },
    toolbar: { height: '36px', borderBottom: '1px solid #2B3139', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', fontSize: '12px' },
    toolbarLeft: { display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-muted)' },
    toolbarRight: { display: 'flex', alignItems: 'center' },
    timeframes: { display: 'flex', gap: '8px', marginLeft: '12px', paddingRight: '12px', borderRight: '1px solid #2B3139' },
    menuWrapper: { position: 'relative', marginLeft: '12px' },
    menuLabel: { display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--color-text-main)' },
    menuDropdown: { position: 'absolute', top: '24px', left: 0, backgroundColor: '#1E2329', border: '1px solid #2B3139', padding: '4px', borderRadius: '4px', zIndex: 10, display: 'flex', flexDirection: 'column' },
    menuItem: { padding: '4px 8px', cursor: 'pointer', color: 'var(--color-text-main)', borderRadius: '4px' },
    iconBtn: { marginLeft: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' },
    chartWrapper: { flex: 1, width: '100%', position: 'relative', overflow: 'hidden', minHeight: 0 }
};
