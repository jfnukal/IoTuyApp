// netlify/functions/search-connection.js
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { from, to } = event.queryStringParameters || {};

  if (!from || !to) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Chybí parametry "from" a "to"' }),
    };
  }

  let browser = null;

  try {
    console.log('🚀 Spouštím Puppeteer...');
    
    // Optimalizace pro Netlify
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-sandbox',
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    // Blokujeme obrázky a CSS pro rychlejší načítání
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    const searchUrl = `https://idos.idnes.cz/vlakyautobusymhd/spojeni/vysledky/?f=${encodeURIComponent(from)}&t=${encodeURIComponent(to)}`;
    
    console.log('🔍 Načítám:', searchUrl);
    
    await page.goto(searchUrl, { 
      waitUntil: 'domcontentloaded', 
      timeout: 25000 
    });

    // Počkej na načtení spojení
    await page.waitForSelector('.connection, .result', { timeout: 8000 }).catch(() => null);

    const firstConnection = await page.evaluate(() => {
      const connElement = document.querySelector('.connection') || 
                          document.querySelector('[data-connection]') ||
                          document.querySelector('.result');
      
      if (!connElement) return null;

      const departure = connElement.querySelector('.departure, [data-departure], .time-departure');
      const arrival = connElement.querySelector('.arrival, [data-arrival], .time-arrival');
      const line = connElement.querySelector('.line, [data-line], .connection-line');

      return {
        departureTime: departure?.innerText?.trim() || 'N/A',
        arrivalTime: arrival?.innerText?.trim() || 'N/A',
        line: line?.innerText?.trim() || 'N/A',
      };
    });

    await browser.close();
    browser = null;

    if (!firstConnection) {
      return { 
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Spojení nenalezeno' }) 
      };
    }

    console.log('✅ Spojení nalezeno:', firstConnection);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(firstConnection),
    };

  } catch (error) {
    console.error('❌ Scraper error:', error);
    
    if (browser) {
      await browser.close().catch(() => {});
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Chyba při scrapingu',
        details: error.message 
      }),
    };
  }
};
