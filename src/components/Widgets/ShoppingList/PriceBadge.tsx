/* src/components/Widgets/ShoppingList/PriceBadge.tsx */

import React, { useState, useEffect } from 'react';
import { checkProductPrice } from '../../../api/pricesAPI';

interface PriceBadgeProps {
  itemName: string;
}

export const PriceBadge: React.FC<PriceBadgeProps> = ({ itemName }) => {
  const [deal, setDeal] = useState<{ store: string; price: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Ignorujeme příliš krátké názvy nebo obecné věci
    if (!itemName || itemName.length < 3) return;

    let isMounted = true;
    
    // Debounce: Čekáme 1.5 sekundy po dopsání, než se zeptáme API (šetříme requesty)
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      const result = await checkProductPrice(itemName);
      
      if (isMounted) {
        setLoading(false);
        if (result) {
          setDeal(result);
        }
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [itemName]);

  if (loading) return <span style={{ fontSize: '0.7em', color: '#aaa', marginLeft: '8px' }}>...</span>;
  
  if (!deal) return null;

  return (
    <span 
      className="price-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: '10px',
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: '#FFEB3B', // Výrazná žlutá pro akci
        color: '#333',
        fontSize: '0.75rem',
        fontWeight: 600,
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }}
    >
      {deal.store}: {deal.price}
    </span>
  );
};