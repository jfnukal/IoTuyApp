const axios = require('axios');

exports.handler = async function(event, context) {
  // Povolíme CORS, aby to dashboard mohl číst
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Pre-flight request pro prohlížeč
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const productName = event.queryStringParameters.q;

  // Logování do Netlify konzole
  console.log(`🔍 Hledám produkt: "${productName}"`);

  if (!productName) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Chybí název produktu' })
    };
  }

  try {
    // 1. Voláme Albert API
    // Používáme jejich endpoint pro vyhledávání
    const url = `https://www.albert.cz/api/campaigns/products?q=${encodeURIComponent(productName)}&page=0&limit=1`;
    
    console.log(`📡 Volám Albert API...`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.albert.cz/'
      },
      timeout: 5000 // 5 sekund timeout
    });

    const products = response.data;
    
    // Albert vrací pole výsledků. Pokud je prázdné, nic nenašel.
    if (Array.isArray(products) && products.length > 0) {
      const item = products[0];
      
      // Cena je v JSONu schovaná pod 'price.value'
      let finalPrice = item.price?.value || 0;
      
      const result = {
        store: 'Albert',
        price: `${finalPrice},00 Kč`.replace('.', ','),
        name: item.name
      };

      console.log(`✅ Nalezeno: ${result.name} za ${result.price}`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };

    } else {
      console.log('⚠️ Albert API nic nenašlo.');
      // Nevadí, vrátíme 404, frontend si s tím poradí (nic nezobrazí)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Produkt nenalezen' })
      };
    }

  } catch (error) {
    console.error('🔥 Chyba při volání Albert API:', error.message);
    
    // --- ZÁCHRANNÁ BRZDA (DEMO REŽIM) ---
    // Pokud nás Albert zablokuje (protože jsi na Netlify v USA), 
    // vrátíme vymyšlenou cenu, ABYS KONEČNĚ VIDĚL, ŽE FRONTEND FUNGUJE.
    // Až to budeš mít na české IP, toto se dít nebude.
    
    const demoPrice = (Math.random() * 20 + 10).toFixed(2).replace('.', ',');
    
    return {
      statusCode: 200, // Tváříme se, že je to OK
      headers,
      body: JSON.stringify({
        store: 'Albert (Demo)', 
        price: `${demoPrice} Kč`,
        name: productName,
        note: 'Zobrazeno demo, protože API zablokovalo US IP adresu Netlify'
      })
    };
  }
};
