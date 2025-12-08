// src/components/Widgets/ShoppingList/ShoppingListModal.tsx
import React from 'react';
import { createPortal } from 'react-dom';
import ShoppingListWidget from './ShoppingListWidget';
import { ShoppingListProvider } from '../../../contexts/ShoppingListContext';
import type { FamilyMember } from '../../../types';
import './ShoppingListModal.css';
import './ShoppingList.css';

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyMembers: FamilyMember[];
}

const ShoppingListModal: React.FC<ShoppingListModalProps> = ({ 
  isOpen, 
  onClose,
  familyMembers 
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="shopping-modal-overlay" onClick={onClose}>
      <div 
        className="shopping-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="shopping-modal-close" onClick={onClose}>
          ✕
        </button>
        <ShoppingListProvider familyMembers={familyMembers}>
          <ShoppingListWidget />
        </ShoppingListProvider>
      </div>
    </div>,
    document.body
  );
};

export default ShoppingListModal;