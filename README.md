# Meteo Sicilia — PWA 0.3

Previsioni Open-Meteo e stazione Ecowitt San Giovannello.

## Installazione
Caricare su GitHub Pages **solo** i sei file PWA: `index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `README.md`.

## Cloudflare Worker
Il file `worker.js` è fornito **separatamente**: sostituisce il codice del Worker Cloudflare `meteo-sicilia-ecowitt`. NON caricarlo nel repository GitHub.

Configurare in Cloudflare tre **Secret**: `ECOWITT_APPLICATION_KEY`, `ECOWITT_API_KEY`, `ECOWITT_DEVICE_MAC`. Non inserire mai i valori nel codice o su GitHub.

Nota: l'endpoint restituisce dati esterni della stazione ed è pubblico. La cache edge riduce le chiamate, ma non costituisce un limite globale di frequenza né un sistema di autenticazione. Valutare limiti Cloudflare per l'uso pubblico.
