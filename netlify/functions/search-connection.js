const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

exports.handler = async function (event, context) {
  const { from, to } = event.queryStringParameters;

  if (!from || !to) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Chybí parametry "from" a "to"' }),
    };
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    const searchUrl = `https://idos.idnes.cz/vlakyautobusymhd/spojeni/vysledky/?f=${encodeURIComponent(from)}&t=${encodeURIComponent(to)}`;
    
    await page.goto(searchUrl, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });

    // Počkej na načtení spojení
    await page.waitForSelector('.connection, .result', { timeout: 10000 }).catch(() => null);

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

    if (!firstConnection) {
      return { 
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Spojení nenalezeno' }) 
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firstConnection),
    };

  } catch (error) {
    console.error('Scraper error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Chyba při scrapingu',
        details: error.message 
      }),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};