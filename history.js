/*
 * history.js
 * HISTÒRIC DE PRECIPITACIÓ - BADALONA METEO
 *
 * Requereix un binding KV:
 *   METEO_KV
 *
 * Funcions exportades:
 *   loadHistory()
 *   saveHistory()
 *   addHistoryPoint()
 *   historyMedian()
 *   findHistoryPoint()
 *   calculateRainWindow()
 *   calculateRainWindows()
 *   calculateRainRate()
 *   calculateTrend()
 */

const HISTORY_KEY = "badalona:rain:history";

const HISTORY_MINUTES = 24 * 60;


/* ============================================================
 * CARREGAR HISTÒRIC
 * ============================================================ */

export async function loadHistory(env) {

  if (!env || !env.METEO_KV) {
    return [];
  }

  try {

    const data = await env.METEO_KV.get(
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


/* ============================================================
 * GUARDAR HISTÒRIC
 * ============================================================ */

export async function saveHistory(
  env,
  history
) {

  if (!env || !env.METEO_KV) {
    return false;
  }

  try {

    await env.METEO_KV.put(
      HISTORY_KEY,
      JSON.stringify(history)
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


/* ============================================================
 * AFEGIR UNA LECTURA
 *
 * stations ha de ser un array amb:
 *
 * {
 *   id,
 *   name,
 *   source,
 *   rainToday
 * }
 * ============================================================ */

export async function addHistoryPoint(
  env,
  stations
) {

  if (!Array.isArray(stations)) {
    return [];
  }


  const history =
    await loadHistory(env);


  const now =
    Date.now();


  const point = {

    timestamp:
      new Date(now).toISOString(),

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

          rain:
            Number.isFinite(
              Number(
                station.rainToday
              )
            )
              ? Number(
                  station.rainToday
                )
              : null

        })
      )

  };


  history.push(point);


  /*
   * Eliminar lectures de més de 24 hores.
   */

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

        item &&
        Number.isFinite(
          item.epoch
        ) &&
        item.epoch >= cutoff
    );


  await saveHistory(
    env,
    filtered
  );


  return filtered;

}


/* ============================================================
 * MEDIANA
 * ============================================================ */

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


  if (!valid.length) {
    return null;
  }


  const middle =
    Math.floor(
      valid.length / 2
    );


  if (
    valid.length % 2 !== 0
  ) {

    return valid[middle];

  }


  return (

    valid[middle - 1] +
    valid[middle]

  ) / 2;

}


/* ============================================================
 * MEDIANA D'UNA LECTURA
 * ============================================================ */

export function historyMedian(
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


  return median(values);

}


/* ============================================================
 * BUSCAR EL PUNT MÉS PROPER
 * ============================================================ */

export function findHistoryPoint(
  history,
  targetEpoch
) {

  if (
    !Array.isArray(history) ||
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

    if (
      !point ||
      !Number.isFinite(
        point.epoch
      )
    ) {

      continue;

    }


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


/* ============================================================
 * CALCULAR PRECIPITACIÓ EN UNA FINESTRA
 *
 * Exemple:
 *
 * 10 minuts
 * 30 minuts
 * 60 minuts
 * 180 minuts
 * ============================================================ */

export function calculateRainWindow(
  history,
  minutes
) {

  if (
    !Array.isArray(history) ||
    history.length < 2
  ) {

    return null;

  }


  const latest =
    history[
      history.length - 1
    ];


  if (
    !latest ||
    !Number.isFinite(
      latest.epoch
    )
  ) {

    return null;

  }


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


  if (!previous) {
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
   * Diferència entre els dos
   * acumulats.
   */

  let difference =
    latestRain -
    previousRain;


  /*
   * Si el comptador s'ha reiniciat
   * durant aquest període, no podem
   * tenir una precipitació negativa.
   */

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
        difference.toFixed(2)
      ),

    start:
      previous.epoch,

    end:
      latest.epoch,

    startTimestamp:
      previous.timestamp,

    endTimestamp:
      latest.timestamp

  };

}


/* ============================================================
 * CALCULAR TOTES LES FINESTRES
 * ============================================================ */

export function calculateRainWindows(
  history
) {

  return {

    rain10min:
      calculateRainWindow(
        history,
        10
      ),

    rain30min:
      calculateRainWindow(
        history,
        30
      ),

    rain1h:
      calculateRainWindow(
        history,
        60
      ),

    rain3h:
      calculateRainWindow(
        history,
        180
      )

  };

}


/* ============================================================
 * INTENSITAT EQUIVALENT
 *
 * Converteix la precipitació de la
 * finestra a mm/h.
 *
 * Exemple:
 *
 * 10 mm en 30 min
 *
 * = 20 mm/h
 * ============================================================ */

export function calculateRainRate(
  window
) {

  if (
    !window ||
    !Number.isFinite(
      window.mm
    ) ||
    !window.minutes
  ) {

    return null;

  }


  return Number(

    (
      window.mm *
      60 /
      window.minutes
    ).toFixed(2)

  );

}


/* ============================================================
 * TENDÈNCIA
 *
 * rising
 * falling
 * stable
 * unknown
 * ============================================================ */

export function calculateTrend(
  history
) {

  if (
    !Array.isArray(history) ||
    history.length < 3
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


/* ============================================================
 * INFORMACIÓ GENERAL DE L'HISTÒRIC
 * ============================================================ */

export function getHistoryInfo(
  history
) {

  if (
    !Array.isArray(history) ||
    !history.length
  ) {

    return {

      points:
        0,

      oldest:
        null,

      newest:
        null,

      minutesCovered:
        0

    };

  }


  const oldest =
    history[0];


  const newest =
    history[
      history.length - 1
    ];


  const minutesCovered =
    Number.isFinite(
      oldest.epoch
    ) &&
    Number.isFinite(
      newest.epoch
    )

      ? Math.round(

          (
            newest.epoch -
            oldest.epoch

          ) / 60000

        )

      : 0;


  return {

    points:
      history.length,

    oldest:
      oldest.timestamp ||
      null,

    newest:
      newest.timestamp ||
      null,

    minutesCovered:
      minutesCovered

  };

}
