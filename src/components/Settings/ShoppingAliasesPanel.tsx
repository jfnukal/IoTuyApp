// src/components/Settings/ShoppingAliasesPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { clearAliasCache } from '../../api/aliasesAPI';
import { clearPriceCache } from '../../api/pricesAPI';

interface Alias {
  id: string;
  alias: string;
  canonical: string;
  count: number;
}

const ShoppingAliasesPanel: React.FC = () => {
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlias, setEditAlias] = useState('');
  const [editCanonical, setEditCanonical] = useState('');

  // Pro přidávání
  const [isAdding, setIsAdding] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [newCanonical, setNewCanonical] = useState('');

  useEffect(() => {
    loadAliases();
  }, []);

  const loadAliases = async () => {
    setLoading(true);
    try {
      const aliasesRef = collection(db, 'productAliases');
      const snapshot = await getDocs(aliasesRef);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Alias[];

      data.sort((a, b) => b.count - a.count);
      setAliases(data);
    } catch (error) {
      console.error('Chyba při načítání aliasů:', error);
    }
    setLoading(false);
  };

  const handleDelete = async (aliasId: string) => {
    if (!confirm('Opravdu smazat tento alias?')) return;

    try {
      await deleteDoc(doc(db, 'productAliases', aliasId));
      clearAliasCache();
      clearPriceCache();
      setAliases((prev) => prev.filter((a) => a.id !== aliasId));
    } catch (error) {
      console.error('Chyba při mazání:', error);
      alert('Nepodařilo se smazat alias');
    }
  };

  const startEdit = (alias: Alias) => {
    setEditingId(alias.id);
    setEditAlias(alias.alias);
    setEditCanonical(alias.canonical);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAlias('');
    setEditCanonical('');
  };

  const saveEdit = async (oldAlias: Alias) => {
    if (!editAlias.trim() || !editCanonical.trim()) {
      alert('Vyplň oba údaje');
      return;
    }

    try {
      // Pokud se změnil alias nebo canonical, vytvoříme nový dokument a smažeme starý
      const newDocId = `${editAlias.toLowerCase().trim()}-${editCanonical
        .toLowerCase()
        .trim()}`.replace(/[^a-z0-9-]/g, '');

      if (newDocId !== oldAlias.id) {
        // Smazat starý
        await deleteDoc(doc(db, 'productAliases', oldAlias.id));
        // Vytvořit nový
        await setDoc(doc(db, 'productAliases', newDocId), {
          alias: editAlias.toLowerCase().trim(),
          canonical: editCanonical.toLowerCase().trim(),
          count: oldAlias.count,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Jen aktualizovat
        await updateDoc(doc(db, 'productAliases', oldAlias.id), {
          alias: editAlias.toLowerCase().trim(),
          canonical: editCanonical.toLowerCase().trim(),
          updatedAt: new Date(),
        });
      }

      clearAliasCache();
      clearPriceCache();
      await loadAliases();
      cancelEdit();
    } catch (error) {
      console.error('Chyba při ukládání:', error);
      alert('Nepodařilo se uložit změny');
    }
  };

  const handleAdd = async () => {
    if (!newAlias.trim() || !newCanonical.trim()) {
      alert('Vyplň oba údaje');
      return;
    }

    if (newAlias.trim().length < 3 || newCanonical.trim().length < 3) {
      alert('Minimální délka je 3 znaky');
      return;
    }

    const aliasNorm = newAlias.toLowerCase().trim();
    const canonicalNorm = newCanonical.toLowerCase().trim();

    if (aliasNorm === canonicalNorm) {
      alert('Alias a produkt nemohou být stejné');
      return;
    }

    const docId = `${aliasNorm}-${canonicalNorm}`.replace(/[^a-z0-9-]/g, '');

    try {
      await setDoc(doc(db, 'productAliases', docId), {
        alias: aliasNorm,
        canonical: canonicalNorm,
        count: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      clearAliasCache();
      clearPriceCache();
      await loadAliases();
      setNewAlias('');
      setNewCanonical('');
      setIsAdding(false);
    } catch (error) {
      console.error('Chyba při přidávání:', error);
      alert('Nepodařilo se přidat alias');
    }
  };

  // Detekce duplicit
  const getDuplicateAliases = () => {
    const aliasCount: Record<string, number> = {};
    aliases.forEach((a) => {
      aliasCount[a.alias] = (aliasCount[a.alias] || 0) + 1;
    });
    return Object.entries(aliasCount)
      .filter(([_, count]) => count > 1)
      .map(([alias]) => alias);
  };

  const duplicates = getDuplicateAliases();

  return (
    <div className="settings-section">
      <h2>🛒 Nákupní seznam - Aliasy</h2>

      <div className="widget-group">
        <h3>🧠 Naučené aliasy</h3>
        <p className="setting-description">
          Když napíšeš slovo vlevo, systém automaticky hledá slovo vpravo.
          Aliasy se vytváří automaticky nebo je můžeš přidat ručně.
        </p>

        {/* Varování o duplicitách */}
        {duplicates.length > 0 && (
          <div
            style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
            }}
          >
            <strong>⚠️ Nalezeny duplicitní aliasy:</strong>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>
              Výraz "{duplicates.join('", "')}" má více významů. Doporučujeme
              smazat nesprávné varianty pro lepší výsledky hledání.
            </p>
          </div>
        )}

        {/* Tlačítko pro přidání */}
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              marginBottom: '16px',
            }}
          >
            ➕ Přidat alias
          </button>
        )}

        {/* Formulář pro přidání */}
        {isAdding && (
          <div
            style={{
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <h4 style={{ margin: '0 0 12px 0' }}>Nový alias</h4>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="text"
                placeholder="Co píšeš (např. radek)"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  width: '150px',
                }}
              />
              <span style={{ color: '#888' }}>→</span>
              <input
                type="text"
                placeholder="Co hledat (např. radegast)"
                value={newCanonical}
                onChange={(e) => setNewCanonical(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  width: '150px',
                }}
              />
              <button
                onClick={handleAdd}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                ✓ Uložit
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewAlias('');
                  setNewCanonical('');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#999',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                ✕ Zrušit
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p>Načítám...</p>
        ) : aliases.length === 0 ? (
          <p style={{ color: '#888', fontStyle: 'italic' }}>
            Zatím žádné aliasy.
          </p>
        ) : (
          <div style={{ marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}
                >
                  <th style={{ padding: '8px' }}>Hledaný výraz</th>
                  <th style={{ padding: '8px' }}>→</th>
                  <th style={{ padding: '8px' }}>Skutečný produkt</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>
                    Použito
                  </th>
                  <th style={{ padding: '8px' }}>Akce</th>
                </tr>
              </thead>
              <tbody>
                {aliases.map((alias) => (
                  <tr
                    key={alias.id}
                    style={{
                      borderBottom: '1px solid #f0f0f0',
                      backgroundColor: duplicates.includes(alias.alias)
                        ? '#fff8e1'
                        : 'transparent',
                    }}
                  >
                    {editingId === alias.id ? (
                      <>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="text"
                            value={editAlias}
                            onChange={(e) => setEditAlias(e.target.value)}
                            style={{
                              padding: '4px 8px',
                              border: '1px solid #2196F3',
                              borderRadius: '4px',
                              width: '100px',
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px', color: '#888' }}>→</td>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="text"
                            value={editCanonical}
                            onChange={(e) => setEditCanonical(e.target.value)}
                            style={{
                              padding: '4px 8px',
                              border: '1px solid #2196F3',
                              borderRadius: '4px',
                              width: '100px',
                            }}
                          />
                        </td>
                        <td
                          style={{
                            padding: '8px',
                            textAlign: 'center',
                            color: '#888',
                          }}
                        >
                          {alias.count}×
                        </td>
                        <td style={{ padding: '8px' }}>
                          <button
                            onClick={() => saveEdit(alias)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#4CAF50',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              marginRight: '8px',
                            }}
                            title="Uložit"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEdit}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#999',
                              cursor: 'pointer',
                              fontSize: '1rem',
                            }}
                            title="Zrušit"
                          >
                            ✕
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '8px', fontWeight: 600 }}>
                          {alias.alias}
                          {duplicates.includes(alias.alias) && (
                            <span
                              style={{ color: '#f57c00', marginLeft: '4px' }}
                              title="Duplicitní alias"
                            >
                              ⚠️
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px', color: '#888' }}>→</td>
                        <td style={{ padding: '8px', color: '#2196F3' }}>
                          {alias.canonical}
                        </td>
                        <td
                          style={{
                            padding: '8px',
                            textAlign: 'center',
                            color: '#888',
                          }}
                        >
                          {alias.count}×
                        </td>
                        <td style={{ padding: '8px' }}>
                          <button
                            onClick={() => startEdit(alias)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2196F3',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              marginRight: '8px',
                            }}
                            title="Upravit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(alias.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#e53935',
                              cursor: 'pointer',
                              fontSize: '1rem',
                            }}
                            title="Smazat"
                          >
                            🗑️
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingAliasesPanel;
