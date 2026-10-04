/*
 * METEO BADALONA - AGREGADOR
 *
 * Fonts:
 *   1. Meteoclimatic - estacions públiques
 *   2. Meteocat/XEMA - opcional amb API Key
 *   3. AEMET - opcional amb API Key
 *   4. Weathercloud - fallback
 *
 * Endpoints:
 *
 *   /
 *       Resum complet
 *
 *   /stations
 *       Totes les estacions
 *
 *   /diagnostic
 *       Estat detallat de totes les fonts
 *
 *   /source/meteoclimatic
 *       Només Meteoclimatic
 *
 *   /source/meteocat
 *       Només Meteocat
 *
 *   /source/aemet
 *       Només AEMET
 *
 *   /source/weathercloud
 *       Només Weathercloud
 */

const CONFIG = {

  // ----------------------------------------------------
  // Meteoclimatic
  // ----------------------------------------------------

  meteoclimatic: [

    {
      id: "ESCAT0800000008912A",
      name: "Badalona Centre",
      priority: 3
    },

    {
      id: "ESCAT0800000008912B",
      name: "Badalona Progrés",
      priority: 3
    },

    {
      id: "ESCAT0800000008915A",
      name: "Badalona Bufalà",
      priority: 3
    },

    {
      id: "ESCAT0800000008915C",
      name: "Badalona BCIN",
      priority: 2
    },

    {
      id: "ESCAT0800000008917B",
      name: "Badalona La Pau",
      priority: 1
    },

    {
      id: "ESCAT0800000008913B",
      name: "Badalona S. Antoni Llefià",
      priority: 3
    }

  ],

  // ----------------------------------------------------
  // Weathercloud
  // ----------------------------------------------------

  weathercloud: [

    {
      id: "8575692672",
      name: "Badalona"
    },

    {
      id: "1033247952",
      name: "Salvador Espriu"
    },

    {
      id: "0113601253",
      name: "Torre Mena"
    },

    {
      id: "3460315932",
      name: "La Salut"
    }

  ],

  // ----------------------------------------------------
  // Meteocat
  //
  // Badalona - Museu
  // ----------------------------------------------------

  meteocat: {

    station: "WU",

    precipitationVariable: 30

  },

  // ----------------------------------------------------
  // Qualitat
  // ----------------------------------------------------

  maxAgeMinutes: 45,

  // Si true, intenta utilitzar fonts opcionals
  // que necessiten API keys.
  optionalApis: false

};


// ======================================================
// UTILITATS
// ======================================================

function median(values) {

  const valid = values
    .filter(v => Number.isFinite(v))
    .sort((a, b) => a - b);

  if (!valid.length) {
    return null;
  }

  const middle =
    Math.floor(valid.length / 2);

  if (valid.length % 2) {
    return valid[middle];
  }

  return (
    valid[middle - 1] +
    valid[middle]
  ) / 2;
}


function json(data, status = 200) {

  return new Response(

    JSON.stringify(
      data,
      null,
      2
    ),

    {

      status,

      headers: {

        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",

        "Access-Control-Allow-Origin":
          "*",

        "Access-Control-Allow-Methods":
          "GET, OPTIONS",

        "Access-Control-Allow-Headers":
          "Content-Type"

      }

    }

  );

}


function parseNumber(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const number =
    Number(
      String(value)
        .replace(",", ".")
        .replace(/[^\d.-]/g, "")
    );

  return Number.isFinite(number)
    ? number
    : null;
}


// ======================================================
// METEOCLIMATIC
// ======================================================

async function getMeteoclimatic() {

  const results = [];

  for (
    const station
    of CONFIG.meteoclimatic
  ) {

    const url =
      `https://www.meteoclimatic.net/perfil/${station.id}`;

    try {

      const response =
        await fetch(

          url,

          {

            headers: {

              "User-Agent":
                "Mozilla/5.0",

              "Accept":
                "text/html"

            }

          }

        );


      if (!response.ok) {

        results.push({

          source:
            "Meteoclimatic",

          id:
            station.id,

          name:
            station.name,

          ok:
            false,

          error:
            `HTTP ${response.status}`

        });

        continue;

      }


      const html =
        await response.text();


      /*
       * Meteoclimatic mostra actualment
       * la precipitació dins de la fitxa.
       *
       * Busquem primer el text
       * "Precip." i els valors
       * immediatament posteriors.
       */

      const clean =
        html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ");


      let rain = null;


      /*
       * Intent 1:
       * Precip. ... valor actual
       */

      let match =
        clean.match(
          /Precip\.?\s+[\s\S]{0,500}?(\d+(?:[.,]\d+)?)\s*mm/i
        );


      if (match) {

        rain =
          parseNumber(match[1]);

      }


      /*
       * Intent 2:
       * Buscar "Hoy" després de Precip.
       */

      if (rain === null) {

        const index =
          clean.search(
            /Precip\./i
          );

        if (index >= 0) {

          const section =
            clean.substring(
              index,
              index + 1200
            );

          const numbers =
            section.match(
              /\d+(?:[.,]\d+)?/g
            );

          if (
            numbers &&
            numbers.length
          ) {

            rain =
              parseNumber(
                numbers[0]
              );

          }

        }

      }


      /*
       * Última actualització
       */

      let timestamp = null;

      const update =
        clean.match(
          /Última actualización\s+([^<]{0,100})/i
        );

      if (update) {

        timestamp =
          update[1].trim();

      }


      results.push({

        source:
          "Meteoclimatic",

        id:
          station.id,

        name:
          station.name,

        ok:
          true,

        rain:
          rain,

        /*
         * Meteoclimatic no sempre exposa
         * rainrate de forma pública.
         */

        rainrate:
          null,

        timestamp:
          timestamp,

        priority:
          station.priority,

        rawAvailable:
          html.length > 0

      });


    } catch (error) {

      results.push({

        source:
          "Meteoclimatic",

        id:
          station.id,

        name:
          station.name,

        ok:
          false,

        error:
          String(error)

      });

    }

  }


  return results;

}


