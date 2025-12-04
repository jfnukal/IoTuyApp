//src/api/pricesAPI.ts
interface PriceResult {
  store: string;
  price: string;
  url: string;
}

export const checkProductPrice = async (productName: string): Promise<PriceResult | null> => {
  try {
    // Volání tvé nové Netlify funkce
    // V dev mode to bude localhost, v produkci relativní cesta
    const response = await fetch(`/.netlify/functions/get-product-price?q=${encodeURIComponent(productName)}`);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Chyba při zjišťování ceny:", error);
    return null;
  }
};