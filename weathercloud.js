import { CONFIG } from "./config.js";
import { parseNumber } from "./utils.js";

export async function getWeathercloud() {
  const results = [];
  for (const station of CONFIG.weathercloud) {
    try {
      const response = await fetch(`https://app.weathercloud.net/device/values?code=${station.id}`, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json,text/plain,*/*" }
      });
      const text = await response.text();

      if (!text?.trim()) {
        results.push({ source: "Weathercloud", id: station.id, name: station.name, ok: false, available: false, error: "Resposta buida" });
        continue;
      }

      let data;
      try { data = JSON.parse(text); }
      catch {
        results.push({ source: "Weathercloud", id: station.id, name: station.name, ok: false, available: false, error: "Resposta no JSON" });
        continue;
      }

      const epoch = parseNumber(data.epoch);
      results.push({
        source: "Weathercloud",
        id: station.id,
        name: station.name,
        ok: true,
        available: true,
        rain: parseNumber(data.rain),
        rainToday: parseNumber(data.rain),
        rainrate: parseNumber(data.rainrate),
        timestamp: epoch ? new Date(epoch * 1000).toISOString() : null,
        epoch
      });
    } catch (error) {
      results.push({ source: "Weathercloud", id: station.id, name: station.name, ok: false, available: false, error: String(error) });
    }
  }
  return results;
}
