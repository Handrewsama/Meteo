export function calculateZoneSituation(rain10, rain30, rain60, rain180) {
  const r10 = rain10 ?? 0, r30 = rain30 ?? 0, r60 = rain60 ?? 0, r180 = rain180 ?? 0;
  let score = 0;

  if (r10 >= 20) score += 5; else if (r10 >= 10) score += 4; else if (r10 >= 5) score += 2; else if (r10 >= 2) score += 1;
  if (r30 >= 30) score += 5; else if (r30 >= 20) score += 4; else if (r30 >= 10) score += 2; else if (r30 >= 5) score += 1;
  if (r60 >= 50) score += 5; else if (r60 >= 30) score += 4; else if (r60 >= 20) score += 2; else if (r60 >= 10) score += 1;
  if (r180 >= 80) score += 5; else if (r180 >= 50) score += 4; else if (r180 >= 30) score += 2; else if (r180 >= 15) score += 1;

  if (score >= 14) return { level: 4, code: "FLOOD", label: "RIUADA", emoji: "🟣", score };
  if (score >= 10) return { level: 3, code: "DANGER", label: "PERILL D'INUNDACIÓ", emoji: "🔴", score };
  if (score >= 6) return { level: 2, code: "LOCAL", label: "POSSIBLE INUNDACIÓ LOCAL", emoji: "🟠", score };
  if (score >= 3) return { level: 1, code: "HEAVY_RAIN", label: "PLUJA INTENSA", emoji: "🟡", score };
  return { level: 0, code: "NORMAL", label: "PLUJA SENSE PERILL", emoji: "🟢", score };
}
