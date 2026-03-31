import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  cancelOrder,
  fetchBalanceHistory,
  fetchMe,
  fetchOrderById,
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

const numberToneClass = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return "";
  return n > 0 ? styles.detailValuePositive : styles.detailValueNegative;
};

const hasNumericValue = (value) => Number.isFinite(Number(value));

const normalizeOrderType = (type) => String(type || "").toLowerCase();

const isOrderCancellable = (order) => {
  const status = (order?.status || "").toLowerCase();
  const type = normalizeOrderType(order?.order_type);
  const isOpenState = ["open", "partial", "pending_trigger", "triggered"].includes(status);
  const isLimitOrStop = type === "limit" || type.includes("stop");
  return isOpenState && isLimitOrStop;
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
  const [expandedOrderId, setExpandedOrderId] = useState("");
  const [orderDetailsById, setOrderDetailsById] = useState({});
  const [orderDetailLoadingId, setOrderDetailLoadingId] = useState("");
  const [orderDetailErrors, setOrderDetailErrors] = useState({});

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
  setExpandedOrderId("");
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

  const onToggleOrderDetails = async (orderId) => {
    if (!orderId) return;

    if (expandedOrderId === orderId) {
      setExpandedOrderId("");
      return;
    }

    setExpandedOrderId(orderId);

    if (orderDetailsById[orderId] || orderDetailLoadingId === orderId) {
      return;
    }

    setOrderDetailLoadingId(orderId);
    setOrderDetailErrors((prev) => ({ ...prev, [orderId]: "" }));

    const detailRes = await fetchOrderById(orderId);

    if (!detailRes.success) {
      setOrderDetailErrors((prev) => ({
        ...prev,
        [orderId]: detailRes.error || "Failed to load order details.",
      }));
      setOrderDetailLoadingId("");
      return;
    }

    setOrderDetailsById((prev) => ({ ...prev, [orderId]: detailRes.order || {} }));
    setOrderDetailLoadingId("");
  };

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
                  <th className={styles.cell}>Details</th>
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
                    <td className={styles.cell} colSpan={10}>
                      No orders found.
                    </td>
                  </tr>
                )}
                {orders.map((order) => {
                  const orderId = order.id || "";
                  const canCancel = isOrderCancellable(order);
                  return (
                    <React.Fragment key={orderId || `${order.symbol}-${order.created_at}`}>
                      <tr>
                        <td className={styles.cell}>
                          {orderId ? (
                            <button
                              type="button"
                              onClick={() => onToggleOrderDetails(orderId)}
                              className={styles.detailBtn}
                            >
                              {expandedOrderId === orderId ? "Hide" : "View"}
                            </button>
                          ) : (
                            <span className={styles.muted}>-</span>
                          )}
                        </td>
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
                            <span className={styles.muted}>Not eligible</span>
                          )}
                        </td>
                      </tr>

                      {expandedOrderId === orderId && (
                        <tr>
                          <td className={styles.detailRowCell} colSpan={10}>
                            {orderDetailLoadingId === orderId && (
                              <div className={styles.muted}>Loading order details...</div>
                            )}

                            {orderDetailLoadingId !== orderId && orderDetailErrors[orderId] && (
                              <div className={styles.errorText}>{orderDetailErrors[orderId]}</div>
                            )}

                            {orderDetailLoadingId !== orderId && !orderDetailErrors[orderId] && orderDetailsById[orderId] && (
                              <div className={styles.detailsLayout}>
                                <div className={styles.detailGroup}>
                                  <h4 className={styles.detailGroupTitle}>Order Info</h4>
                                  <div className={styles.detailsGrid}>
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>Order ID</span>
                                      <span className={styles.detailValue}>{orderDetailsById[orderId].id || "-"}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>Status</span>
                                      <span className={styles.detailValue}>{orderDetailsById[orderId].status || "-"}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>Type</span>
                                      <span className={styles.detailValue}>{orderDetailsById[orderId].order_type || "-"}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>Side</span>
                                      <span className={styles.detailValue}>{orderDetailsById[orderId].side || "-"}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className={styles.detailGroup}>
                                  <h4 className={styles.detailGroupTitle}>Pricing</h4>
                                  <div className={styles.detailsGrid}>
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>Price</span>
                                      <span
                                        className={cx(
                                          styles.detailValue,
                                          hasNumericValue(
                                            orderDetailsById[orderId].price ??
                                              orderDetailsById[orderId].limit_price ??
                                              orderDetailsById[orderId].stop_price,
                                          ) &&
                                            numberToneClass(
                                              orderDetailsById[orderId].price ??
                                                orderDetailsById[orderId].limit_price ??
                                                orderDetailsById[orderId].stop_price,
                                            ),
                                        )}
                                      >
                                        {hasNumericValue(
                                          orderDetailsById[orderId].price ??
                                            orderDetailsById[orderId].limit_price ??
                                            orderDetailsById[orderId].stop_price,
                                        )
                                          ? fmtCurrency(
                                              orderDetailsById[orderId].price ??
                                                orderDetailsById[orderId].limit_price ??
                                                orderDetailsById[orderId].stop_price,
                                            )
                                          : "-"}
                                      </span>
                                    </div>
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>Stop Price</span>
                                      <span
                                        className={cx(
                                          styles.detailValue,
                                          hasNumericValue(orderDetailsById[orderId].stop_price) &&
                                            numberToneClass(orderDetailsById[orderId].stop_price),
                                        )}
                                      >
                                        {hasNumericValue(orderDetailsById[orderId].stop_price)
                                          ? fmtCurrency(orderDetailsById[orderId].stop_price)
                                          : "-"}
                                      </span>
                                    </div>
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>Limit Price</span>
                                      <span
                                        className={cx(
                                          styles.detailValue,
                                          hasNumericValue(orderDetailsById[orderId].limit_price) &&
                                            numberToneClass(orderDetailsById[orderId].limit_price),
                                        )}
                                      >
                                        {hasNumericValue(orderDetailsById[orderId].limit_price)
                                          ? fmtCurrency(orderDetailsById[orderId].limit_price)
                                          : "-"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className={styles.detailGroup}>
                                  <h4 className={styles.detailGroupTitle}>Execution</h4>
                                  <div className={styles.detailsGrid}>
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>Quantity</span>
                                      <span
                                        className={cx(
                                          styles.detailValue,
                                          numberToneClass(orderDetailsById[orderId].quantity),
                                        )}
                                      >
                                        {fmtNumber(orderDetailsById[orderId].quantity, 4)}
                                      </span>
                                    </div>
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>Filled Qty</span>
                                      <span
                                        className={cx(
                                          styles.detailValue,
                                          numberToneClass(orderDetailsById[orderId].filled_qty),
                                        )}
                                      >
                                        {fmtNumber(orderDetailsById[orderId].filled_qty, 4)}
                                      </span>
                                    </div>
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>Fill %</span>
                                      {(() => {
                                        const qty = numberOrZero(orderDetailsById[orderId].quantity);
                                        const filled = numberOrZero(orderDetailsById[orderId].filled_qty);
                                        const fillPercent = qty > 0 ? (filled / qty) * 100 : null;
                                        const fillTone =
                                          fillPercent === null
                                            ? ""
                                            : fillPercent >= 100
                                              ? styles.detailValuePositive
                                              : styles.detailValueNegative;
                                        return (
                                      <span
                                        className={cx(styles.detailValue, fillTone)}
                                      >
                                        {fillPercent === null ? "-" : `${fillPercent.toFixed(2)}%`}
                                      </span>
                                        );
                                      })()}
                                    </div>
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>Remaining Qty</span>
                                      <span
                                        className={cx(
                                          styles.detailValue,
                                          numberOrZero(orderDetailsById[orderId].quantity) -
                                            numberOrZero(orderDetailsById[orderId].filled_qty) >
                                          0
                                            ? styles.detailValueNegative
                                            : styles.detailValuePositive,
                                        )}
                                      >
                                        {fmtNumber(
                                          numberOrZero(orderDetailsById[orderId].quantity) -
                                            numberOrZero(orderDetailsById[orderId].filled_qty),
                                          4,
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className={styles.detailGroup}>
                                  <h4 className={styles.detailGroupTitle}>Timeline</h4>
                                  <div className={styles.detailsGrid}>
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>Created</span>
                                      <span className={styles.detailValue}>
                                        {fmtDateTime(orderDetailsById[orderId].created_at)}
                                      </span>
                                    </div>
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>Updated</span>
                                      <span className={styles.detailValue}>
                                        {fmtDateTime(orderDetailsById[orderId].updated_at)}
                                      </span>
                                    </div>
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>Expires</span>
                                      <span className={styles.detailValue}>
                                        {fmtDateTime(orderDetailsById[orderId].expires_at)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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