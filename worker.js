const STATIONS = [
  {
    id: "8575692672",
    name: "Badalona"
  }
];

export default {
  async fetch(request) {

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    try {

      const stations = [];

      for (const station of STATIONS) {

        const url =
          `https://app.weathercloud.net/device/values?code=${station.id}`;

        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "X-Requested-With": "XMLHttpRequest"
          }
        });

        if (!response.ok) {
          stations.push({
            id: station.id,
            name: station.name,
            error: `Weathercloud HTTP ${response.status}`
          });

          continue;
        }

        const data = await response.json();

        stations.push({
          id: station.id,
          name: station.name,
          rain: data.rain ?? null,
          rainrate: data.rainrate ?? null,
          epoch: data.epoch ?? null
        });
      }

      const validRainrate = stations
        .map(s => Number(s.rainrate))
        .filter(v => Number.isFinite(v));

      const validRain = stations
        .map(s => Number(s.rain))
        .filter(v => Number.isFinite(v));

      const average = values =>
        values.length
          ? values.reduce((a, b) => a + b, 0) / values.length
          : null;

      return new Response(
        JSON.stringify({
          ok: true,
          updated: new Date().toISOString(),

          summary: {
            rainrate: average(validRainrate),
            rain: average(validRain)
          },

          stations
        }, null, 2),
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            ...corsHeaders
          }
        }
      );

    } catch (error) {

      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message
        }, null, 2),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...corsHeaders
          }
        }
      );
    }
  }
};
