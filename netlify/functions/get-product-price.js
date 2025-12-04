//netlify/functions/get-product-price.js
const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function(event, context) {
  // Povolení volání odkudkoliv (nebo specifikuj svou doménu)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Rychlá odpověď pro pre-flight requesty
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const productName = event.queryStringParameters.q;

  if (!productName) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Chybí parametr q' })
    };
  }

  try {
    const url = `https://www.kupi.cz/hledat?q=${encodeURIComponent(productName)}`;
    
    // Tváříme se jako prohlížeč
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': 'https://www.kupi.cz/'
      },
      timeout: 8000 // 8 sekund timeout
    });

    const $ = cheerio.load(data);
    let bestDeal = null;

    $('.discount_card').each((i, el) => {
      if (bestDeal) return;
      
      const storeName = $(el).find('.shop_logo').attr('alt');
      let price = $(el).find('.price_value').text().trim();
      
      if (!price) {
          price = $(el).find('.price_box strong').text().trim();
      }

      if (storeName && price) {
        bestDeal = {
          store: storeName,
          price: price.replace(/\s+/g, ' '),
        };
      }
    });

    if (bestDeal) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(bestDeal)
      };
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Nenalezeno' })
      };
    }

  } catch (error) {
    console.error('Scraping error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Chyba při získávání dat' })
    };
  }
};