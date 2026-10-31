# Meteo Sicilia — PWA 0.1 (prototipo privato)

## Funzionalità
- Previsioni reali tramite Open-Meteo (richiede Internet)
- Località siciliane e GPS con consenso
- Prossime 12 ore, 7 giorni, confronto sperimentale ECMWF/GFS/ICON
- Predisposizione UI per Ecowitt San Giovannello (non ancora collegata)

## Uso su Android senza computer
1. Pubblicare **questa cartella** tramite un servizio gratuito di hosting statico che offra HTTPS, per esempio GitHub Pages o Cloudflare Pages. Evitare di includere password o chiavi API nel codice.
2. Aprire l'URL HTTPS in Chrome Android.
3. Menu ⋮ > Aggiungi a schermata Home / Installa app.
4. Autorizzare il GPS solo se desiderato.

NOTA: il file `index.html` aperto direttamente come file locale non garantisce GPS, service worker o installazione PWA. Il codice non è ancora un APK. Il sito non implementa accesso privato: un URL pubblicato su hosting statico può essere visitato da altri, anche se non pubblicizzato.

Open-Meteo: consultare le condizioni per uso non commerciale e i limiti API. Non utilizzare questa versione per allerte di sicurezza.
