// src/components/Widgets/ShoppingList/ShoppingRecommendation.tsx
import React, { useState, useEffect } from 'react';
import {
  analyzeShoppingList,
  type ShoppingAnalysis,
} from '../../../api/shoppingAnalyzer';

interface ShoppingRecommendationProps {
  items: Array<{ text: string; completed: boolean }>;
}

// Barvy obchodů
const STORE_COLORS: Record<string, string> = {
  Kaufland: '#e31e24',
  Lidl: '#0050aa',
  Albert: '#ed1c24',
  Penny: '#cd1719',
  Billa: '#ffed00',
};

export const ShoppingRecommendation: React.FC<ShoppingRecommendationProps> = ({
  items,
}) => {
  const [analysis, setAnalysis] = useState<ShoppingAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Filtrujeme jen nekoupené položky a mapujeme na správný formát
    const activeItems = items
      .filter((item) => !item.completed)
      .map((item) => ({ name: item.text, completed: item.completed }));
    if (activeItems.length < 2) {
      setAnalysis(null);
      return;
    }

    let isMounted = true;

    const analyze = async () => {
      setLoading(true);
      // Mapujeme text → name pro analyzeShoppingList
      const mappedItems = items.map((item) => ({
        name: item.text,
        completed: item.completed,
      }));
      /* Když ceny nejdou načíst, doporučení se prostě neukáže — bez
         tohohle by tu zůstalo navždy „🔍 Analyzuji nabídky…" (převzato
         z Family-Dashboard; `findAllDeals` teď při výpadku vyhazuje chybu). */
      try {
        const result = await analyzeShoppingList(mappedItems);
        if (isMounted) setAnalysis(result);
      } catch {
        if (isMounted) setAnalysis(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Debounce - počkáme 2 sekundy po poslední změně
    const timeoutId = setTimeout(analyze, 2000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [items]);

  if (loading) {
    return (
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '8px',
          marginTop: '8px',
          fontSize: '0.85rem',
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        🔍 Analyzuji nabídky...
      </div>
    );
  }

  if (!analysis || !analysis.bestStore) {
    return null;
  }

  const { bestStore, allStores, tip } = analysis;
  const storeColor = STORE_COLORS[bestStore.store] || '#666';

  return (
    <div
      style={{
        padding: '10px 12px',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: '8px',
        marginTop: '12px',
        marginBottom: '12px',
        borderLeft: `4px solid ${storeColor}`,
      }}
    >
      {/* Hlavní doporučení */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>🛒</span>
          <div>
            <div
              style={{
                fontWeight: 600,
                color: '#fff',
                fontSize: '0.9rem',
              }}
            >
              Doporučení:{' '}
              <span
                style={{
                  color: storeColor === '#ffed00' ? '#fff' : storeColor,
                }}
              >
                {bestStore.store}
              </span>
            </div>
            {tip && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: '2px',
                }}
              >
                {tip}
              </div>
            )}
          </div>
        </div>
        <span
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.8rem',
          }}
        >
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Rozbalený detail */}
      {expanded && (
        <div style={{ marginTop: '12px' }}>
          {/* Hlavička */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 0 8px 0',
              fontSize: '0.7rem',
              color: 'rgba(255,255,255,0.5)',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <span>Obchod</span>
            <div>
              <span style={{ marginRight: '12px' }}>V akci</span>
              <span>Cena</span>
            </div>
          </div>
          {allStores
            .slice(0, 4)
            .map((store: (typeof allStores)[0], index: number) => (
              <div
                key={store.store}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderTop:
                    index === 0 ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  opacity: index === 0 ? 1 : 0.7,
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: STORE_COLORS[store.store] || '#666',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      color: store.store === 'Billa' ? '#000' : '#fff',
                    }}
                  >
                    {store.store.substring(0, 2).toUpperCase()}
                  </span>
                  <span style={{ color: '#fff', fontSize: '0.85rem' }}>
                    {store.store}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      color: '#fff',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    {store.itemsFound}/{store.totalItems}
                  </span>
                  <span
                    style={{
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '0.75rem',
                      marginLeft: '8px',
                    }}
                  >
                    {store.totalPrice.toFixed(0)} Kč
                  </span>
                </div>
              </div>
            ))}

          {analysis.notFound.length > 0 && (
            <div
              style={{
                marginTop: '8px',
                padding: '6px 0',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              ⚠️ Bez akce: {analysis.notFound.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
