# Project Synthetic-Bull — Frontend

> **IIT Kharagpur × NextBull | OpenSoft 2026**
> Real-time simulated crypto/stock exchange trading terminal — Vite + React frontend.

---

## Table of Contents

1. [What This Is](#1-what-this-is)
2. [What We Are Building](#2-what-we-are-building)
3. [Architecture Overview](#3-architecture-overview)
4. [Data Flow](#4-data-flow)
5. [Directory Reference](#5-directory-reference)
6. [State Management Design](#6-state-management-design)
7. [WebSocket Message Contract](#7-websocket-message-contract)
8. [Performance Rules](#8-performance-rules)
9. [Vision — What Is Asked vs What We Should Do](#9-vision--what-is-asked-vs-what-we-should-do)
10. [What to Avoid](#10-what-to-avoid)
11. [UI & Design Guidelines](#11-ui--design-guidelines)
12. [Evaluation Priorities](#12-evaluation-priorities)
13. [Dev Setup](#13-dev-setup)
14. [Environment Variables](#14-environment-variables)

---

## 1. What This Is

This is the **frontend-only** repo for Project Synthetic-Bull. The backend (matching engine, market simulator, trading bots) lives in a separate repo. The frontend connects to the backend exclusively via:

- **WebSocket** — real-time order book diffs, trade executions, candle ticks, portfolio updates, bot activity
- **REST API** — order placement, order cancellation, initial portfolio snapshot

**Eval weight: Frontend & UX is 50% of the total score.** This is the most important part of the project. Invest in it.

---

## 2. What We Are Building

### Required (core score)

| Feature | Component | Notes |
|---|---|---|
| Candlestick chart | `CandlestickChart` | 1s and 5s intervals, switchable |
| Order book depth | `OrderBook`, `DepthChart` | Live bid/ask levels + depth visualization |
| Order entry panel | `OrderPanel` | Market orders + Limit orders |
| Portfolio widget | `PortfolioWidget` | Cash, holdings, live P&L |
| WebSocket feed | `useWebSocket`, `WebSocketClient` | 50–100 msgs/sec, must not lag |

### Optional (tie-breaker bonus)

| Feature | Component | Notes |
|---|---|---|
| Bot status panel | `BotStatusPanel`, `BotCard` | Market Maker Bot + Alpha Bot monitoring |
| Bot trade feed | `BotTradeFeed` | Scrolling live feed of bot-executed trades |

### Not Required

- Authentication / login
- Multiple assets / tickers (single simulated asset is sufficient)
- Historical data persistence across sessions
- Mobile responsiveness (nice to have, not scored)

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
│                                                             │
│  ┌──────────┐   ┌─────────────────────────────────────────┐ │
│  │ App.jsx  │──▶│           TradingTerminal.jsx            │ │
│  │ (router) │   │         (single page, MVP)               │ │
│  └──────────┘   └───────────────┬─────────────────────────┘ │
│                                 │ TradingLayout (CSS Grid)   │
│          ┌──────────────────────┼───────────────┐            │
│          ▼                      ▼               ▼            │
│  ┌──────────────┐   ┌──────────────────┐  ┌──────────────┐  │
│  │Candlestick   │   │   OrderBook      │  │  OrderPanel  │  │
│  │Chart         │   │   + DepthChart   │  │  (forms)     │  │
│  └──────┬───────┘   └────────┬─────────┘  └──────┬───────┘  │
│         │                   │                    │           │
│         ▼                   ▼                    ▼           │
│  ┌──────────────┐   ┌──────────────┐    ┌──────────────┐    │
│  │ marketStore  │   │orderBookStore│    │  orderStore  │    │
│  └──────────────┘   └──────────────┘    └──────────────┘    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               useWebSocket (mounted once)             │   │
│  │   WebSocketClient → messageParser → store dispatch   │   │
│  └──────────────────────────┬───────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────┘
                              │ ws://
                    ┌─────────▼─────────┐
                    │   Backend Engine  │
                    │  (separate repo)  │
                    └───────────────────┘
```

### Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Build tool | Vite | Fast HMR, native ESM |
| UI framework | React 18 | Concurrent rendering helps with high-freq updates |
| State management | **Zustand** | Minimal boilerplate, no context re-render cascade, fine-grained subscriptions |
| Server state | React Query | Handles REST calls, loading/error states, cache invalidation |
| Charting | **lightweight-charts** (TradingView) | Purpose-built for financial charts, imperative API avoids React re-render on every tick |
| Styling | Tailwind CSS | Utility-first, no runtime overhead |
| HTTP client | Axios | Interceptors for auth headers if needed later |
| Path alias | `@/` → `src/` | Configured in `vite.config.js` |

---

## 4. Data Flow

```
Backend WebSocket
       │
       ▼
WebSocketClient.js          ← singleton, manages reconnect
       │
       ▼
messageParser.js            ← validates JSON, identifies event type
       │
       ├──▶ WS_EVENTS.ORDERBOOK_DIFF   ──▶  orderBookStore.applyDiff()
       ├──▶ WS_EVENTS.TRADE_EXECUTED   ──▶  marketStore.addTrade()
       ├──▶ WS_EVENTS.CANDLE_UPDATE    ──▶  marketStore.updateCandle()
       ├──▶ WS_EVENTS.PORTFOLIO_UPDATE ──▶  portfolioStore.update()
       └──▶ WS_EVENTS.BOT_TRADE        ──▶  botStore.addTrade()

orderBookStore
       │
       └──▶ useOrderBook()  [memoized transform]
              └──▶ OrderBook component (renders depth levels)

marketStore
       │
       └──▶ useCandlestick()  [rAF-batched]
              └──▶ CandlestickChart (series.update() — NOT re-render)

portfolioStore + marketStore
       │
       └──▶ usePortfolio()  [derived metrics]
              └──▶ PortfolioWidget

orderStore (optimistic)
       │
       ├──▶ useOrderSubmit()  [REST mutation + rollback]
       └──▶ OpenOrders component
```

---

## 5. Directory Reference

```
src/
├── main.jsx                   Entry point. Mounts App, wraps QueryClientProvider.
├── App.jsx                    Router setup. Lazy-loads pages.
│
├── assets/                    Static files (icons, logo SVG etc.)
├── styles/
│   ├── globals.css            Tailwind directives. CSS custom properties for
│   │                          chart colors (lightweight-charts can't read Tailwind).
│   └── theme.js               JS export of the same palette. Consumed by chart
│                              series options and tailwind.config.js.
│
├── constants/
│   ├── wsEvents.js            All WS event type strings. NEVER hardcode these inline.
│   └── trading.js             ORDER_TYPES, ORDER_SIDES, DEFAULT_CAPITAL ($100k), intervals.
│
├── services/
│   ├── websocket/
│   │   ├── WebSocketClient.js Singleton. Owns the WS connection, reconnect, sub/unsub API.
│   │   ├── messageParser.js   Pure parser. Returns null for unknown events (no throws).
│   │   └── index.js           Re-exports.
│   └── api/
│       ├── ordersApi.js       placeOrder(), cancelOrder() — raw Axios calls.
│       └── portfolioApi.js    fetchPortfolio() — initial load reconciliation.
│
├── store/                     All Zustand stores. One file per concern.
│   ├── marketStore.js         Current price, OHLCV candle list, last trade.
│   ├── orderBookStore.js      Bids/asks as Map<price, size>. applyDiff() action.
│   ├── portfolioStore.js      Cash, holdings map. Unrealised P&L NOT stored here.
│   ├── orderStore.js          Open orders, history. Optimistic add/remove.
│   └── botStore.js            Bot status enum, P&L, rolling trade feed (capped at 200).
│
├── hooks/                     Custom hooks. Glue between stores/services and components.
│   ├── useWebSocket.js        Opens WS, routes messages. Mount ONCE in App.jsx.
│   ├── useOrderBook.js        Reads orderBookStore, outputs sorted DepthLevel[] + spread.
│   ├── useCandlestick.js      Reads marketStore candles, returns rAF-ready update API.
│   ├── usePortfolio.js        Combines portfolioStore + marketStore → derived metrics.
│   ├── useOrderSubmit.js      React Query mutation + optimistic orderStore update.
│   └── useThrottle.js         Generic value throttle. Use on price displays, not on stores.
│
├── utils/                     Pure functions. No React, no imports from store.
│   ├── formatters.js          formatPrice(), formatVolume(), formatCurrency(), formatPercent().
│   ├── orderBookHelpers.js    aggregateDepth(), computeMidPrice(), computeSpread().
│   ├── chartAdapters.js       toOHLCV(), toVolumeBar(). Converts WS data → chart format.
│   └── pnlCalc.js             calcUnrealisedPnL(), calcRealisedPnL(), calcPnLPercent().
│
├── components/
│   ├── ui/                    Dumb, reusable primitives. No store access.
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Select.jsx
│   │   ├── Badge.jsx          BUY=green, SELL=red, FILLED=muted, OPEN=brand.
│   │   ├── Card.jsx           Dark panel with surface-border. Base for all widgets.
│   │   ├── Ticker.jsx         Price number that flashes green/red on change.
│   │   └── Spinner.jsx
│   │
│   ├── charts/
│   │   ├── CandlestickChart.jsx   lightweight-charts wrapper. Chart in ref, NOT state.
│   │   ├── DepthChart.jsx         Bid/ask cumulative area chart. Optional but impactful.
│   │   └── PriceLine.jsx          Horizontal overlay (e.g. entry price line on chart).
│   │
│   ├── orderbook/
│   │   ├── OrderBook.jsx          Container: asks (top) + spread + bids (bottom).
│   │   ├── OrderBookSide.jsx      One side. Virtualize if > 20 levels shown.
│   │   └── SpreadIndicator.jsx    Mid-price + spread in basis points.
│   │
│   ├── trading/
│   │   ├── OrderPanel.jsx         Tabbed: Market | Limit. + OpenOrders below.
│   │   ├── MarketOrderForm.jsx    Side (BUY/SELL) + Quantity. Submit → useOrderSubmit.
│   │   ├── LimitOrderForm.jsx     Side + Quantity + Price. Submit → useOrderSubmit.
│   │   └── OpenOrders.jsx         Table of open orders. Cancel button per row.
│   │
│   ├── portfolio/
│   │   ├── PortfolioWidget.jsx    Cash / Holdings value / Total equity / P&L.
│   │   ├── HoldingsTable.jsx      Per-asset rows: avg cost, qty, current value, P&L.
│   │   └── PnLBadge.jsx           +$123.45 (+1.23%) in green or red.
│   │
│   └── bots/                  Optional module. Can be behind a feature flag.
│       ├── BotStatusPanel.jsx     Container for both bot cards.
│       ├── BotCard.jsx            Status (RUNNING/STOPPED), P&L, last action.
│       └── BotTradeFeed.jsx       Live scrolling list. Max 50 DOM rows.
│
├── layouts/
│   ├── RootLayout.jsx         App shell: top navbar + <Outlet />.
│   └── TradingLayout.jsx      CSS Grid. Named areas. See section 9 for grid design.
│
└── pages/
    ├── TradingTerminal.jsx    Composes all panels. The only real page.
    └── NotFound.jsx           404 fallback.
```

---

## 6. State Management Design

### Store responsibilities

```
marketStore      — "what is happening in the market right now"
orderBookStore   — "what orders are sitting in the book"
portfolioStore   — "what the user owns"
orderStore       — "what orders the user has placed"
botStore         — "what the bots are doing"
```

### Key patterns

**Order book updates — use Map, not array:**
```js
// CORRECT — O(1) update
state.bids.set(price, size);
if (size === 0) state.bids.delete(price);

// WRONG — O(n) scan on every WS message at 100/sec
state.bids = state.bids.filter(b => b.price !== price);
state.bids.push({ price, size });
```

**Unrealised P&L — derive, do not store:**
```js
// In usePortfolio.js — recompute when price or holdings change
const unrealisedPnL = calcUnrealisedPnL(holdings, currentPrice);

// WRONG — storing it means you need to sync it constantly
portfolioStore.set({ unrealisedPnL: ... });
```

**Chart updates — imperative, not declarative:**
```js
// In CandlestickChart.jsx — chart lives in a ref
const chartRef = useRef(null);
const seriesRef = useRef(null);

useEffect(() => {
  // On new candle from useCandlestick:
  seriesRef.current.update(latestCandle); // imperative API — no re-render
}, [latestCandle]);

// WRONG — this causes a full React re-render for every tick
const [candles, setCandles] = useState([]);
```

**Throttle display values, not store writes:**
```js
// In PortfolioWidget.jsx
const rawEquity = usePortfolioStore(s => s.totalEquity);
const equity = useThrottle(rawEquity, 100); // display at max 10fps
// Store itself is still updated at full WS rate
```

**Optimistic order submission:**
```js
// useOrderSubmit.js flow:
// 1. Add order to orderStore optimistically (instant UI feedback)
// 2. Fire REST call
// 3. On success: replace optimistic entry with confirmed server order
// 4. On failure: remove optimistic entry, show error toast
```

---

## 7. WebSocket Message Contract

> **Note to agent:** The actual event names and shapes must be confirmed with the backend team. The constants in `src/constants/wsEvents.js` must mirror exactly what the backend sends. Below is the expected/recommended schema. Lock it down with the backend team before building components.

```jsonc
// Order book incremental diff
{
  "event": "ORDERBOOK_DIFF",
  "bids": [["29500.00", "1.24"], ["29499.50", "0.80"]],
  "asks": [["29501.00", "0.45"], ["29501.50", "2.10"]],
  "timestamp": 1710000000000
}

// Trade execution (market fill)
{
  "event": "TRADE_EXECUTED",
  "price": 29500.50,
  "quantity": 0.30,
  "side": "BUY",
  "timestamp": 1710000000000
}

// Candle tick (1s or 5s)
{
  "event": "CANDLE_UPDATE",
  "interval": "1s",
  "open": 29498.00,
  "high": 29505.00,
  "low": 29496.00,
  "close": 29500.50,
  "volume": 12.45,
  "time": 1710000000     // Unix seconds — required by lightweight-charts
}

// User portfolio update (after fill)
{
  "event": "PORTFOLIO_UPDATE",
  "cash": 95000.00,
  "holdings": { "BTC": 0.17 },
  "realisedPnL": 150.00
}

// Bot trade (optional)
{
  "event": "BOT_TRADE",
  "bot": "MARKET_MAKER" | "ALPHA",
  "side": "BUY" | "SELL",
  "price": 29500.50,
  "quantity": 0.10,
  "timestamp": 1710000000000
}
```

---

## 8. Performance Rules

These are non-negotiable at 50–100 WS messages per second:

1. **Never put the chart instance in React state.** Use `useRef`. A `setState` call on every tick = 100 full reconciliation cycles per second.

2. **Never re-render the OrderBook on every WS message.** The `useOrderBook` hook must memoize its output with `useMemo`, recomputing only when the Map reference changes (after `applyDiff`).

3. **`useWebSocket` must be mounted exactly once** — at `App.jsx` level. If it's mounted inside a component that unmounts/remounts, you get duplicate connections and double-processing.

4. **Cap the bot trade feed DOM** to a maximum of 50 rows. Render a virtual scroll or simply slice to 50. At 100 bot trades/sec, an unbound list will crash the browser.

5. **Batch candle updates in `requestAnimationFrame`.** The chart doesn't need to update faster than 60fps. Collect incoming ticks in a buffer and flush once per animation frame.

6. **Do not use `useSelector` with object/array literals as default values.** This creates new references every render:
   ```js
   // WRONG
   const bids = useOrderBookStore(s => s.bids || []);
   // CORRECT
   const bids = useOrderBookStore(s => s.bids);
   ```

7. **`aggregateDepth` in `orderBookHelpers.js` is the hot path.** It runs on every ORDERBOOK_DIFF. Keep it allocation-light: avoid `.map().filter().sort()` chains. Pre-allocate arrays where possible.

8. **Use `shallow` from Zustand** when selecting multiple fields:
   ```js
   import { shallow } from 'zustand/shallow';
   const { cash, holdings } = usePortfolioStore(s => ({ cash: s.cash, holdings: s.holdings }), shallow);
   ```

---

## 9. Vision — What Is Asked vs What We Should Do

This section documents cases where the problem statement asks for one thing, but we believe a different implementation approach produces a better result. These are intentional deviations, not oversights.

---

### 9.1 Candlestick chart library

**What is asked:** A "live, auto-updating Candlestick chart."

**Naive approach:** Use Recharts or Chart.js wrapped in React state — simple to implement, but these libraries re-render the entire chart SVG on every data point update. At 1–5 second candles this is fine; at 100 WS messages/sec feeding into it, it is not.

**Our approach:** Use **`lightweight-charts`** (TradingView's open-source library). It exposes an imperative API (`series.update()`) that updates only the last candle pixel-by-pixel without touching React's reconciler. The chart lives in a `useRef`, never in `useState`. This is how professional trading terminals work.

**Implication:** `CandlestickChart.jsx` does not receive `candles` as a prop and re-render. It initialises once, gets a ref to the series, and `useCandlestick` calls `series.update()` directly.

---

### 9.2 Order book state structure

**What is asked:** Display the limit order book with bids and asks.

**Naive approach:** Store bids and asks as sorted arrays, and on each diff message, find and splice the modified price level.

**Our approach:** Store bids and asks as `Map<priceString, size>` in Zustand. On diff: `map.set(price, size)` or `map.delete(price)` — O(1) regardless of book depth. Sorting only happens in `useOrderBook` for the view layer, not in the store. This is critical at 50–100 diffs/sec.

---

### 9.3 P&L calculation location

**What is asked:** "A real-time Portfolio widget showing the user's current cash balance, asset holdings, and live P&L."

**Naive approach:** Store `unrealisedPnL` in `portfolioStore` and update it every time a price WebSocket message arrives.

**Our approach:** `portfolioStore` only stores factual state (cash, holdings, realised P&L). `unrealisedPnL` is **derived** in `usePortfolio()` by combining `holdings` from `portfolioStore` with `currentPrice` from `marketStore`. It is never stored. This avoids a redundant write to the store on every price tick (100/sec) for something that can be computed in a single multiplication at render time.

---

### 9.4 Layout grid approach

**What is asked:** "A modern, NextBull-styled web interface."

**Naive approach:** Flex columns with hardcoded widths.

**Our approach:** CSS Grid with named template areas in `TradingLayout.jsx`. This mirrors how Bloomberg Terminal and TradingView structure their panes. It is responsive by changing the template string per breakpoint, not by moving DOM nodes. Panels can be rearranged without touching component hierarchy.

Recommended grid (desktop):
```
┌─────────────────────┬───────────────┐
│                     │               │
│   CandlestickChart  │  OrderBook    │
│                     │               │
├──────────┬──────────┤               │
│          │          ├───────────────┤
│ Portfolio│  Order   │  BotStatus   │
│ Widget   │  Panel   │  (optional)  │
└──────────┴──────────┴───────────────┘
```

---

### 9.5 WebSocket connection management

**What is asked:** Receive data via WebSocket.

**Naive approach:** `useEffect(() => { const ws = new WebSocket(url); ... }, [])` inside a component.

**Our approach:** A singleton `WebSocketClient` class handles the connection, reconnect with exponential backoff, and a listener registry. `useWebSocket` hook is called once at `App.jsx` level and routes messages to stores. Components never open their own connections. If a component unmounts and remounts, no connections are lost or duplicated.

---

### 9.6 Bot panel as a feature flag

**What is asked:** Bot monitoring is optional/tie-breaker.

**Our approach:** The bot panel components (`bots/`) are built as a complete, isolated module. In `TradingTerminal.jsx`, they are conditionally rendered behind a constant flag:
```js
const SHOW_BOT_PANEL = true; // flip to false to hide cleanly
```
This means the feature can be toggled without touching component logic or layout.

---

### 9.7 Depth chart as a separate view

**What is asked:** "A visual representation of the Limit Order Book (Bid/Ask depth)."

**Naive approach:** Just show the tabular order book (price levels list).

**Our approach:** Build *both* — the tabular `OrderBook` (price levels with size bars) and a `DepthChart` (cumulative bid/ask area chart). The depth chart is far more readable and visually impressive for the panel. It uses the same `useOrderBook` data. The tabular view is kept for precision.

---

## 10. What to Avoid

### Code patterns

- **Do not use `useState` for anything that comes from a WebSocket.** All WS-driven data lives in Zustand stores. `useState` inside components is only for purely local UI state (open/closed tab, input value).

- **Do not call `store.getState()` inside components.** Always use the Zustand hook with a selector. `getState()` is only valid inside non-React contexts (event handlers outside React, utility functions).

- **Do not pass store state down through many prop levels.** Use the Zustand hooks directly in the leaf component that needs the data. Prop drilling defeats the purpose of a global store.

- **Do not debounce the store writes.** Debounce the *renders* (via `useThrottle`) but always write to the store immediately so all consumers get the freshest data. Debouncing writes would cause a portfolio to show stale P&L.

- **Do not import store files into utility functions** (`utils/`). Utilities must be pure functions — no store access, no React hooks, no side effects. This keeps them unit-testable.

- **Do not put `lightweight-charts` instances in React state.** This is repeated because it is the single most common mistake when building trading UIs in React. Chart → `useRef`. Always.

### Design patterns

- **Do not make the layout a single giant component.** `TradingTerminal.jsx` only assembles layout; it does not contain logic. Each panel is fully self-contained.

- **Do not create one monolithic CSS file.** Each component gets its Tailwind classes inline. Global CSS (`globals.css`) is only for CSS custom properties and Tailwind base directives.

- **Do not hardcode WS event strings in components.** All event type strings live in `src/constants/wsEvents.js`. Hardcoding leads to typo bugs that are silent (WS just never delivers).

- **Do not fetch portfolio data by polling the REST endpoint at high frequency.** Portfolio comes from WebSocket `PORTFOLIO_UPDATE` events after fills. REST `fetchPortfolio` is only called once on mount and as a reconciliation safety net.

### Architecture

- **Do not open WebSocket connections in more than one place.** The `WebSocketClient` singleton and `useWebSocket` hook own the connection. No other file should call `new WebSocket(...)`.

- **Do not couple the bot panel to the core trading logic.** Bot components only read from `botStore`. They never interact with `orderStore` or `portfolioStore`. Bots are observers only from the frontend's perspective.

- **Do not mix REST and WS responsibilities.** Order *placement* and *cancellation* go through REST. Market data and order book go through WebSocket. Portfolio updates come from WebSocket after fills; the REST endpoint is for initial load only.

---

## 11. UI & Design Guidelines

### Theme tokens

Defined in `tailwind.config.js` and mirrored in `src/styles/theme.js`:

| Token | Value | Usage |
|---|---|---|
| `surface.DEFAULT` | `#0f1117` | Page background |
| `surface.raised` | `#161b27` | Card/panel backgrounds |
| `surface.border` | `#1e2535` | All borders |
| `brand.DEFAULT` | `#f59e0b` | Accent, active tab, primary CTA |
| `bull` | `#22c55e` | Buy side, positive P&L, price up |
| `bear` | `#ef4444` | Sell side, negative P&L, price down |
| `muted` | `#6b7280` | Secondary text, labels |

### Fonts

- Numbers (prices, quantities): `font-mono` — `JetBrains Mono` → `Fira Code` → monospace
- UI labels: `font-sans` — `Inter`

### Price flashing

The `Ticker` component should flash its background green (`bull`) when price increases and red (`bear`) when it decreases. Use a CSS transition with a short duration (150ms). This is a standard exchange UI pattern and will be noticed by evaluators.

### Order book depth bars

Each row in `OrderBookSide` should have a background depth bar showing the size relative to the maximum size on that side. This is a CSS `width` percentage on a pseudo-element or a background gradient. It adds significant visual value with minimal code.

---

## 12. Evaluation Priorities

Frontend & UX is **50%** of the score. Within that, the evaluators care about:

1. **Responsiveness of the web terminal** — does the chart update live? Does the order book move? Is there lag?
2. **Quality of the charting** — is it a real candlestick chart with proper OHLCV, or just a line?
3. **Intuitive UI/UX design** — does it look like a real trading terminal? Dark theme, proper layout.

Ranked effort allocation for this repo:

1. `CandlestickChart` + `useCandlestick` — must be buttery smooth
2. `OrderBook` + `OrderBookSide` — must be visually impressive with depth bars
3. `TradingLayout` — the overall grid must look professional
4. `OrderPanel` — must work correctly (order submission)
5. `PortfolioWidget` — must show live P&L
6. `DepthChart` — visual bonus
7. `BotStatusPanel` — tie-breaker bonus

---

## 13. Dev Setup

```bash
# Install dependencies
npm install

# Start dev server (proxies /api to localhost:8000 by default)
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

The frontend dev server runs on **port 5173** by default.

The Vite proxy in `vite.config.js` forwards `/api` requests to the backend. Set `VITE_API_BASE_URL` in `.env.local` to override the backend address.

### With Docker (full stack)

From the root `docker-compose.yml` in the backend repo:
```bash
docker-compose up
```
The frontend container runs `vite build` and serves the static output via nginx on port **80**.

---

## 14. Environment Variables

See `.env.example`:

```env
# WebSocket endpoint for the backend trading engine
VITE_WS_URL=ws://localhost:8000/ws

# REST API base URL
VITE_API_BASE_URL=http://localhost:8000
```

All env vars exposed to the browser must be prefixed with `VITE_`. Copy `.env.example` to `.env.local` for local development.

---

*This README is the authoritative source for any agent or developer working on this frontend. When in doubt about approach, refer to [Section 9](#9-vision--what-is-asked-vs-what-we-should-do) and [Section 10](#10-what-to-avoid).*
