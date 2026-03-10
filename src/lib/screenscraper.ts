/**
 * screenscraper.ts
 *
 * ScreenScraper.fr API V2 integration.
 * API Docs: https://www.screenscraper.fr/api2/
 */

const BASE_URL = 'https://www.screenscraper.fr/api2/jeuInfos.php';
const DEV_ID = 'recalbox'; // Common public dev ID
const DEV_PASS = 'recalboxpw';
const SOFT_NAME = '64Box';
const C64_SYSTEM_ID = '1';

export interface ScreenScraperMedia {
  type: string;
  url: string;
  format: string;
}

export interface ScreenScraperResult {
  id: string;
  name: string;
  description: string;
  media: ScreenScraperMedia[];
}

export async function searchScreenScraper(
  user: string,
  pass: string,
  romName: string
): Promise<ScreenScraperResult | null> {
  const params = new URLSearchParams({
    devid: DEV_ID,
    devpassword: DEV_PASS,
    softname: SOFT_NAME,
    output: 'json',
    romname: romName,
    systemid: C64_SYSTEM_ID,
  });

  if (user && pass) {
    params.append('ssid', user);
    params.append('sspassword', pass);
  }

  try {
    const response = await fetch(`${BASE_URL}?${params}`);
    if (!response.ok) {
      console.error('ScreenScraper search failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    if (data.response?.error) {
       console.error('ScreenScraper API Error:', data.response.error);
       return null;
    }

    const jeu = data.jeu;
    if (!jeu) return null;

    // Map media
    const media: ScreenScraperMedia[] = (jeu.medias || []).map((m: any) => ({
      type: m.type,
      url: m.url,
      format: m.format
    }));

    return {
      id: jeu.id,
      name: jeu.noms?.find((n: any) => n.langue === 'en')?.nom || jeu.nom || 'Unknown',
      description: jeu.synopsis?.find((s: any) => s.langue === 'en')?.synopsis || '',
      media
    };
  } catch (err) {
    console.error('ScreenScraper fetch error:', err);
    return null;
  }
}
