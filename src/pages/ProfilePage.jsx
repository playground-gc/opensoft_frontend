import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  cancelOrder,
  fetchBalanceHistory,
  fetchMe,
  fetchOrders,
  fetchPortfolio,
  fetchTrades} from "../services/api";
import { useAuthStore } from "../store";

const glassCardStyle = {
  background: "rgba(0, 0, 0, 0.4)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 69, 0, 0.1)",
  borderRadius: "0px",
  boxShadow: "0 0 25px rgba(255, 69, 0, 0.03), inset 0 0 15px rgba(255, 69, 0, 0.01)",
  overflow: "hidden"
};

const neonTextStyle = {
  color: "#ff4500",
  textShadow: "0 0 8px rgba(255, 69, 0, 0.4)"};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px"};

const tdStyle = {
  padding: "16px 20px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  textAlign: "left"};

const thStyle = {
  ...tdStyle,
  color: "rgba(255, 255, 255, 0.5)",
  fontWeight: "500",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)"};

const numberOrZero = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const fmtCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2}).format(numberOrZero(value));

const fmtNumber = (value, digits = 4) => numberOrZero(value).toFixed(digits);

const fmtDateTime = (value) => {
  if (!value) return "-";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? String(value) : dt.toLocaleString();
};

const isOrderCancellable = (order) => {
  const status = (order?.status || "").toLowerCase();
  return ["open", "partial", "pending_trigger", "triggered"].includes(status);
};

const normalizeMe = (data) => {
  if (!data || typeof data !== "object") return {};
  return {
    username: data.username || "-",
    email: data.email || "-",
    cashBalance: numberOrZero(data.cash_balance ?? data.cash ?? data.balance),
    portfolioValue: numberOrZero(
      data.total_portfolio_value ?? data.portfolio_market_value,
    ),
    totalUnrealizedPnl: numberOrZero(
      data.total_unrealized_pnl ?? data.unrealized_pnl,
    ),
    totalAccountValue: numberOrZero(
      data.total_account_value ?? data.account_value,
    ),
    holdings: Array.isArray(data.holdings) ? data.holdings : []};
};

const normalizeBalancePoints = (history = [], currentBalance = 0) => {
  const pts = history
    .map((item, index) => {
      const x = index + 1;
      const y = numberOrZero(item.balance);
      return {
        x,
        y,
        reason: item.reason || "-",
        symbol: item.symbol || "-",
        delta: numberOrZero(item.delta),
        date: item.timestamp || item.created_at || item.time || item.date || ""};
    })
    .filter((pt) => Number.isFinite(pt.y));

  if (pts.length === 0) {
    return [
      {
        x: 1,
        y: currentBalance,
        reason: "Current",
        symbol: "-",
        delta: 0,
        date: new Date().toISOString()},
      {
        x: 2,
        y: currentBalance,
        reason: "Current",
        symbol: "-",
        delta: 0,
        date: new Date().toISOString()},
    ];
  }
  if (pts.length === 1) {
    pts.push({ ...pts[0], x: 2 });
  }
  return pts;
};

// --- SVG Icons ---
const IconDashboard = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="9"></rect>
    <rect x="14" y="3" width="7" height="5"></rect>
    <rect x="14" y="12" width="7" height="9"></rect>
    <rect x="3" y="16" width="7" height="5"></rect>
  </svg>
);

const IconAssets = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path>
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path>
  </svg>
);

const IconOrders = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

const IconHistory = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

const IconRefresh = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

