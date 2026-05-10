// src/AI/tools.ts
// Definice nástrojů, které Gemini může volat.

export const toolsDefinition = [
  {
    function_declarations: [

      // ==================== NÁKUPNÍ SEZNAM ====================
      {
        name: 'addToShoppingList',
        description: 'POVINNĚ ZAVOLEJ tuto funkci kdykoli uživatel chce přidat položku na nákupní seznam. Bez zavolání se nic neuloží.',
        parameters: {
          type: 'OBJECT',
          properties: {
            items: {
              type: 'ARRAY',
              description: "Seznam věcí k přidání (např. ['mléko', 'rohlíky'])",
              items: { type: 'STRING' },
            },
          },
          required: ['items'],
        },
      },
      {
        name: 'getShoppingList',
        description: 'Vrátí aktuální obsah nákupního seznamu.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'clearShoppingList',
        description: 'Smaže celý nákupní seznam.',
        parameters: { type: 'OBJECT', properties: {} },
      },

      // ==================== KALENDÁŘ ====================
      {
        name: 'getCalendarEvents',
        description:
          'Vrátí události z kalendáře. Použij pro dotazy jako "co máme dnes/zítra/příští týden", "co je naplánováno".',
        parameters: {
          type: 'OBJECT',
          properties: {
            daysAhead: {
              type: 'NUMBER',
              description: 'Kolik dní dopředu zobrazit (výchozí: 7). Pro "dnes" použij 1.',
            },
            fromDate: {
              type: 'STRING',
              description:
                'Výchozí datum ve formátu YYYY-MM-DD, nebo "today"/"tomorrow". Výchozí: dnes.',
            },
          },
        },
      },
      {
        name: 'addCalendarEvent',
        description:
          'POVINNĚ ZAVOLEJ tuto funkci kdykoli uživatel chce přidat, naplánovat nebo zapsat událost do kalendáře. Toto je jediný způsob jak událost skutečně uložit. Bez zavolání této funkce se nic neuloží.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: {
              type: 'STRING',
              description: 'Název události (např. "Tanec", "Zubař", "Narozeniny")',
            },
            date: {
              type: 'STRING',
              description: 'Datum ve formátu YYYY-MM-DD. Dnešní datum je ' + new Date().toISOString().split('T')[0] + '. Zítřek si vypočítej sám.',
            },
            time: {
              type: 'STRING',
              description: 'Čas ve formátu HH:MM, např. "10:00". Pokud uživatel čas neřekl, vynech.',
            },
            memberName: {
              type: 'STRING',
              description: 'Jméno člena rodiny (např. "táta", "Johanka"). Volitelné.',
            },
          },
          required: ['title', 'date'],
        },
      },

      // ==================== SVÁTKY & NAROZENINY ====================
      {
        name: 'getNameday',
        description:
          'Zjistí kdo má svátek v konkrétní den. Použij pro "kdo má dnes svátek", "kdo má svátek 3. září", "kdy má svátek Petr".',
        parameters: {
          type: 'OBJECT',
          properties: {
            date: {
              type: 'STRING',
              description:
                'Datum ve formátu YYYY-MM-DD, nebo "today"/"dnes", nebo "tomorrow"/"zítra". Pro jméno použij D.M. formát (např. "3.9.").',
            },
          },
          required: ['date'],
        },
      },
      {
        name: 'getUpcomingBirthdays',
        description:
          'Vrátí nadcházející narozeniny členů rodiny. Použij pro "kdo má brzy narozeniny".',
        parameters: {
          type: 'OBJECT',
          properties: {
            daysAhead: {
              type: 'NUMBER',
              description: 'Kolik dní dopředu (výchozí: 30)',
            },
          },
        },
      },

      // ==================== MYČKA ====================
      {
        name: 'getDishwasherStatus',
        description:
          'Zjistí kdo je na řadě s myčkou a kdo myl naposledy. Použij pro dotazy jako "kdo má myčku", "kdo je na řadě s myčkou", "kdy se naposledy myla myčka".',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'markDishwasherDone',
        description:
          'POVINNĚ ZAVOLEJ tuto funkci když uživatel řekne že umyl nádobí, nebo chce označit myčku jako hotovou. Tato funkce posune řadu na dalšího člena rodiny.',
        parameters: { type: 'OBJECT', properties: {} },
      },

      // ==================== KUCHAŘKA / RECEPTY ====================
      {
        name: 'getRecipeList',
        description:
          'Vrátí seznam receptů v kuchařce. Použij pro dotazy jako "co máme v kuchařce", "jaké recepty máme", "co můžeme uvařit".',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'searchRecipes',
        description:
          'Hledá recept podle názvu nebo ingredience. Použij pro dotazy jako "máme recept na svíčkovou", "co uvaříme z kuřete", "najdi recept s těstovinami".',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: {
              type: 'STRING',
              description: 'Hledaný výraz — název jídla nebo ingredience (např. "kuře", "svíčková", "těstoviny")',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'getRecipeDetail',
        description:
          'Vrátí detail receptu včetně ingrediencí a doby přípravy. Použij když uživatel chce vědět co přesně je v receptu nebo jak ho připravit.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: {
              type: 'STRING',
              description: 'Název receptu (nebo jeho část), jehož detail chceme zobrazit.',
            },
          },
          required: ['name'],
        },
      },

    ],
  },
];
