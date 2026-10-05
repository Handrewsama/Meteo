import { median } from "./utils.js";

export function calculateSummary(stations) {
  const valid = stations.filter(s => s.ok === true && Number.isFinite(s.rainToday));
  const values = valid.map(s => s.rainToday);

  return {
    stationsTotal: stations.length,
    stationsValid: valid.length,
    rainTodayMedian: median(values),
    rainTodayMin: values.length ? Math.min(...values) : null,
    rainTodayMax: values.length ? Math.max(...values) : null,
    sources: [...new Set(valid.map(s => s.source))]
  };
}
