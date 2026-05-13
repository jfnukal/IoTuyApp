// src/components/Widgets/ShoppingList/ShoppingListCompact.tsx
import React, { useState } from 'react';
import { useShoppingList } from '../../../contexts/ShoppingListContext';
import './ShoppingList.css';
import { PriceBadge } from './PriceBadge';

interface ShoppingListCompactProps {
  onOpenFull?: () => void;
  maxItems?: number;
}

const ShoppingListCompact: React.FC<ShoppingListCompactProps> = ({
  onOpenFull,
  maxItems = 5,
}) => {
  const { items, loading, addItem, toggleItem, deleteItem } = useShoppingList();
  const [newItemText, setNewItemText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Zobraz všechny položky (ne jen aktivní), seřazené
  const displayItems = items.slice(0, maxItems);
  const remainingCount = items.length - maxItems;

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemText.trim()) {
      await addItem(newItemText);
      setNewItemText('');
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsAdding(false);
      setNewItemText('');
    }
  };

  const handleToggle = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    toggleItem(itemId);
  };

  const handleDelete = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    deleteItem(itemId);
  };

// PRO KOMPAKTNÍ VERZI
if (loading) {
  return (
    <div className="shopping-compact loading">
 
    </div>
  );
}

  return (
    <div className="shopping-compact">
      {/* Header */}
      <div className="shopping-compact-header">
        <div className="shopping-compact-title" onClick={onOpenFull}>
          <span className="shopping-icon">🛒</span>
          <span>Nákupní seznam</span>
          {items.length > 0 && (
            <span className="shopping-count">
              {items.filter((i) => !i.completed).length}/{items.length}
            </span>
          )}
        </div>
        <button
          className="shopping-add-btn"
          onClick={() => setIsAdding(!isAdding)}
          title="Přidat položku"
        >
          {isAdding ? '✕' : '＋'}
        </button>
      </div>

      {/* Rychlé přidání */}
      {isAdding && (
        <form className="shopping-quick-add" onSubmit={handleAddItem}>
          <input
            type="text"
            className="shopping-quick-input"
            placeholder="Co nakoupit..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            maxLength={100}
          />
          <button type="submit" className="shopping-quick-submit">
            ✓
          </button>
        </form>
      )}

      {/* Seznam položek */}
      <div className="shopping-compact-list">
        {items.length === 0 ? (
          <div className="shopping-empty">
            <span className="shopping-empty-icon">📝</span>
            <span>Seznam je prázdný</span>
          </div>
        ) : (
          <>
            {displayItems.map((item) => (
              <div
  key={item.id}
  className={`shopping-compact-item ${
    item.completed ? 'completed' : ''
  }`}
>
  <span 
    className="item-checkbox"
    onClick={(e) => handleToggle(e, item.id)}
    style={{ cursor: 'pointer' }}
  >
    {item.completed ? '☑' : '☐'}
  </span>
                <span className="item-text">{item.text}</span>
                {/* --- NOVÝ KÓD ZAČÁTEK --- */}
                {!item.completed && <PriceBadge itemName={item.text} />}
                {/* --- NOVÝ KÓD KONEC --- */}
                <span className="item-author">{item.addedByEmoji}</span>
                <button
                  className="item-delete-btn"
                  onClick={(e) => handleDelete(e, item.id)}
                  title="Smazat položku"
                >
                  🗑️
                </button>
              </div>
            ))}

            {remainingCount > 0 && (
              <div className="shopping-more" onClick={onOpenFull}>
                +{remainingCount} další...
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};

export default ShoppingListCompact;