// ======================================================
// WEATHERCloud
// ======================================================

async function getWeathercloud() {

  const results = [];


  for (
    const station
    of CONFIG.weathercloud
  ) {

    try {

      const url =
        `https://app.weathercloud.net/device/values?code=${station.id}`;


      const response =
        await fetch(

          url,

          {

            headers: {

              "User-Agent":
                "Mozilla/5.0",

              "Accept":
                "application/json,text/plain,*/*"

            }

          }

        );


      const text =
        await response.text();


      /*
       * Weathercloud ens està retornant
       * actualment una resposta HTML buida
       * des de Cloudflare.
       *
       * No provoquem error.
       * Simplement marquem la font
       * com unavailable.
       */

      if (
        !text ||
        !text.trim()
      ) {

        results.push({

          source:
            "Weathercloud",

          id:
            station.id,

          name:
            station.name,

          ok:
            false,

          available:
            false,

          error:
            "Resposta buida"

        });

        continue;

      }


      let data;

      try {

        data =
          JSON.parse(text);

      } catch {

        results.push({

          source:
            "Weathercloud",

          id:
            station.id,

          name:
            station.name,

          ok:
            false,

          available:
            false,

          error:
            "Resposta no JSON"

        });

        continue;

      }


      const epoch =
        parseNumber(
          data.epoch
        );


      results.push({

        source:
          "Weathercloud",

        id:
          station.id,

        name:
          station.name,

        ok:
          true,

        available:
          true,

        rain:
          parseNumber(data.rain),

        rainrate:
          parseNumber(data.rainrate),

        timestamp:
          epoch
            ? new Date(
                epoch * 1000
              ).toISOString()
            : null,

        epoch

      });


    } catch (error) {

      results.push({

        source:
          "Weathercloud",

        id:
          station.id,

        name:
          station.name,

        ok:
          false,

        available:
          false,

        error:
          String(error)

      });

    }

  }


  return results;

}


// ======================================================
// METEOCAT
// ======================================================

async function getMeteocat(env) {

  /*
   * L'API oficial XEMA requereix
   * subscripció/API key.
   *
   * La deixem preparada però
   * desactivada fins que hi hagi
   * una credencial configurada.
   */

  if (
    !CONFIG.optionalApis
  ) {

    return {

      source:
        "Meteocat",

      ok:
        false,

      available:
        false,

      reason:
        "API opcional desactivada"

    };

  }


  const apiKey =
    env.METEOCAT_API_KEY;


  if (!apiKey) {

    return {

      source:
        "Meteocat",

      ok:
        false,

      available:
        false,

      reason:
        "Falta METEOCAT_API_KEY"

    };

  }


  try {

    const now =
      new Date();


    const year =
      now.getUTCFullYear();


    const month =
      String(
        now.getUTCMonth() + 1
      ).padStart(2, "0");


    const day =
      String(
        now.getUTCDate()
      ).padStart(2, "0");


    /*
     * Variable 30 =
     * precipitació.
     */

    const url =
      `https://api.meteo.cat/xema/v1/variables/mesurades/30/${year}/${month}/${day}?codiEstacio=${CONFIG.meteocat.station}`;


    const response =
      await fetch(

        url,

        {

          headers: {

            "X-API-Key":
              apiKey,

            "Accept":
              "application/json"

          }

        }

      );


    if (!response.ok) {

      return {

        source:
          "Meteocat",

        ok:
          false,

        available:
          true,

        error:
          `HTTP ${response.status}`

      };

    }


    const data =
      await response.json();


    const readings =
      data.lectures || [];


    const valid =
      readings
        .filter(
          r =>
            r.estat !== "N"
        )
        .map(
          r => ({

            timestamp:
              r.data,

            rain:
              parseNumber(
                r.valor
              )

          })
        );


    const latest =
      valid.length
        ? valid[valid.length - 1]
        : null;


    return {

      source:
        "Meteocat",

      station:
        CONFIG.meteocat.station,

      ok:
        true,

      available:
        true,

      rain:
        latest
          ? latest.rain
          : null,

      timestamp:
        latest
          ? latest.timestamp
          : null,

      readings:
        valid

    };


  } catch (error) {

    return {

      source:
        "Meteocat",

      ok:
        false,

      available:
        true,

      error:
        String(error)

    };

  }

}


