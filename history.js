import { CONFIG } from "./config.js";
import { median } from "./utils.js";

export async function loadHistory(env) {
  if (!env.METEO_KV) return [];
  try {
    const data = await env.METEO_KV.get(CONFIG.history.key, "json");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("KV read error:", error);
    return [];
  }
}

export async function saveHistory(env, history) {
  if (!env.METEO_KV) return false;
  try {
    await env.METEO_KV.put(CONFIG.history.key, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error("KV write error:", error);
    return false;
  }
}

export async function addHistoryPoint(env, stations) {
  const history = await loadHistory(env);
  const now = Date.now();

  history.push({
    timestamp: new Date(now).toISOString(),
    epoch: now,
    stations: stations.map(station => ({
      id: station.id,
      name: station.name,
      source: station.source,
      priority: station.priority ?? null,
      ok: station.ok === true,
      rainToday: Number.isFinite(station.rainToday) ? station.rainToday : null,
      rainNow: Number.isFinite(station.rainNow) ? station.rainNow : null,
      rainrate: Number.isFinite(station.rainrate) ? station.rainrate : null,
      timestamp: station.timestamp ?? null
    }))
  });

  const cutoff = now - CONFIG.history.minutes * 60 * 1000;
  const filtered = history.filter(item => item.epoch >= cutoff);
  await saveHistory(env, filtered);
  return filtered;
}

export function findHistoryPoint(history, targetEpoch) {
  if (!history.length) return null;
  let closest = history[0];
  let difference = Math.abs(history[0].epoch - targetEpoch);

  for (const point of history) {
    const d = Math.abs(point.epoch - targetEpoch);
    if (d < difference) {
      closest = point;
      difference = d;
    }
  }
  return closest;
}

export function historyMedian(point) {
  if (!point?.stations) return null;
  return median(point.stations.map(s => s.rainToday).filter(Number.isFinite));
}

export function calculateStationRainWindow(history, minutes) {
  if (history.length < 2) return [];
  const latest = history[history.length - 1];
  const previous = findHistoryPoint(history, latest.epoch - minutes * 60 * 1000);
  if (!previous) return [];

  const previousMap = new Map();
  for (const station of previous.stations || []) {
    previousMap.set(`${station.source}:${station.id}`, station);
  }

  const results = [];
  for (const station of latest.stations || []) {
    const key = `${station.source}:${station.id}`;
    const oldStation = previousMap.get(key);
    if (!oldStation) continue;

    const currentRain = Number.isFinite(station.rainToday) ? station.rainToday : null;
    const previousRain = Number.isFinite(oldStation.rainToday) ? oldStation.rainToday : null;
    if (currentRain === null || previousRain === null) continue;

    const rain = Math.max(0, currentRain - previousRain);

    results.push({
      id: station.id,
      name: station.name,
      source: station.source,
      priority: station.priority ?? null,
      rain: Number(rain.toFixed(2)),
      mmPerHour: Number((rain * 60 / minutes).toFixed(2)),
      currentRainToday: currentRain,
      previousRainToday: previousRain
    });
  }
  return results;
}
