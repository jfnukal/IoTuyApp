// src/contexts/ShoppingListContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from './AuthContext';
import type { ShoppingItem, FamilyMember } from '../types';

interface ShoppingListContextType {
  items: ShoppingItem[];
  loading: boolean;
  error: string | null;
  addItem: (text: string) => Promise<void>;
  toggleItem: (itemId: string) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  getShareText: () => string;
}

const ShoppingListContext = createContext<ShoppingListContextType | null>(null);

interface ShoppingListProviderProps {
  children: React.ReactNode;
  familyMembers: FamilyMember[];
}

export const ShoppingListProvider: React.FC<ShoppingListProviderProps> = ({
  children,
  familyMembers,
}) => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Najdi aktuálního člena rodiny
  const currentMember = familyMembers.find(
    (m) => m.authUid === currentUser?.uid
  );

  // Real-time subscription
  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = firestoreService.subscribeToShoppingList((list) => {
      if (list) {
        // Seřaď: nedokončené nahoře, pak podle času přidání
        const sorted = [...list.items].sort((a, b) => {
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
          }
          return b.addedAt - a.addedAt;
        });
        setItems(sorted);
      } else {
        setItems([]);
      }
      setLoading(false);
      setError(null);
    });

    return () => unsubscribe();
  }, []);

  // Přidání položky
  const addItem = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    try {
      await firestoreService.addShoppingItem({
        text: text.trim(),
        addedBy: currentMember?.id || 'unknown',
        addedByEmoji: currentMember?.emoji || '👤',
        addedByName: currentMember?.name || 'Někdo',
      });
    } catch (err) {
      console.error('Chyba při přidávání položky:', err);
      setError('Nepodařilo se přidat položku');
    }
  }, [currentMember]);

// Přepnutí stavu (dokončeno/nedokončeno)
const toggleItem = useCallback(async (itemId: string) => {
  const item = items.find((i) => i.id === itemId);
  if (!item) return;

  try {
    const newCompleted = !item.completed;
    
    if (newCompleted) {
      // Označujeme jako dokončené
      await firestoreService.updateShoppingItem(itemId, {
        completed: true,
        completedBy: currentMember?.id || null,
        completedByName: currentMember?.name || null,
        completedAt: Date.now(),
      });
    } else {
      // Obnovujeme jako nedokončené - použijeme null místo undefined
      await firestoreService.updateShoppingItem(itemId, {
        completed: false,
        completedBy: null,
        completedByName: null,
        completedAt: null,
      });
    }
  } catch (err) {
    console.error('Chyba při aktualizaci položky:', err);
    setError('Nepodařilo se aktualizovat položku');
  }
}, [items, currentMember]);

  // Smazání položky
  const deleteItem = useCallback(async (itemId: string) => {
    try {
      await firestoreService.deleteShoppingItem(itemId);
    } catch (err) {
      console.error('Chyba při mazání položky:', err);
      setError('Nepodařilo se smazat položku');
    }
  }, []);

  // Smazání dokončených
  const clearCompleted = useCallback(async () => {
    try {
      await firestoreService.clearCompletedItems();
    } catch (err) {
      console.error('Chyba při mazání dokončených:', err);
      setError('Nepodařilo se smazat dokončené položky');
    }
  }, []);

  // Generování textu pro sdílení
  const getShareText = useCallback(() => {
    const activeItems = items.filter((i) => !i.completed);
    if (activeItems.length === 0) {
      return '🛒 Nákupní seznam je prázdný!';
    }
    
    const itemsList = activeItems
      .map((item) => `• ${item.text}`)
      .join('\n');
    
    return `🛒 Nákupní seznam:\n\n${itemsList}\n\n📱 Odesláno z IoT Smart Home`;
  }, [items]);

  const value: ShoppingListContextType = {
    items,
    loading,
    error,
    addItem,
    toggleItem,
    deleteItem,
    clearCompleted,
    getShareText,
  };

  return (
    <ShoppingListContext.Provider value={value}>
      {children}
    </ShoppingListContext.Provider>
  );
};

// Hook pro použití kontextu
export const useShoppingList = (): ShoppingListContextType => {
  const context = useContext(ShoppingListContext);
  if (!context) {
    throw new Error('useShoppingList musí být použit uvnitř ShoppingListProvider');
  }
  return context;
};