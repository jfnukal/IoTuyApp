// src/components/Widgets/ShoppingList/PriceDetailModal.tsx
import React from 'react';
import { createPortal } from 'react-dom';
import {
  type PriceResult,
  learnAlias,
  clearPriceCache,
} from '../../../api/pricesAPI';
import { deleteAliasBySearch, clearAliasCache } from '../../../api/aliasesAPI';
import './ShoppingListModal.css';

interface PriceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  offers: PriceResult[];
  onWrongProduct?: () => void; // Callback pro "toto není správný produkt"
}

const PriceDetailModal: React.FC<PriceDetailModalProps> = ({
  isOpen,
  onClose,
  itemName,
  offers,
  onWrongProduct,
}) => {
  const [learnedProduct, setLearnedProduct] = React.useState<string | null>(
    null
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Handler pro "Toto není správný produkt"
  const handleWrongProduct = async () => {
    setIsDeleting(true);

    // Smažeme aliasy pro tento hledaný výraz
    const deleted = await deleteAliasBySearch(itemName);

    // Vyčistíme cache
    clearAliasCache();
    clearPriceCache();

    console.log(
      `[PriceDetailModal] Smazáno ${deleted} aliasů pro "${itemName}"`
    );

    setIsDeleting(false);
    onClose();

    // Zavoláme callback pro zobrazení ručního hledání
    if (onWrongProduct) {
      onWrongProduct();
    }
  };

  // Reset při zavření
  React.useEffect(() => {
    if (!isOpen) {
      setLearnedProduct(null);
    }
  }, [isOpen]);

  if (!isOpen || offers.length === 0) return null;

  const bestOffer = offers[0];
  const otherOffers = offers.slice(1, 6); // Max 5 dalších

  // Učení aliasů - když uživatel potvrdí správný produkt
  const handleLearn = async (productName?: string) => {
    if (!productName || !itemName) return;

    // Extrahujeme klíčová slova z hledání
    const searchWords = itemName
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !/^\d+$/.test(w));

    // Extrahujeme OBECNÁ klíčová slova z produktu (ne značky)
    // Hledáme slova jako "mouka", "pivo", "mleko" - ne "Karlova Koruna"
    const commonProductWords = [
      'mouka',
      'pivo',
      'mleko',
      'chleb',
      'maslo',
      'syry',
      'jogurt',
      'sunka',
      'salam',
      'kava',
      'caj',
      'dzus',
      'voda',
      'olej',
      'cukr',
      'sul',
      'ryze',
      'testoviny',
      'kecup',
      'majoneza',
      'horcice',
      'ocet',
      'vejce',
      'tvaroh',
      'smetana',
      'cokolada',
      'susanky',
      'chipsy',
      'oriseky',
      'maso',
      'kure',
      'veprove',
      'hovezi',
      'ryba',
      'zelenina',
      'ovoce',
      'banany',
      'jablka',
      'pomerance',
      'brambory',
      'cibule',
      'cesnek',
      'rajcata',
      'papriky',
      'okurky',
      'salat',
      'mrkev',
      'petrzl',
      'radegast',
      'gambrinus',
      'pilsner',
      'kozel',
      'staropramen',
      'budvar',
      'kofola',
      'cola',
      'sprite',
      'fanta',
      'rum',
      'vodka',
      'vino',
      'sekt',
      'whisky',
      'gin',
      'hladka',
      'polohruba',
      'hruba',
    ];

    const productNameNorm = productName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Najdeme obecná slova v názvu produktu
    const foundProductWords = commonProductWords.filter((word) =>
      productNameNorm.includes(word)
    );

    let learned = false;

    // Pro každé hledané slovo
    for (const searchWord of searchWords) {
      const searchNorm = searchWord
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      // Pokud hledané slovo není v obecných slovech produktu
      const isInProduct = foundProductWords.some(
        (pw) => pw.includes(searchNorm) || searchNorm.includes(pw)
      );

      if (!isInProduct && foundProductWords.length > 0) {
        // Vezmeme nejrelevantnější obecné slovo (nejdelší shoda)
        const canonical = foundProductWords.sort(
          (a, b) => b.length - a.length
        )[0];
        if (canonical) {
          await learnAlias(searchWord, canonical);
          learned = true;
          console.log(`[Learn] Naučeno: "${searchWord}" → "${canonical}"`);
        }
      }
    }

    // Zobrazíme zpětnou vazbu
    setLearnedProduct(productName);

    if (!learned) {
      console.log('[Learn] Nic nového k naučení');
    }
  };

  return createPortal(
    <div
      className="price-modal-overlay"
      onClick={onClose}
      style={{ zIndex: 999999 }}
    >
      <div className="price-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="price-modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="price-modal-header">
          <span className="price-modal-icon">🏷️</span>
          <h3>Nalezená akce</h3>
        </div>

        <div className="price-modal-search-term">
          Hledáno: <strong>{itemName}</strong>
        </div>

        {/* Nejlepší nabídka */}
        <div
          className="price-modal-best"
          style={{
            opacity: bestOffer.isFuture ? 0.6 : 1,
            background: bestOffer.isFuture
              ? 'linear-gradient(135deg, #e0e0e0 0%, #c0c0c0 100%)'
              : 'linear-gradient(135deg, #FFF9C4 0%, #FFEB3B 100%)',
          }}
        >
          {bestOffer.isFuture && (
            <div
              style={{
                fontSize: '0.75rem',
                color: '#666',
                marginBottom: '4px',
                fontStyle: 'italic',
              }}
            >
              ⏳ Bude platit od{' '}
              {bestOffer.validityText?.split('–')[0]?.trim() || 'příště'}
            </div>
          )}
          <div className="price-modal-product-name">
            {bestOffer.productName || itemName}
          </div>
          <div className="price-modal-best-price">
            <span className="price-modal-store">{bestOffer.store}</span>
            <span className="price-modal-price">{bestOffer.price}</span>
            {bestOffer.unit && (
              <span
                style={{ fontSize: '0.8rem', color: '#666', marginLeft: '4px' }}
              >
                / {bestOffer.unit}
              </span>
            )}
          </div>
          {bestOffer.pricePerUnit && (
            <div
              style={{ fontSize: '0.75rem', color: '#888', marginTop: '2px' }}
            >
              ({bestOffer.pricePerUnit})
            </div>
          )}
          {bestOffer.validityText && !bestOffer.isFuture && (
            <div className="price-modal-validity">
              📅 {bestOffer.validityText}
            </div>
          )}
          {bestOffer.productUrl && (
            <a
              href={bestOffer.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="price-modal-link"
            >
              🔗 Zobrazit na Kupi.cz
            </a>
          )}

          {/* Tlačítko pro učení */}
          {learnedProduct === bestOffer.productName ? (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                backgroundColor: '#4CAF50',
                color: 'white',
                borderRadius: '6px',
                fontSize: '0.85rem',
                textAlign: 'center',
              }}
            >
              ✓ Zapamatováno! Příště najdu snáze.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => handleLearn(bestOffer.productName)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                ✓ Správný
              </button>
              <button
                onClick={handleWrongProduct}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: isDeleting ? '#ccc' : '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  cursor: isDeleting ? 'wait' : 'pointer',
                }}
              >
                {isDeleting ? '...' : '✕ Špatný'}
              </button>
            </div>
          )}
        </div>

        {/* Další nabídky */}
        {otherOffers.length > 0 && (
          <div className="price-modal-others">
            <div className="price-modal-others-title">Také v akci:</div>
            {otherOffers.map((offer, index) => {
              return (
                <div
                  key={index}
                  className="price-modal-other-item"
                  style={{
                    opacity: offer.isFuture ? 0.5 : 1,
                    backgroundColor: offer.isFuture ? '#f5f5f5' : 'transparent',
                  }}
                >
                  <div className="price-modal-other-main">
                    <span className="price-modal-other-store">
                      {offer.store}
                    </span>
                    <span className="price-modal-other-price">
                      {offer.price}
                      {offer.unit && (
                        <span style={{ fontSize: '0.7rem', color: '#888' }}>
                          {' '}
                          / {offer.unit}
                        </span>
                      )}
                    </span>
                    {offer.isFuture && (
                      <span
                        style={{
                          marginLeft: '8px',
                          fontSize: '0.7rem',
                          color: '#888',
                        }}
                      >
                        ⏳
                      </span>
                    )}
                  </div>
                  {offer.validityText && (
                    <div
                      className="price-modal-other-validity"
                      style={{
                        marginLeft: '32px',
                        color: offer.isFuture ? '#888' : '#e67e22',
                      }}
                    >
                      {offer.validityText}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info o počtu variant */}
        {offers.length > 6 && (
          <div className="price-modal-more-info">
            ... a {offers.length - 6} dalších variant
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default PriceDetailModal;
