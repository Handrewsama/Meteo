# Meteo Badalona Worker modular

Aquesta versió divideix el Worker en mòduls perquè sigui més fàcil mantenir-lo.

Fitxers:
- worker.js: entrada i rutes.
- config.js: estacions i configuració.
- utils.js: funcions comunes.
- meteoclimatic.js: connector Meteoclimatic.
- weathercloud.js: connector Weathercloud.
- history.js: Cloudflare KV i històric.
- risk.js: classificació per zona.
- summary.js: resum.

Tots els fitxers han d'estar al mateix projecte/Worker i el binding KV ha de continuar sent METEO_KV.

NOTA: la versió actual manté el càlcul temporal basat en rainToday. Abans d'usar el semàfor com a alerta real, cal validar aquest comportament amb dades històriques i, idealment, incorporar radar/avisos oficials.
