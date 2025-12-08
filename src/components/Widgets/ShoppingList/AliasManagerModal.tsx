// src/components/Widgets/ShoppingList/AliasManagerModal.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { clearAliasCache } from '../../../api/aliasesAPI';

interface Alias {
  id: string;
  alias: string;
  canonical: string;
  count: number;
}

interface AliasManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AliasManagerModal: React.FC<AliasManagerModalProps> = ({ isOpen, onClose }) => {
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadAliases();
    }
  }, [isOpen]);

  const loadAliases = async () => {
    setLoading(true);
    try {
      const aliasesRef = collection(db, 'productAliases');
      const snapshot = await getDocs(aliasesRef);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Alias[];
      
      // Seřadit podle počtu použití
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
      setAliases(prev => prev.filter(a => a.id !== aliasId));
    } catch (error) {
      console.error('Chyba při mazání:', error);
      alert('Nepodařilo se smazat alias');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>🧠 Naučené aliasy</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '16px',
          overflowY: 'auto',
          flex: 1
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#666' }}>Načítám...</div>
          ) : aliases.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666' }}>
              <p>Zatím žádné aliasy.</p>
              <p style={{ fontSize: '0.85rem' }}>
                Aliasy se vytváří automaticky když klikneš na "Toto je správný produkt" v detailu ceny.
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '12px' }}>
                Když napíšeš slovo vlevo, systém hledá i slovo vpravo.
              </p>
              {aliases.map(alias => (
                <div 
                  key={alias.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>{alias.alias}</span>
                    <span style={{ color: '#888', margin: '0 8px' }}>→</span>
                    <span style={{ color: '#2196F3' }}>{alias.canonical}</span>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      color: '#aaa',
                      marginLeft: '8px'
                    }}>
                      ({alias.count}×)
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(alias.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#e53935',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      fontSize: '0.9rem'
                    }}
                    title="Smazat alias"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #eee',
          backgroundColor: '#f9f9f9'
        }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#7c4dff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};