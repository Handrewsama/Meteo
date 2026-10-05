import { CONFIG } from "./config.js";
import { json } from "./utils.js";
import { getMeteoclimatic } from "./meteoclimatic.js";
import { getWeathercloud } from "./weathercloud.js";
import { addHistoryPoint, calculateStationRainWindow } from "./history.js";
import { calculateZoneSituation } from "./risk.js";
import { calculateSummary } from "./summary.js";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return json({}, 204);

    if (request.method !== "GET") {
      return json({ ok: false, error: "Only GET supported" }, 405);
    }

    const url = new URL(request.url);

    if (url.pathname === "/diagnostic") {
      const [meteoclimatic, weathercloud] = await Promise.all([
        getMeteoclimatic(),
        getWeathercloud()
      ]);

      return json({
        ok: true,
        updated: new Date().toISOString(),
        sources: { meteoclimatic, weathercloud }
      });
    }

    if (url.pathname === "/source/meteoclimatic") {
      return json({
        ok: true,
        source: "Meteoclimatic",
        updated: new Date().toISOString(),
        stations: await getMeteoclimatic()
      });
    }

    if (url.pathname === "/source/weathercloud") {
      return json({
        ok: true,
        source: "Weathercloud",
        updated: new Date().toISOString(),
        stations: await getWeathercloud()
      });
    }

    const [meteoclimatic, weathercloud] = await Promise.all([
      getMeteoclimatic(),
      getWeathercloud()
    ]);

    const stations = [...meteoclimatic, ...weathercloud];
    const summary = calculateSummary(stations);

    const history = await addHistoryPoint(env, stations);

    const rain10 = calculateStationRainWindow(history, 10);
    const rain30 = calculateStationRainWindow(history, 30);
    const rain60 = calculateStationRainWindow(history, 60);
    const rain180 = calculateStationRainWindow(history, 180);

    const zones = stations.map(station => {
      const key = `${station.source}:${station.id}`;

      const r10 = rain10.find(x => `${x.source}:${x.id}` === key);
      const r30 = rain30.find(x => `${x.source}:${x.id}` === key);
      const r60 = rain60.find(x => `${x.source}:${x.id}` === key);
      const r180 = rain180.find(x => `${x.source}:${x.id}` === key);

      return {
        id: station.id,
        name: station.name,
        source: station.source,
        rainToday: station.rainToday ?? null,
        rain10min: r10?.rain ?? null,
        rain30min: r30?.rain ?? null,
        rain1h: r60?.rain ?? null,
        rain3h: r180?.rain ?? null,
        situation: calculateZoneSituation(
          r10?.rain ?? 0,
          r30?.rain ?? 0,
          r60?.rain ?? 0,
          r180?.rain ?? 0
        )
      };
    });

    return json({
      ok: true,
      updated: new Date().toISOString(),
      summary,
      zones,
      precipitation: {
        rain10min: rain10,
        rain30min: rain30,
        rain1h: rain60,
        rain3h: rain180
      },
      stations
    });
  }
};
