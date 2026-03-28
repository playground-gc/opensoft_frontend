/**
 * DataManager.js
 * 
 * Production Binance WebSocket Integration & REST Interface.
 * Real-time order books, trades, and tickers mapped seamlessly to frontend.
 */

class DataManager {
  constructor() {
    this.subscribers = new Map();
    this.buffers = {};
    
    // Configurable standard symbols (SYN/USDT instead of SYN/USD to ensure live connection via Binance)
    this.basePairs = [
        'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'SYN/USDT', 'DOGE/USDT', 'ADA/USDT', 'XRP/USDT'
    ];

    this.basePairs.forEach(pair => {
        this.buffers[pair] = {
            ticker: { symbol: pair, price: 0, change: 0, high: 0, low: 0, volume: 0 },
            orderBook: { bids: [], asks: [] },
            latestTrades: []
        };
        this.subscribers.set(pair, new Set());
    });

    this.connectWebSockets();
    this.startFlushLoop();
  }

  formatSymbol(pair) {
     return pair.replace('/', '').toLowerCase();
  }

  connectWebSockets() {
      const streams = [];
      this.basePairs.forEach(pair => {
         const sym = this.formatSymbol(pair);
         streams.push(`${sym}@ticker`);
         streams.push(`${sym}@depth20@100ms`);
         streams.push(`${sym}@trade`);
      });

      // Using data-stream.binance.vision to bypass regional ISP blocks of stream.binance.com
      const wsUrl = `wss://data-stream.binance.vision:9443/stream?streams=${streams.join('/')}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
         const message = JSON.parse(event.data);
         if (!message.data) return;
         
         const streamName = message.stream;
         const data = message.data;

         const pair = this.basePairs.find(p => this.formatSymbol(p) === streamName.split('@')[0]);
         if (!pair) return;

         const buffer = this.buffers[pair];

         if (streamName.includes('@ticker')) {
            buffer.ticker.price = parseFloat(data.c);
            buffer.ticker.change = parseFloat(data.P);
            buffer.ticker.high = parseFloat(data.h);
            buffer.ticker.low = parseFloat(data.l);
            buffer.ticker.volume = parseFloat(data.v);
         } 
         else if (streamName.includes('@depth20')) {
            let bidTotal = 0;
            buffer.orderBook.bids = data.bids.map(b => {
                const size = parseFloat(b[1]);
                bidTotal += size;
                return { price: parseFloat(b[0]), size, total: bidTotal };
            });
            let askTotal = 0;
            buffer.orderBook.asks = data.asks.map(a => {
                const size = parseFloat(a[1]);
                askTotal += size;
                return { price: parseFloat(a[0]), size, total: askTotal };
            });
         }
         else if (streamName.includes('@trade')) {
            buffer.latestTrades.unshift({
                price: parseFloat(data.p),
                size: parseFloat(data.q),
                time: data.T,
                isBuyerMaker: data.m
            });
            if (buffer.latestTrades.length > 30) buffer.latestTrades.pop();
         }
      };
      
      this.ws.onclose = () => {
         console.warn("Binance WS Closed. Reconnecting in 3s...");
         setTimeout(() => this.connectWebSockets(), 3000);
      };
  }

  startFlushLoop() {
    setInterval(() => {
      Object.keys(this.buffers).forEach(symbol => {
          const subs = this.subscribers.get(symbol);
          if (subs && subs.size > 0) {
              // Ensure we have a valid price before emitting to prevent NaN crashes on bootup
              if (this.buffers[symbol].ticker.price > 0) {
                  const snapshot = { ...this.buffers[symbol] };
                  subs.forEach(cb => cb(snapshot));
              }
          }
      });
    }, 50); // High-performance 50ms flush
  }

  subscribe(symbol, callback) {
    if (!this.buffers[symbol]) {
        console.warn(`Symbol ${symbol} not supported by DataManager`);
        return () => {};
    }
    const subs = this.subscribers.get(symbol);
    subs.add(callback);
    
    if (this.buffers[symbol].ticker.price > 0) {
        callback({ ...this.buffers[symbol] });
    }
    
    return () => {
      subs.delete(callback);
    };
  }

  async fetchHistoricalKlines(symbol, timeframe) {
      const intervalMap = { '1s': '1s', '15m': '15m', '1H': '1h', '4H': '4h', '1D': '1d', '1W': '1w' };
      const interval = intervalMap[timeframe] || '1d';
      const formattedSymbol = this.formatSymbol(symbol).toUpperCase();
      
      try {
          // Using data-api.binance.vision to bypass regional ISP blocks
          const res = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${formattedSymbol}&interval=${interval}&limit=500`);
          const data = await res.json();
          
          return data.map(d => ({
              time: Math.floor(d[0] / 1000),
              open: parseFloat(d[1]),
              high: parseFloat(d[2]),
              low: parseFloat(d[3]),
              close: parseFloat(d[4])
          }));
      } catch (err) {
          console.error("Error fetching historical klines", err);
          return [];
      }
  }
}

export const dataManager = new DataManager();
