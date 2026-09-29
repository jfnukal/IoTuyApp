// src/components/Widgets/ShoppingList/DruhChooserModal.tsx
//
// „CO MYSLÍŠ?" — výběr druhu u obecné položky.        (přidáno 4. 9. 2026)
//
// Proč to vzniklo: kdo si napíše na seznam „káva", nemyslí „jakoukoli kávu,
// hlavně lacinou". Ve vzorku letáků na to slovo sedí 55 různých výrobků, od
// ledové kávy za 14,90 po zrnkovou za 449 — a značka na seznamu z nich mlčky
// vybírala nejlevnější, tedy odpovídala na otázku, kterou nikdo nepoložil.
//
// Volby počítá `nabidniDruhy` v `priceMatching.ts`; tady se jen ukazují.
// Kdy se okno vůbec objeví (a proč skoro nikdy — u 46 ze 79 běžných položek
// se ptát nemá), je popsáno tamtéž.
//
// ⚠️ Portál jde do `document.body`, ne do `#modal-root` — schválně stejně jako
// sousední `PriceDetailModal`, aby se dvě okna téhož widgetu nechovala různě.
//
// Převzato z Family-Dashboard (29. 9. 2026). Navíc oproti originálu režim
// `jine` pro nabídku ostatních nalezených produktů po „✕ Špatný": vlastní
// nadpis a hlavně poctivé tlačítko „napíšu sám" (v originále tam svítí
// „ukaž nejlevnější", ale vede na ruční hledání) a stačí mu JEDNA volba —
// s limitem dvou se po „Špatný" s jedinou další nabídkou neukázalo nic.

import React from 'react';
import { createPortal } from 'react-dom';
import type { Druh } from '../../../api/pricesAPI';
import './ShoppingListModal.css';

interface DruhChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  druhy: Druh[];
  /** Vybral si — `dotaz` je to, čím se má hledat dál. */
  onPick: (druh: Druh) => void;
  /** `druhy`: nechce vybírat — ukaž nejlevnější, jako by okno nebylo.
   *  `jine`: nic z nabídnutého nesedí — napíše si to sám. */
  onSkip: () => void;
  /** `druhy` = „jaký druh myslíš?" (výchozí), `jine` = ostatní nalezené
   *  produkty po „✕ Špatný". */
  rezim?: 'druhy' | 'jine';
}

const cena = (c: number): string =>
  `${c.toFixed(2).replace('.', ',').replace(',00', '')} Kč`;

const DruhChooserModal: React.FC<DruhChooserModalProps> = ({
  isOpen,
  onClose,
  itemName,
  druhy,
  onPick,
  onSkip,
  rezim = 'druhy',
}) => {
  const jine = rezim === 'jine';
  // Výběr ze dvou druhů je otázka; u jiných nálezů stačí i jeden.
  if (!isOpen || druhy.length < (jine ? 1 : 2)) return null;

  /* Volby jsou buď DRUHY („Mletá", pocet > 1), nebo konkrétní VÝROBKY
     („Minerální voda Vincentka", pocet === 1). Pozná se to podle `pocet`
     a mění to jen nadpis — seznam vypadá stejně. */
  const jsouDruhy = druhy.some((d) => d.pocet > 1);

  return createPortal(
    <div
      className="price-modal-overlay"
      onClick={onClose}
      style={{ zIndex: 999999 }}
    >
      <div className="price-modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          className="price-modal-close"
          onClick={onClose}
          aria-label="Zavřít"
        >
          ✕
        </button>

        <div className="price-modal-header">
          <span className="price-modal-icon">🤔</span>
          <h3>{jine ? 'Co z toho to je?' : jsouDruhy ? 'Jaký druh?' : 'Která?'}</h3>
        </div>

        <div className="price-modal-search-term">
          {jine ? (
            <>
              Na seznamu máš <strong>{itemName}</strong> — v letácích se
              našlo ještě tohle.
            </>
          ) : (
            <>
              Na seznamu máš <strong>{itemName}</strong> — v letácích je toho
              víc druhů.
            </>
          )}
        </div>

        <div className="druh-volby">
          {druhy.map((d) => (
            <button
              key={d.dotaz}
              type="button"
              className="druh-volba"
              onClick={() => onPick(d)}
            >
              <span className="druh-volba-popis">
                {d.popis}
                {d.pocet > 1 && (
                  <span className="druh-volba-pocet">
                    {' '}
                    · {d.pocet} výrobků
                  </span>
                )}
              </span>
              <span className="druh-volba-cena">
                od {cena(d.odCeny)}
                <span className="druh-volba-obchod">{d.obchod}</span>
              </span>
            </button>
          ))}
        </div>

        {/* ÚNIKOVÁ CESTA. Bez ní by okno bylo past: kdyby se člověk do žádné
            z voleb nepoznal, neměl by se jak dostat k cenám, které už jsou
            načtené (u `jine` k ručnímu hledání). */}
        <button type="button" className="druh-preskocit" onClick={onSkip}>
          {jine ? 'Nic z toho — napíšu to sám' : 'Je mi to jedno — ukaž nejlevnější'}
        </button>

        <div className="price-modal-more-info">
          Co vybereš, si appka u téhle položky zapamatuje. Změnit to jde
          tlačítkem „✕ Špatný" v detailu ceny.
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DruhChooserModal;
