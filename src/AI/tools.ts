// src/AI/tools.ts

// Definice funkcí, které posíláme Gemini, aby věděl, co umí.
export const toolsDefinition = [
  {
    function_declarations: [
      {
        name: "addToShoppingList",
        description: "Přidá jednu nebo více položek do nákupního seznamu. Pokud uživatel neřekne množství, přidej jen název.",
        parameters: {
          type: "OBJECT",
          properties: {
            items: {
              type: "ARRAY",
              description: "Seznam věcí k nákupu (např. ['mléko', '5 rohlíků'])",
              items: {
                type: "STRING"
              }
            }
          },
          required: ["items"]
        }
      },
      {
        name: "getShoppingList",
        description: "Vrátí aktuální obsah nákupního seznamu.",
        parameters: {
          type: "OBJECT",
          properties: {} // Žádné parametry nejsou potřeba
        }
      },
       {
        name: "clearShoppingList",
        description: "Smaže celý nákupní seznam.",
        parameters: {
          type: "OBJECT",
          properties: {} 
        }
      }
    ]
  }
];