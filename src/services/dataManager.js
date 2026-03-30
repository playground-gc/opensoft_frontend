/**
 * DataManager.js
 * Manages REST (Port 8000) and WebSocket (Port 8001) state.
 */

class DataManager {
  constructor() {
    this.subscribers = new Map(); // Map<Symbol, Set<Callback>>
    this.buffers = {};
    this.candleHistory = {}; // Map<Symbol, candle[]>
    
    // Configurable symbols
    const symbols = [
        { pair: 'BTC/USDT', basePrice: 68142.00, volume: 3474 },
        { pair: 'ETH/USDT', basePrice: 3412.50, volume: 15320 },
        { pair: 'SOL/USDT', basePrice: 142.10, volume: 450123 },
        { pair: 'SYN/USD', basePrice: 15302.50, volume: 45012 },
        { pair: 'DOGE/USDT', basePrice: 0.162, volume: 9945012 },
        { pair: 'ADA/USDT', basePrice: 0.58, volume: 1245012 },
        { pair: 'XRP/USDT', basePrice: 0.61, volume: 545012 }
    ];

    symbols.forEach(s => {
        this.buffers[s.pair] = {
            ticker: {
                symbol: s.pair,
                price: s.basePrice,
                change: (Math.random() * 5) - 2.5,
                high: s.basePrice * 1.05,
                low: s.basePrice * 0.95,
                volume: s.volume,
            },
            orderBook: { bids: [], asks: [] },
            latestTrades: [],
            chartCandle: {
                time: Math.floor(Date.now() / 1000),
                open: s.basePrice,
                high: s.basePrice,
                low: s.basePrice,
                close: s.basePrice
            }
        };
        this.subscribers.set(s.pair, new Set());
        this.initOrderBook(s.pair);
        this.seedCandleHistory(s.pair, s.basePrice);
        // Set initial live candle time to just after last seeded candle
        const lastSeedTime = this.candleHistory[s.pair]?.slice(-1)[0]?.time ?? Math.floor(Date.now() / 1000);
        this.buffers[s.pair].chartCandle = {
            time: lastSeedTime + 60,
            open: s.basePrice, high: s.basePrice, low: s.basePrice, close: s.basePrice
        };
    });

    this.startMockWebSocket();
    this.startFlushLoop();
  }

  initOrderBook(symbol) {
    let currentPrice = this.buffers[symbol].ticker.price;
    const isCrypto = symbol.includes('USDT') && currentPrice < 10;
    const step = isCrypto ? currentPrice * 0.001 : currentPrice * 0.0005;
    
    const bids = [];
    const asks = [];
    let bidTotal = 0;
    let askTotal = 0;
    
    for (let i = 0; i < 20; i++) {
        // Bids go down
        const bidPrice = +(currentPrice - (i * step) - (Math.random()*step)).toFixed(4);
        const bidSize = +(Math.random() * 5).toFixed(3);
        bidTotal += bidSize;
        bids.push({ price: bidPrice, size: bidSize, total: bidTotal });

        // Asks go up
        const askPrice = +(currentPrice + (i * step) + (Math.random()*step)).toFixed(4);
        const askSize = +(Math.random() * 5).toFixed(3);
        askTotal += askSize;
        asks.push({ price: askPrice, size: askSize, total: askTotal });
    }
    
    this.buffers[symbol].orderBook.bids = bids;
    this.buffers[symbol].orderBook.asks = asks;
  }

  startMockWebSocket() {
    setInterval(() => {
      Object.keys(this.buffers).forEach(symbol => {
          this.simulateIncomingTick(symbol);
      });
    }, 15); // Slightly slower to accommodate multiple syms easily
  }

  simulateIncomingTick(symbol) {
    const buffer = this.buffers[symbol];
    const isCrypto = symbol.includes('USDT') && buffer.ticker.price < 5;
    const volatility = isCrypto ? buffer.ticker.price * 0.005 : buffer.ticker.price * 0.001;
    
    const change = (Math.random() - 0.5) * volatility;
    let newPrice = buffer.ticker.price + change;
    if (newPrice < 0.0001) newPrice = 0.0001;
    newPrice = +newPrice.toFixed(4);
    
    buffer.ticker.price = newPrice;
    
    // Update candle
    const candle = buffer.chartCandle;
    const now = Math.floor(Date.now() / 1000);
    
    if (now > candle.time + 60) {
        // Push completed candle to history before rotating
        const completed = { ...candle, volume: Math.floor(Math.random() * 5000) + 500 };
        if (!this.candleHistory[symbol]) this.candleHistory[symbol] = [];
        this.candleHistory[symbol].push(completed);
        if (this.candleHistory[symbol].length > 500) this.candleHistory[symbol].shift();

        buffer.chartCandle = {
            time: now,
            open: newPrice,
            high: newPrice,
            low: newPrice,
            close: newPrice
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
  }

  startFlushLoop() {
    setInterval(() => {
      Object.keys(this.buffers).forEach(symbol => {
          const subs = this.subscribers.get(symbol);
          if (subs && subs.size > 0) {
              const snapshot = { ...this.buffers[symbol] };
              subs.forEach(cb => cb(snapshot));
          }
      });
    }, 50);
  }

  seedCandleHistory(symbol, basePrice) {
    const history = [];
    const now = Math.floor(Date.now() / 1000);
    let price = basePrice;
    const isCrypto = symbol.includes('USDT') && price < 5;
    const volatility = isCrypto ? price * 0.005 : price * 0.001;
    for (let i = 200; i >= 0; i--) {
        const t = now - i * 60;
        const open = price;
        const change = (Math.random() - 0.49) * volatility * 10;
        price = Math.max(0.0001, +(price + change).toFixed(4));
        const close = price;
        const high = Math.max(open, close) + Math.random() * volatility * 5;
        const low = Math.min(open, close) - Math.random() * volatility * 5;
        const volume = Math.floor(Math.random() * 5000) + 500;
        history.push({ time: t, open, high: +high.toFixed(4), low: +Math.max(0.0001, low).toFixed(4), close, volume });
    }
    this.candleHistory[symbol] = history;
  }

  getCandles(symbol) {
    const history = this.candleHistory[symbol] ?? [];
    const current = this.buffers[symbol]?.chartCandle;
    let all = [...history];
    if (current) {
        // Only append live candle if it's strictly after last history candle
        const lastTime = all.length > 0 ? all[all.length - 1].time : 0;
        if (current.time > lastTime) {
            all.push({ ...current, volume: current.volume ?? 0 });
        } else if (current.time === lastTime) {
            // Update the last candle with latest live data
            all[all.length - 1] = { ...all[all.length - 1], ...current };
        }
    }
    // Safety: sort by time and remove any duplicates
    all.sort((a, b) => a.time - b.time);
    const seen = new Set();
    return all.filter(c => {
        if (seen.has(c.time)) return false;
        seen.add(c.time);
        return true;
    });
  }

  subscribe(symbol, callback) {
    if (!this.buffers[symbol]) {
        console.warn(`Symbol ${symbol} not supported by DataManager`);
        return () => {};
    }
}

export const dataManager = new DataManager();