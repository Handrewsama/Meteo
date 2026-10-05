/*
 * METEO BADALONA API
 * Cloudflare Worker
 *
 * Fonts:
 * - Meteoclimatic
 * - Weathercloud
 * - Meteocat (opcional)
 * - AEMET (opcional)
 */

const CONFIG = {

  meteoclimatic: [

    {
      id: "ESCAT0800000008912A",
      name: "Badalona Centre",
      priority: 5
    },

    {
      id: "ESCAT0800000008912B",
      name: "Badalona Progrés",
      priority: 5
    },

    {
      id: "ESCAT0800000008915A",
      name: "Badalona Bufalà",
      priority: 5
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
      priority: 4
    },

    {
      id: "ESCAT0800000008911C",
      name: "Badalona Dalt la Vila",
      priority: 2
    }

  ],


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


  meteocat: {

    station: "WU",

    precipitationVariable: 30

  },


  optionalApis: false

};


// ============================================================
// RESPOSTA JSON
// ============================================================

function json(data, status = 200) {

  return new Response(

    JSON.stringify(
      data,
      null,
      2
    ),

    {

      status: status,

      headers: {

        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store, no-cache, must-revalidate",

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


// ============================================================
// CONVERSIÓ A NÚMERO
// ============================================================

function parseNumber(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return null;

  }


  const cleaned =

    String(value)

      .replace(",", ".")

      .replace(/[^\d.-]/g, "");


  const result =
    Number(cleaned);


  return Number.isFinite(result)
    ? result
    : null;

}


// ============================================================
// NETEJA HTML
// ============================================================

function cleanHtml(html) {

  return html

    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )

    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )

    .replace(
      /<noscript[\s\S]*?<\/noscript>/gi,
      " "
    )

    .replace(
      /<br\s*\/?>/gi,
      " "
    )

    .replace(
      /<\/td>/gi,
      " "
    )

    .replace(
      /<\/th>/gi,
      " "
    )

    .replace(
      /<\/tr>/gi,
      " "
    )

    .replace(
      /<[^>]+>/g,
      " "
    )

    .replace(
      /&nbsp;/gi,
      " "
    )

    .replace(
      /&ordm;/gi,
      "º"
    )

    .replace(
      /&aacute;/gi,
      "á"
    )

    .replace(
      /&eacute;/gi,
      "é"
    )

    .replace(
      /&iacute;/gi,
      "í"
    )

    .replace(
      /&oacute;/gi,
      "ó"
    )

    .replace(
      /&uacute;/gi,
      "ú"
    )

    .replace(
      /&ntilde;/gi,
      "ñ"
    )

    .replace(
      /&#39;/gi,
      "'"
    )

    .replace(
      /&quot;/gi,
      '"'
    )

    .replace(
      /&amp;/gi,
      "&"
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


// ============================================================
// PRECIPITACIÓ D'AVUI
// ============================================================

function extractRainToday(clean) {

  const precipIndex =
    clean.search(
      /Precip\./i
    );


  if (
    precipIndex < 0
  ) {

    return null;

  }


  const section =
    clean.substring(
      precipIndex,
      precipIndex + 1800
    );


  /*
   * Primer intent:
   *
   * buscar directament un valor
   * associat a "Hoy".
   */

  const hoyMatches = [

    ...section.matchAll(

      /\bHoy\b[\s\S]{0,120}?(\d+(?:[.,]\d+)?)\s*(?:mm)?/gi

    )

  ];


  if (
    hoyMatches.length
  ) {

    const candidate =
      hoyMatches[
        hoyMatches.length - 1
      ][1];


    const value =
      parseNumber(
        candidate
      );


    if (
      value !== null
    ) {

      return value;

    }

  }


  /*
   * Segon intent:
   *
   * agafem el bloc entre l'últim
   * "Hoy" i "Mes".
   */

  const hoyPositions = [

    ...section.matchAll(
      /\bHoy\b/gi
    )

  ];


  const lastHoy =

    hoyPositions.length

      ? hoyPositions[
          hoyPositions.length - 1
        ].index

      : -1;


  if (
    lastHoy >= 0
  ) {

    const afterHoy =
      section.substring(
        lastHoy
      );


    const mesIndex =
      afterHoy.search(
        /\bMes\b/i
      );


    if (
      mesIndex >= 0
    ) {

      const block =
        afterHoy.substring(
          0,
          mesIndex
        );


      const numbers =
        block.match(
          /\d+(?:[.,]\d+)?/g
        );


      if (
        numbers &&
        numbers.length
      ) {

        return parseNumber(
          numbers[
            numbers.length - 1
          ]
        );

      }

    }

  }


  return null;

}


// ============================================================
// PRECIPITACIÓ ACTUAL
// ============================================================

function extractRainNow(clean) {

  const index =
    clean.search(
      /Precip\./i
    );


  if (
    index < 0
  ) {

    return null;

  }


  const section =
    clean.substring(
      index,
      index + 500
    );


  const match =
    section.match(

      /Precip\.\s*(?:Dias\s+Sequia\s*)?(\d+(?:[.,]\d+)?)/i

    );


  if (
    !match
  ) {

    return null;

  }


  return parseNumber(
    match[1]
  );

}
// ============================================================
// HORA D'ACTUALITZACIÓ
// ============================================================

function extractUpdate(clean) {

  const match =
    clean.match(

      /Última actualización\s+(\d{1,2}-\d{1,2}-\d{4}\s+\d{1,2}:\d{2})\s*UTC/i

    );


  if (
    match
  ) {

    return match[1] + " UTC";

  }


  return null;

}


// ============================================================
// METEOCLIMATIC
// ============================================================

async function getMeteoclimatic() {

  const results = [];


  for (
    const station of CONFIG.meteoclimatic
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
                "Mozilla/5.0 (compatible; BadalonaMeteo/1.0)",

              "Accept":
                "text/html,application/xhtml+xml"

            }

          }

        );


      if (
        !response.ok
      ) {

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


      if (
        !html ||
        html.length < 100
      ) {

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
            "HTML buit o massa curt"

        });

        continue;

      }


      const clean =
        cleanHtml(
          html
        );


      const rainToday =
        extractRainToday(
          clean
        );


      const rainNow =
        extractRainNow(
          clean
        );


      const timestamp =
        extractUpdate(
          clean
        );


      results.push({

        source:
          "Meteoclimatic",

        id:
          station.id,

        name:
          station.name,

        ok:
          true,

        rainToday:
          rainToday,

        rainNow:
          rainNow,

        rain:
          rainToday,

        rainrate:
          null,

        timestamp:
          timestamp,

        priority:
          station.priority,

        rawAvailable:
          true,

        parser:
          "meteoclimatic-v3"

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


// ============================================================
// WEATHERCloud
// ============================================================

async function getWeathercloud() {

  const results = [];


  for (
    const station of CONFIG.weathercloud
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
          JSON.parse(
            text
          );

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
          parseNumber(
            data.rain
          ),

        rainToday:
          parseNumber(
            data.rain
          ),

        rainrate:
          parseNumber(
            data.rainrate
          ),

        timestamp:
          epoch
            ? new Date(
                epoch * 1000
              ).toISOString()
            : null,

        epoch:
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
// ============================================================
// METEOCAT
// ============================================================

async function getMeteocat(env) {

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


  if (
    !apiKey
  ) {

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
      ).padStart(
        2,
        "0"
      );


    const day =
      String(
        now.getUTCDate()
      ).padStart(
        2,
        "0"
      );


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


    if (
      !response.ok
    ) {

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
          reading =>
            reading.estat !== "N"
        )

        .map(
          reading => ({

            timestamp:
              reading.data,

            rain:
              parseNumber(
                reading.valor
              )

          })
        );


    const latest =
      valid.length
        ? valid[
            valid.length - 1
          ]
        : null;


    return {

      source:
        "Meteocat",

      station:
        CONFIG.meteocat.station,

      name:
        "Badalona - Museu",

      ok:
        true,

      available:
        true,

      rain:
        latest
          ? latest.rain
          : null,

      rainToday:
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


// ============================================================
// AEMET
// ============================================================

async function getAemet(env) {

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
      "Connector preparat"

  };

}


// ============================================================
// MEDIANA
// ============================================================

function median(values) {

  const valid =
    values

      .filter(
        value =>
          Number.isFinite(
            value
          )
      )

      .sort(
        (a, b) =>
          a - b
      );


  if (
    !valid.length
  ) {

    return null;

  }


  const middle =
    Math.floor(
      valid.length / 2
    );


  if (
    valid.length % 2
  ) {

    return valid[
      middle
    ];

  }


  return (

    valid[
      middle - 1
    ] +

    valid[
      middle
    ]

  ) / 2;

}

// ============================================================
// HISTÒRIC DE PRECIPITACIÓ - CLOUDFLARE KV
// ============================================================

const HISTORY_KEY = "badalona:rain:history";

const HISTORY_MINUTES = 24 * 60;


// ------------------------------------------------------------
// LLEGIR HISTÒRIC
// ------------------------------------------------------------

async function loadHistory(env) {

  if (!env.METEO_KV) {
    return [];
  }

  try {

    const data =
      await env.METEO_KV.get(
        HISTORY_KEY,
        "json"
      );

    if (!Array.isArray(data)) {
      return [];
    }

    return data;

  } catch (error) {

    console.error(
      "KV read error:",
      error
    );

    return [];

  }

}


// ------------------------------------------------------------
// GUARDAR HISTÒRIC
// ------------------------------------------------------------

async function saveHistory(
  env,
  history
) {

  if (!env.METEO_KV) {
    return false;
  }

  try {

    await env.METEO_KV.put(

      HISTORY_KEY,

      JSON.stringify(
        history
      )

    );

    return true;

  } catch (error) {

    console.error(
      "KV write error:",
      error
    );

    return false;

  }

}


// ------------------------------------------------------------
// AFEGIR UNA LECTURA
// ------------------------------------------------------------

async function addHistoryPoint(
  env,
  stations
) {

  const history =
    await loadHistory(
      env
    );


  const now =
    Date.now();


  const point = {

  timestamp:
    new Date(
      now
    ).toISOString(),

  epoch:
    now,

  stations:
    stations.map(
      station => ({

        id:
          station.id,

        name:
          station.name,

        source:
          station.source,

        priority:
          station.priority ?? null,

        ok:
          station.ok === true,

        rainToday:
          Number.isFinite(
            station.rainToday
          )
            ? station.rainToday
            : null,

        rainNow:
          Number.isFinite(
            station.rainNow
          )
            ? station.rainNow
            : null,

        rainrate:
          Number.isFinite(
            station.rainrate
          )
            ? station.rainrate
            : null,

        timestamp:
          station.timestamp ?? null

      })
    )

};


  history.push(
    point
  );


  const cutoff =
    now -
    (
      HISTORY_MINUTES *
      60 *
      1000
    );


  const filtered =
    history.filter(
      item =>
        item.epoch >=
        cutoff
    );


  await saveHistory(
    env,
    filtered
  );


  return filtered;

}


// ------------------------------------------------------------
// OBTENIR LA MEDIANA D'UNA LECTURA
// ------------------------------------------------------------

function historyMedian(
  point
) {

  if (
    !point ||
    !Array.isArray(
      point.stations
    )
  ) {

    return null;

  }


  const values =
    point.stations

      .map(
        station =>
          station.rain
      )

      .filter(
        value =>
          Number.isFinite(
            value
          )
      );


  return median(
    values
  );

}


// ------------------------------------------------------------
// BUSCAR EL PUNT MÉS PROPER A UN MOMENT
// ------------------------------------------------------------

function findHistoryPoint(
  history,
  targetEpoch
) {

  if (
    !history.length
  ) {

    return null;

  }


  let closest =
    history[0];


  let difference =
    Math.abs(
      history[0].epoch -
      targetEpoch
    );


  for (
    const point of history
  ) {

    const currentDifference =
      Math.abs(
        point.epoch -
        targetEpoch
      );


    if (
      currentDifference <
      difference
    ) {

      closest =
        point;

      difference =
        currentDifference;

    }

  }


  return closest;

}

// ============================================================
// PRECIPITACIÓ PER ESTACIÓ
// ============================================================

function calculateStationRainWindow(
  history,
  minutes
) {

  if (
    history.length < 2
  ) {

    return [];

  }


  const latest =
    history[
      history.length - 1
    ];


  const targetEpoch =
    latest.epoch -
    (
      minutes *
      60 *
      1000
    );


  const previous =
    findHistoryPoint(
      history,
      targetEpoch
    );


  if (
    !previous
  ) {

    return [];

  }


  const previousMap =
    new Map();


  for (
    const station of previous.stations || []
  ) {

    previousMap.set(
      `${station.source}:${station.id}`,
      station
    );

  }


  const results = [];


  for (
    const station of latest.stations || []
  ) {

    const key =
      `${station.source}:${station.id}`;


    const oldStation =
      previousMap.get(
        key
      );


    if (
      !oldStation
    ) {

      continue;

    }


    const currentRain =
      Number.isFinite(
        station.rainToday
      )
        ? station.rainToday
        : null;


    const previousRain =
      Number.isFinite(
        oldStation.rainToday
      )
        ? oldStation.rainToday
        : null;


    if (
      currentRain === null ||
      previousRain === null
    ) {

      continue;

    }


    let rain =
      currentRain -
      previousRain;


    // Protecció contra el reinici del comptador diari
    if (
      rain < 0
    ) {

      rain = 0;

    }


    results.push({

      id:
        station.id,

      name:
        station.name,

      source:
        station.source,

      priority:
        station.priority ?? null,

      rain:
        Number(
          rain.toFixed(
            2
          )
        ),

      mmPerHour:
        Number(
          (
            rain *
            60 /
            minutes
          ).toFixed(
            2
          )
        ),

      currentRainToday:
        currentRain,

      previousRainToday:
        previousRain,

      timestamp:
        station.timestamp ?? null

    });

  }


  return results;

}

// ------------------------------------------------------------
// PRECIPITACIÓ EN UNA FINESTRA TEMPORAL
// ------------------------------------------------------------

function calculateRainWindow(
  history,
  minutes
) {

  if (
    history.length <
    2
  ) {

    return null;

  }


  const latest =
    history[
      history.length - 1
    ];


  const targetEpoch =
    latest.epoch -
    (
      minutes *
      60 *
      1000
    );


  const previous =
    findHistoryPoint(
      history,
      targetEpoch
    );


  if (
    !previous
  ) {

    return null;

  }


  const latestRain =
    historyMedian(
      latest
    );


  const previousRain =
    historyMedian(
      previous
    );


  if (
    latestRain === null ||
    previousRain === null
  ) {

    return null;

  }


  /*
   * Diferència de precipitació
   * acumulada.
   *
   * Protecció contra resets del
   * comptador de precipitació.
   */

  let difference =
    latestRain -
    previousRain;


  if (
    difference < 0
  ) {

    difference = 0;

  }


  return {

    minutes:
      minutes,

    mm:
      Number(
        difference.toFixed(
          2
        )
      ),

    start:
      previous.epoch,

    end:
      latest.epoch

  };

}


// ------------------------------------------------------------
// INTENSITAT EQUIVALENT mm/h
// ------------------------------------------------------------

function calculateRainRate(
  window
) {

  if (
    !window ||
    !window.minutes
  ) {

    return null;

  }


  return Number(

    (
      window.mm *
      60 /
      window.minutes

    ).toFixed(
      2
    )

  );

}


// ------------------------------------------------------------
// TENDÈNCIA
// ------------------------------------------------------------

function calculateTrend(
  history
) {

  if (
    history.length <
    3
  ) {

    return "unknown";

  }


  const last =
    history[
      history.length - 1
    ];


  const previous =
    history[
      history.length - 3
    ];


  const lastRain =
    historyMedian(
      last
    );


  const previousRain =
    historyMedian(
      previous
    );


  if (
    lastRain === null ||
    previousRain === null
  ) {

    return "unknown";

  }


  const difference =
    lastRain -
    previousRain;


  if (
    difference > 1
  ) {

    return "rising";

  }


  if (
    difference < -1
  ) {

    return "falling";

  }


  return "stable";

}

// ============================================================
// SITUACIÓ PER ZONA
// ============================================================

function calculateZoneSituation(
  rain10,
  rain30,
  rain60,
  rain180
) {

  const r10 =
    rain10 ?? 0;

  const r30 =
    rain30 ?? 0;

  const r60 =
    rain60 ?? 0;

  const r180 =
    rain180 ?? 0;


  let score = 0;


  // ----------------------------------------------------------
  // 10 MINUTS
  // ----------------------------------------------------------

  if (r10 >= 20) {

    score += 5;

  } else if (r10 >= 10) {

    score += 4;

  } else if (r10 >= 5) {

    score += 2;

  } else if (r10 >= 2) {

    score += 1;

  }


  // ----------------------------------------------------------
  // 30 MINUTS
  // ----------------------------------------------------------

  if (r30 >= 30) {

    score += 5;

  } else if (r30 >= 20) {

    score += 4;

  } else if (r30 >= 10) {

    score += 2;

  } else if (r30 >= 5) {

    score += 1;

  }


  // ----------------------------------------------------------
  // 1 HORA
  // ----------------------------------------------------------

  if (r60 >= 50) {

    score += 5;

  } else if (r60 >= 30) {

    score += 4;

  } else if (r60 >= 20) {

    score += 2;

  } else if (r60 >= 10) {

    score += 1;

  }


  // ----------------------------------------------------------
  // 3 HORES
  // ----------------------------------------------------------

  if (r180 >= 80) {

    score += 5;

  } else if (r180 >= 50) {

    score += 4;

  } else if (r180 >= 30) {

    score += 2;

  } else if (r180 >= 15) {

    score += 1;

  }


  // ==========================================================
  // RESULTAT
  // ==========================================================

  if (score >= 14) {

    return {

      level: 4,

      code: "FLOOD",

      label: "RIUADA",

      emoji: "🟣",

      score: score

    };

  }


  if (score >= 10) {

    return {

      level: 3,

      code: "DANGER",

      label: "PERILL D'INUNDACIÓ",

      emoji: "🔴",

      score: score

    };

  }


  if (score >= 6) {

    return {

      level: 2,

      code: "LOCAL",

      label: "POSSIBLE INUNDACIÓ LOCAL",

      emoji: "🟠",

      score: score

    };

  }


  if (score >= 3) {

    return {

      level: 1,

      code: "HEAVY_RAIN",

      label: "PLUJA INTENSA",

      emoji: "🟡",

      score: score

    };

  }


  return {

    level: 0,

    code: "NORMAL",

    label: "PLUJA SENSE PERILL",

    emoji: "🟢",

    score: score

  };

}

// ============================================================
// CLASSIFICACIÓ DE LA SITUACIÓ AL CARRER
// ============================================================

function calculateStreetSituation(
  rain10,
  rain30,
  rain60,
  rain180,
  rain1440,
  trend,
  stations
) {

  let score = 0;


  // ----------------------------------------------------------
  // INTENSITAT 30 MIN
  // ----------------------------------------------------------

  if (
    rain30 !== null
  ) {

    if (
      rain30 >= 40
    ) {

      score += 5;

    } else if (
      rain30 >= 20
    ) {

      score += 4;

    } else if (
      rain30 >= 10
    ) {

      score += 2;

    } else if (
      rain30 >= 5
    ) {

      score += 1;

    }

  }


  // ----------------------------------------------------------
  // ACUMULACIÓ 1 HORA
  // ----------------------------------------------------------

  if (
    rain60 !== null
  ) {

    if (
      rain60 >= 80
    ) {

      score += 5;

    } else if (
      rain60 >= 40
    ) {

      score += 4;

    } else if (
      rain60 >= 20
    ) {

      score += 2;

    } else if (
      rain60 >= 10
    ) {

      score += 1;

    }

  }


  // ----------------------------------------------------------
  // ACUMULACIÓ 3 HORES
  // ----------------------------------------------------------

  if (
    rain180 !== null
  ) {

    if (
      rain180 >= 90
    ) {

      score += 5;

    } else if (
      rain180 >= 60
    ) {

      score += 4;

    } else if (
      rain180 >= 30
    ) {

      score += 2;

    } else if (
      rain180 >= 15
    ) {

      score += 1;

    }

  }


  // ----------------------------------------------------------
  // ACUMULACIÓ 24 HORES
  // ----------------------------------------------------------

  if (
    rain1440 !== null
  ) {

    if (
      rain1440 >= 200
    ) {

      score += 5;

    } else if (
      rain1440 >= 100
    ) {

      score += 4;

    } else if (
      rain1440 >= 50
    ) {

      score += 2;

    } else if (
      rain1440 >= 25
    ) {

      score += 1;

    }

  }


  // ----------------------------------------------------------
  // TENDÈNCIA
  // ----------------------------------------------------------

  if (
    trend === "rising"
  ) {

    score += 1;

  }


  // ----------------------------------------------------------
  // QUANTES ESTACIONS ESTAN DETECTANT PLUJA?
  // ----------------------------------------------------------

  const validStations =
    stations.filter(

      station =>
        station.ok === true &&
        Number.isFinite(
          station.rainToday
        )

    );


  const rainStations =
    validStations.filter(

      station =>
        station.rainToday > 0

    );


  const affectedPercentage =
    validStations.length

      ? (
          rainStations.length /
          validStations.length
        ) * 100

      : 0;


  if (
    affectedPercentage >= 80
  ) {

    score += 2;

  } else if (
    affectedPercentage >= 50
  ) {

    score += 1;

  }


  // ==========================================================
  // CLASSIFICACIÓ
  // ==========================================================

  if (
    score >= 14
  ) {

    return {

      level:
        4,

      code:
        "EXTREME",

      label:
        "RIUADA / SITUACIÓ EXTREMA",

      shortLabel:
        "RIUADA",

      emoji:
        "🟣",

      score:
        score,

      message:
        "Situació potencialment molt perillosa. Evita desplaçaments i zones inundables."

    };

  }


  if (
    score >= 10
  ) {

    return {

      level:
        3,

      code:
        "DANGER",

      label:
        "PERILL D'INUNDACIÓ",

      shortLabel:
        "PERILL",

      emoji:
        "🔴",

      score:
        score,

      message:
        "Risc elevat d'inundacions sobtades. Extrema la precaució al carrer."

    };

  }


  if (
    score >= 6
  ) {

    return {

      level:
        2,

      code:
        "LOCAL_FLOODING",

      label:
        "POSSIBLE INUNDACIÓ LOCAL",

      shortLabel:
        "PRECAUCIÓ",

      emoji:
        "🟠",

      score:
        score,

      message:
        "Pluja intensa. Es poden produir bassals importants i inundacions puntuals."

    };

  }


  if (
    score >= 3
  ) {

    return {

      level:
        1,

      code:
        "HEAVY_RAIN",

      label:
        "PLUJA INTENSA",

      shortLabel:
        "PLUJA INTENSA",

      emoji:
        "🟡",

      score:
        score,

      message:
        "Pluja intensa però sense indicadors suficients d'inundació generalitzada."

    };

  }


  return {

    level:
      0,

    code:
      "NORMAL_RAIN",

    label:
      "PLUJA SENSE PERILL",

    shortLabel:
      "NORMAL",

    emoji:
      "🟢",

    score:
      score,

    message:
      "Pluja sense indicadors actuals de situació de perill."

  };

}

// ============================================================
// RESUM DE PRECIPITACIÓ
// ============================================================

function calculateSummary(stations) {

  const valid =
    stations.filter(

      station =>

        station.ok === true &&

        Number.isFinite(
          station.rainToday
        )

    );


  const values =
    valid.map(

      station =>
        station.rainToday

    );


  return {

    stationsTotal:
      stations.length,

    stationsValid:
      valid.length,

    rainTodayMedian:
      median(
        values
      ),

    rainTodayMin:
      values.length
        ? Math.min(
            ...values
          )
        : null,

    rainTodayMax:
      values.length
        ? Math.max(
            ...values
          )
        : null,

    sources:
      [
        ...new Set(

          valid.map(
            station =>
              station.source
          )

        )
      ]

  };

}
// ============================================================
// WORKER PRINCIPAL
// ============================================================

export default {

  async fetch(
    request,
    env
  ) {

    // --------------------------------------------------------
    // CORS
    // --------------------------------------------------------

    if (
      request.method ===
      "OPTIONS"
    ) {

      return json(
        {},
        204
      );

    }


    // --------------------------------------------------------
    // NOMÉS GET
    // --------------------------------------------------------

    if (
      request.method !==
      "GET"
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


    // ========================================================
    // DIAGNOSTIC
    // ========================================================

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

          meteoclimatic:
            meteoclimatic,

          weathercloud:
            weathercloud,

          meteocat:
            meteocat,

          aemet:
            aemet

        }

      });

    }


    // ========================================================
    // FONT: METEOCLIMATIC
    // ========================================================

    if (
      url.pathname ===
      "/source/meteoclimatic"
    ) {

      const stations =
        await getMeteoclimatic();


      return json({

        ok:
          true,

        source:
          "Meteoclimatic",

        updated:
          new Date().toISOString(),

        stations:
          stations

      });

    }


    // ========================================================
    // FONT: WEATHERCloud
    // ========================================================

    if (
      url.pathname ===
      "/source/weathercloud"
    ) {

      const stations =
        await getWeathercloud();


      return json({

        ok:
          true,

        source:
          "Weathercloud",

        updated:
          new Date().toISOString(),

        stations:
          stations

      });

    }


    // ========================================================
    // FONT: METEOCAT
    // ========================================================

    if (
      url.pathname ===
      "/source/meteocat"
    ) {

      const data =
        await getMeteocat(
          env
        );


      return json(
        data
      );

    }


    // ========================================================
    // FONT: AEMET
    // ========================================================

    if (
      url.pathname ===
      "/source/aemet"
    ) {

      const data =
        await getAemet(
          env
        );


      return json(
        data
      );

    }


    // ========================================================
    // TOTES LES ESTACIONS
    // ========================================================

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


      const stations = [

        ...meteoclimatic,

        ...weathercloud

      ];


      return json({

        ok:
          true,

        updated:
          new Date().toISOString(),

        stations:
          stations

      });

    }


    // ========================================================
    // RUTA PRINCIPAL "/"
    // ========================================================

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


    const stations = [

      ...meteoclimatic,

      ...weathercloud

    ];


    const summary =
      calculateSummary(
        stations
      );

// ========================================================
// HISTÒRIC
// ========================================================

  const history =
    await addHistoryPoint(
      env,
      stations
    );


// ========================================================
// PRECIPITACIÓ PER ZONA
// ========================================================

const rain10Zones =
  calculateStationRainWindow(
    history,
    10
  );

const rain30Zones =
  calculateStationRainWindow(
    history,
    30
  );

const rain60Zones =
  calculateStationRainWindow(
    history,
    60
  );

const rain180Zones =
  calculateStationRainWindow(
    history,
    180
  );


// ========================================================
// CONSTRUIR ZONES
// ========================================================

const zoneMap =
  new Map();


for (
  const station of stations
) {

  const key =
    `${station.source}:${station.id}`;


  zoneMap.set(
    key,
    {

      id:
        station.id,

      name:
        station.name,

      source:
        station.source,

      priority:
        station.priority ?? null,

      rain10min:
        0,

      rain30min:
        0,

      rain1h:
        0,

      rain3h:
        0,

      situation:
        calculateZoneSituation(
          0,
          0,
          0,
          0
        )

    }
  );

}


// ========================================================
// INCORPORAR 10 MIN
// ========================================================

for (
  const zone of rain10Zones
) {

  const key =
    `${zone.source}:${zone.id}`;

  const target =
    zoneMap.get(
      key
    );

  if (
    target
  ) {

    target.rain10min =
      zone.rain;

  }

}


// ========================================================
// INCORPORAR 30 MIN
// ========================================================

for (
  const zone of rain30Zones
) {

  const key =
    `${zone.source}:${zone.id}`;

  const target =
    zoneMap.get(
      key
    );

  if (
    target
  ) {

    target.rain30min =
      zone.rain;

  }

}


// ========================================================
// INCORPORAR 1 HORA
// ========================================================

for (
  const zone of rain60Zones
) {

  const key =
    `${zone.source}:${zone.id}`;

  const target =
    zoneMap.get(
      key
    );

  if (
    target
  ) {

    target.rain1h =
      zone.rain;

  }

}


// ========================================================
// INCORPORAR 3 HORES
// ========================================================

for (
  const zone of rain180Zones
) {

  const key =
    `${zone.source}:${zone.id}`;

  const target =
    zoneMap.get(
      key
    );

  if (
    target
  ) {

    target.rain3h =
      zone.rain;

  }

}


// ========================================================
// CALCULAR SITUACIÓ FINAL DE CADA ZONA
// ========================================================

for (
  const zone of zoneMap.values()
) {

  zone.situation =
    calculateZoneSituation(

      zone.rain10min,

      zone.rain30min,

      zone.rain1h,

      zone.rain3h

    );

}


// ========================================================
// CONVERTIR MAP -> ARRAY
// ========================================================

const zones =
  Array.from(
    zoneMap.values()
  );

    return json({

  ok:
    true,

  updated:
    new Date().toISOString(),

  summary:
    summary,

  zones:
    zones,

  precipitation: {

    rain10min:
      rain10Zones,

    rain30min:
      rain30Zones,

    rain1h:
      rain60Zones,

    rain3h:
      rain180Zones

  },

  stations:
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
