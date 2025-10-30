// src/api/unsplash.ts
import { createApi } from 'unsplash-js';
import { configService } from '../services/configService';

let unsplashClient: ReturnType<typeof createApi> | null = null;

/**
 * Inicializuje Unsplash klienta s API klíčem z Firebase
 */
async function getUnsplashClient() {
  if (unsplashClient) {
    return unsplashClient;
  }

  try {
    const accessKey = await configService.getApiKey('unsplash');

    if (!accessKey) {
      throw new Error('Unsplash API klíč není dostupný');
    }

    unsplashClient = createApi({
      accessKey,
    });

    return unsplashClient;
  } catch (error) {
    console.error('❌ Nepodařilo se inicializovat Unsplash klienta:', error);
    throw error;
  }
}

export const fetchImageForQuery = async (
  query: string
): Promise<string | null> => {
  try {
    const unsplash = await getUnsplashClient();

    const result = await unsplash.search.getPhotos({
      query: query,
      page: 1,
      perPage: 5, // Získáme 5 obrázků, abychom měli z čeho vybrat
      orientation: 'landscape', // Chceme obrázky na šířku pro hlavičku
    });

    if (result.response && result.response.results.length > 0) {
      // Z výsledků vybereme náhodný obrázek
      const randomIndex = Math.floor(
        Math.random() * result.response.results.length
      );
      const randomPhoto = result.response.results[randomIndex];
      // Vrátíme optimalizovaný obrázek (WebP, 1200x400, kvalita 80)
      // Parametry: w=šířka, h=výška, fit=crop (ořízne), q=kvalita, fm=webp (formát)
      return `${randomPhoto.urls.raw}&w=1200&h=400&fit=crop&q=80&fm=webp`;
    }
    return null;
  } catch (error) {
    console.error('Chyba při načítání obrázku z Unsplash:', error);
    return null;
  }
};
