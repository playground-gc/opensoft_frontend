import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header/Header";
import MarketWatch from "./components/MarketWatch/MarketWatch";
import ChartGrid from "./components/ChartGrid/ChartGrid";
import OrderBook from "./components/orderbook/OrderBook";
import PlaceOrder from "./components/PlaceOrder/PlaceOrder";
import UserPanel from "./components/UserPanel/UserPanel";
import AuthModal from "./components/AuthModal/AuthModal";
import { useAuthStore } from "./store";

function TradingTerminal() {
  const { token, username: storedUsername } = useAuthStore();
  const [activeSymbol, setActiveSymbol] = useState("AAPL_S");
  const [user, setUser] = useState(storedUsername || null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [showAuth, setShowAuth] = useState(!token);

  const [comparisonSymbols, setComparisonSymbols] = useState([]);

  const handleLoginSuccess = (username) => {
    setUser(username);
    setIsAuthenticated(true);
    setShowAuth(false);
  };

  const toggleComparison = (symbol) => {
    if (symbol === activeSymbol) return;
    setComparisonSymbols((prev) =>
      prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol],
    );
  };

  return (
    <div className="app-container">
      <div className="panel header-area">
        <Header symbol={activeSymbol} />
      </div>

      {/* Left Column -> Order Book (Swapped based on prompt) */}
      <div className="panel left-area">
        <OrderBook symbol={activeSymbol} />
      </div>

      {/* Center Column -> Chart, PlaceOrder, and UserPanel stacked */}
      <div className="center-stack">
        <div
          className="panel"
          style={{ flex: "0 0 auto", height: "600px", minHeight: "600px" }}
        >
          <ChartGrid
            mainSymbol={activeSymbol}
            comparisonSymbols={comparisonSymbols}
          />
        </div>
        <div className="panel" style={{ flexShrink: 0, height: "300px" }}>
          <PlaceOrder symbol={activeSymbol} isAuthenticated={isAuthenticated} />
        </div>
        <div className="panel" style={{ flexShrink: 0, height: "240px" }}>
          <UserPanel isAuthenticated={isAuthenticated} />
        </div>
      </div>

      {/* Right Column -> Market Watch (Stocks) */}
      <div className="panel right-area">
        <MarketWatch
          activeSymbol={activeSymbol}
          comparisonSymbols={comparisonSymbols}
          onSelectSymbol={(sym) => setActiveSymbol(sym)}
          onToggleComparison={toggleComparison}
        />
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/trading-charts" replace />} />
        <Route path="/trading-charts" element={<TradingTerminal />} />
        <Route path="*" element={<Navigate to="/trading-charts" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