// ======================================================
// AEMET
// ======================================================

async function getAemet(env) {

  /*
   * AEMET necessita API Key.
   *
   * La deixem com a connector opcional.
   */

  if (
    !CONFIG.optionalApis
  ) {

    return {

      source:
        "AEMET",

      ok:
        false,

      available:
        false,

      reason:
        "API opcional desactivada"

    };

  }


  if (
    !env.AEMET_API_KEY
  ) {

    return {

      source:
        "AEMET",

      ok:
        false,

      available:
        false,

      reason:
        "Falta AEMET_API_KEY"

    };

  }


  return {

    source:
      "AEMET",

    ok:
      false,

    available:
      true,

    reason:
      "Connector preparat; cal configurar estació AEMET"

  };

}


// ======================================================
// AGREGACIÓ
// ======================================================

function calculateSummary(stations) {

  /*
   * Només dades que tinguin
   * precipitació numèrica.
   */

  const valid =
    stations.filter(
      s =>
        s.ok &&
        Number.isFinite(
          s.rain
        )
    );


  const values =
    valid.map(
      s => s.rain
    );


  /*
   * IMPORTANT:
   *
   * rain pot significar:
   *
   * - acumulat avui
   * - precipitació actual
   *
   * segons la font.
   *
   * Per això no els barregem
   * cegament.
   */


  return {

    stationCount:
      stations.length,

    validStationCount:
      valid.length,

    medianRain:
      median(values),

    sources:
      [
        ...new Set(
          valid.map(
            s => s.source
          )
        )
      ]

  };

}


// ======================================================
// WORKER
// ======================================================

export default {

  async fetch(
    request,
    env
  ) {

    if (
      request.method === "OPTIONS"
    ) {

      return json(
        {},
        204
      );

    }


    if (
      request.method !== "GET"
    ) {

      return json(
        {
          ok:
            false,

          error:
            "Only GET supported"
        },

        405
      );

    }


    const url =
      new URL(
        request.url
      );


    /*
     * --------------------------------------------------
     * DIAGNOSTIC
     * --------------------------------------------------
     */

    if (
      url.pathname ===
      "/diagnostic"
    ) {

      const [
        meteoclimatic,
        weathercloud,
        meteocat,
        aemet
      ] =
        await Promise.all(
          [

            getMeteoclimatic(),

            getWeathercloud(),

            getMeteocat(env),

            getAemet(env)

          ]
        );


      return json({

        ok:
          true,

        updated:
          new Date().toISOString(),

        sources: {

          meteoclimatic,

          weathercloud,

          meteocat,

          aemet

        }

      });

    }


    /*
     * --------------------------------------------------
     * METEOCLIMATIC
     * --------------------------------------------------
     */

    if (
      url.pathname ===
      "/source/meteoclimatic"
    ) {

      return json({

        ok:
          true,

        source:
          "Meteoclimatic",

        stations:
          await getMeteoclimatic()

      });

    }


    /*
     * --------------------------------------------------
     * WEATHERCloud
     * --------------------------------------------------
     */

    if (
      url.pathname ===
      "/source/weathercloud"
    ) {

      return json({

        ok:
          true,

        source:
          "Weathercloud",

        stations:
          await getWeathercloud()

      });

    }


    /*
     * --------------------------------------------------
     * METEOCAT
     * --------------------------------------------------
     */

    if (
      url.pathname ===
      "/source/meteocat"
    ) {

      return json(
        await getMeteocat(env)
      );

    }


    /*
     * --------------------------------------------------
     * AEMET
     * --------------------------------------------------
     */

    if (
      url.pathname ===
      "/source/aemet"
    ) {

      return json(
        await getAemet(env)
      );

    }


    /*
     * --------------------------------------------------
     * STATIONS
     * --------------------------------------------------
     */

    if (
      url.pathname ===
      "/stations"
    ) {

      const [
        meteoclimatic,
        weathercloud
      ] =
        await Promise.all(
          [

            getMeteoclimatic(),

            getWeathercloud()

          ]
        );


      const stations =
        [

          ...meteoclimatic,

          ...weathercloud

        ];


      return json({

        ok:
          true,

        updated:
          new Date().toISOString(),

        stations

      });

    }


    /*
     * --------------------------------------------------
     * DEFAULT /
     * --------------------------------------------------
     */

    const [
      meteoclimatic,
      weathercloud
    ] =
      await Promise.all(
        [

          getMeteoclimatic(),

          getWeathercloud()

        ]
      );


    const stations =
      [

        ...meteoclimatic,

        ...weathercloud

      ];


    const summary =
      calculateSummary(
        stations
      );


    return json({

      ok:
        true,

      updated:
        new Date().toISOString(),

      summary,

      stations,

      sources: {

        Meteoclimatic:
          meteoclimatic.length,

        Weathercloud:
          weathercloud.length,

        Meteocat:
          CONFIG.optionalApis,

        AEMET:
          CONFIG.optionalApis

      }

    });

  }

};
