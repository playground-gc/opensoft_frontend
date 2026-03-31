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
import styles from "./ProfilePage.module.css";

const cx = (...classes) => classes.filter(Boolean).join(" ");

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
	return <div className={styles.emptyHistory}>No history data yet.</div>;
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
			  className={styles.chartSvg}
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
  const [activeTab, setActiveTab] = useState("holdings");

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
      <main className={styles.loggedOut}>
        <h1 className={styles.loggedOutTitle}>Profile</h1>
        <p className={styles.loggedOutText}>You need to log in to view your profile data.</p>
        <Link to="/trading-charts" className={styles.backLink}>
          Go to trading terminal
        </Link>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.headerTitle}>Profile Dashboard</h1>
          <p className={styles.headerSubtitle}>
            User account, holdings, orders, trades, and balance history.
          </p>
        </div>
        <button type="button" onClick={loadProfileData} className={styles.refreshBtn}>
          Refresh
        </button>
      </div>

      {loading && <div className={styles.loading}>Loading profile data...</div>}
      {!loading && error && <div className={styles.error}>{error}</div>}

      <section className={styles.summarySection}>
        <article className={styles.sectionCard}>
          <div className={styles.metaLabel}>Username</div>
          <div className={styles.usernameValue}>{me.username || "-"}</div>

          <div className={styles.metricBlock}>
            <div className={styles.metaLabel}>Total Account Value</div>
            <div className={styles.accountValue}>{fmtCurrency(me.totalAccountValue)}</div>
          </div>

          <div className={styles.metricBlockLarge}>
            <div className={styles.metaLabel}>Unrealized PnL</div>
            <div
              className={cx(
                styles.pnlValue,
                me.totalUnrealizedPnl >= 0 ? styles.positive : styles.negative,
              )}
            >
              {fmtCurrency(me.totalUnrealizedPnl)}
            </div>
          </div>

          <div className={styles.smallCards}>
            <div className={styles.smallCard}>
              <div className={styles.smallCardLabel}>Email</div>
              <div className={styles.smallCardValueSmall}>{me.email || "-"}</div>
            </div>
            <div className={styles.smallCard}>
              <div className={styles.smallCardLabel}>Cash Balance</div>
              <div className={styles.smallCardValue}>{fmtCurrency(me.cashBalance)}</div>
            </div>
            <div className={styles.smallCard}>
              <div className={styles.smallCardLabel}>Portfolio Value</div>
              <div className={styles.smallCardValue}>{fmtCurrency(me.portfolioValue)}</div>
            </div>
          </div>
        </article>

        <article className={styles.sectionCard}>
          <h2 className={styles.chartTitle}>Balance History</h2>
          <BalanceChart points={points} />
        </article>
      </section>

      <section className={cx(styles.sectionCard, styles.dataSection)}>
        <div className={styles.tabs}>
          <button
            type="button"
            onClick={() => setActiveTab("holdings")}
            className={cx(styles.tabBtn, activeTab === "holdings" && styles.tabBtnActive)}
          >
            Portfolio Holdings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={cx(styles.tabBtn, activeTab === "orders" && styles.tabBtnActive)}
          >
            Orders
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("trades")}
            className={cx(styles.tabBtn, activeTab === "trades" && styles.tabBtnActive)}
          >
            My Trades
          </button>
        </div>

        {activeTab === "holdings" && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.cell}>Symbol</th>
                  <th className={styles.cell}>Qty</th>
                  <th className={styles.cell}>Avg Price</th>
                  <th className={styles.cell}>Current Price</th>
                  <th className={styles.cell}>Market Value</th>
                  <th className={styles.cell}>Unrealized PnL</th>
                </tr>
              </thead>
              <tbody>
                {!holdings.length && (
                  <tr>
                    <td className={styles.cell} colSpan={6}>
                      No holdings yet.
                    </td>
                  </tr>
                )}
                {holdings.map((row, idx) => {
                  const pnl = numberOrZero(row.unrealized_pnl ?? row.pnl);
                  const symbol = row.symbol || row.asset || "-";
                  return (
                    <tr key={`${symbol}-${idx}`}>
                      <td className={styles.cell}>{symbol}</td>
                      <td className={styles.cell}>{fmtNumber(row.quantity, 4)}</td>
                      <td className={styles.cell}>{fmtCurrency(row.avg_price ?? row.avg_cost)}</td>
                      <td className={styles.cell}>{fmtCurrency(row.current_price ?? row.price)}</td>
                      <td className={styles.cell}>{fmtCurrency(row.market_value)}</td>
                      <td className={cx(styles.cell, pnl >= 0 ? styles.positive : styles.negative)}>
                        {fmtCurrency(pnl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "orders" && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.cell}>Created</th>
                  <th className={styles.cell}>Symbol</th>
                  <th className={styles.cell}>Type</th>
                  <th className={styles.cell}>Side</th>
                  <th className={styles.cell}>Qty</th>
                  <th className={styles.cell}>Filled</th>
                  <th className={styles.cell}>Price</th>
                  <th className={styles.cell}>Status</th>
                  <th className={styles.cell}>Action</th>
                </tr>
              </thead>
              <tbody>
                {!orders.length && (
                  <tr>
                    <td className={styles.cell} colSpan={9}>
                      No orders found.
                    </td>
                  </tr>
                )}
                {orders.map((order) => {
                  const orderId = order.id || "";
                  const canCancel = isOrderCancellable(order);
                  return (
                    <tr key={orderId || `${order.symbol}-${order.created_at}`}>
                      <td className={styles.cell}>{fmtDateTime(order.created_at)}</td>
                      <td className={styles.cell}>{order.symbol || "-"}</td>
                      <td className={styles.cell}>{order.order_type || "-"}</td>
                      <td
                        className={cx(
                          styles.cell,
                          order.side === "buy" ? styles.positive : styles.negative,
                        )}
                      >
                        {order.side || "-"}
                      </td>
                      <td className={styles.cell}>{fmtNumber(order.quantity, 4)}</td>
                      <td className={styles.cell}>{fmtNumber(order.filled_qty, 4)}</td>
                      <td className={styles.cell}>
                        {fmtCurrency(order.price ?? order.limit_price ?? order.stop_price)}
                      </td>
                      <td className={styles.cell}>{order.status || "-"}</td>
                      <td className={styles.cell}>
                        {canCancel ? (
                          <button
                            type="button"
                            disabled={cancellingId === orderId}
                            onClick={() => onCancelOrder(orderId)}
                            className={styles.cancelBtn}
                          >
                            {cancellingId === orderId ? "Cancelling..." : "Cancel"}
                          </button>
                        ) : (
                          <span className={styles.muted}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "trades" && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.cell}>Time</th>
                  <th className={styles.cell}>Symbol</th>
                  <th className={styles.cell}>Role</th>
                  <th className={styles.cell}>Price</th>
                  <th className={styles.cell}>Quantity</th>
                  <th className={styles.cell}>Total</th>
                </tr>
              </thead>
              <tbody>
                {!trades.length && (
                  <tr>
                    <td className={styles.cell} colSpan={6}>
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
                      <td className={styles.cell}>{fmtDateTime(trade.timestamp || trade.created_at)}</td>
                      <td className={styles.cell}>{trade.symbol || "-"}</td>
                      <td
                        className={cx(
                          styles.cell,
                          role === "buy" ? styles.positive : styles.negative,
                        )}
                      >
                        {role}
                      </td>
                      <td className={styles.cell}>{fmtCurrency(price)}</td>
                      <td className={styles.cell}>{fmtNumber(qty, 4)}</td>
                      <td className={styles.cell}>{fmtCurrency(price * qty)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}