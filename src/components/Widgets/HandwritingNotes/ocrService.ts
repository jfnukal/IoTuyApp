// src/plugins/HandwritingNotes/ocrService.ts
import { configService } from '../../../services/configService';

export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
}

class OCRService {
  private readonly VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';
  private apiKey: string | null = null;

  constructor() {
    this.loadApiKey();
  }

  private async loadApiKey(): Promise<void> {
    try {
      // Použijeme tvůj configService pro načtení API klíče
      this.apiKey = await configService.getApiKey('google_vision');
    } catch (error) {
      console.error('❌ Nepodařilo se načíst Google Vision API klíč:', error);
    }
  }

  private async ensureApiKey(): Promise<string> {
    if (!this.apiKey) {
      this.apiKey = await configService.getApiKey('google_vision');
    }
    if (!this.apiKey) {
      throw new Error('Google Vision API klíč není dostupný');
    }
    return this.apiKey;
  }

  /**
   * Rozpozná text z obrázku (base64)
   */
  async recognizeText(base64Image: string): Promise<OCRResult> {
    try {
      const apiKey = await this.ensureApiKey();

      // Odstranění data URL prefixu (data:image/png;base64,)
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

      const requestBody = {
        requests: [
          {
            image: {
              content: cleanBase64,
            },
            features: [
              {
                type: 'DOCUMENT_TEXT_DETECTION', // Nejlepší pro rukopis
                maxResults: 1,
              },
            ],
            imageContext: {
              languageHints: ['cs', 'en'], // Čeština a angličtina
            },
          },
        ],
      };

      const response = await fetch(`${this.VISION_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Vision API Error: ${response.status}`);
      }

      const data = await response.json();

      // Kontrola chyb
      if (data.responses[0].error) {
        throw new Error(`Vision API: ${data.responses[0].error.message}`);
      }

      // Extrakce textu
      const textAnnotations = data.responses[0].textAnnotations;

      if (!textAnnotations || textAnnotations.length === 0) {
        return {
          text: '',
          confidence: 0,
          language: 'unknown',
        };
      }

      // První annotation obsahuje celý text
      const fullText = textAnnotations[0].description;
      
      // Výpočet průměrné confidence
      const avgConfidence = textAnnotations.length > 1
        ? textAnnotations.slice(1).reduce((sum: number, ann: any) => sum + (ann.confidence || 0), 0) / (textAnnotations.length - 1)
        : 0;

      // Detekce jazyka
      const detectedLanguage = textAnnotations[0].locale || 'cs';

      return {
        text: fullText,
        confidence: Math.round(avgConfidence * 100),
        language: detectedLanguage,
      };

    } catch (error) {
      console.error('❌ Chyba při OCR:', error);
      throw error;
    }
  }

  /**
   * Rozpozná text a kategorizuje typ (poznámka vs nákupní seznam)
   */
  async recognizeAndCategorize(base64Image: string): Promise<{
    text: string;
    type: 'note' | 'shopping';
    confidence: number;
  }> {
    const result = await this.recognizeText(base64Image);

    // Jednoduchá kategorizace podle klíčových slov
    const shoppingKeywords = [
      'koupit', 'nakoupit', 'nákup', 'obchod', 'kg', 'ks', 'litr',
      'mléko', 'chleba', 'máslo', 'vejce', 'zelenina', 'ovoce',
      'buy', 'shop', 'store', 'milk', 'bread', 'eggs',
    ];

    const lowerText = result.text.toLowerCase();
    const isShopping = shoppingKeywords.some(keyword => lowerText.includes(keyword));

    return {
      text: result.text,
      type: isShopping ? 'shopping' : 'note',
      confidence: result.confidence,
    };
  }
}

export const ocrService = new OCRService();