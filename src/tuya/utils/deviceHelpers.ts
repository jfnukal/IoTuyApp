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
  'sp': 'doorbell',       // Video zvonek 🔔
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
 * Zjistí typ karty podle kategorie zařízení
 */
export const getDeviceCardType = (category: string): string => {
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
 * Tuya ukládá snapshot jako base64 encoded JSON v movement_detect_pic nebo doorbell_pic
 */
 export const getDoorbellSnapshotUrl = (
  status: Array<{ code: string; value: any }> | null | undefined
): string | undefined => {
  if (!status || status.length === 0) return undefined;

  // Hledáme tyto kódy (v pořadí priority)
  const snapshotCodes = ['doorbell_pic', 'movement_detect_pic', 'alarm_message'];

  for (const code of snapshotCodes) {
    const value = getStatusValue(status, code);
    
    if (!value || value === '') continue;

    try {
      // Dekóduj base64
      const decoded = atob(value);
      const data = JSON.parse(decoded);

      console.log(`📸 Dekódovaná data z ${code}:`, data);

      // Extrahuj URL z JSON struktury
      if (data.files && Array.isArray(data.files) && data.files.length > 0) {
        const fileInfo = data.files[0];
        
        // Může být array [url, ""] nebo string
        let relativePath = Array.isArray(fileInfo) ? fileInfo[0] : fileInfo;
        
        if (relativePath && typeof relativePath === 'string') {
          // Pokud obsahuje bucket info, sestav plnou URL
          if (data.bucket) {
            // Tuya EU storage URL
            const baseUrl = `https://${data.bucket}.s3.eu-central-1.amazonaws.com`;
            const fullUrl = relativePath.startsWith('http') 
              ? relativePath 
              : `${baseUrl}${relativePath}`;
            
            console.log(`✅ Snapshot URL nalezena: ${fullUrl}`);
            return fullUrl;
          }
          
          // Už je to plná URL
          if (relativePath.startsWith('http')) {
            console.log(`✅ Snapshot URL nalezena: ${relativePath}`);
            return relativePath;
          }
        }
      }

      // Zkus další formát (někdy je URL přímo v data.url)
      if (data.url && typeof data.url === 'string') {
        console.log(`✅ Snapshot URL nalezena: ${data.url}`);
        return data.url;
      }

    } catch (error) {
      console.warn(`⚠️ Nepodařilo se dekódovat ${code}:`, error);
      continue;
    }
  }

  console.warn('⚠️ Snapshot URL nenalezena v žádném z kódů');
  return undefined;
};
