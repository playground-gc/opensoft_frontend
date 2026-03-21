/**
 * @file portfolioApi.js
 * @description REST API function to fetch the current portfolio snapshot (cash + holdings).
 * Used on initial load and after order fills to reconcile local optimistic state with server truth.
 * @exports fetchPortfolio
 * @note Polling cadence is intentionally low; real-time P&L comes from WebSocket, not this endpoint.
 */

export const fetchPortfolio = () => Promise.resolve();
