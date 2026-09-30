// src/components/Widgets/ShoppingList/PriceBadge.tsx
//
// Cenovka u položky nákupního seznamu. Hledání samo sedí v `priceMatching.ts`;
// tady se jen ukazuje, co našlo. Srovnáno s Family-Dashboard 29. 9. 2026
// (výběr druhu, „jiný výrobek", ostatní nálezy po „✕ Špatný", výpadek cen) —
// bez placených tarifů a šablon, které tahle rodinná appka nemá.
import React, { useState, useEffect, useRef } from 'react';
import {
  findAllDeals,
  findDruhy,
  learnAlias,
  type Druh,
  type PriceResult,
  TEXT_CENY_NEDOSTUPNE,
} from '../../../api/pricesAPI';
import PriceDetailModal from './PriceDetailModal';
import DruhChooserModal from './DruhChooserModal';
import { useDnes } from '../../../hooks/useDnes';

interface PriceBadgeProps {
  itemName: string;
}

export const PriceBadge: React.FC<PriceBadgeProps> = ({ itemName }) => {
  const [offers, setOffers] = useState<PriceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /* VOLBY „cos myslel?" — neprázdné jen u obecných položek typu „káva".
     U většiny věcí zůstane prázdné a značka se chová jako dosud. */
  const [druhy, setDruhy] = useState<Druh[]>([]);
  const [vyberOtevren, setVyberOtevren] = useState(false);

  // Pro ruční hledání
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  /* Ceny se nepodařilo načíst — to NENÍ „nenalezeno". Ťuknutí na ⚠️
     to zkusí znovu (`pokusCen`). */
  const [nedostupne, setNedostupne] = useState(false);
  const [pokusCen, setPokusCen] = useState(0);
  /* O půlnoci hledat znovu (převzato z Family-Dashboard, 30. 9. 2026).
     Položka na zdi visí přes noc beze změny a cenovka by jinak dál
     ukazovala akci, která o půlnoci skončila (a „⏳" u té, která začala).
     `useDnes` se přepočítá každou minutu a hned po rozsvícení displeje. */
  const den = useDnes();

  /* JINÉ NALEZENÉ PRODUKTY — ukážou se po „✕ Špatný" místo prázdného pole.
     Dřív se nálezy zahodily a člověk musel název uhodnout, ačkoli appka
     tu správnou položku měla v ruce (u „vejce" nabídla aspik a zahodila
     obojí balení z podestýlky). */
  const [jineNabidky, setJineNabidky] = useState<PriceResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!itemName || itemName.length < 3) return;

    let isMounted = true;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setNotFound(false);
      setNedostupne(false);
      setJineNabidky([]); // nálezy k předchozímu názvu položky už neplatí
      /* Obojí najednou. Čte se to z TÝCHŽ načtených dat, takže druhý dotaz
         nestojí ani jedno čtení z databáze navíc — jen jiný pohled na ně. */
      try {
        const [results, volby] = await Promise.all([
          findAllDeals(itemName),
          findDruhy(itemName),
        ]);
        if (isMounted) {
          setOffers(results);
          setDruhy(volby);
          setNotFound(results.length === 0);
        }
      } catch {
        if (isMounted) {
          setOffers([]);
          setDruhy([]);
          setNedostupne(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [itemName, pokusCen, den]); // nový den = hledat znovu

  // Focus na input když se otevře
  useEffect(() => {
    if (showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearch]);

  // Handler pro „Toto není správný produkt"
  const handleWrongProduct = () => {
    /* NEJDŘÍV NABÍDNOUT, CO UŽ MÁME. „Špatný" znamená jen tolik, že nesedí
       TENHLE produkt, ne že nesedí všechny.

       Nabídky se sdružují PODLE NÁZVU a z každé skupiny se bere nejlevnější:
       `offers` totiž nese jeden řádek na OBCHOD, takže bez toho by se
       nabídlo pětkrát totéž. Psaní zůstává jako druhá možnost — a když
       opravdu není z čeho vybrat, otevře se rovnou, jako dřív. */
    const zobrazeny = offers[0]?.productName;
    const podleNazvu = new Map<string, PriceResult>();
    for (const o of offers) {
      if (!o.productName || o.productName === zobrazeny) continue;
      const ma = podleNazvu.get(o.productName);
      if (!ma || o.priceNum < ma.priceNum) podleNazvu.set(o.productName, o);
    }
    const jine = [...podleNazvu.values()].sort((a, b) => a.priceNum - b.priceNum);

    setIsModalOpen(false);
    setDruhy([]);
    setNotFound(false);

    if (jine.length > 0) {
      setJineNabidky(jine);
      return;
    }
    // Není z čeho vybírat — rovnou psát.
    setOffers([]);
    setShowSearch(true);
    setSearchQuery('');
  };

  /* VYBRAL SI JINÝ PRODUKT ZE SEZNAMU. Je to vědomá volba ze seznamu, takže
     se zapamatuje jako alias (`learnAlias`) — stejně jako výběr druhu.
     Zrušit jde tlačítkem „✕ Špatný" nebo v Nastavení → Nákupní seznam. */
  const handleVyberJinou = async (o: PriceResult) => {
    const nazev = o.productName;
    if (!nazev) return; // bez názvu se nedá ani učit, ani hledat
    setJineNabidky([]);
    setLoading(true);
    void learnAlias(itemName, nazev);

    let results: PriceResult[];
    try {
      results = await findAllDeals(nazev);
    } catch {
      setLoading(false);
      alert(TEXT_CENY_NEDOSTUPNE);
      return;
    }
    setLoading(false);

    if (results.length === 0) {
      // Nemělo by nastat — volba vznikla z týchž dat. Tiše to spolknout ale
      // nesmíme, jinak kliknutí vypadá, že nefunguje.
      alert(`Pro „${nazev}" se nepodařilo dohledat cenu. Zkus hledat ručně lupou.`);
      return;
    }
    setOffers(results);
    setIsModalOpen(true);
  };

  /** Nic z nabídnutých nesedí — teprve teď se píše ručně. */
  const handleRadsiPsat = () => {
    setJineNabidky([]);
    setOffers([]);
    setShowSearch(true);
    setSearchQuery('');
  };

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Když je z čeho vybírat, ptá se to dřív, než ukáže jednu cenu.
    if (druhy.length >= 2) {
      setVyberOtevren(true);
      return;
    }
    if (offers.length > 0) {
      setIsModalOpen(true);
    }
  };

  /* VYBRAL SI DRUH. Zapamatuje se to k položce (`learnAlias`) a hned se
     dohledají ceny už jen pro ten druh. Příště se appka neptá — `nabidniDruhy`
     u položky s naučeným aliasem mlčí. */
  const handleVyberDruh = async (druh: Druh) => {
    setVyberOtevren(false);
    setLoading(true);
    void learnAlias(itemName, druh.dotaz);

    let results: PriceResult[];
    try {
      results = await findAllDeals(druh.dotaz);
    } catch {
      setLoading(false);
      alert(TEXT_CENY_NEDOSTUPNE);
      return;
    }
    setLoading(false);

    if (results.length === 0) {
      // Nemělo by nastat — volba vznikla z týchž dat. Ale tiše to spolknout
      // nesmíme, jinak by kliknutí vypadalo jako by nefungovalo.
      alert(`Pro „${druh.dotaz}" se nepodařilo dohledat cenu. Zkus hledat ručně lupou.`);
      return;
    }

    setOffers(results);
    setDruhy([]); // vybráno, podruhé se už neptáme
    setIsModalOpen(true);
  };

  /** Nechce vybírat — ukaž nejlevnější, jako by okno nebylo. */
  const handlePreskocitVyber = () => {
    setVyberOtevren(false);
    setDruhy([]);
    if (offers.length > 0) setIsModalOpen(true);
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
    let results: PriceResult[];
    try {
      results = await findAllDeals(searchQuery);
    } catch {
      setSearchLoading(false);
      // Výpadek ≠ „žádná akce" — dřív tu stálo, že akce není.
      alert(TEXT_CENY_NEDOSTUPNE);
      return;
    }
    setSearchLoading(false);

    if (results.length > 0) {
      // Auto-učení aliasů je vypnuté (dělalo odpad typu "bez → maso").
      // Aliasy se spravují ručně v Nastavení → Nákupní seznam.
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

  /* Okno s ostatními nálezy po „✕ Špatný". Vykresluje se jen u cenovky
     (poslední větev níž) — jiná větev, dokud je otevřené, nastat nemůže:
     `handleWrongProduct` vynuluje druhy a nabídky nechá. Schválně TÝMŽ
     oknem jako výběr druhu: pro člověka je to táž otázka („které z toho
     je ono?"), jen s jiným únikem (`rezim="jine"` → napíšu sám). */
  const oknoJinych = (
    <DruhChooserModal
      isOpen={jineNabidky.length > 0}
      onClose={() => setJineNabidky([])}
      itemName={itemName}
      rezim="jine"
      druhy={jineNabidky.map((o) => ({
        popis: o.productName ?? '',
        dotaz: o.productName ?? '',
        pocet: 1,
        odCeny: o.priceNum,
        obchod: o.store,
      }))}
      onPick={(volba) =>
        handleVyberJinou(
          jineNabidky.find((o) => o.productName === volba.dotaz) ?? jineNabidky[0]
        )
      }
      onSkip={handleRadsiPsat}
    />
  );

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

  /* Ceny se nepodařilo načíst — malé ⚠️, ťuknutí zkusí znovu. Dřív to
     vypadalo jako „nenalezeno" (🔍), tedy jako že akce není. */
  if (nedostupne) {
    return (
      <button
        type="button"
        className="price-badge price-badge-nedostupne"
        onClick={(e) => { e.stopPropagation(); setPokusCen((p) => p + 1); }}
        title="Ceny z letáků se teď nepodařilo načíst — ťukni pro nový pokus"
        aria-label="Ceny z letáků se nepodařilo načíst, zkusit znovu"
        style={{
          marginLeft: '8px',
          padding: '2px 8px',
          borderRadius: '12px',
          border: '1px dashed currentColor',
          background: 'transparent',
          color: 'inherit',
          fontSize: '0.7rem',
          cursor: 'pointer',
          opacity: 0.75,
        }}
      >
        ⚠️
      </button>
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

  /* JE Z ČEHO VYBÍRAT — místo ceny se ukáže počet voleb.
     Schválně NENÍ žlutá jako cena: tohle není údaj, ale otázka, a kdyby
     vypadalo stejně, člověk by čekal, že po kliknutí uvidí cenu.
     Objevuje se to zřídka (skoro jen u slov typu „káva", „sýr", „minerálka")
     — podmínky jsou v `nabidniDruhy` v `priceMatching.ts`. */
  if (druhy.length >= 2) {
    const jsouDruhy = druhy.some((d) => d.pocet > 1);
    const n = druhy.length;
    // 2–4 druhy / 5+ druhů
    const tvar = n < 5 ? (jsouDruhy ? 'druhy' : 'značky') : jsouDruhy ? 'druhů' : 'značek';

    return (
      <>
        <span
          className="price-badge price-badge-vyber"
          onClick={handleBadgeClick}
          title={`Na seznamu je „${itemName}" obecně — klikni a vyber, co myslíš.`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            marginLeft: '8px',
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: '#e8eaf6',
            color: '#333',
            border: '1px solid #c5cae9',
            fontSize: '0.7rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span aria-hidden="true">☰</span>
          {n} {tvar}
        </span>

        <DruhChooserModal
          isOpen={vyberOtevren}
          onClose={() => setVyberOtevren(false)}
          itemName={itemName}
          druhy={druhy}
          onPick={handleVyberDruh}
          onSkip={handlePreskocitVyber}
        />
      </>
    );
  }

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

  /* AKCE, KTERÁ JEŠTĚ NEPLATÍ — letáky se sbírají s předstihem, takže
     nabídka klidně začíná až příští týden. Detail ceny to říká odjakživa
     („⏳ Bude platit od…"), ale tahle značka na seznamu ne: svítila vždycky
     žlutě, jako by cena platila dnes, a člověk se to dozvěděl teprve po
     kliknutí. U produktu, který má POUZE budoucí akci, to byla past —
     mohl podle ní vyrazit do obchodu.
     Přesýpací hodiny + zašedlá barva jsou schválně stejné jako v modalu. */
  const jenBudouci = bestOffer.isFuture === true;
  const odKdy = bestOffer.validityText?.split('–')[0]?.trim();

  /* JINÝ VÝROBEK — přímo tahle položka v letácích není, cena patří
     podobnému výrobku („vejce" → Vejce v aspiku). Dřív to značka nijak
     neřekla a rodina mohla plánovat nákup podle ceny aspiku.
     Stejně jako u budoucí akce to musí říct SLOVO na značce, ne jen bublina
     (tablet na zdi myš nemá); bílá čárkovaná místo žluté „opravdové" ceny. */
  const jinyVyrobek = bestOffer.jinyVyrobek === true;

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
          backgroundColor: jenBudouci ? '#e0e0e0' : jinyVyrobek ? '#ffffff' : '#FFEB3B',
          color: jenBudouci ? '#555' : jinyVyrobek ? '#444' : '#333',
          ...(jinyVyrobek ? { border: '1px dashed #9e9e9e' } : {}),
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
        title={
          jinyVyrobek
            ? `V letácích teď není přímo „${itemName}". ${bestOffer.store}: ${bestOffer.price} je cena JINÉHO výrobku — ${bestOffer.productName ?? 'podobného'}` +
              `${jenBudouci ? `, akce zatím NEPLATÍ${odKdy ? `, začíná ${odKdy}` : ''}` : ''}. Klikni pro detail.`
            : jenBudouci
              ? `${bestOffer.store}: ${bestOffer.price} — akce zatím NEPLATÍ${odKdy ? `, začíná ${odKdy}` : ''}. Klikni pro detail.`
              : `${bestOffer.store}: ${bestOffer.price} - Klikni pro detail`
        }
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
            opacity: jenBudouci ? 0.55 : 1,
          }}
        >
          {config.short}
        </span>
        {jenBudouci && <span aria-hidden="true">⏳</span>}
        {bestOffer.price}
        {/* Samotné přesýpací hodiny by na tabletu na zdi nikdo nerozluštil,
            a bublina s vysvětlením se čte jen myší. Proto i slovem. */}
        {jenBudouci && (
          <span style={{ fontWeight: 500, fontSize: '0.62rem', whiteSpace: 'nowrap' }}>
            {odKdy ? `od ${odKdy}` : 'až příště'}
          </span>
        )}
        {jinyVyrobek && (
          <span className="price-badge-jiny" style={{ fontWeight: 500, fontSize: '0.62rem', whiteSpace: 'nowrap' }}>
            jiný výrobek
          </span>
        )}
      </span>

      <PriceDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemName={itemName}
        offers={offers}
        onWrongProduct={handleWrongProduct}
      />

      {oknoJinych}
    </>
  );
};
