import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  cancelOrder,
  fetchBalanceHistory,
  fetchMe,
  fetchOrders,
  fetchPortfolio,
  fetchTrades,
} from "../services/api";
import { useAuthStore } from "../store";

const cardStyle = {
  background: "var(--color-bg-panel)",
  border: "1px solid var(--color-bg-border)",
  borderRadius: "8px",
  padding: "14px",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "12px",
};

const tdStyle = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--color-bg-border)",
  textAlign: "left",
};

const numberOrZero = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const fmtCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 2,
  }).format(numberOrZero(value));

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
	totalAccountValue: numberOrZero(data.total_account_value ?? data.account_value),
	holdings: Array.isArray(data.holdings) ? data.holdings : [],
  };
};

const normalizeBalancePoints = (history = []) =>
  history
	.map((item, index) => {
	  const x = index + 1;
	  const y = numberOrZero(item.balance);
	  return {
		x,
		y,
		reason: item.reason || "-",
		symbol: item.symbol || "-",
		delta: numberOrZero(item.delta),
		date: item.timestamp || item.created_at || item.time || item.date || "",
	  };
	})
	.filter((pt) => Number.isFinite(pt.y));

const BalanceChart = ({ points }) => {
  if (!points.length) {
	return <div style={{ color: "var(--color-text-muted)" }}>No history data yet.</div>;
  }

  const width = 860;
  const height = 220;
  const pad = 26;
  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const ySpan = Math.max(maxY - minY, 1);
  const xSpan = Math.max(points.length - 1, 1);

  const toX = (i) => pad + (i / xSpan) * (width - pad * 2);
  const toY = (value) => height - pad - ((value - minY) / ySpan) * (height - pad * 2);

  const linePath = points
	.map((p, i) => `${i === 0 ? "M" : "L"}${toX(i)} ${toY(p.y)}`)
	.join(" ");

  return (
	<svg
	  width="100%"
	  height={height}
	  viewBox={`0 0 ${width} ${height}`}
	  style={{ display: "block", background: "#11161c", borderRadius: "6px" }}
	  role="img"
	  aria-label="Balance history line chart"
	>
	  <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#2B3139" />
	  <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#2B3139" />
	  <path d={linePath} fill="none" stroke="#0ECB81" strokeWidth="2" />
	  {points.map((p, i) => (
		<circle key={`${p.x}-${p.y}-${i}`} cx={toX(i)} cy={toY(p.y)} r="2.5" fill="#0ECB81">
		  <title>{`${fmtDateTime(p.date)} | ${p.symbol} | ${p.reason} | delta ${fmtCurrency(p.delta)} | balance ${fmtCurrency(p.y)}`}</title>
		</circle>
	  ))}
	  <text x={pad + 4} y={pad + 10} fill="#848E9C" fontSize="10">
		Max: {fmtCurrency(maxY)}
	  </text>
	  <text x={pad + 4} y={height - pad - 4} fill="#848E9C" fontSize="10">
		Min: {fmtCurrency(minY)}
	  </text>
	</svg>
  );
};

