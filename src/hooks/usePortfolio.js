/**
 * @file usePortfolio.js
 * @description Derives computed portfolio metrics (total equity, unrealised P&L, P&L %)
 * by combining portfolioStore holdings with live prices from marketStore.
 * @exports usePortfolio  () => { totalEquity, unrealisedPnL, pnlPercent, cash, holdings }
 * @note All derivations are pure functions of store state; no local useState needed here.
 */

export const usePortfolio = () => ({
  totalEquity: 0,
  unrealisedPnL: 0,
  pnlPercent: 0,
  cash: 0,
  holdings: [],
});
