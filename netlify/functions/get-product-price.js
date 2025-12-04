const axios = require('axios');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const productName = event.queryStringParameters.q;
  if (!productName) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Chybí dotaz' }) };

  console.log(`🔍 Hledám v Albert API: "${productName}"`);

  try {
    // 1. Zkusíme oficiální API Alberta (vrací krásný JSON)
    // Albert má API pro vyhledávání, které používá jejich aplikace
    const url = `https://www.albert.cz/api/campaigns/products?q=${encodeURIComponent(productName)}&page=0&limit=5`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
        'Referer': 'https://www.albert.cz/'
      },
      timeout: 5000
    });

    // Albert API vrací pole produktů
    const products = response.data;
    
    if (products && products.length > 0) {
      // Vezmeme první relevantní výsledek
      const item = products[0]; 
      
      // Vytáhneme cenu (může být v různých polích podle toho, zda je akce)
      // Cena bývá jako číslo (float), převedeme na string
      let currentPrice = item.price?.value || item.oldPrice?.value || 0;
      
      const result = {
        store: 'Albert',
        price: `${currentPrice},00 Kč`, // Formátování ceny
        img: item.images ? item.images[0]?.url : null,
        name: item.name
      };

      console.log(`✅ Nalezeno v Albertu: ${result.name} za ${result.price}`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    } else {
      console.log('⚠️ Albert nic nenašel, zkusíme Fallback.');
      throw new Error("Nenalezeno v API");
    }

  } catch (error) {
    console.error('⚠️ Chyba nebo blokace:', error.message);
    
    // --- FALLBACK / DEMO REŽIM ---
    // Aby ti dashboard neházel chyby, když jsi v USA a Albert tě blokne,
    // vrátíme "falešnou" cenu. Doma v ČR ti to pak může fungovat napřímo, 
    // nebo si tuto část můžeš nechat pro testování UI.
    
    console.log("👉 Aktivuji DEMO data pro testování UI");
    
    // Generování náhodné "uvěřitelné" ceny
    const randomPrice = (Math.random() * 30 + 15).toFixed(2).replace('.', ',');
    
    return {
      statusCode: 200, // Vracíme 200 OK, aby frontend neřval
      headers,
      body: JSON.stringify({
        store: 'Kaufland (Demo)', // Poznámka (Demo), ať víš, že to není real
        price: `${randomPrice} Kč`,
        name: productName
      })
    };
  }
};
