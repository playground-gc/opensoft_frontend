import React, { useState } from 'react';
import Header from './components/Header/Header';
import MarketWatch from './components/MarketWatch/MarketWatch';
import ChartGrid from './components/ChartGrid/ChartGrid';
import OrderBook from './components/OrderBook/OrderBook';
import PlaceOrder from './components/PlaceOrder/PlaceOrder';
import UserPanel from './components/UserPanel/UserPanel';

function App() {
  const [activeSymbol, setActiveSymbol] = useState('BTC/USDT');
  
  // Array of comparison symbols plotted on top of the main chart
  const [comparisonSymbols, setComparisonSymbols] = useState([]);

  const toggleComparison = (symbol) => {
    if (symbol === activeSymbol) return;
    setComparisonSymbols(prev => 
       prev.includes(symbol) 
          ? prev.filter(s => s !== symbol) 
          : [...prev, symbol]
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
        <div className="panel" style={{flex: '0 0 auto', height: '600px', minHeight: '600px'}}>
          <ChartGrid 
             mainSymbol={activeSymbol} 
             comparisonSymbols={comparisonSymbols}
          />
        </div>
        <div className="panel" style={{flexShrink: 0, height: '300px'}}>
          <PlaceOrder symbol={activeSymbol} />
        </div>
        <div className="panel" style={{flexShrink: 0, height: '240px'}}>
          <UserPanel />
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
      
    </div>
  );
}

export default App;