export default function ProfilePage() {
  const { token } = useAuthStore();
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

	const [meRes, portfolioRes, ordersRes, tradesRes, historyRes] = await Promise.all([
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

  const points = useMemo(() => normalizeBalancePoints(balanceHistory), [balanceHistory]);

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
	  <main style={{ padding: "24px", color: "var(--color-text-main)" }}>
		<h1 style={{ marginBottom: "8px" }}>Profile</h1>
		<p style={{ color: "var(--color-text-muted)", marginBottom: "12px" }}>
		  You need to log in to view your profile data.
		</p>
		<Link to="/trading-charts" style={{ color: "#0ECB81" }}>
		  Go to trading terminal
		</Link>
	  </main>
	);
  }

  return (
	<main
	  style={{
		height: "100vh",
		overflowY: "auto",
		background: "var(--color-bg-deep)",
		color: "var(--color-text-main)",
		padding: "18px",
	  }}
	>
	  <div style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between" }}>
		<div>
		  <h1 style={{ fontSize: "20px", marginBottom: "4px" }}>Profile Dashboard</h1>
		  <p style={{ color: "var(--color-text-muted)" }}>
			User account, holdings, orders, trades, and balance history.
		  </p>
		</div>
		<button
		  type="button"
		  onClick={loadProfileData}
		  style={{
			alignSelf: "start",
			padding: "8px 12px",
			borderRadius: "6px",
			border: "1px solid var(--color-bg-border)",
			background: "#1d2a23",
			color: "#0ECB81",
			cursor: "pointer",
		  }}
		>
		  Refresh
		</button>
	  </div>

	  {loading && <div style={{ marginBottom: "12px" }}>Loading profile data...</div>}
	  {!loading && error && (
		<div style={{ marginBottom: "12px", color: "#F6465D" }}>{error}</div>
	  )}

	  <section
		style={{
		  display: "grid",
		  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
		  gap: "10px",
		  marginBottom: "12px",
		}}
	  >
		<article style={cardStyle}>
		  <div style={{ color: "var(--color-text-muted)", marginBottom: "6px" }}>Username</div>
		  <strong>{me.username || "-"}</strong>
		</article>
		<article style={cardStyle}>
		  <div style={{ color: "var(--color-text-muted)", marginBottom: "6px" }}>Email</div>
		  <strong>{me.email || "-"}</strong>
		</article>
		<article style={cardStyle}>
		  <div style={{ color: "var(--color-text-muted)", marginBottom: "6px" }}>Cash Balance</div>
		  <strong>{fmtCurrency(me.cashBalance)}</strong>
		</article>
		<article style={cardStyle}>
		  <div style={{ color: "var(--color-text-muted)", marginBottom: "6px" }}>
			Portfolio Value
		  </div>
		  <strong>{fmtCurrency(me.portfolioValue)}</strong>
		</article>
		<article style={cardStyle}>
		  <div style={{ color: "var(--color-text-muted)", marginBottom: "6px" }}>Unrealized PnL</div>
		  <strong style={{ color: me.totalUnrealizedPnl >= 0 ? "#0ECB81" : "#F6465D" }}>
			{fmtCurrency(me.totalUnrealizedPnl)}
		  </strong>
		</article>
		<article style={cardStyle}>
		  <div style={{ color: "var(--color-text-muted)", marginBottom: "6px" }}>
			Total Account Value
		  </div>
		  <strong>{fmtCurrency(me.totalAccountValue)}</strong>
		</article>
	  </section>

	  <section style={{ ...cardStyle, marginBottom: "12px" }}>
		<h2 style={{ marginBottom: "10px", fontSize: "14px" }}>Balance History</h2>
		<BalanceChart points={points} />
	  </section>

	  <section style={{ ...cardStyle, marginBottom: "12px" }}>
		<h2 style={{ marginBottom: "10px", fontSize: "14px" }}>Portfolio Holdings</h2>
		<div style={{ overflowX: "auto" }}>
		  <table style={tableStyle}>
			<thead>
			  <tr>
				<th style={tdStyle}>Symbol</th>
				<th style={tdStyle}>Qty</th>
				<th style={tdStyle}>Avg Price</th>
				<th style={tdStyle}>Current Price</th>
				<th style={tdStyle}>Market Value</th>
				<th style={tdStyle}>Unrealized PnL</th>
			  </tr>
			</thead>
			<tbody>
			  {!holdings.length && (
				<tr>
				  <td style={tdStyle} colSpan={6}>
					No holdings yet.
				  </td>
				</tr>
			  )}
			  {holdings.map((row, idx) => {
				const pnl = numberOrZero(row.unrealized_pnl ?? row.pnl);
				const symbol = row.symbol || row.asset || "-";
				return (
				  <tr key={`${symbol}-${idx}`}>
					<td style={tdStyle}>{symbol}</td>
					<td style={tdStyle}>{fmtNumber(row.quantity, 4)}</td>
					<td style={tdStyle}>{fmtCurrency(row.avg_price ?? row.avg_cost)}</td>
					<td style={tdStyle}>{fmtCurrency(row.current_price ?? row.price)}</td>
					<td style={tdStyle}>{fmtCurrency(row.market_value)}</td>
					<td style={{ ...tdStyle, color: pnl >= 0 ? "#0ECB81" : "#F6465D" }}>
					  {fmtCurrency(pnl)}
					</td>
				  </tr>
				);
			  })}
			</tbody>
		  </table>
		</div>
	  </section>

	  <section style={{ ...cardStyle, marginBottom: "12px" }}>
		<h2 style={{ marginBottom: "10px", fontSize: "14px" }}>Orders</h2>
		<div style={{ overflowX: "auto" }}>
		  <table style={tableStyle}>
			<thead>
			  <tr>
				<th style={tdStyle}>Created</th>
				<th style={tdStyle}>Symbol</th>
				<th style={tdStyle}>Type</th>
				<th style={tdStyle}>Side</th>
				<th style={tdStyle}>Qty</th>
				<th style={tdStyle}>Filled</th>
				<th style={tdStyle}>Price</th>
				<th style={tdStyle}>Status</th>
				<th style={tdStyle}>Action</th>
			  </tr>
			</thead>
			<tbody>
			  {!orders.length && (
				<tr>
				  <td style={tdStyle} colSpan={9}>
					No orders found.
				  </td>
				</tr>
			  )}
			  {orders.map((order) => {
				const orderId = order.id || "";
				const canCancel = isOrderCancellable(order);
				return (
				  <tr key={orderId || `${order.symbol}-${order.created_at}`}>
					<td style={tdStyle}>{fmtDateTime(order.created_at)}</td>
					<td style={tdStyle}>{order.symbol || "-"}</td>
					<td style={tdStyle}>{order.order_type || "-"}</td>
					<td style={{ ...tdStyle, color: order.side === "buy" ? "#0ECB81" : "#F6465D" }}>
					  {order.side || "-"}
					</td>
					<td style={tdStyle}>{fmtNumber(order.quantity, 4)}</td>
					<td style={tdStyle}>{fmtNumber(order.filled_qty, 4)}</td>
					<td style={tdStyle}>
					  {fmtCurrency(order.price ?? order.limit_price ?? order.stop_price)}
					</td>
					<td style={tdStyle}>{order.status || "-"}</td>
					<td style={tdStyle}>
					  {canCancel ? (
						<button
						  type="button"
						  disabled={cancellingId === orderId}
						  onClick={() => onCancelOrder(orderId)}
						  style={{
							padding: "5px 10px",
							borderRadius: "4px",
							border: "1px solid #5f2b31",
							background: "#31181c",
							color: "#F6465D",
							cursor: "pointer",
						  }}
						>
						  {cancellingId === orderId ? "Cancelling..." : "Cancel"}
						</button>
					  ) : (
						<span style={{ color: "var(--color-text-muted)" }}>-</span>
					  )}
					</td>
				  </tr>
				);
			  })}
			</tbody>
		  </table>
		</div>
	  </section>

	  <section style={cardStyle}>
		<h2 style={{ marginBottom: "10px", fontSize: "14px" }}>My Trades</h2>
		<div style={{ overflowX: "auto" }}>
		  <table style={tableStyle}>
			<thead>
			  <tr>
				<th style={tdStyle}>Time</th>
				<th style={tdStyle}>Symbol</th>
				<th style={tdStyle}>Role</th>
				<th style={tdStyle}>Price</th>
				<th style={tdStyle}>Quantity</th>
				<th style={tdStyle}>Total</th>
			  </tr>
			</thead>
			<tbody>
			  {!trades.length && (
				<tr>
				  <td style={tdStyle} colSpan={6}>
					No trades found.
				  </td>
				</tr>
			  )}
			  {trades.map((trade, idx) => {
				const role = trade.role || trade.side || "-";
				const price = numberOrZero(trade.price);
				const qty = numberOrZero(trade.quantity);
				return (
				  <tr key={`${trade.id || trade.trade_id || idx}`}>
					<td style={tdStyle}>{fmtDateTime(trade.timestamp || trade.created_at)}</td>
					<td style={tdStyle}>{trade.symbol || "-"}</td>
					<td style={{ ...tdStyle, color: role === "buy" ? "#0ECB81" : "#F6465D" }}>
					  {role}
					</td>
					<td style={tdStyle}>{fmtCurrency(price)}</td>
					<td style={tdStyle}>{fmtNumber(qty, 4)}</td>
					<td style={tdStyle}>{fmtCurrency(price * qty)}</td>
				  </tr>
				);
			  })}
			</tbody>
		  </table>
		</div>
	  </section>
	</main>
  );
}