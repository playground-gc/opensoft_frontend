import React, { useEffect, useRef, useState } from 'react';
import { createChart, AreaSeries } from 'lightweight-charts';
import { dataManager } from '../../services/dataManager';

const findNearest = (dataArr, price) => {
    if (!dataArr || dataArr.length === 0) return null;
    let closest = dataArr[0];
    let minDiff = Math.abs(dataArr[0].price - price);
    for (let i = 1; i < dataArr.length; i++) {
        const d = Math.abs(dataArr[i].price - price);
        if (d < minDiff) { 
            minDiff = d; 
            closest = dataArr[i]; 
        }
    }
    return closest;
};

export default function DepthChart({ symbol }) {
    const chartContainerRef = useRef();
    const chartRef = useRef();
    const bidsSeriesRef = useRef();
    const asksSeriesRef = useRef();
    
    const currentPriceRef = useRef(0);
    const rawBidsRef = useRef([]);
    const rawAsksRef = useRef([]);

    const [hoverState, setHoverState] = useState(null);

    useEffect(() => {
        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight
                });
            }
        };

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
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: '#2B3139',
                tickMarkFormatter: (time) => {
                    return (time / 1000000).toFixed(4);
                },
            },
            rightPriceScale: {
                borderColor: '#2B3139',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            crosshair: {
                mode: 0,
                vertLine: { visible: false, labelVisible: false },
                horzLine: { visible: false, labelVisible: false },
            },
            localization: {
                timeFormatter: (time) => {
                    return (time / 1000000).toFixed(4);
                }
            }
        });

        // Bids (Green)
        const bidsSeries = chart.addSeries(AreaSeries, {
            lineColor: '#0ECB81',
            topColor: 'rgba(14, 203, 129, 0.4)',
            bottomColor: 'rgba(14, 203, 129, 0.05)',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
            lineType: 1 // 1 is WithSteps in lightweight-charts
        });

        // Asks (Red)
        const asksSeries = chart.addSeries(AreaSeries, {
            lineColor: '#F6465D',
            topColor: 'rgba(246, 70, 93, 0.4)',
            bottomColor: 'rgba(246, 70, 93, 0.05)',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
            lineType: 1
        });

        chartRef.current = chart;
        bidsSeriesRef.current = bidsSeries;
        asksSeriesRef.current = asksSeries;

        chart.subscribeCrosshairMove((param) => {
            if (
                param.point === undefined ||
                !param.time ||
                param.point.x < 0 ||
                param.point.x > chartContainerRef.current.clientWidth ||
                param.point.y < 0 ||
                param.point.y > chartContainerRef.current.clientHeight
            ) {
                setHoverState(null);
                return;
            }

            const hoverPrice = param.time / 1000000;
            const bids = rawBidsRef.current;
            const asks = rawAsksRef.current;
            if (!bids || !asks || bids.length === 0 || asks.length === 0) return;

            let highestBid = bids[0].price;
            for (let b of bids) if (b.price > highestBid) highestBid = b.price;
            
            let lowestAsk = asks[0].price;
            for (let a of asks) if (a.price < lowestAsk) lowestAsk = a.price;

            const midPrice = (highestBid + lowestAsk) / 2;
            const absDiff = Math.abs((hoverPrice - midPrice) / midPrice);

            const bidPriceTarget = midPrice * (1 - absDiff);
            const askPriceTarget = midPrice * (1 + absDiff);

            const closestBid = findNearest(bids, bidPriceTarget);
            const closestAsk = findNearest(asks, askPriceTarget);

            if (!closestBid || !closestAsk) {
                setHoverState(null);
                return;
            }

            const xBid = chart.timeScale().timeToCoordinate(Math.round(closestBid.price * 1000000));
            const xAsk = chart.timeScale().timeToCoordinate(Math.round(closestAsk.price * 1000000));
            const yBid = bidsSeries.priceToCoordinate(closestBid.total);
            const yAsk = asksSeries.priceToCoordinate(closestAsk.total);

            if (xBid === null || xAsk === null || yBid === null || yAsk === null) {
                setHoverState(null);
                return;
            }

            const paneWidth = chart.timeScale().width();

            // Format to 1 decimal exact representation to avoid floating point stutter
            const bidDiffDisplay = (((closestBid.price - midPrice) / midPrice) * 100).toFixed(1);
            const askDiffDisplay = (((closestAsk.price - midPrice) / midPrice) * 100).toFixed(1);

            setHoverState({
                xBid, yBid, 
                bidPrice: closestBid.price, 
                bidAmount: closestBid.total,
                bidDiff: bidDiffDisplay,
                
                xAsk, yAsk,
                askPrice: closestAsk.price,
                askAmount: closestAsk.total,
                askDiff: askDiffDisplay,
                
                width: chartContainerRef.current.clientWidth,
                paneWidth
            });
        });

        let isInitialScaled = false;

        const unsub = dataManager.subscribe(symbol, (data) => {
            if (data.ticker) {
                currentPriceRef.current = data.ticker.price;
            }
            if (!data.orderBook || !data.orderBook.bids || !data.orderBook.asks) return;
            
            rawBidsRef.current = data.orderBook.bids;
            rawAsksRef.current = data.orderBook.asks;

            const bidsData = [...data.orderBook.bids]
                .sort((a, b) => a.price - b.price)
                .map(b => ({
                    time: Math.round(b.price * 1000000),
                    value: b.total
                }))
                .filter((b, idx, arr) => idx === 0 || b.time !== arr[idx - 1].time);

            const asksData = [...data.orderBook.asks]
                .sort((a, b) => a.price - b.price)
                .map(a => ({
                    time: Math.round(a.price * 1000000),
                    value: a.total
                }))
                .filter((a, idx, arr) => idx === 0 || a.time !== arr[idx - 1].time);
            
            if (bidsData.length > 0) bidsSeries.setData(bidsData);
            if (asksData.length > 0) asksSeries.setData(asksData);
            
            if (!isInitialScaled && bidsData.length > 0 && asksData.length > 0) {
                 chart.timeScale().fitContent();
                 isInitialScaled = true;
            }
        });

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
            unsub();
            chart.remove();
        };
    }, [symbol]);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#1E2329' }}>
            <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
                
                {hoverState && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10, overflow: 'hidden' }}>
                        
                        {/* Green Highlight Band (Left to xBid) */}
                        <div style={{
                            position: 'absolute',
                            top: 0, bottom: 0,
                            left: 0, width: hoverState.xBid,
                            backgroundColor: 'rgba(14,203,129,0.08)'
                        }} />

                        {/* Red Highlight Band (xAsk to Right) */}
                        <div style={{
                            position: 'absolute',
                            top: 0, bottom: 0,
                            left: hoverState.xAsk, 
                            width: hoverState.paneWidth ? Math.max(0, hoverState.paneWidth - hoverState.xAsk) : `calc(100% - ${hoverState.xAsk}px - 60px)`,
                            backgroundColor: 'rgba(246,70,93,0.08)'
                        }} />

                        {/* Bid Vertical Line */}
                        <div style={{
                            position: 'absolute', top: 0, bottom: 0,
                            left: hoverState.xBid, borderLeft: '1px dashed #ffffff40'
                        }} />

                        {/* Ask Vertical Line */}
                        <div style={{
                            position: 'absolute', top: 0, bottom: 0,
                            left: hoverState.xAsk, borderLeft: '1px dashed #ffffff40'
                        }} />

                        {/* Bid Dot */}
                        <div style={{
                            position: 'absolute', width: 8, height: 8, borderRadius: '50%',
                            backgroundColor: '#0ECB81',
                            left: hoverState.xBid - 4, top: hoverState.yBid - 4
                        }} />

                        {/* Ask Dot */}
                        <div style={{
                            position: 'absolute', width: 8, height: 8, borderRadius: '50%',
                            backgroundColor: '#F6465D',
                            left: hoverState.xAsk - 4, top: hoverState.yAsk - 4
                        }} />

                        {/* Bid Tooltip */}
                        <div style={{
                            position: 'absolute',
                            ...(hoverState.xBid < 140 
                                ? { left: hoverState.xBid + 10 } 
                                : { right: `calc(100% - ${hoverState.xBid - 10}px)` }),
                            top: Math.max(10, hoverState.yBid - 40),
                            backgroundColor: '#F2F3F5',
                            color: '#1E2329',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            fontSize: '12px',
                            fontFamily: 'sans-serif',
                            minWidth: '130px'
                        }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 16 }}>
                               <span style={{ color: '#474D57' }}>Range</span>
                               <span style={{ color: '#0ECB81', fontWeight: 500 }}>{hoverState.bidDiff}%</span>
                           </div>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                               <span style={{ color: '#474D57' }}>Price</span>
                               <span style={{ fontWeight: 500 }}>{hoverState.bidPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                           </div>
                           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                               <span style={{ color: '#474D57' }}>Amount</span>
                               <span style={{ fontWeight: 500 }}>{hoverState.bidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                           </div>
                        </div>

                        {/* Ask Tooltip */}
                        <div style={{
                            position: 'absolute',
                            ...(hoverState.xAsk > hoverState.width - 140 
                                ? { right: `calc(100% - ${hoverState.xAsk - 10}px)` } 
                                : { left: hoverState.xAsk + 10 }),
                            top: Math.max(10, hoverState.yAsk - 40),
                            backgroundColor: '#F2F3F5',
                            color: '#1E2329',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            fontSize: '12px',
                            fontFamily: 'sans-serif',
                            minWidth: '130px'
                        }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 16 }}>
                               <span style={{ color: '#474D57' }}>Range</span>
                               <span style={{ color: '#F6465D', fontWeight: 500 }}>+{hoverState.askDiff}%</span>
                           </div>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                               <span style={{ color: '#474D57' }}>Price</span>
                               <span style={{ fontWeight: 500 }}>{hoverState.askPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                           </div>
                           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                               <span style={{ color: '#474D57' }}>Amount</span>
                               <span style={{ fontWeight: 500 }}>{hoverState.askAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                           </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
