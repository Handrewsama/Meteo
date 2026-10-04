const STATIONS = [
  { id: "8575692672", name: "Badalona", source: "Weathercloud" },
  { id: "1033247952", name: "Salvador Espriu", source: "Weathercloud" },
  { id: "0113601253", name: "Torre Mena", source: "Weathercloud" },
  { id: "3460315932", name: "La Salut", source: "Weathercloud" }
];

const MAX_AGE_MINUTES = 30;

function median(values) {
  if (!values.length) return null;

  const a = [...values].sort((x, y) => x - y);
  const middle = Math.floor(a.length / 2);

  if (a.length % 2) {
    return a[middle];
  }

  return (a[middle - 1] + a[middle]) / 2;
}

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    }
  );
}

async function readStation(station) {

  const url =
    `https://app.weathercloud.net/device/values?code=${station.id}`;

  try {

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {

      return {
        ...station,
        ok: false,
        error: `Weathercloud HTTP ${response.status}`
      };

    }

    const data = await response.json();

    const epoch = Number(data.epoch);

    const timestamp =
      Number.isFinite(epoch)
        ? new Date(epoch * 1000).toISOString()
        : null;

    const ageMinutes =
      Number.isFinite(epoch)
        ? Math.max(
            0,
            (Date.now() - epoch * 1000) / 60000
          )
        : null;

    return {

      ...station,

      ok: true,

      rain:
        Number.isFinite(Number(data.rain))
          ? Number(data.rain)
          : null,

      rainrate:
        Number.isFinite(Number(data.rainrate))
          ? Number(data.rainrate)
          : null,

      epoch:
        Number.isFinite(epoch)
          ? epoch
          : null,

      timestamp,

      ageMinutes:
        ageMinutes === null
          ? null
          : Number(ageMinutes.toFixed(1)),

      stale:
        ageMinutes === null ||
        ageMinutes > MAX_AGE_MINUTES

    };

  } catch (error) {

    return {

      ...station,

      ok: false,

      error: String(error)

    };

  }
}

export default {

  async fetch(request) {

    if (request.method === "OPTIONS") {

      return json({}, 204);

    }

    if (request.method !== "GET") {

      return json(
        {
          ok: false,
          error: "Only GET is supported"
        },
        405
      );

    }

    const stations =
      await Promise.all(
        STATIONS.map(readStation)
      );

    const fresh =
      stations.filter(
        station =>
          station.ok &&
          !station.stale &&
          Number.isFinite(station.rainrate)
      );

    const rainrates =
      fresh.map(
        station => station.rainrate
      );

    const rains =
      fresh
        .map(station => station.rain)
        .filter(Number.isFinite);

    let confidence = "low";

    if (fresh.length >= 3) {

      confidence = "high";

    } else if (fresh.length === 2) {

      confidence = "medium";

    }

    return json({

      ok: true,

      updated:
        new Date().toISOString(),

      summary: {

        rainrate:
          median(rainrates),

        rain:
          median(rains),

        stationsTotal:
          stations.length,

        stationsFresh:
          fresh.length,

        confidence

      },

      stations

    });

  }

};
