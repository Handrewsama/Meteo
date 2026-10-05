import { CONFIG } from "./config.js";
import { parseNumber, cleanHtml } from "./utils.js";

function extractRainToday(clean) {
  const precipIndex = clean.search(/Precip\./i);
  if (precipIndex < 0) return null;
  const section = clean.substring(precipIndex, precipIndex + 1800);

  const hoyMatches = [...section.matchAll(/\bHoy\b[\s\S]{0,120}?(\d+(?:[.,]\d+)?)\s*(?:mm)?/gi)];
  if (hoyMatches.length) {
    const value = parseNumber(hoyMatches[hoyMatches.length - 1][1]);
    if (value !== null) return value;
  }

  const hoyPositions = [...section.matchAll(/\bHoy\b/gi)];
  const lastHoy = hoyPositions.length ? hoyPositions[hoyPositions.length - 1].index : -1;

  if (lastHoy >= 0) {
    const afterHoy = section.substring(lastHoy);
    const mesIndex = afterHoy.search(/\bMes\b/i);
    if (mesIndex >= 0) {
      const numbers = afterHoy.substring(0, mesIndex).match(/\d+(?:[.,]\d+)?/g);
      if (numbers?.length) return parseNumber(numbers[numbers.length - 1]);
    }
  }
  return null;
}

function extractRainNow(clean) {
  const index = clean.search(/Precip\./i);
  if (index < 0) return null;
  const match = clean.substring(index, index + 500)
    .match(/Precip\.\s*(?:Dias\s+Sequia\s*)?(\d+(?:[.,]\d+)?)/i);
  return match ? parseNumber(match[1]) : null;
}

function extractUpdate(clean) {
  const match = clean.match(/Última actualización\s+(\d{1,2}-\d{1,2}-\d{4}\s+\d{1,2}:\d{2})\s*UTC/i);
  return match ? `${match[1]} UTC` : null;
}

export async function getMeteoclimatic() {
  const results = [];
  for (const station of CONFIG.meteoclimatic) {
    try {
      const response = await fetch(`https://www.meteoclimatic.net/perfil/${station.id}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BadalonaMeteo/1.0)",
          "Accept": "text/html,application/xhtml+xml"
        }
      });

      if (!response.ok) {
        results.push({ source: "Meteoclimatic", id: station.id, name: station.name, ok: false, error: `HTTP ${response.status}` });
        continue;
      }

      const html = await response.text();
      if (!html || html.length < 100) {
        results.push({ source: "Meteoclimatic", id: station.id, name: station.name, ok: false, error: "HTML buit o massa curt" });
        continue;
      }

      const clean = cleanHtml(html);
      const rainToday = extractRainToday(clean);

      results.push({
        source: "Meteoclimatic",
        id: station.id,
        name: station.name,
        ok: true,
        rainToday,
        rainNow: extractRainNow(clean),
        rain: rainToday,
        rainrate: null,
        timestamp: extractUpdate(clean),
        priority: station.priority,
        rawAvailable: true,
        parser: "meteoclimatic-v3"
      });
    } catch (error) {
      results.push({ source: "Meteoclimatic", id: station.id, name: station.name, ok: false, error: String(error) });
    }
  }
  return results;
}
