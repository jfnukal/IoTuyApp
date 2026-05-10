// src/AI/services/geminiApi.ts
import { toolsDefinition } from '../tools';
import { addItems, getList, clearList } from './shoppingService';
import {
  getCalendarEvents,
  addCalendarEvent,
  getNameday,
  getUpcomingBirthdays,
} from './calendarService';
import { getDishwasherStatus, markDishwasherDone } from './dishwasherService';
import { configService } from '../../services/configService';

let API_KEY: string | null = null;
const getApiKey = async (): Promise<string> => {
  if (!API_KEY) {
    API_KEY = await configService.getApiKey('gemini');
    if (!API_KEY) console.error('CHYBA: Chybí Gemini API klíč ve Firestore (appConfig/apiKeys/gemini)!');
  }
  return API_KEY || '';
};

const SYSTEM_PROMPT = `
Jsi rodinný asistent. Spravuješ kalendář, nákupní seznam a domácnost.

KRITICKÁ PRAVIDLA — musíš je vždy dodržet:
1. Kdykoli tě uživatel požádá o ZÁPIS nebo PŘIDÁNÍ (do kalendáře, nákupního seznamu apod.), VŽDY NEJDŘÍV ZAVOLEJ příslušnou funkci (addCalendarEvent, addToShoppingList...). Teprve potom odpověz hlasem.
2. NIKDY neříkej "přidávám" nebo "hotovo" bez toho, aby sis předtím zavolal funkci. Slova bez akce jsou zakázána.
3. Pokud ti chybí povinný parametr (např. datum), zeptej se uživatele — ale jen na to co chybí, ne na víc.
4. Mluv přirozenou češtinou, buď stručný.
5. NEPOUŽÍVEJ formátování (hvězdičky, markdown, odrážky).
6. Čísla piš slovy — "čtrnáct hodin" ne "14:00", "třetího září" ne "3.9.".
7. Nepoužívej emotikony.
`.trim();

const freshHistory = () => [
  { role: 'user',  parts: [{ text: SYSTEM_PROMPT }] },
  { role: 'model', parts: [{ text: 'Rozumím. Vždy zavolám funkci před tím, než cokoliv potvrdím.' }] },
];

let chatHistory: { role: string; parts: { text: string }[] }[] = freshHistory();

export const resetChat = () => { chatHistory = freshHistory(); };

// ==================== DISPATCHER FUNKCÍ ====================

async function executeFunction(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {

    // --- Nákupní seznam ---
    case 'addToShoppingList':
      return await addItems(args.items ?? []);
    case 'getShoppingList': {
      const list = getList();
      return list.length > 0 ? `Na seznamu máš: ${list.join(', ')}.` : 'Nákupní seznam je prázdný.';
    }
    case 'clearShoppingList':
      return clearList();

    // --- Kalendář ---
    case 'getCalendarEvents':
      return getCalendarEvents(args.daysAhead ?? 7, args.fromDate);
    case 'addCalendarEvent':
      return await addCalendarEvent(args.title, args.date, args.time, args.memberName);

    // --- Svátky & Narozeniny ---
    case 'getNameday':
      return getNameday(args.date ?? 'today');
    case 'getUpcomingBirthdays':
      return getUpcomingBirthdays(args.daysAhead ?? 30);

    // --- Myčka ---
    case 'getDishwasherStatus':
      return getDishwasherStatus();
    case 'markDishwasherDone':
      return await markDishwasherDone();

    default:
      return `Funkci "${name}" neumím vykonat.`;
  }
}

// ==================== HLAVNÍ FUNKCE ====================

export const sendToGemini = async (message: string): Promise<string> => {
  try {
    chatHistory.push({ role: 'user', parts: [{ text: message }] });

    let response = await callGeminiApi(chatHistory, toolsDefinition);
    let data = await response.json();

    if (!data.candidates?.length) throw new Error('Gemini neodpověděl.');

    let candidateContent = data.candidates[0].content;
    const part = candidateContent.parts[0];

    // Function calling
    if (part.functionCall) {
      const fc = part.functionCall;
      console.log('🤖 Gemini volá:', fc.name, fc.args);

      const result = await executeFunction(fc.name, fc.args ?? {});

      chatHistory.push(candidateContent);
      chatHistory.push({
        role: 'function',
        parts: [{
          functionResponse: {
            name: fc.name,
            response: { name: fc.name, content: result },
          },
        }],
      } as any);

      response = await callGeminiApi(chatHistory);
      data = await response.json();
      candidateContent = data.candidates[0].content;
    }

    const finalReply = candidateContent.parts[0].text;
    if (finalReply) {
      chatHistory.push({ role: 'model', parts: [{ text: finalReply }] });
      return finalReply;
    }

    return 'Hotovo.';

  } catch (error) {
    console.error('Chyba komunikace s Gemini:', error);
    return 'Omlouvám se, ale došlo k chybě.';
  }
};

// Omez historii na posledních 20 zpráv (šetří tokeny)
function trimHistory() {
  if (chatHistory.length > 22) {
    chatHistory = [chatHistory[0], chatHistory[1], ...chatHistory.slice(-20)];
  }
}

async function callGeminiApi(history: any[], tools?: any[]) {
  trimHistory();
  const body: any = { contents: history };
  if (tools) body.tools = tools;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${await getApiKey()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    console.error('Gemini API Error:', err);
    throw new Error(`API Error: ${res.status}`);
  }

  return res;
}
