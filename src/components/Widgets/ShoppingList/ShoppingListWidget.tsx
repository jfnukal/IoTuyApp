// src/components/Widgets/ShoppingList/ShoppingListWidget.tsx
import React, { useState } from 'react';
import { useShoppingList } from '../../../contexts/ShoppingListContext';
import './ShoppingList.css';

const ShoppingListWidget: React.FC = () => {
  const { items, loading, addItem, toggleItem, deleteItem, clearCompleted, getShareText } = useShoppingList();
  const [newItemText, setNewItemText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Filtrování položek
  const filteredItems = items.filter((item) => {
    if (filter === 'active') return !item.completed;
    if (filter === 'completed') return item.completed;
    return true;
  });

  // Statistiky
  const activeCount = items.filter((i) => !i.completed).length;
  const completedCount = items.filter((i) => i.completed).length;

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

  const handleShare = async (method: 'whatsapp' | 'email' | 'copy') => {
    const text = getShareText();
    
    switch (method) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=Nákupní seznam&body=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'copy':
        await navigator.clipboard.writeText(text);
        alert('Seznam zkopírován do schránky!');
        break;
    }
  };

  if (loading) {
    return (
      <div className="shopping-widget loading">
        <div className="loading-content">
          <span className="loading-spinner">🔄</span>
          <p>Načítám seznam...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shopping-widget">
      {/* Header */}
      <div className="shopping-widget-header">
        <div className="shopping-widget-title">
          <span className="shopping-icon">🛒</span>
          <span>Nákupní seznam</span>
        </div>
        <div className="shopping-widget-actions">
          <button
            className="shopping-action-btn add"
            onClick={() => setIsAdding(!isAdding)}
            title="Přidat položku"
          >
            {isAdding ? '✕' : '➕'}
          </button>
        </div>
      </div>

      {/* Rychlé přidání */}
      {isAdding && (
        <form className="shopping-add-form" onSubmit={handleAddItem}>
          <input
            type="text"
            className="shopping-add-input"
            placeholder="Co nakoupit... (Enter pro přidání)"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            maxLength={100}
          />
          <button type="submit" className="shopping-add-submit">
            Přidat
          </button>
        </form>
      )}

      {/* Filtry a statistiky */}
      <div className="shopping-filters">
        <div className="shopping-stats">
          <span className="stat-active">📝 {activeCount} k nákupu</span>
          <span className="stat-completed">✅ {completedCount} koupeno</span>
        </div>
        <div className="shopping-filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Vše
          </button>
          <button
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            K nákupu
          </button>
          <button
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Koupeno
          </button>
        </div>
      </div>

      {/* Seznam položek */}
      <div className="shopping-widget-list">
        {filteredItems.length === 0 ? (
          <div className="shopping-empty-full">
            <span className="shopping-empty-icon">
              {filter === 'completed' ? '🎉' : '📝'}
            </span>
            <p>
              {filter === 'completed'
                ? 'Zatím nic nebylo koupeno'
                : filter === 'active'
                ? 'Vše nakoupeno! 🎉'
                : 'Seznam je prázdný'}
            </p>
            {filter === 'all' && (
              <button
                className="shopping-add-first"
                onClick={() => setIsAdding(true)}
              >
                Přidat první položku
              </button>
            )}
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`shopping-widget-item ${item.completed ? 'completed' : ''}`}
            >
              <div
                className="item-main"
                onClick={() => toggleItem(item.id)}
              >
                <span className="item-checkbox">
                  {item.completed ? '☑' : '☐'}
                </span>
                <span className="item-text">{item.text}</span>
              </div>
              <div className="item-meta">
                <span className="item-author" title={`Přidal/a: ${item.addedByName}`}>
                  {item.addedByEmoji}
                </span>
                {item.completed && item.completedByName && (
                  <span className="item-completed-by" title={`Koupil/a: ${item.completedByName}`}>
                    ✓
                  </span>
                )}
                <button
                  className="item-delete"
                  onClick={() => deleteItem(item.id)}
                  title="Smazat položku"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer s akcemi */}
      <div className="shopping-widget-footer">
        <div className="shopping-share-buttons">
          <button
            className="share-btn whatsapp"
            onClick={() => handleShare('whatsapp')}
            title="Odeslat přes WhatsApp"
          >
            📱 WhatsApp
          </button>
          <button
            className="share-btn email"
            onClick={() => handleShare('email')}
            title="Odeslat emailem"
          >
            📧 Email
          </button>
          <button
            className="share-btn copy"
            onClick={() => handleShare('copy')}
            title="Kopírovat do schránky"
          >
            📋 Kopírovat
          </button>
        </div>
        
        {completedCount > 0 && (
          <button
            className="shopping-clear-btn"
            onClick={clearCompleted}
          >
            🧹 Smazat koupené ({completedCount})
          </button>
        )}
      </div>
    </div>
  );
};


export default ShoppingListWidget;
