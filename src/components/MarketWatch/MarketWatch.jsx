import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { dataManager } from '../../services/dataManager';

export default function MarketWatch({ activeSymbol, comparisonSymbols, onSelectSymbol, onToggleComparison }) {
    const [search, setSearch] = useState('');
    const tabs = ['Favorites', 'All'];
    const [activeTab, setActiveTab] = useState('All');

    const [assets, setAssets] = useState([]);

    useEffect(() => {
        const unsubs = [];
        const tickDataMap = {};

        const subscribe = (pairs) => {
            pairs.forEach(pair => {
                if (tickDataMap[pair] !== undefined) return;
                const unsub = dataManager.subscribe(pair, (data) => {
                    tickDataMap[pair] = {
                        pair,
                        price: data.ticker.price,
                        change: data.ticker.change,
                    };
                    setAssets(Object.values(tickDataMap));
                });
                unsubs.push(unsub);
            });
        };

        dataManager.onReady(subscribe);

        return () => unsubs.forEach(u => u());
    }, []);

    const displayedAssets = assets.filter(a => a.pair.toLowerCase().includes(search.toLowerCase()));

    return (
        <div style={styles.container}>
            <div style={styles.searchBox}>
                <Search size={14} color="var(--color-text-muted)" style={{marginRight: 8}} />
                <input 
                    style={styles.input} 
                    placeholder="Search" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            
            <div style={styles.tabsStrip}>
                {tabs.map(tab => (
                    <div 
                        key={tab} 
                        style={{
                            ...styles.tab, 
                            color: activeTab === tab ? 'white' : 'var(--color-text-muted)',
                            borderBottom: activeTab === tab ? '2px solid #FCD535' : '2px solid transparent'
                        }}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </div>
                ))}
            </div>

            <div style={styles.listHeader}>
                <div style={{...styles.headerCell, flex: 2}}>Pair / Compare</div>
                <div style={{...styles.headerCell, flex: 2}}>Price</div>
                <div style={{...styles.headerCell, flex: 1, textAlign: 'right'}}>Change</div>
            </div>

            <div style={styles.list}>
                {displayedAssets.map((asset) => {
                    const isComparing = comparisonSymbols.includes(asset.pair);
                    const isMain = activeSymbol === asset.pair;
                    
                    return (
                    <div 
                       key={asset.pair} 
                       style={{
                           ...styles.row,
                           backgroundColor: isMain ? '#2B3139' : 'transparent',
                           borderLeft: isComparing ? '2px solid #0ECB81' : '2px solid transparent'
                       }}
                    >   
                        <div style={{flex: 2, display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <div style={{fontWeight: 'bold', cursor: 'pointer', flex: 1}} onClick={() => onSelectSymbol(asset.pair)}>
                                {asset.pair}
                            </div>
                            {!isMain && (
                                <div 
                                    style={{
                                       display: 'flex', 
                                       alignItems: 'center', 
                                       justifyContent: 'center',
                                       cursor: 'pointer',
                                       color: isComparing ? '#FCD535' : 'var(--color-text-muted)',
                                    }}
                                    title={isComparing ? "Remove Comparison" : "Overlay and Compare"}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleComparison(asset.pair);
                                    }}
                                >
                                    <Plus size={14} style={{transform: isComparing ? 'rotate(45deg)' : 'none', transition: '0.2s'}} />
                                </div>
                            )}
                        </div>
                        
                        <div style={{flex: 2, cursor: 'pointer', color: asset.change >= 0 ? 'var(--color-neon-green)' : 'var(--color-coral-red)'}} onClick={() => onSelectSymbol(asset.pair)}>
                            {asset.price.toFixed(asset.price < 5 ? 4 : 2)}
                        </div>
                        <div style={{flex: 1, cursor: 'pointer', textAlign: 'right', color: asset.change >= 0 ? 'var(--color-neon-green)' : 'var(--color-coral-red)'}} onClick={() => onSelectSymbol(asset.pair)}>
                            {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
                        </div>
                    </div>
                )})}
            </div>
        </div>
    );
}

const styles = {
    container: { display: 'flex', flexDirection: 'column', height: '100%', padding: '12px 16px', userSelect: 'none' },
    searchBox: { display: 'flex', alignItems: 'center', backgroundColor: '#2B3139', borderRadius: '4px', padding: '6px 12px', marginBottom: '12px' },
    input: { background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '12px', fontFamily: 'inherit' },
    tabsStrip: { display: 'flex', gap: '16px', marginBottom: '12px', borderBottom: '1px solid var(--color-bg-border)' },
    tab: { fontSize: '12px', fontWeight: '500', paddingBottom: '8px', cursor: 'pointer' },
    listHeader: { display: 'flex', fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '8px' },
    list: { flex: 1, overflowY: 'auto' },
    row: { display: 'flex', fontSize: '11px', padding: '6px 8px', margin: '0 -8px', alignItems: 'center', borderRadius: '4px' }
};
