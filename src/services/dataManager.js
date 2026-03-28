/**
 * DataManager.js
 * 
 * Simulates a high-performance backend (50-100 updates/sec).
 * Now supports multiple symbols individually.
 */

class DataManager {
  constructor() {
    this.subscribers = new Map(); // Map<Symbol, Set<Callback>>
    this.buffers = {};
    
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
        buffer.chartCandle = {
            time: now,
            open: newPrice,
            high: newPrice,
            low: newPrice,
            close: newPrice
        };
    } else {
        candle.close = newPrice;
        if (newPrice > candle.high) candle.high = newPrice;
        if (newPrice < candle.low) candle.low = newPrice;
    }

    if (Math.random() < 0.1) {
        buffer.latestTrades.unshift({
            price: newPrice,
            size: +(Math.random() * 2).toFixed(3),
            time: Date.now(),
            isBuyerMaker: Math.random() > 0.5
        });
        if (buffer.latestTrades.length > 30) {
            buffer.latestTrades.pop();
        }
    }

    if (Math.random() < 0.2) {
       if (buffer.orderBook.bids.length > 0) {
         buffer.orderBook.bids[0].size = +(Math.random() * 5).toFixed(3);
       }
       if (buffer.orderBook.asks.length > 0) {
         buffer.orderBook.asks[0].size = +(Math.random() * 5).toFixed(3);
       }
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

  subscribe(symbol, callback) {
    if (!this.buffers[symbol]) {
        console.warn(`Symbol ${symbol} not supported by DataManager`);
        return () => {};
    }
    const subs = this.subscribers.get(symbol);
    subs.add(callback);
    callback({ ...this.buffers[symbol] });
    
    return () => {
      subs.delete(callback);
    };
  }
}

export const dataManager = new DataManager();
