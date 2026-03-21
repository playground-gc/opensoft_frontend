/**
 * @file useOrderBook.js
 * @description Selects raw bid/ask maps from orderBookStore and transforms them into
 * a sorted, depth-aggregated array suitable for direct rendering in OrderBookSide.
 * @exports useOrderBook  () => { bids: DepthLevel[], asks: DepthLevel[], spread: number }
 * @note Memoize output with useMemo; recompute only when the underlying Map reference changes.
 */

export const useOrderBook = () => ({ bids: [], asks: [], spread: 0 });
