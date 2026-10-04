const STATIONS = [
  { id: "8575692672", name: "Badalona" },
  { id: "1033247952", name: "Salvador Espriu" },
  { id: "0113601253", name: "Torre Mena" },
  { id: "3460315932", name: "La Salut" }
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store"
    }
  });
}

async function testStation(station) {

  const url =
    `https://app.weathercloud.net/device/values?code=${station.id}`;

  try {

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json,text/plain,*/*"
      }
    });

    const text = await response.text();

    return {
      id: station.id,
      name: station.name,
      httpStatus: response.status,
      contentType: response.headers.get("content-type"),
      length: text.length,
      first500Characters: text.substring(0, 500)
    };

  } catch (error) {

    return {
      id: station.id,
      name: station.name,
      error: String(error)
    };

  }
}

export default {

  async fetch(request) {

    const results =
      await Promise.all(
        STATIONS.map(testStation)
      );

    return json({
      ok: true,
      testedAt: new Date().toISOString(),
      results
    });

  }

};
