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
  // CACHE - klíč podle dotazu
  const cacheKey = `unsplash_${query.replace(/\s+/g, '_')}`;
  const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hodin v ms

  // Zkusit načíst z cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { url, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > cacheExpiry;
      
      if (!isExpired && url) {
        console.log('📷 Unsplash: použita cache pro', query);
        return url;
      }
    }
  } catch (e) {
    // Cache error - pokračujeme bez cache
  }

  // Načíst z API (původní kód)
  try {
    const unsplash = await getUnsplashClient();

    const result = await unsplash.search.getPhotos({
      query: query,
      page: 1,
      perPage: 5,
      orientation: 'landscape',
    });

    if (result.response && result.response.results.length > 0) {
      const randomIndex = Math.floor(
        Math.random() * result.response.results.length
      );
      const randomPhoto = result.response.results[randomIndex];
      // 🆕 Snížená kvalita pro rychlejší načítání
      const imageUrl = `${randomPhoto.urls.raw}&w=800&h=300&fit=crop&q=70&fm=webp`;

      // 🆕 Uložit do cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          url: imageUrl,
          timestamp: Date.now()
        }));
        console.log('📷 Unsplash: uloženo do cache', query);
      } catch (e) {
        // localStorage plný - ignorujeme
      }

      return imageUrl;
    }
    return null;
  } catch (error) {
    console.error('Chyba při načítání obrázku z Unsplash:', error);
    return null;
  }
};