const BalanceChart = ({ points }) => {
  const width = 860;
  const height = 260;
  const pad = 12;

  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const ySpan = Math.max(maxY - minY, 1) * 1.05; // Add less headroom to use vertical space
  const xSpan = Math.max(points.length - 1, 1);

  const toX = (i) => pad + (i / xSpan) * (width - pad * 2);
  const toY = (value) =>
    height -
    pad -
    ((value - minY + ySpan * 0.025) / ySpan) * (height - pad * 2);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(i)} ${toY(p.y)}`)
    .join(" ");

  const fillPath = `${linePath} L${toX(points.length - 1)} ${height} L${toX(0)} ${height} Z`;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="neonGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255, 69, 0, 0.4)" />
          <stop offset="100%" stopColor="rgba(255, 69, 0, 0)" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path d={fillPath} fill="url(#neonGradient)" />

      {/* Grid lines */}
      <line
        x1={pad}
        y1={height / 2}
        x2={width - pad}
        y2={height / 2}
        stroke="rgba(255,255,255,0.05)"
        strokeDasharray="4 4"
      />
      <line
        x1={pad}
        y1={height - pad}
        x2={width - pad}
        y2={height - pad}
        stroke="rgba(255,255,255,0.1)"
      />

      {/* Main neon line */}
      <path
        d={linePath}
        fill="none"
        stroke="#ff4500"
        strokeWidth="3"
        filter="url(#glow)"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={`${p.x}-${p.y}-${i}`}
          cx={toX(i)}
          cy={toY(p.y)}
          r="4"
          fill="#000"
          stroke="#ff4500"
          strokeWidth="2"
          style={{ transition: "all 0.2s ease" }}
        >
          <title>{`${fmtDateTime(p.date)} | ${p.symbol} | ${p.reason} | delta ${fmtCurrency(p.delta)} | balance ${fmtCurrency(p.y)}`}</title>
        </circle>
      ))}
    </svg>
  );
};

export default function ProfilePage() {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [me, setMe] = useState({});
  const [holdings, setHoldings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [trades, setTrades] = useState([]);
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [cancellingId, setCancellingId] = useState("");

  const loadProfileData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const [meRes, portfolioRes, ordersRes, tradesRes, historyRes] =
      await Promise.all([
        fetchMe(),
        fetchPortfolio(),
        fetchOrders({ limit: 100 }),
        fetchTrades({ limit: 100 }),
        fetchBalanceHistory({ limit: 120 }),
      ]);

    if (!meRes.success) {
      setError(meRes.error || "Unable to load profile data.");
      setLoading(false);
      return;
    }

    const normalizedMe = normalizeMe(meRes.data);
    setMe(normalizedMe);
    setHoldings(
      portfolioRes.success
        ? portfolioRes.holdings
        : Array.isArray(normalizedMe.holdings)
          ? normalizedMe.holdings
          : [],
    );
    setOrders(ordersRes.success ? ordersRes.orders : []);
    setTrades(tradesRes.success ? tradesRes.trades : []);
    setBalanceHistory(historyRes.success ? historyRes.history : []);

    const silentErrors = [portfolioRes, ordersRes, tradesRes, historyRes]
      .filter((res) => !res.success)
      .map((res) => res.error)
      .filter(Boolean);

    if (silentErrors.length) {
      setError(`Some sections failed to load: ${silentErrors.join(" | ")}`);
    }

    setLoading(false);
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProfileData();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadProfileData]);

  const points = useMemo(
    () => normalizeBalancePoints(balanceHistory, me.cashBalance || 0),
    [balanceHistory, me.cashBalance],
  );

  const onCancelOrder = async (orderId) => {
    if (!orderId) return;
    setCancellingId(orderId);
    const res = await cancelOrder(orderId);
    if (!res.success) {
      setError(res.error || "Failed to cancel order.");
      setCancellingId("");
      return;
    }
    await loadProfileData();
    setCancellingId("");
  };

  if (!token) {
    return (
      <main
        style={{
          padding: "40px",
          color: "#fff",
          background: "transparent",
          minHeight: "100vh"}}
      >
        <div
          style={{
            ...glassCardStyle,
            padding: "40px",
            maxWidth: "400px",
            margin: "0 auto",
            textAlign: "center"}}
        >
          <h1 style={{ marginBottom: "16px", ...neonTextStyle }}>
            Access Denied
          </h1>
          <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "32px" }}>
            Authentication is required to view your profile.
          </p>
          <Link
            to="/trading-charts"
            style={{
              display: "inline-block",
              background: "rgba(255, 69, 0, 0.1)",
              border: "1px solid #ff4500",
              color: "#ff4500",
              padding: "12px 24px",
              borderRadius: "0px",
              textDecoration: "none",
              fontWeight: "600",
              transition: "all 0.3s",
              boxShadow: "0 0 15px rgba(255, 69, 0, 0.2)"}}
          >
            Return to Terminal
          </Link>
        </div>
      </main>
    );
  }

  const renderTabContent = () => {
    if (activeTab === "overview") {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            }}
        >
          <div
            style={{
              ...glassCardStyle,
              padding: "32px",
              display: "flex",
              flexWrap: "wrap",
              gap: "40px",
              position: "relative"}}
          >
            {/* Neon glow accent in corner */}
            <div
              style={{
                position: "absolute",
                top: "-50px",
                right: "-50px",
                width: "150px",
                height: "150px",
                background: "#ff4500",
                filter: "blur(100px)",
                opacity: 0.15,
                pointerEvents: "none"}}
            />

            <div style={{ flex: "1 1 300px", zIndex: 1 }}>
              <div
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "14px",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "1px"}}
              >
                Estimated Balance
              </div>
              <div
                style={{
                  fontSize: "42px",
                  fontWeight: "800",
                  color: "#fff",
                  textShadow: "0 0 20px rgba(255,255,255,0.1)",
                  marginBottom: "8px"}}
              >
                {fmtCurrency(me.totalAccountValue)}
              </div>
              <div
                style={{
                  fontSize: "15px",
                  color: "rgba(255,255,255,0.6)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"}}
              >
                <span>≈ {fmtCurrency(me.cashBalance)} Available Cash</span>
              </div>
            </div>

            <div style={{ flex: "2 1 400px", minWidth: 0, zIndex: 1 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px"}}
              >
                <div
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "14px",
                    textTransform: "uppercase",
                    letterSpacing: "1px"}}
                >
                  Performance
                </div>
                <div
                  style={{
                    color: me.totalUnrealizedPnl >= 0 ? "#0ECB81" : "#F6465D",
                    fontWeight: "600",
                    background:
                      me.totalUnrealizedPnl >= 0
                        ? "rgba(14, 203, 129, 0.1)"
                        : "rgba(246, 70, 93, 0.1)",
                    padding: "4px 12px",
                    borderRadius: "0px",
                    border: `1px solid ${me.totalUnrealizedPnl >= 0 ? "rgba(14, 203, 129, 0.2)" : "rgba(246, 70, 93, 0.2)"}`}}
                >
                  {me.totalUnrealizedPnl >= 0 ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "2px" }}><path d="M12 4l8 16H4z"/></svg> : <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "2px" }}><path d="M12 20L4 4h16z"/></svg>}
                  {fmtCurrency(me.totalUnrealizedPnl)} PnL
                </div>
              </div>
              <div
                style={{ height: "260px", width: "100%", marginTop: "16px" }}
              >
                <BalanceChart points={points} />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "24px"}}
          >
            {[
              { label: "Account Username", val: me.username },
              { label: "Contact Email", val: me.email },
              {
                label: "Total Asset Value",
                val: fmtCurrency(me.portfolioValue)},
            ].map((stat, i) => (
              <div key={i} style={{ ...glassCardStyle, padding: "24px" }}>
                <div
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "12px"}}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "rgba(255,255,255,0.9)"}}
                >
                  {stat.val}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === "assets") {
      return (
        <div style={{ ...glassCardStyle}}>
          <div
            style={{
              padding: "24px",
              borderBottom: "1px solid rgba(255,255,255,0.05)"}}
          >
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>
              Portfolio Holdings
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Asset</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Avg Price</th>
                  <th style={thStyle}>Current Price</th>
                  <th style={thStyle}>Market Value</th>
                  <th style={thStyle}>PnL</th>
                </tr>
              </thead>
              <tbody>
                {!holdings.length && (
                  <tr>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "center",
                        padding: "60px 0",
                        color: "rgba(255,255,255,0.4)"}}
                      colSpan={6}
                    >
                      No assets found.
                    </td>
                  </tr>
                )}
                {holdings.map((row, idx) => {
                  const pnl = numberOrZero(row.unrealized_pnl ?? row.pnl);
                  const symbol = row.symbol || row.asset || "-";
                  const isUp = pnl >= 0;
                  return (
                    <tr
                      key={`${symbol}-${idx}`}
                      style={{ transition: "background 0.2s" }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(255,255,255,0.02)")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <td style={{ ...tdStyle, fontWeight: "600" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px"}}
                        >
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "0px",
                              background: "rgba(255, 69, 0, 0.1)",
                              border: "1px solid rgba(255, 69, 0, 0.2)",
                              color: "#ff4500",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "bold",
                              fontSize: "14px"}}
                          >
                            {symbol.charAt(0)}
                          </div>
                          {symbol}
                        </div>
                      </td>
                      <td style={tdStyle}>{fmtNumber(row.quantity, 4)}</td>
                      <td
                        style={{ ...tdStyle, color: "rgba(255,255,255,0.7)" }}
                      >
                        {fmtCurrency(row.avg_price ?? row.avg_cost)}
                      </td>
                      <td style={tdStyle}>
                        {fmtCurrency(row.current_price ?? row.price)}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: "500" }}>
                        {fmtCurrency(row.market_value)}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          color: isUp ? "#0ECB81" : "#F6465D",
                          fontWeight: "600"}}
                      >
                        {isUp ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "2px" }}><path d="M12 4l8 16H4z"/></svg> : <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "2px" }}><path d="M12 20L4 4h16z"/></svg>}
                        {fmtCurrency(pnl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeTab === "orders") {
      return (
        <div style={{ ...glassCardStyle}}>
          <div
            style={{
              padding: "24px",
              borderBottom: "1px solid rgba(255,255,255,0.05)"}}
          >
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>
              Order History
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date & Time</th>
                  <th style={thStyle}>Symbol</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Side</th>
                  <th style={thStyle}>Price</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Filled</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {!orders.length && (
                  <tr>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "center",
                        padding: "60px 0",
                        color: "rgba(255,255,255,0.4)"}}
                      colSpan={9}
                    >
                      No active or past orders.
                    </td>
                  </tr>
                )}
                {orders.map((order) => {
                  const orderId = order.id || "";
                  const canCancel = isOrderCancellable(order);
                  const isBuy = order.side === "buy";
                  return (
                    <tr
                      key={orderId || `${order.symbol}-${order.created_at}`}
                      style={{ transition: "background 0.2s" }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(255,255,255,0.02)")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <td
                        style={{
                          ...tdStyle,
                          color: "rgba(255,255,255,0.5)",
                          fontSize: "13px"}}
                      >
                        {fmtDateTime(order.created_at)}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: "600" }}>
                        {order.symbol || "-"}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textTransform: "uppercase",
                          fontSize: "12px",
                          letterSpacing: "1px"}}
                      >
                        {order.order_type || "-"}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          color: isBuy ? "#0ECB81" : "#F6465D",
                          textTransform: "uppercase",
                          fontWeight: "bold",
                          fontSize: "12px"}}
                      >
                        {order.side || "-"}
                      </td>
                      <td style={tdStyle}>
                        {fmtCurrency(
                          order.price ?? order.limit_price ?? order.stop_price,
                        )}
                      </td>
                      <td style={tdStyle}>{fmtNumber(order.quantity, 4)}</td>
                      <td
                        style={{ ...tdStyle, color: "rgba(255,255,255,0.7)" }}
                      >
                        {fmtNumber(order.filled_qty, 4)}
                      </td>
                      <td style={{ ...tdStyle, textTransform: "capitalize" }}>
                        <span
                          style={{
                            background:
                              order.status === "filled"
                                ? "rgba(14, 203, 129, 0.1)"
                                : order.status === "open"
                                  ? "rgba(255, 69, 0, 0.1)"
                                  : "rgba(255,255,255,0.05)",
                            color:
                              order.status === "filled"
                                ? "#0ECB81"
                                : order.status === "open"
                                  ? "#ff4500"
                                  : "rgba(255,255,255,0.6)",
                            padding: "4px 8px",
                            borderRadius: "0px",
                            fontSize: "12px"}}
                        >
                          {order.status || "-"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {canCancel ? (
                          <button
                            type="button"
                            disabled={cancellingId === orderId}
                            onClick={() => onCancelOrder(orderId)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: "0px",
                              border: "1px solid rgba(246, 70, 93, 0.3)",
                              background: "rgba(246, 70, 93, 0.1)",
                              color: "#F6465D",
                              fontWeight: "600",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              fontSize: "12px",
                              textTransform: "uppercase"}}
                            onMouseOver={(e) =>
                              (e.target.style.background =
                                "rgba(246, 70, 93, 0.2)")
                            }
                            onMouseOut={(e) =>
                              (e.target.style.background =
                                "rgba(246, 70, 93, 0.1)")
                            }
                          >
                            {cancellingId === orderId ? "Wait" : <span style={{display:"flex",alignItems:"center"}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px"}}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>Cancel</span>}
                          </button>
                        ) : (
                          <span style={{ color: "rgba(255,255,255,0.2)" }}>
                            -
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeTab === "trades") {
      return (
        <div style={{ ...glassCardStyle}}>
          <div
            style={{
              padding: "24px",
              borderBottom: "1px solid rgba(255,255,255,0.05)"}}
          >
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>
              Trade Executions
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date & Time</th>
                  <th style={thStyle}>Symbol</th>
                  <th style={thStyle}>Side</th>
                  <th style={thStyle}>Price</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {!trades.length && (
                  <tr>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "center",
                        padding: "60px 0",
                        color: "rgba(255,255,255,0.4)"}}
                      colSpan={6}
                    >
                      No trades executed.
                    </td>
                  </tr>
                )}
                {trades.map((trade, idx) => {
                  const role = trade.role || trade.side || "-";
                  const price = numberOrZero(trade.price);
                  const qty = numberOrZero(trade.quantity);
                  const isBuy = role === "buy";
                  return (
                    <tr
                      key={`${trade.id || trade.trade_id || idx}`}
                      style={{ transition: "background 0.2s" }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(255,255,255,0.02)")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <td
                        style={{
                          ...tdStyle,
                          color: "rgba(255,255,255,0.5)",
                          fontSize: "13px"}}
                      >
                        {fmtDateTime(trade.timestamp || trade.created_at)}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: "600" }}>
                        {trade.symbol || "-"}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          color: isBuy ? "#0ECB81" : "#F6465D",
                          textTransform: "uppercase",
                          fontWeight: "bold",
                          fontSize: "12px"}}
                      >
                        {role}
                      </td>
                      <td style={tdStyle}>{fmtCurrency(price)}</td>
                      <td style={tdStyle}>{fmtNumber(qty, 4)}</td>
                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: "500",
                          color: "rgba(255,255,255,0.9)"}}
                      >
                        {fmtCurrency(price * qty)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
  };

  const navItems = [
    { id: "overview", label: "Dashboard", icon: <IconDashboard /> },
    { id: "assets", label: "Assets", icon: <IconAssets /> },
    { id: "orders", label: "Orders", icon: <IconOrders /> },
    { id: "trades", label: "Trade History", icon: <IconHistory /> },
  ];

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "radial-gradient(circle at 50% -20%, #0a0a0a, #050505 80%)",
        color: "#fff",
        fontFamily: "'Inter', 'Segoe UI', sans-serif"}}
    >
      <style>{`
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 0px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      {/* Header */}
      <div
        style={{
          height: "70px",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          zIndex: 10}}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "linear-gradient(135deg, #ff4500, #f5d061)",
              borderRadius: "0px",
              boxShadow: "0 0 15px rgba(255, 69, 0, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"}}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#000"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 22h20L12 2z" />
            </svg>
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "800",
              letterSpacing: "2px",
              ...neonTextStyle}}
          >
            SYNTHETIC
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              padding: "6px 16px 6px 6px",
              borderRadius: "0px"}}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                background: "rgba(255, 69, 0, 0.2)",
                borderRadius: "50%",
                color: "#ff4500",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "14px"}}
            >
              {me.username ? me.username.charAt(0).toUpperCase() : "U"}
            </div>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "rgba(255,255,255,0.8)"}}
            >
              {me.username || "Trader"}
            </span>
          </div>
          <Link
            to="/trading-charts"
            style={{
              textDecoration: "none",
              color: "#000",
              background: "linear-gradient(90deg, #ff4500, #f0b942)",
              padding: "10px 24px",
              borderRadius: "0px",
              fontSize: "13px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "1px",
              boxShadow: "0 4px 15px rgba(255, 69, 0, 0.3)",
              transition: "transform 0.2s, box-shadow 0.2s"}}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(255, 69, 0, 0.4)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow =
                "0 4px 15px rgba(255, 69, 0, 0.3)";
            }}
          >
            Terminal
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <div
          style={{
            width: "280px",
            padding: "32px 24px",
            borderRight: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            zIndex: 5,
            background: "rgba(0,0,0,0.2)"}}
        >
          <div
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.3)",
              marginBottom: "16px",
              paddingLeft: "16px",
              letterSpacing: "2px",
              fontWeight: "700"}}
          >
            PORTFOLIO MENU
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  padding: "16px 20px",
                  cursor: "pointer",
                  borderRadius: "0px",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  background: isActive
                    ? "rgba(255, 69, 0, 0.1)"
                    : "transparent",
                  border: `1px solid ${isActive ? "rgba(255, 69, 0, 0.2)" : "transparent"}`,
                  color: isActive ? "#ff4500" : "rgba(255,255,255,0.6)",
                  fontWeight: isActive ? "600" : "400",
                  transition: "all 0.2s ease",
                  boxShadow: isActive
                    ? "inset 0 0 20px rgba(255, 69, 0, 0.05)"
                    : "none"}}
                onMouseOver={(e) => {
                  if (!isActive) e.currentTarget.style.color = "#fff";
                }}
                onMouseOut={(e) => {
                  if (!isActive)
                    e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                }}
              >
                <div style={{ opacity: isActive ? 1 : 0.5 }}>{item.icon}</div>
                <span style={{ fontSize: "15px" }}>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Content Area */}
        <div
          style={{
            flex: 1,
            padding: "40px",
            overflowY: "auto",
            position: "relative"}}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: "40px"}}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "13px",
                  marginBottom: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "1px"}}
              >
                <span>Portfolio</span>
                <span>/</span>
                <span style={{ color: "#ff4500" }}>
                  {navItems.find((i) => i.id === activeTab)?.label}
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "700" }}>
                {navItems.find((i) => i.id === activeTab)?.label}
              </h1>
            </div>

            <button
              onClick={loadProfileData}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "0px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s"}}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
            >
              <IconRefresh />
              Sync Data
            </button>
          </div>

          {loading && (
            <div
              style={{
                padding: "80px 0",
                textAlign: "center",
                color: "rgba(255, 69, 0, 0.8)"}}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  border: "3px solid rgba(255, 69, 0, 0.2)",
                  borderTopColor: "#ff4500",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 20px"}}
              />
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              Loading secure data...
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                ...glassCardStyle,
                padding: "20px 24px",
                background: "rgba(246, 70, 93, 0.1)",
                border: "1px solid rgba(246, 70, 93, 0.3)",
                color: "#F6465D",
                marginBottom: "32px",
                display: "flex",
                alignItems: "center",
                gap: "12px"}}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
            </div>
          )}

          {!loading && renderTabContent()}
        </div>
      </div>
    </div>
  );
}
