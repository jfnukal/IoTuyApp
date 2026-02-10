// src/AI/components/VoiceBridge.tsx
import React, { useEffect } from 'react';
// DŮLEŽITÉ: Zkontroluj, jestli cesta sedí k tvému souboru Contextu
import { useShoppingList } from '../../contexts/ShoppingListContext'; 
import { syncItemsFromApp, registerAddHandler } from '../services/shoppingService';

export const VoiceBridge: React.FC = () => {
    // Vytáhneme si data a funkce z tvého existujícího widgetu
    const { items, addItem } = useShoppingList();

    // 1. Sync směrem DO AI 
    // Kdykoliv se změní 'items' (např. někdo něco přidá v aplikaci), pošleme to do AI cache
    useEffect(() => {
        syncItemsFromApp(items);
    }, [items]);

    // 2. Sync směrem Z AI
    // Zaregistrujeme funkci, kterou má AI zavolat, když chce něco přidat
    useEffect(() => {
        registerAddHandler(async (text) => {
             console.log("🎤 VoiceBridge přidává:", text);
             await addItem(text); // Tohle je ta funkce z tvého Contextu (Firebase)
        });
    }, [addItem]);

    // Tato komponenta nic nevykresluje, je to jen logický most
    return null;
};