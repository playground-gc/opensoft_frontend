/**
 * DataManager.js
 * Manages REST (Port 8000) and WebSocket (Port 8001) state.
 */

class DataManager {
    constructor() {
        this.subscribers = new Map();
        this.buffers = {};
        this.sockets = {};
        
        // Verified backend symbols
        this.basePairs = ['AAPL_S', 'GOOGL_S', 'TSLA_S', 'MSFT_S', 'AMZN_S'];

        this.basePairs.forEach(pair => {
            this.buffers[pair] = {
                ticker: { symbol: pair, price: 0, change: 0, high: 0, low: 0, volume: 0 },
                orderBook: { bids: [], asks: [] },
                candleTick: null,
            };
            this.subscribers.set(pair, new Set());
        });

        // Use 127.0.0.1 to avoid WSL IPv6 resolution issues
        this.host = '127.0.0.1'; 
        this.connectWebSockets();
        this.startFlushLoop();
    }

    /**
     * 1. REST: Fetch Historical Candles (Port 8000)
     */
    async fetchHistoricalKlines(symbol, timeframe) {
        const intervalMap = { '1s': '1s', '10s': '10s', '1m': '1m', '15m': '15m', '1H': '1h', '4H': '4h', '1D': '1d', '1W': '1w' };
        const interval = intervalMap[timeframe] || '1m';
        
        try {
            const res = await fetch(`http://${this.host}:8000/api/v1/candles/${symbol}?interval=${interval}&limit=500`);
            if (!res.ok) return [];
            const data = await res.json();
            
            // Map backend candle format to Lightweight Charts format
            if (!data.candles) return [];
            const mapped = data.candles.map(c => {
                // Accept either ms (>1e10) or seconds timestamps
                const rawTs = c.timestamp ?? c.time ?? Date.now();
                const time = rawTs > 1e10 ? Math.floor(rawTs / 1000) : Math.floor(rawTs);
                return {
                    time,
                    open: parseFloat(c.open),
                    high: parseFloat(c.high),
                    low: parseFloat(c.low),
                    close: parseFloat(c.close)
                };
            });
            // Lightweight Charts requires strictly ascending, deduplicated timestamps
            const seen = new Set();
            return mapped
                .sort((a, b) => a.time - b.time)
                .filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true; });
        } catch (err) {
            console.error(`[DataManager] History fetch failed for ${symbol}:`, err);
            return [];
        }
    }

    /**
     * 2. WS: Connect to Live Stream (Port 8001)
     */
    setupSocket(pair) {
        if (this.sockets[pair]) {
            try { this.sockets[pair].close(); } catch(e){}
        }
        
        // Backend expects symbol in path: /ws/AAPL_S
        const wsUrl = `ws://${this.host}:8001/ws/${pair}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log(`%c[WS Connected] ${pair} on Port 8001`, "color: #0ecb81; font-weight: bold");
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const buffer = this.buffers[pair];

                if (message.event === 'orderbook') {
                    // 1. Safely grab the best Bid and best Ask from the JSON arrays
                    const bestAsk = message.asks && message.asks.length > 0 ? parseFloat(message.asks[0][0]) : 0;
                    const bestBid = message.bids && message.bids.length > 0 ? parseFloat(message.bids[0][0]) : 0;

                    // 2. Calculate the Mid-Price
                    let currentPrice = buffer.ticker.price; 
                    if (bestAsk > 0 && bestBid > 0) {
                        currentPrice = (bestAsk + bestBid) / 2;
                    } else if (bestBid > 0) {
                        currentPrice = bestBid;
                    } else if (bestAsk > 0) {
                        currentPrice = bestAsk;
                    }
                    
                    
                    // 3. FORCE the ticker price to update so the Chart wakes up!
                    if (currentPrice > 0) {
                        buffer.ticker.price = currentPrice;
                    }

                    // 4. Process the visual Order Book bars
                    let askTotal = 0;
                    buffer.orderBook.asks = (message.asks || []).map(a => {
                        const price = parseFloat(a[0]);
                        const size = parseFloat(a[1]);
                        askTotal += size;
                        return { price, size, total: askTotal };
                    });

                    let bidTotal = 0;
                    buffer.orderBook.bids = (message.bids || []).map(b => {
                        const price = parseFloat(b[0]);
                        const size = parseFloat(b[1]);
                        bidTotal += size;
                        return { price, size, total: bidTotal };
                    });
                } 
                else if (message.event === 'candle') {
                    // Just in case the backend ever starts sending these again
                    buffer.ticker.price = parseFloat(message.close);
                    buffer.ticker.high = parseFloat(message.high);
                    buffer.ticker.low = parseFloat(message.low);
                }
            } catch (err) {
                // Silently catch JSON parse errors to keep the stream alive
            }
        };

        ws.onclose = () => {
            console.warn(`[WS Closed] ${pair}. Reconnecting...`);
            setTimeout(() => this.setupSocket(pair), 3000);
        };

        this.sockets[pair] = ws;
    }

    connectWebSockets() {
        this.basePairs.forEach(pair => this.setupSocket(pair));
    }

    startFlushLoop() {
        setInterval(() => {
            Object.keys(this.buffers).forEach(symbol => {
                const subs = this.subscribers.get(symbol);
                if (subs && subs.size > 0) {
                    const snapshot = JSON.parse(JSON.stringify(this.buffers[symbol]));
                    subs.forEach(cb => cb(snapshot));
                }
            });
        }, 100); 
    }

    subscribe(symbol, callback) {
        if (!this.subscribers.has(symbol)) {
            console.warn(`[DataManager] Unsupported symbol: ${symbol}`);
            return () => {};
        }
        this.subscribers.get(symbol).add(callback);
        return () => this.subscribers.get(symbol).delete(callback);
    }
}

export const dataManager = new DataManager();