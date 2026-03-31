import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import TradingChart from '../TradingChart/TradingChart';
import { LayoutGrid, Square, Columns, Rows, Grid2x2, ChevronDown } from 'lucide-react';

export default function ChartGrid({ mainSymbol, comparisonSymbols }) {
    // layout map: '1x1', '2x1' (side-by-side), '1x2' (above-below), '2x2'
    const [layout, setLayout] = useState('1x1');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownRect, setDropdownRect] = useState(null);
    
    const dropdownToggleRef = useRef(null);
    const dropdownMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownOpen &&
                dropdownToggleRef.current && !dropdownToggleRef.current.contains(e.target) &&
                (!dropdownMenuRef.current || !dropdownMenuRef.current.contains(e.target))
            ) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownOpen]);

    // Static sub-symbols for demo grids when active
    const subSymbols = ['ETH/USDT', 'SOL/USDT', 'ADA/USDT'];

    const renderDropdown = () => (
        <div style={styles.dropdownContainer}>
            <div 
               ref={dropdownToggleRef}
               style={styles.dropdownToggle}
               onClick={(e) => {
                   setDropdownRect(e.currentTarget.getBoundingClientRect());
                   setDropdownOpen(!dropdownOpen);
               }}
            >
                <LayoutGrid size={14} style={{marginRight: 4}} />
                Multi Chart <ChevronDown size={14} style={{marginLeft: 4, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: '0.2s'}} />
            </div>
            
            {dropdownOpen && dropdownRect && document.body && createPortal(
                <div 
                    ref={dropdownMenuRef}
                    style={{
                        ...styles.dropdownMenu,
                        top: dropdownRect.bottom + 8,
                        right: window.innerWidth - dropdownRect.right
                    }}
                >
                        <div style={styles.menuItem} onClick={() => { setLayout('1x1'); setDropdownOpen(false); }}>
                            <span style={styles.menuNum}>1</span> <Square size={16} />
                        </div>
                        <div style={styles.menuItem} onClick={() => { setLayout('2x1'); setDropdownOpen(false); }}>
                            <span style={styles.menuNum}>2</span> <Columns size={16} />
                        </div>
                        <div style={styles.menuItem} onClick={() => { setLayout('1x2'); setDropdownOpen(false); }}>
                            <span style={styles.menuNum}>2</span> <Rows size={16} />
                        </div>
                        <div style={styles.menuItem} onClick={() => { setLayout('2x2'); setDropdownOpen(false); }}>
                            <span style={styles.menuNum}>4</span> <Grid2x2 size={16} />
                        </div>
                    </div>,
                document.body
            )}
        </div>
    );

    const renderCharts = () => {
        if (layout === '1x1') {
            return (
                <TradingChart 
                    symbol={mainSymbol} 
                    comparisonSymbols={comparisonSymbols}
                    toolbarRightExtra={renderDropdown()}
                />
            );
        }

        if (layout === '2x1') {
            return (
                <div style={{display: 'flex', flexDirection: 'row', width: '100%', height: '100%', gap: '2px', backgroundColor: '#2B3139'}}>
                    <div style={{flex: 1, minWidth: 0}}><TradingChart symbol={mainSymbol} comparisonSymbols={[]} toolbarRightExtra={renderDropdown()} /></div>
                    <div style={{flex: 1, minWidth: 0}}><TradingChart symbol={subSymbols[0]} comparisonSymbols={[]} /></div>
                </div>
            );
        }

        if (layout === '1x2') {
             return (
                <div style={{display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: '2px', backgroundColor: '#2B3139'}}>
                    <div style={{flex: 1, minHeight: 0}}><TradingChart symbol={mainSymbol} comparisonSymbols={[]} toolbarRightExtra={renderDropdown()} /></div>
                    <div style={{flex: 1, minHeight: 0}}><TradingChart symbol={subSymbols[0]} comparisonSymbols={[]} /></div>
                </div>
            );
        }

        if (layout === '2x2') {
             return (
                <div style={{display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: '2px', backgroundColor: '#2B3139'}}>
                    <div style={{flex: 1, display: 'flex', flexDirection: 'row', gap: '2px', minHeight: 0}}>
                        <div style={{flex: 1, minWidth: 0}}><TradingChart symbol={mainSymbol} comparisonSymbols={[]} toolbarRightExtra={renderDropdown()} /></div>
                        <div style={{flex: 1, minWidth: 0}}><TradingChart symbol={subSymbols[0]} comparisonSymbols={[]} /></div>
                    </div>
                    <div style={{flex: 1, display: 'flex', flexDirection: 'row', gap: '2px', minHeight: 0}}>
                        <div style={{flex: 1, minWidth: 0}}><TradingChart symbol={subSymbols[1]} comparisonSymbols={[]} /></div>
                        <div style={{flex: 1, minWidth: 0}}><TradingChart symbol={subSymbols[2]} comparisonSymbols={[]} /></div>
                    </div>
                </div>
            );
        }
    };

    return (
        <div style={{width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column'}}>
            
            {/* Global Chart Layout Toolbar is dynamically rendered into the first chart widget */}

            <div style={{flex: 1, overflow: 'hidden'}}>
               {renderCharts()}
            </div>
            
        </div>
    );
}

const styles = {
    dropdownContainer: {
        position: 'relative',
        zIndex: 50,
        marginRight: '8px'
    },
    dropdownToggle: {
        display: 'flex',
        alignItems: 'center',
        color: 'var(--color-text-muted)',
        fontSize: '11px',
        cursor: 'pointer',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: '#1E2329',
        border: '1px solid #2B3139',
        whiteSpace: 'nowrap',
        flexShrink: 0
    },
    dropdownMenu: {
        position: 'fixed',
        backgroundColor: '#1E2329',
        border: '1px solid #2B3139',
        borderRadius: '4px',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        zIndex: 99999
    },
    menuItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px',
        cursor: 'pointer',
        color: 'var(--color-text-main)',
        borderRadius: '4px',
    },
    menuNum: {
        marginRight: '12px',
        fontSize: '12px',
        color: 'var(--color-text-muted)'
    }
};
