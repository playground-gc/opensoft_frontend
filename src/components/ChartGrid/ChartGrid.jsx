import React, { useState } from 'react';
import TradingChart from '../TradingChart/TradingChart';
import { LayoutGrid, Square, Columns, Rows, Grid2x2, ChevronDown } from 'lucide-react';

export default function ChartGrid({ mainSymbol, comparisonSymbols }) {
    // layout map: '1x1', '2x1' (side-by-side), '1x2' (above-below), '2x2'
    const [layout, setLayout] = useState('1x1');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Verified backend symbols from your DataManager logs
    const subSymbols = ['GOOGL_S', 'TSLA_S', 'MSFT_S', 'AMZN_S'];

    const renderCharts = () => {
        // Use a 'key' based on layout and symbol to force clean re-mounts on resize
        if (layout === '1x1') {
            return (
                <div style={styles.chartContainer}>
                    <TradingChart 
                        key={`1x1-${mainSymbol}`}
                        symbol={mainSymbol} 
                        comparisonSymbols={comparisonSymbols}
                    />
                </div>
            );
        }

        if (layout === '2x1') {
            return (
                <div style={styles.flexRow}>
                    <div style={styles.flexItem}>
                        <TradingChart key={`2x1-a-${mainSymbol}`} symbol={mainSymbol} />
                    </div>
                    <div style={styles.flexItem}>
                        <TradingChart key={`2x1-b-${subSymbols[0]}`} symbol={subSymbols[0]} />
                    </div>
                </div>
            );
        }

        if (layout === '1x2') {
            return (
                <div style={styles.flexCol}>
                    <div style={styles.flexItem}>
                        <TradingChart key={`1x2-a-${mainSymbol}`} symbol={mainSymbol} />
                    </div>
                    <div style={styles.flexItem}>
                        <TradingChart key={`1x2-b-${subSymbols[0]}`} symbol={subSymbols[0]} />
                    </div>
                </div>
            );
        }

        if (layout === '2x2') {
            return (
                <div style={styles.flexCol}>
                    <div style={styles.flexRow}>
                        <div style={styles.flexItem}><TradingChart key="2x2-a" symbol={mainSymbol} /></div>
                        <div style={styles.flexItem}><TradingChart key="2x2-b" symbol={subSymbols[0]} /></div>
                    </div>
                    <div style={styles.flexRow}>
                        <div style={styles.flexItem}><TradingChart key="2x2-c" symbol={subSymbols[1]} /></div>
                        <div style={styles.flexItem}><TradingChart key="2x2-d" symbol={subSymbols[2]} /></div>
                    </div>
                </div>
            );
        }
    };

    return (
        <div style={styles.wrapper}>
            {/* Multi-Chart Layout Toolbar */}
            <div style={styles.dropdownContainer}>
                <div 
                   style={styles.dropdownToggle}
                   onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                    <LayoutGrid size={14} style={{marginRight: 6}} />
                    <span style={{fontSize: '11px'}}>Layout</span>
                    <ChevronDown size={14} style={{marginLeft: 6, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: '0.2s'}} />
                </div>
                
                {dropdownOpen && (
                    <div style={styles.dropdownMenu}>
                        <div style={styles.menuItem} onClick={() => { setLayout('1x1'); setDropdownOpen(false); }}>
                            <Square size={14} style={{marginRight: 10}} /> Single Chart
                        </div>
                        <div style={styles.menuItem} onClick={() => { setLayout('2x1'); setDropdownOpen(false); }}>
                            <Columns size={14} style={{marginRight: 10}} /> Side-by-Side
                        </div>
                        <div style={styles.menuItem} onClick={() => { setLayout('1x2'); setDropdownOpen(false); }}>
                            <Rows size={14} style={{marginRight: 10}} /> Top-Bottom
                        </div>
                        <div style={styles.menuItem} onClick={() => { setLayout('2x2'); setDropdownOpen(false); }}>
                            <Grid2x2 size={14} style={{marginRight: 10}} /> Quad View
                        </div>
                    </div>
                )}
            </div>

            <div style={{flex: 1, overflow: 'hidden', backgroundColor: '#161a1e'}}>
               {renderCharts()}
            </div>
        </div>
    );
}

const styles = {
    wrapper: {
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#161a1e'
    },
    chartContainer: {
        width: '100%',
        height: '100%'
    },
    flexRow: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        gap: '2px',
        backgroundColor: '#2B3139'
    },
    flexCol: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        gap: '2px',
        backgroundColor: '#2B3139'
    },
    flexItem: {
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        backgroundColor: '#161a1e'
    },
    dropdownContainer: {
        position: 'absolute',
        top: '8px',
        right: '50px',
        zIndex: 100
    },
    dropdownToggle: {
        display: 'flex',
        alignItems: 'center',
        color: '#d1d4dc',
        cursor: 'pointer',
        padding: '4px 10px',
        borderRadius: '4px',
        backgroundColor: 'rgba(30, 35, 41, 0.9)',
        border: '1px solid #2B3139',
        backdropFilter: 'blur(4px)'
    },
    dropdownMenu: {
        position: 'absolute',
        top: '32px',
        right: '0',
        backgroundColor: '#1e2329',
        border: '1px solid #2b3139',
        borderRadius: '4px',
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
        width: '140px'
    },
    menuItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 10px',
        cursor: 'pointer',
        color: '#d1d4dc',
        borderRadius: '4px',
        fontSize: '11px',
        transition: 'background 0.2s',
        '&:hover': { backgroundColor: '#2b3139' }
    }
};