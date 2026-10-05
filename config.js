export const CONFIG = {
  meteoclimatic: [
    { id: "ESCAT0800000008912A", name: "Badalona Centre", priority: 5 },
    { id: "ESCAT0800000008912B", name: "Badalona Progrés", priority: 5 },
    { id: "ESCAT0800000008915A", name: "Badalona Bufalà", priority: 5 },
    { id: "ESCAT0800000008915C", name: "Badalona BCIN", priority: 2 },
    { id: "ESCAT0800000008917B", name: "Badalona La Pau", priority: 1 },
    { id: "ESCAT0800000008913B", name: "Badalona S. Antoni Llefià", priority: 4 },
    { id: "ESCAT0800000008911C", name: "Badalona Dalt la Vila", priority: 2 }
  ],
  weathercloud: [
    { id: "8575692672", name: "Badalona" },
    { id: "1033247952", name: "Salvador Espriu" },
    { id: "0113601253", name: "Torre Mena" },
    { id: "3460315932", name: "La Salut" }
  ],
  meteocat: { station: "WU", precipitationVariable: 30 },
  optionalApis: false,
  history: { key: "badalona:rain:history", minutes: 24 * 60 }
};
