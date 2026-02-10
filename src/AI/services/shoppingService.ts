// src/AI/services/shoppingService.ts

// 1. Cache pro AI (aby věděla, co je na seznamu, aniž by se ptala Reactu)
let currentItemsCache: string[] = [];

// Typ pro funkci, která přidává položku (z Reactu)
type AddHandler = (text: string) => Promise<void>;
let addHandler: AddHandler | null = null;

// --- API PRO REACT (Volá se z VoiceBridge) ---

// React nám sem posílá aktuální seznam, kdykoliv se změní
export const syncItemsFromApp = (items: { text: string; completed: boolean }[]) => {
    // AI zajímá jen to, co není koupené
    currentItemsCache = items
        .filter(i => !i.completed)
        .map(i => i.text);
};

// React se zaregistruje: "Když budeš chtít přidat položku, zavolej mě tady"
export const registerAddHandler = (handler: AddHandler) => {
    addHandler = handler;
};

// --- API PRO GEMINI (Volá se z geminiApi.ts) ---

export const getList = (): string[] => {
    return currentItemsCache;
};

export const addItems = async (items: string[]): Promise<string> => {
    if (!addHandler) {
        return "Chyba: Hlasové ovládání není propojeno s aplikací (chybí VoiceBridge).";
    }
    
    // Postupně přidáme položky přes funkci z Reactu
    const added: string[] = [];
    for (const item of items) {
        try {
            await addHandler(item); // Volá addItem z tvého Contextu
            added.push(item);
        } catch (e) {
            console.error("Chyba při přidávání hlasem:", item, e);
        }
    }
    
    if (added.length === 0) return "Nepodařilo se přidat žádnou položku.";
    return `Přidáno: ${added.join(', ')}.`;
};

export const clearList = (): string => {
    return "Mazání celého seznamu hlasem je z bezpečnostních důvodů vypnuto.";
};