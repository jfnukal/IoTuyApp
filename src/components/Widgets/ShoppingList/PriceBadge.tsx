// src/components/Widgets/ShoppingList/PriceBadge.tsx
import React, { useState, useEffect, useRef } from 'react';
import { findAllDeals, type PriceResult, learnAlias } from '../../../api/pricesAPI';
import PriceDetailModal from './PriceDetailModal';

interface PriceBadgeProps {
  itemName: string;
}

export const PriceBadge: React.FC<PriceBadgeProps> = ({ itemName }) => {
  const [offers, setOffers] = useState<PriceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Pro ruční hledání
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!itemName || itemName.length < 3) return;

    let isMounted = true;
    
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setNotFound(false);
      const results = await findAllDeals(itemName);
      
      if (isMounted) {
        setLoading(false);
        setOffers(results);
        setNotFound(results.length === 0);
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [itemName]);

  // Focus na input když se otevře
  useEffect(() => {
    if (showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearch]);

  // Handler pro "Toto není správný produkt" - zobrazí ruční hledání
const handleWrongProduct = () => {
  setOffers([]);
  setNotFound(false);
  setShowSearch(true);
  setSearchQuery('');
};

const handleBadgeClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (offers.length > 0) {
    setIsModalOpen(true);
  }
};

  const handleSearchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSearch(true);
    setSearchQuery('');
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!searchQuery.trim() || searchQuery.length < 3) return;
    
    setSearchLoading(true);
    const results = await findAllDeals(searchQuery);
    setSearchLoading(false);
    
    if (results.length > 0) {
      // Uložíme alias: původní hledání → nové hledání
      const originalWords = itemName.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !/^\d+$/.test(w));
      const newWords = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !/^\d+$/.test(w));
      
      // Najdeme slova která jsou v novém ale ne v původním
      for (const origWord of originalWords) {
        const origNorm = origWord.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const isInNew = newWords.some(nw => nw.includes(origNorm) || origNorm.includes(nw));
        
        if (!isInNew && newWords.length > 0) {
          // Vezmeme hlavní slovo z nového hledání
          const canonical = newWords.find(w => w.length > 3) || newWords[0];
          if (canonical) {
            await learnAlias(origWord, canonical);
            console.log(`[PriceBadge] Naučeno: "${origWord}" → "${canonical}"`);
          }
        }
      }
      
      setOffers(results);
      setNotFound(false);
      setShowSearch(false);
      setIsModalOpen(true);
    } else {
      // Nic nenalezeno ani po ručním hledání
      alert(`Pro "${searchQuery}" nebyla nalezena žádná akce.`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  // Loading state
  if (loading) {
    return (
      <span 
        className="price-badge price-badge-loading"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          marginLeft: '10px',
          padding: '2px 8px',
          borderRadius: '12px',
          backgroundColor: '#e0e0e0',
          color: '#666',
          fontSize: '0.75rem',
        }}
      >
        ...
      </span>
    );
  }

  // Ruční vyhledávání - rozbalený input
  if (showSearch) {
    return (
      <form 
        onSubmit={handleManualSearch}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          marginLeft: '8px',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Hledat produkt..."
          disabled={searchLoading}
          style={{
            width: '120px',
            padding: '4px 8px',
            borderRadius: '12px',
            border: '2px solid #2196F3',
            fontSize: '0.75rem',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={searchLoading || searchQuery.length < 3}
          style={{
            padding: '4px 8px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: searchLoading ? '#ccc' : '#2196F3',
            color: 'white',
            fontSize: '0.75rem',
            cursor: searchLoading ? 'wait' : 'pointer',
          }}
        >
          {searchLoading ? '...' : '✓'}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowSearch(false);
            setSearchQuery('');
          }}
          style={{
            padding: '4px 6px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: '#999',
            color: 'white',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </form>
    );
  }
  
  // Nenalezeno - tlačítko pro ruční hledání
  if (notFound) {
    return (
      <span 
        className="price-badge price-badge-search"
        onClick={handleSearchClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          marginLeft: '8px',
          padding: '2px 8px',
          borderRadius: '12px',
          backgroundColor: '#f0f0f0',
          color: '#666',
          fontSize: '0.7rem',
          cursor: 'pointer',
          border: '1px dashed #aaa',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#e3f2fd';
          e.currentTarget.style.borderColor = '#2196F3';
          e.currentTarget.style.color = '#2196F3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#f0f0f0';
          e.currentTarget.style.borderColor = '#aaa';
          e.currentTarget.style.color = '#666';
        }}
        title="Klikni pro ruční vyhledání"
      >
        🔍
      </span>
    );
  }

  // Žádné nabídky a není notFound (např. krátký název)
  if (offers.length === 0) return null;

  const bestOffer = offers[0];

  // Zkratky a barvy obchodů
  const STORE_CONFIG: Record<string, { short: string; color: string }> = {
    'Kaufland': { short: 'KL', color: '#e31e24' },
    'Lidl': { short: 'LI', color: '#0050aa' },
    'Albert': { short: 'AL', color: '#ed1c24' },
    'Penny': { short: 'PE', color: '#cd1719' },
    'Billa': { short: 'BI', color: '#ffed00' },
  };
  
  const config = STORE_CONFIG[bestOffer.store] || { 
    short: bestOffer.store.substring(0, 2).toUpperCase(), 
    color: '#666' 
  };

  return (
    <>
      <span 
        className="price-badge"
        onClick={handleBadgeClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          marginLeft: '8px',
          padding: '2px 6px 2px 2px',
          borderRadius: '12px',
          backgroundColor: '#FFEB3B',
          color: '#333',
          fontSize: '0.7rem',
          fontWeight: 600,
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          transition: 'transform 0.1s, box-shadow 0.1s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
        }}
        title={`${bestOffer.store}: ${bestOffer.price} - Klikni pro detail`}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            backgroundColor: config.color,
            color: bestOffer.store === 'Billa' ? '#000' : '#fff',
            fontWeight: 700,
            fontSize: '0.55rem',
          }}
        >
          {config.short}
        </span>
        {bestOffer.price}
      </span>

      <PriceDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemName={itemName}
        offers={offers}
        onWrongProduct={handleWrongProduct}
      />
    </>
  );
};