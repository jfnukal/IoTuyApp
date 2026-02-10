// src/AI/services/geminiApi.ts
import { toolsDefinition } from '../tools';
import { addItems, getList, clearList } from './shoppingService';

import { configService } from '../../services/configService';

let API_KEY: string | null = null;

const getApiKey = async (): Promise<string> => {
  if (!API_KEY) {
    API_KEY = await configService.getApiKey('gemini');
    if (!API_KEY) {
      console.error("CHYBA: Chybí Gemini API klíč ve Firestore (appConfig/apiKeys/gemini)!");
    }
  }
  return API_KEY || '';
};

// Sloučený prompt: Tvoje pravidla pro hlas + Instrukce pro nákupy
const SYSTEM_PROMPT = `
Jsi inteligentní domácí asistent jménem Gemini.
Tvým úkolem je spravovat domácnost (hlavně nákupní seznam) a odpovídat na dotazy.

Pravidla pro tvé odpovědi (budeš čten hlasovou syntézou):
1. Mluv přirozenou češtinou, buď milý a stručný.
2. ⛔️ NEPOUŽÍVEJ formátování (žádné hvězdičky, markdown, odrážky).
3. 🔢 Čísla piš slovy (místo "1.5 kg" napiš "kilo a půl", místo "14:00" "čtrnáct nula nula").
4. Nepoužívej emotikony.

Logika funkcí:
- Pokud něco přidáš do seznamu, potvrď stručně, co jsi přidal.
- Pokud je seznam prázdný, řekni to.
`;

// Inicializace historie
let chatHistory: any[] = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: 'Rozumím. Jsem připraven pomáhat.' }] }
];

export const sendToGemini = async (message: string): Promise<string> => {
  try {
    // 1. Přidáme dotaz uživatele do historie
    chatHistory.push({ role: 'user', parts: [{ text: message }] });

    // 2. První volání API (pošleme i definici nástrojů - tools)
    let response = await callGeminiApi(chatHistory, toolsDefinition);
    let data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
       throw new Error('Gemini neodpověděl.');
    }

    // Získáme odpověď (může to být text NEBO požadavek na funkci)
    let candidateContent = data.candidates[0].content;
    const part = candidateContent.parts[0];

    // --- LOGIKA VOLÁNÍ FUNKCÍ (Function Calling) ---
    if (part.functionCall) {
        const fc = part.functionCall;
        console.log("🤖 Gemini chce zavolat funkci:", fc.name, fc.args);

        let functionResult = "";

// Vykonání správné lokální funkce
if (fc.name === 'addToShoppingList') {
  // PŘIDÁNO AWAIT - čekáme, až se to zapíše do Firebase
  functionResult = await addItems(fc.args.items || []);
} else if (fc.name === 'getShoppingList') {
  const list = getList();
  functionResult = list.length > 0 
      ? `Na seznamu máš: ${list.join(', ')}.` 
      : "Nákupní seznam je prázdný.";
} else if (fc.name === 'clearShoppingList') {
  functionResult = clearList();
} else {
  functionResult = "Tuto funkci neumím vykonat.";
}

        // DŮLEŽITÉ: Musíme do historie přidat, že Gemini "zavolal" funkci...
        chatHistory.push(candidateContent);

        // ... a že my jsme mu vrátili výsledek (functionResponse)
        chatHistory.push({
            role: 'function',
            parts: [{
                functionResponse: {
                    name: fc.name,
                    response: { name: fc.name, content: functionResult }
                }
            }]
        });

        // 3. Druhé volání API (Gemini si přečte výsledek funkce a vygeneruje finální hlasovou odpověď)
        // Teď už nástroje posílat nemusíme (nebo můžeme, ale není to nutné pro odpověď)
        response = await callGeminiApi(chatHistory); 
        data = await response.json();
        candidateContent = data.candidates[0].content;
    }
    // --- KONEC LOGIKY FUNKCÍ ---

    // Vytažení finálního textu
    const finalReply = candidateContent.parts[0].text;

    if (finalReply) {
        chatHistory.push({ role: 'model', parts: [{ text: finalReply }] });
        return finalReply;
    }

    return "Provedeno.";

  } catch (error) {
    console.error('Chyba komunikace s Gemini:', error);
    return 'Omlouvám se, ale došlo k chybě v mém digitálním mozku.';
  }
};

// Pomocná funkce pro Fetch, abychom nepsali to samé 2x
async function callGeminiApi(history: any[], tools?: any[]) {
    const body: any = { contents: history };
    if (tools) {
        body.tools = tools;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${await getApiKey()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
        const err = await response.json();
        console.error("API Error Detail:", err);
        throw new Error(`API Error: ${response.status}`);
    }

    return response;
}
