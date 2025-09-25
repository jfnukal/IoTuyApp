import { createApi } from 'unsplash-js';

const unsplash = createApi({
  accessKey: import.meta.env.VITE_UNSPLASH_ACCESS_KEY!,
});

export const fetchImageForQuery = async (query: string): Promise<string | null> => {
  try {
    const result = await unsplash.search.getPhotos({
      query: query,
      page: 1,
      perPage: 5, // Získáme 5 obrázků, abychom měli z čeho vybrat
      orientation: 'landscape', // Chceme obrázky na šířku pro hlavičku
    });

    if (result.response && result.response.results.length > 0) {
      // Z výsledků vybereme náhodný obrázek
      const randomIndex = Math.floor(Math.random() * result.response.results.length);
      const randomPhoto = result.response.results[randomIndex];
      // Vrátíme URL obrázku v "regular" velikosti
      return randomPhoto.urls.regular;
    }
    return null;
  } catch (error) {
    console.error("Chyba při načítání obrázku z Unsplash:", error);
    return null;
  }
};