// src/components/DashboardV2/ShoppingWidget.tsx
import React, { useEffect, useState } from 'react';
import { ShoppingListProvider } from '../../contexts/ShoppingListContext';
import ShoppingListCompact from '../Widgets/ShoppingList/ShoppingListCompact';
import ShoppingListModal from '../Widgets/ShoppingList/ShoppingListModal';
import { VoiceBridge } from '../../AI/components/VoiceBridge';
import { firestoreService } from '../../services/firestoreService';
import type { FamilyMember } from '../../types';

const ShoppingWidget: React.FC = () => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    firestoreService.subscribeToFamilyMembers((members) => {
      setFamilyMembers(members);
    }).then((fn) => { unsub = fn; });
    return () => { unsub?.(); };
  }, []);

  return (
    <>
      <ShoppingListProvider familyMembers={familyMembers}>
        <VoiceBridge />
        <ShoppingListCompact
          maxItems={3}
          onOpenFull={() => setModalOpen(true)}
        />
      </ShoppingListProvider>

      {modalOpen && (
        <ShoppingListModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          familyMembers={familyMembers}
        />
      )}
    </>
  );
};

export default ShoppingWidget;
