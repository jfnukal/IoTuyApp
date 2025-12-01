// src/tuya/utils/deviceHelpers.ts

/**
 * Mapování Tuya kategorií na naše interní typy
 */
 export const DEVICE_CATEGORY_MAP: Record<string, string> = {
  'wk': 'heating',        // Topení
  'kg': 'multi_switch',   // 2-gang switch (světlo chodba)
  'dj': 'smart_light',    // Chytré světlo s jasem
  'cz': 'multi_socket',   // Multi-zásuvka
  'wsdcg': 'temp_sensor', // Teplotní senzor
  'pir': 'motion_sensor', // PIR senzor
  'mcs': 'door_sensor',   // Dveřní senzor
  'wfcon': 'gateway',     // Zigbee Gateway
  'sfkzq': 'valve',       // Ventil zavlažování
  'zwjcy': 'soil_sensor', // Půdní senzor
 // 'sp': 'doorbell',       // Video zvonek 🔔 // 'sp': rozlišuje se v getDeviceCardType() podle product_id  
};

/**
 * Mapování Tuya kategorií na české názvy pro zobrazení
 */
 export const DEVICE_CATEGORY_LABELS: Record<string, string> = {
  'wk': 'Topení',
  'wkcz': 'Bojler',
  'kg': 'Vypínač',
  'dj': 'Chytré světlo',
  'cz': 'Zásuvka',
  'pc': 'Zásuvka',
  'wsdcg': 'Teplotní senzor',
  'pir': 'PIR senzor',
  'mcs': 'Dveřní senzor',
  'wfcon': 'Zigbee Gateway',
  'sfkzq': 'Ventil',
  'zwjcy': 'Půdní senzor',
  'sp': 'Kamera',
};

/**
 * Získá český název kategorie
 */
export const getCategoryLabel = (category: string): string => {
  return DEVICE_CATEGORY_LABELS[category] || category;
};

/**
 * Převod teploty z Tuya formátu (235 → 23.5°C)
 */
export const formatTemperature = (value: number): number => {
  return value / 10;
};

/**
 * Převod jasu z Tuya formátu (1000 → 100%)
 */
export const formatBrightness = (value: number): number => {
  return Math.round((value / 1000) * 100);
};

/**
 * Zjistí typ karty podle kategorie zařízení a product_id
 */
 export const getDeviceCardType = (category: string, productId?: string): string => {
  // Speciální případ: kategorie 'sp' může být doorbell NEBO kamera
  if (category === 'sp' && productId) {
    // Doorbell produkty
    if (productId === 'kzatr9ohaiy4iokw') {
      return 'doorbell';
    }
    // PTZ Camera produkty
    if (productId === '2aancrpmmj91oxqb') {
      return 'ptz_camera';
    }
  }
  
  return DEVICE_CATEGORY_MAP[category] || 'basic';
};

/**
 * Ikony podle typu karty
 */
export const getCardIcon = (cardType: string): string => {
  const icons: Record<string, string> = {
    'heating': '🔥',
    'multi_switch': '💡',
    'smart_light': '💡',
    'multi_socket': '🔌',
    'temp_sensor': '🌡️',
    'motion_sensor': '👁️',
    'door_sensor': '🚪',
    'gateway': '🌐',
    'valve': '💧',
    'soil_sensor': '🌱',
    'doorbell': '🔔',
    'ptz_camera': '📹', 
    'climate': '❄️',   
    'security': '🔒',  
    'cover': '🪟',     
    'garden': '🌱',    
    'switch': '🔌',    
    'light': '💡',     
    'sensor': '📡',    
    'basic': '⚙️',
  };
  return icons[cardType] || '⚙️';
};

/**
 * Najde hodnotu status kódu
 */
 export const getStatusValue = (
  status: Array<{ code: string; value: any }> | null | undefined,
  code: string
): any => {
  if (!status || status.length === 0) return undefined;
  const found = status.find((s) => s.code === code);
  return found?.value;
};

/**
 * Najde hodnotu status kódu - zkusí více variant názvů
 */
 export const getStatusValueMultiple = (
  status: Array<{ code: string; value: any }> | null | undefined,
  codes: string[]
): any => {
  if (!status || status.length === 0) return undefined;
  
  // Zkus všechny varianty kódů
  for (const code of codes) {
    const found = status.find((s) => s.code === code);
    if (found !== undefined) return found.value;
  }
  
  return undefined;
};

/**
 * Univerzální funkce pro získání teploty (podporuje všechny varianty)
 */
export const getTemperature = (
  status: Array<{ code: string; value: any }> | null | undefined
): number | undefined => {
  const tempRaw = getStatusValueMultiple(status, [
    'va_temperature',    // Čínské senzory
    'temp_current',      // Standardní Tuya
    'temperature',       // Alternativa
    'temp_value',        // Další varianta
  ]);
  
  return tempRaw !== undefined ? formatTemperature(tempRaw) : undefined;
};

/**
 * Univerzální funkce pro získání vlhkosti (podporuje všechny varianty)
 */
export const getHumidity = (
  status: Array<{ code: string; value: any }> | null | undefined
): number | undefined => {
  const humidityRaw = getStatusValueMultiple(status, [
    'va_humidity',       // Čínské senzory
    'humidity_value',    // Standardní Tuya
    'humidity',          // Alternativa
    'humid_value',       // Další varianta
  ]);
  
  // Pokud je hodnota > 100, formátuj jako teplotu (587 → 58.7%)
  // Pokud je <= 100, vrať rovnou (je už v procentech)
  if (humidityRaw === undefined) return undefined;
  return humidityRaw > 100 ? formatTemperature(humidityRaw) : humidityRaw;
};

/**
 * Univerzální funkce pro získání baterie (podporuje všechny varianty)
 */
export const getBattery = (
  status: Array<{ code: string; value: any }> | null | undefined
): number | undefined => {
  return getStatusValueMultiple(status, [
    'battery_percentage', // Standardní
    'battery',            // Alternativa
    'battery_value',      // Další varianta
    'va_battery',         // Čínská varianta
  ]);
};

/**
 * Dekóduje snapshot URL z Tuya doorbell
 */
export const getDoorbellSnapshotUrl = (
  status: Array<{ code: string; value: any }> | null | undefined
): string | undefined => {
  if (!status || status.length === 0) return undefined;

  const value = getStatusValue(status, 'movement_detect_pic');
  
  if (!value || value === '') {
    return undefined;
  }

  try {
    const decoded = atob(value);
    const data = JSON.parse(decoded);

    if (data.files && Array.isArray(data.files) && data.files.length > 0) {
      const fileInfo = data.files[0];
      let relativePath = Array.isArray(fileInfo) ? fileInfo[0] : fileInfo;
      
      if (relativePath && typeof relativePath === 'string') {
        // Pokud už je to plná URL
        if (relativePath.startsWith('http')) {
          return relativePath;
        }

        // Sestav plnou URL s AWS S3
        return `https://${data.bucket}.s3.eu-central-1.amazonaws.com${relativePath}`;
      }
    }

  } catch (error) {
    // Tiché selhání - snapshot prostě nebude k dispozici
  }

  return undefined;
};