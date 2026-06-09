<p align="center">
	<img src="https://res.cloudinary.com/dxudggkln/image/upload/v1780140804/favicon_qt7k3d.png" alt="SmartFare logo" width="96">
</p>

# SmartFare

SmartFare è una piattaforma di pianificazione viaggi per l’Italia che combina un’esperienza pubblica di scoperta, una mappa interattiva, un builder manuale di itinerari e due flussi di pianificazione assistiti da IA. Il repository è organizzato come monorepo con due applicazioni runtime:

- [Smartfare-Backend](Smartfare-Backend) - backend Express, Prisma, PostgreSQL, IA, autenticazione, upload media e API.
- [Smartfare-Frontend](Smartfare-Frontend) - SPA Angular con routing, SEO, i18n, rendering mappe e UX per gli itinerari.

Il repository contiene anche strumenti di utilità in [utils](utils) per la generazione di documenti, l’arricchimento dei dati attività e la generazione di QR code.

## Panoramica

SmartFare consente agli utenti di cercare destinazioni, consultare itinerari pubblici, esplorare una mappa interattiva dei POI, creare o modificare manualmente i piani di viaggio e usare un assistente IA per generare o rifinire gli itinerari. Il backend persiste utenti, sessioni, itinerari, preferiti, follower, località, strutture ricettive, attività e cronologia chat tramite modelli Prisma.

Il frontend non è un semplice involucro: gestisce metadati SEO a livello di route, cambio lingua, consenso cookie, gating dei social login, editing stateful degli itinerari, clustering sulla mappa e UX di chat IA in streaming.

## Funzionalità Principali

- Home pubblica con hero animato, itinerari in evidenza e sezioni CTA.
- Esperienza Discover con ranking itinerari, creator, viaggi vicini e ricerca tra viaggi, utenti e località.
- Mappa interattiva dell’Italia con Leaflet, clustering, caricamento bbox, categorie e ricerca geocoding.
- Planner manuale per iniziare un viaggio da una destinazione e da un intervallo di date.
- Builder itinerario con gestione POI, preview, summary, mappa e assistenza chat IA.
- Chat Smartfare AI con risposte in streaming, estrazione dello stato del planner, gestione sessioni e generazione itinerari.
- Autenticazione con email/password, Google e GitHub.
- Flussi di verifica email, recupero password, reset password e cambio password con codice.
- Profilo utente, follower, impostazioni e itinerari salvati.
- Preferiti e clonazione di itinerari pubblici.
- Upload media tramite Cloudinary.
- Moderazione contenuti lato client e lato server.
- Metadati SEO, canonical URL, JSON-LD, sitemap e rendering consapevole della lingua.
- Pipeline di utilità per documentazione, arricchimento attività e generazione QR.

## Stack Tecnologico

| Livello | Tecnologia | Versione | Utilizzo |
|---|---:|---:|---|
| Frontend | Angular | 21.2.x | SPA, routing, DI, signals, build tooling |
| Frontend | TypeScript | 5.9.x | Logica applicativa |
| Frontend | RxJS | 7.8.x | Flussi HTTP e reattivi |
| Frontend | Leaflet | 1.9.x | Mappe interattive |
| Frontend | leaflet.markercluster | 1.5.x | Clustering dei marker |
| Frontend | Bootstrap | 5.3.x | Layout e primitive UI |
| Frontend | AOS / typed.js | 2.3.x / 3.0.x | Motion ed effetti di typing |
| Frontend | Angular social login | 2.6.x | Sign-in Google |
| Backend | Node.js + Express | 5.x | Server API |
| Backend | TypeScript | 5.6.x | Logica server |
| Backend | Prisma Client | 7.7.x | ORM e accesso allo schema |
| Backend | PostgreSQL | n/d | Persistenza principale |
| Backend | Zod | 4.3.x | Validazione richieste |
| Backend | Gemini API | n/d | Generazione IA |
| Backend | Cloudinary | n/d | Upload e storage media |
| Backend | Nodemailer / SendGrid | n/d | Invio email |
| Backend | JWT | 9.x | Token di sessione |
| Utilità | Python | n/d | Generazione QR e strumenti per la tesina |

## Architettura

SmartFare segue un’architettura a due applicazioni con un dominio condiviso:

1. Il frontend Angular gestisce rendering delle route, stato locale, UI ottimistica, rendering mappe, metadati SEO e interazioni utente.
2. Il backend Express espone endpoint REST e streaming SSE per il flusso chat IA.
3. Prisma è l’astrazione unica di persistenza per utenti, profili, preferenze, itinerari, chat, località e entità correlate.
4. Servizi esterni forniscono IA, geocoding, email, immagini e social sign-in.

### Backend

Il bootstrap del backend si trova in [Smartfare-Backend/server.ts](Smartfare-Backend/server.ts). Il file crea l’app Express da [Smartfare-Backend/src/app.ts](Smartfare-Backend/src/app.ts) e poi ascolta sulla `PORT`, con default `3000`.

`createApp()` configura:

- `trust proxy` per i deploy dietro reverse proxy.
- Logging delle richieste con request id.
- Header di sicurezza con `helmet`.
- Rate limiting globale.
- Allowlist CORS tramite `FRONTEND_URL` e supporto opzionale ai preview Vercel.
- Parsing JSON con limite `1mb`.
- Moderazione contenuti lato server.
- Servizio statico della cartella [Smartfare-Backend/public](Smartfare-Backend/public).
- Endpoint `/health` per i check di piattaforma.
- Mount delle route per auth, locations, itineraries, AI, chat, activity, accommodation, upload, profile, follow e moderation tokens.
- Gestione errori globale.

### Frontend

Il frontend parte da [Smartfare-Frontend/src/main.ts](Smartfare-Frontend/src/main.ts), che registra la locale italiana e avvia [Smartfare-Frontend/src/app/app.component.ts](Smartfare-Frontend/src/app/app.component.ts) usando [Smartfare-Frontend/src/app/app.config.ts](Smartfare-Frontend/src/app/app.config.ts).

L’app Angular usa:

- componenti standalone lazy-loaded;
- signals per gran parte dello stato locale e condiviso;
- interceptor HTTP funzionali per auth, moderazione e loader;
- metadati SEO a livello di route tramite `data.seoKey`;
- traduzione del DOM tramite un servizio i18n e un pipe personalizzato;
- una shell UI condivisa con alert, loader, consenso cookie, privacy e TOS.

### Flusso Dati

- I componenti UI chiamano i servizi di feature in [Smartfare-Frontend/src/app/core/services](Smartfare-Frontend/src/app/core/services).
- Quei servizi chiamano endpoint backend sotto `/auth`, `/api/...` oppure servizi esterni quando necessario.
- Le route backend delegano a classi di servizio in [Smartfare-Backend/src/services](Smartfare-Backend/src/services).
- Prisma persiste il risultato e garantisce l’integrità delle relazioni.
- I flussi IA combinano stato itinerario persistito, contesto delle preferenze utente e dati di catalogo dal database.

## Struttura del Progetto

```text
SmartFare/
├── README.md
├── Smartfare-Backend/
│   ├── package.json
│   ├── package-lock.json
│   ├── server.ts
│   ├── check_db.ts
│   ├── run-migration.ts
│   ├── run-auth-session-migration.ts
│   ├── prisma.config.ts
│   ├── tsconfig.json
│   ├── vercel.json
│   ├── public/
│   │   └── index.html
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │       ├── 20260508_add_chat_sessions.sql
│   │       ├── 20260510_add_auth_sessions.sql
│   │       ├── 20260514_add_image_to_location.sql
│   │       └── manual_remove_transport.sql
│   ├── scratch/
│   │   └── check-locations.ts
│   └── src/
│       ├── app.ts
│       ├── config/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── schemas/
│       ├── services/
│       └── utils/
├── Smartfare-Frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── angular.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.spec.json
│   ├── vercel.json
│   ├── scripts/
│   │   └── generate-sitemap.mjs
│   ├── public/
│   │   ├── robots.txt
│   │   ├── sitemap.xml
│   │   ├── favicon.png
│   │   ├── world-map.svg
│   │   └── assets/
│   └── src/
│       ├── index.html
│       ├── main.ts
│       ├── styles.css
│       ├── environments/
│       └── app/
│           ├── app.component.ts
│           ├── app.component.html
│           ├── app.component.css
│           ├── app.config.ts
│           ├── app.routes.ts
│           ├── core/
│           ├── features/
│           └── shared/
└── utils/
	├── docs/
	├── generate activities/
	└── generate qr/
```

### Note sulle Cartelle

- `Smartfare-Backend/src/config` contiene il wiring di Prisma e Cloudinary.
- `Smartfare-Backend/src/middleware` contiene auth JWT, moderazione ed error handling.
- `Smartfare-Backend/src/routes` contiene tutti gli entrypoint API pubblici.
- `Smartfare-Backend/src/services` contiene la logica auth, IA, itinerari, email, immagini e moderazione.
- `Smartfare-Backend/src/schemas` contiene la validazione Zod dei payload in ingresso.
- `Smartfare-Backend/src/models` contiene i contratti TypeScript condivisi dai servizi.
- `Smartfare-Backend/src/utils` contiene gli helper per la readiness del planner e le preferenze utente.
- `Smartfare-Frontend/src/app/core` contiene auth, stato, interceptor, SEO, i18n e servizi riusabili.
- `Smartfare-Frontend/src/app/features` contiene le schermate di route e gli alberi di componenti.
- `Smartfare-Frontend/src/app/shared` contiene componenti condivisi, come le card itinerario.

## Flusso dell’Applicazione

### Avvio

1. Il backend parte da [Smartfare-Backend/server.ts](Smartfare-Backend/server.ts).
2. L’app viene configurata in [Smartfare-Backend/src/app.ts](Smartfare-Backend/src/app.ts).
3. Il frontend parte da [Smartfare-Frontend/src/main.ts](Smartfare-Frontend/src/main.ts).
4. Angular bootstrappa [AppComponent](Smartfare-Frontend/src/app/app.component.ts) e applica [appConfig](Smartfare-Frontend/src/app/app.config.ts).
5. La SEO viene inizializzata al primo render e a ogni cambio di route.

### Routing

- Le route frontend sono definite in [Smartfare-Frontend/src/app/app.routes.ts](Smartfare-Frontend/src/app/app.routes.ts).
- Le route pubbliche includono home, discover, interactive map, login, register, forgot-password, reset-password, verify-email, manual planner, preview e callback OAuth.
- Le route protette sono presidiate da `authGuard` per profilo, impostazioni, itinerari, follower e Voyager.
- Il backend monta le route REST sotto `/api`, `/auth` e `/public`.

### Autenticazione

- `login`, `register`, `google` e `github` sono gestiti dalle route auth.
- I token JWT contengono `userId`, `email`, `sessionId` e dati profilo opzionali.
- La validazione auth lato backend controlla sia la firma JWT sia lo stato di revoca in `AuthSession`.
- Il frontend conserva i token in `localStorage` e le registrazioni social in sospeso in `sessionStorage`.
- L’autenticazione social è bloccata se non sono accettati i cookie funzionali.

### Planner e IA

- Il planner manuale inizializza un itinerario a partire da destinazione e intervallo date.
- Il builder itinerario carica il workspace della location selezionata, combina i POI di accommodation e attività e persiste le bozze.
- Il flusso Smartfare AI usa streaming SSE da `/api/chat/sessions/:id/stream`.
- L’API IA dedicata crea o modifica un itinerario usando Gemini e il catalogo delle destinazioni.

### Persistenza Dati

- Utenti, sessioni, itinerari, preferiti, profili, preferenze, località, attività e accommodation sono memorizzati tramite Prisma.
- Il backend mantiene coerenti lo stato itinerario e lo stato chat collegando `ChatSession` e `Itinerary` dove opportuno.
- Le immagini delle località possono essere memorizzate nel database dopo il primo fetch.

### Rendering e Deploy

- Angular usa componenti standalone lazy-loaded e stili globali in [Smartfare-Frontend/src/styles.css](Smartfare-Frontend/src/styles.css).
- Il build frontend genera `sitemap.xml` prima di `ng build`.
- Il backend serve `public/index.html` quando i file statici sono presenti ed espone `/health` per i controlli di deploy.
- Esistono configurazioni Vercel per entrambe le app, ma il codice backend è un normale server Node, non un handler serverless puro.

## Installazione

### Prerequisiti

- Node.js 20+ consigliato.
- npm 11+ come dichiarato nel frontend.
- Database PostgreSQL.
- Prisma CLI/runtime.
- Account e chiavi opzionali per Gemini, Cloudinary, Google OAuth, GitHub OAuth, invio email e Unsplash.

### Clonare il Repository

```bash
git clone <repository-url>
cd SmartFare
```

### Installazione Dipendenze

Installa le dipendenze separatamente nelle due app:

```bash
cd Smartfare-Backend
npm install

cd ..\Smartfare-Frontend
npm install
```

### Configurazione Ambiente

Il repository non include un file `.env.example`. Le variabili usate dal codice sono le seguenti.

#### Ambiente Backend

| Variabile | Scopo |
|---|---|
| `PORT` | Porta HTTP del server backend. Default: `3000` in `server.ts`. |
| `NODE_ENV` | Abilita comportamenti di produzione nella sicurezza e nell’email. |
| `FRONTEND_URL` | Allowlist CORS, separata da virgole. Usata anche per redirect OAuth e link email. |
| `BACKEND_URL` | Base URL usato per generare i redirect OAuth backend. |
| `ALLOW_VERCEL_PREVIEW_ORIGINS` | Consente origin `*.vercel.app` quando impostato a `true`. |
| `JWT_SECRET` | Secret per firma e verifica JWT. Obbligatoria. |
| `JWT_EXPIRES_IN` | Durata del JWT. Default: `7d`. |
| `DIRECT_URL` | URL datasource Prisma in [prisma.config.ts](Smartfare-Backend/prisma.config.ts). |
| `GEMINI_API_KEY` | Necessaria per Smartfare AI e generazione itinerari. |
| `GEMINI_MODEL` | Modello Gemini primario, con fallback nei servizi IA. |
| `ID_CLIENT` | Client id Google OAuth per il login Google. |
| `GITHUB_CLIENT_ID` | Client id GitHub OAuth. |
| `GITHUB_CLIENT_SECRET` | Client secret GitHub OAuth. |
| `UNSPLASH_ACCESS_KEY` | Lookup e caching delle immagini delle località. |
| `SMTP_HOST` | Host SMTP per nodemailer. |
| `SMTP_PORT` | Porta SMTP per nodemailer. |
| `SMTP_USER` | Username SMTP e possibile fallback come mittente. |
| `SMTP_PASS` | Password SMTP. |
| `SMTP_FROM` | Override opzionale del mittente. |
| `EMAIL_FROM` | Indirizzo mittente preferito. |
| `SENDGRID_API_KEY` | Abilita l’invio via SendGrid HTTP. |
| `FORCE_SENDGRID` | Forza il ramo SendGrid quando `true`. |

#### Ambiente Frontend

| Variabile | File | Scopo |
|---|---|---|
| `apiUrl` | [Smartfare-Frontend/src/environments/environment.ts](Smartfare-Frontend/src/environments/environment.ts) | URL base delle API usato dai servizi Angular. |
| `siteUrl` | [Smartfare-Frontend/src/environments/environment.ts](Smartfare-Frontend/src/environments/environment.ts) | URL canonico del sito usato da SEO e sitemap. |

I valori attuali mostrano direttamente URL locali e di produzione nei file di environment. Non esiste un `.env.example` separato per il frontend.

### Avvio in Development

Backend:

```bash
cd Smartfare-Backend
npm run dev
```

Frontend:

```bash
cd Smartfare-Frontend
npm start
```

### Avvio in Production

Backend:

```bash
cd Smartfare-Backend
npm run build
npm start
```

Frontend:

```bash
cd Smartfare-Frontend
npm run build
```

## API

### Auth

| Metodo | Endpoint | Scopo | Auth |
|---|---|---|---|
| POST | `/auth/login` | Login con email/password. | No |
| POST | `/auth/register` | Registrazione locale o social. | No |
| GET | `/auth/github` | Avvia il flusso OAuth GitHub. | No |
| GET | `/auth/github/callback` | Completa il flusso OAuth GitHub. | No |
| POST | `/auth/google` | Sign-in Google tramite ID token. | No |
| POST | `/auth/logout` | Revoca la sessione auth corrente. | Sì |
| POST | `/auth/forgot-password` | Invia il link per il reset password. | No |
| POST | `/auth/reset-password` | Reset password con token. | No |
| POST | `/auth/verify-email` | Verifica l’email dell’account. | No |

Gli errori comuni includono validazione Zod, credenziali non valide, account non verificato, configurazione OAuth mancante, token di reset scaduto e stato di revoca sessione non valido.

### Località

| Metodo | Endpoint | Scopo |
|---|---|---|
| GET | `/api/locations` | Cerca località per nome, provincia o CAP. |
| GET | `/api/locations/carousel` | Restituisce località in evidenza con conteggio itinerari pubblici. |
| GET | `/api/locations/random-image` | Restituisce un’immagine località casuale cacheata o un fallback. |

### Attività e Accommodation

| Metodo | Endpoint | Scopo |
|---|---|---|
| GET | `/api/activity/categories` | Elenca le categorie che hanno almeno un’attività. Restituisce anche `hasHotels`. |
| GET | `/api/activity/area` | Carica attività e accommodation dentro una bounding box per la mappa. |
| GET | `/api/accommodation` | Restituisce le accommodation per un `locationId`. |

### Itinerari

| Metodo | Endpoint | Scopo |
|---|---|---|
| GET | `/api/itineraries/workspace` | Restituisce il workspace aggregato per il builder. |
| GET | `/api/itineraries/latest` | Carica l’ultima bozza dell’utente autenticato. |
| GET | `/api/itineraries/public` | Elenca gli itinerari pubblici, con filtri opzionali per location, ricerca e trending. |
| GET | `/api/itineraries/public/nearby` | Itinerari pubblici vicino all’ultima destinazione dell’utente. |
| GET | `/api/itineraries/public/:id/route` | Coordinate del percorso per la mappa discover. |
| GET | `/api/itineraries/public/:id` | Carica un itinerario pubblico per id. |
| POST | `/api/itineraries/copy/:id` | Clona un itinerario pubblico o posseduto dall’utente corrente. |
| POST | `/api/itineraries` | Crea o aggiorna una bozza itinerario. |
| GET | `/api/itineraries/me` | Carica gli itinerari dell’utente. |
| GET | `/api/itineraries/favorites` | Carica gli itinerari preferiti. |
| DELETE | `/api/itineraries/:id` | Elimina un itinerario posseduto. |
| POST | `/api/itineraries/:id/favorite` | Aggiunge ai preferiti. |
| DELETE | `/api/itineraries/:id/favorite` | Rimuove dai preferiti. |
| GET | `/api/itineraries/:id/favorite-status` | Verifica lo stato dei preferiti. |
| GET | `/api/itineraries/:id` | Carica un itinerario privato posseduto dall’utente corrente. |

### IA

| Metodo | Endpoint | Scopo |
|---|---|---|
| POST | `/api/ai/itinerary/chat` | Modifica o rifinisce un itinerario con Gemini. |
| POST | `/api/ai/itinerary/generate` | Genera un nuovo itinerario dopo il riconoscimento della destinazione. |

### Chat

| Metodo | Endpoint | Scopo |
|---|---|---|
| GET | `/api/chat/sessions` | Elenca le sessioni chat dell’utente corrente. |
| POST | `/api/chat/sessions` | Crea una nuova sessione chat. |
| GET | `/api/chat/sessions/:id/messages` | Recupera i messaggi di una sessione. |
| PATCH | `/api/chat/sessions/:id` | Rinomina, pinna, attiva/disattiva o cambia modo. |
| DELETE | `/api/chat/sessions/:id` | Elimina sessione e messaggi. |
| POST | `/api/chat/sessions/:id/stream` | Esegue streaming della risposta IA via SSE. |
| POST | `/api/chat/sessions/:id/generate-itinerary` | Genera l’itinerario finale dalla chat planner. |

### Profilo, Follow e Account

| Metodo | Endpoint | Scopo |
|---|---|---|
| GET | `/api/profile/me` | Profilo, conteggi e preferenze dell’utente autenticato. |
| GET | `/api/profile/me/followers` | Elenco follower dell’utente corrente. |
| GET | `/api/profile/top-creators` | Creator ordinati per numero follower. |
| GET | `/api/profile/featured-explorers` | Creator con itinerari pubblici, ordinati per recenza. |
| GET | `/api/profile/search` | Ricerca utenti per nome/cognome. |
| GET | `/api/profile/:id` | Vista profilo pubblica. |
| PATCH | `/api/profile/me` | Aggiorna i campi del profilo. |
| PATCH | `/api/profile/preferences` | Aggiorna preferenze di viaggio e interessi. |
| POST | `/api/profile/password/send-code` | Invia un codice a 6 cifre per cambiare password. |
| POST | `/api/profile/password/reset` | Reimposta la password usando il codice. |
| POST | `/api/profile/upload/avatar` | Upload avatar su Cloudinary e salvataggio URL. |
| POST | `/api/profile/upload/background` | Upload immagine di background. |
| DELETE | `/api/profile/account` | Elimina account e dati correlati. |

### Follow

| Metodo | Endpoint | Scopo |
|---|---|---|
| POST | `/api/follow/:userId` | Segue un utente. |
| DELETE | `/api/follow/:userId` | Smette di seguire un utente. |
| GET | `/api/follow/status/:userId` | Verifica lo stato di follow. |

### Upload

| Metodo | Endpoint | Scopo |
|---|---|---|
| POST | `/api/upload/image` | Upload Cloudinary autenticato generico, opzionalmente collegato a un itinerario. |

### Moderazione

| Metodo | Endpoint | Scopo |
|---|---|---|
| GET | `/public/moderation/tokens` | Mappa pubblica dei token di moderazione per la sincronizzazione lato client. |

## Database

Lo schema Prisma in [Smartfare-Backend/prisma/schema.prisma](Smartfare-Backend/prisma/schema.prisma) definisce il modello dati principale.

### Modelli Principali

- `User` - identità account e stato auth.
- `AuthSession` - lista di revoca delle sessioni JWT.
- `ChatSession` - metadati della sessione chat Voyager.
- `ChatMessage` - messaggi persistiti del planner/assistant.
- `UserProfile` - informazioni pubbliche del profilo.
- `UserPreference` - impostazioni preferenze di viaggio.
- `UserPreferenceInterest` - many-to-many tra preferenze e categorie attività.
- `Location` - catalogo delle destinazioni.
- `Follow` - grafo sociale.
- `Accommodation` - POI di tipo hotel/struttura ricettiva.
- `ActivityCategory` - tassonomia delle attività.
- `Activity` - POI per le schermate discover e builder.
- `ItineraryVisibility` - lookup per lo stato di visibilità.
- `Itinerary` - entità principale dell’itinerario.
- `ItineraryFavorite` - relation many-to-many dei preferiti.
- `ItineraryItemType` - lookup del tipo di item itinerario.
- `ItineraryItem` - item dell’itinerario per giorno e ordine.

### Relazioni

- Un utente ha un profilo e una preferenza.
- Un utente possiede molti itinerari, preferiti, sessioni chat e auth session.
- Una località possiede molte accommodation, attività, itinerari e chat session.
- Una chat session può essere collegata a un itinerario.
- Un itinerario contiene molti item e molti preferiti.
- Un itinerary item può riferirsi a una activity o a una accommodation.
- Un record follow collega un utente a un altro utente.

### Migrazioni

- [20260508_add_chat_sessions.sql](Smartfare-Backend/prisma/migrations/20260508_add_chat_sessions.sql) aggiunge `ChatSession` e `ChatMessage`.
- [20260510_add_auth_sessions.sql](Smartfare-Backend/prisma/migrations/20260510_add_auth_sessions.sql) aggiunge `AuthSession` e rimuove il vecchio approccio a singola sessione.
- [20260514_add_image_to_location.sql](Smartfare-Backend/prisma/migrations/20260514_add_image_to_location.sql) aggiunge `Location.image` per le immagini cacheate.
- [manual_remove_transport.sql](Smartfare-Backend/prisma/migrations/manual_remove_transport.sql) rimuove le tabelle transport, le colonne transport e corregge anche la migrazione del typo/primary key di `UserPreferenceInterest`.

### Note sul Database

- `ItineraryVisibility` e `ItineraryItemType` sono lookup model, ma nel repository non è presente uno script seed dedicato.
- `TRANSPORT` compare ancora negli schema di request per compatibilità, ma lo schema Prisma attuale non contiene più le tabelle transport.

## Sicurezza

Le misure implementate includono:

- `helmet` nel backend.
- Rate limiting globale e per route.
- Allowlist CORS con supporto opzionale ai preview.
- Validazione JWT più controllo di revoca delle sessioni su `AuthSession`.
- Auth opzionale per le route pubbliche che possono beneficiare del contesto utente.
- Moderazione contenuti lato client e lato server.
- Restrizioni sugli upload tramite configurazione Cloudinary e guardie di route.
- Route protette in Angular tramite `authGuard`.
- Gating del consenso cookie per cookie funzionali e flussi social login.
- Sanitizzazione degli URL di ritorno per i flussi OAuth.

## Testing

Nel repository non è stato trovato un test suite sostanziale.

- Il package backend dichiara `jest` e `supertest`, ma non sono presenti file `*.test.ts` o `*.spec.ts`.
- Il package frontend dichiara `ng test` e `vitest`, ma non sono presenti test corrispondenti.

In pratica il repository espone gli strumenti di testing, ma non test mantenuti.

## Deployment

### Frontend

- [Smartfare-Frontend/vercel.json](Smartfare-Frontend/vercel.json) configura le rewrite SPA verso `index.html`.
- [Smartfare-Frontend/scripts/generate-sitemap.mjs](Smartfare-Frontend/scripts/generate-sitemap.mjs) genera `public/sitemap.xml` a partire da `seo.config.ts` prima del build.
- L’output di produzione è configurato su `dist/SmartFare/browser`.

### Backend

- [Smartfare-Backend/vercel.json](Smartfare-Backend/vercel.json) indirizza le richieste verso `server.ts` e include `public/**`.
- Il backend espone anche `/health` e il serving statico per gli ambienti che usano un server Node persistente.

### Artefatti Mancanti per il Deploy

- Nessun `Dockerfile` trovato.
- Nessun `docker-compose.yml` trovato.
- Nessun workflow GitHub Actions trovato.

## Dipendenze Principali

### Dipendenze Backend

| Package | Scopo |
|---|---|
| `express` | Server HTTP e routing |
| `cors` | Policy CORS |
| `helmet` | Header di sicurezza |
| `express-rate-limit` | Controllo abusi |
| `prisma`, `@prisma/client`, `@prisma/adapter-pg` | Accesso al database |
| `zod` | Validazione input |
| `jsonwebtoken` | Access token |
| `bcryptjs` | Hash password |
| `nodemailer`, `axios` | Invio email |
| `cloudinary`, `multer`, `multer-storage-cloudinary` | Gestione upload |
| `@google/generative-ai` | Chiamate Gemini IA |
| `google-auth-library` | Login Google |
| `cheerio`, `query-string`, `xss`, `mime` | Supporto utility |

### Dipendenze Frontend

| Package | Scopo |
|---|---|
| `@angular/*` | Framework SPA |
| `rxjs` | Flussi reattivi |
| `bootstrap`, `bootstrap-icons` | UI e icone |
| `leaflet`, `leaflet.markercluster` | Rendering e clustering mappe |
| `@abacritt/angularx-social-login` | Sign-in social Google |
| `aos`, `typed.js` | Motion e typing hero |

### Utilità

- [utils/generate qr/main.py](utils/generate%20qr/main.py) genera l’immagine QR del progetto.
- [utils/generate activities/enrich.mjs](utils/generate%20activities/enrich.mjs) e i file correlati supportano l’arricchimento di attività/categorie.
- [utils/docs/generate_tesina.py](utils/docs/generate_tesina.py) supporta la generazione della documentazione della tesina.

## Problemi Noti

Queste sono criticità concrete rilevate dallo stato attuale del repository:

- [Smartfare-Frontend/src/environments/environment.ts](Smartfare-Frontend/src/environments/environment.ts) punta a `http://localhost:3421`, mentre [Smartfare-Backend/server.ts](Smartfare-Backend/server.ts) usa `3000` di default e [Smartfare-Backend/src/services/auth/auth.service.ts](Smartfare-Backend/src/services/auth/auth.service.ts) usa `3001` come fallback per gli URL backend. La configurazione locale risulta incoerente se le variabili ambiente non vengono allineate.
- [Smartfare-Backend/package.json](Smartfare-Backend/package.json) dichiara `populate-db`, `populate-hotels` ed `export-locations`, ma i file `src/scripts/*` referenziati non sono presenti nell’albero del repository.
- [Smartfare-Backend/run-migration.ts](Smartfare-Backend/run-migration.ts) contiene statement SQL e step di migrazione duplicati, rendendo lo script fragile e più difficile da mantenere.
- [Smartfare-Backend/src/services/email/email.service.ts](Smartfare-Backend/src/services/email/email.service.ts) chiama `fs.existsSync()` su una URL Cloudinary quando costruisce un fallback logo, quindi il fallback locale non può funzionare come previsto.
- [Smartfare-Backend/public/index.html](Smartfare-Backend/public/index.html) contiene un attributo non valido `crossdeparture` nel tag preconnect di Google Fonts.
- [Smartfare-Frontend/src/app/core/services/script-loader.service.ts](Smartfare-Frontend/src/app/core/services/script-loader.service.ts) è attualmente uno stub, anche se viene iniettato da [Smartfare-Frontend/src/app/app.component.ts](Smartfare-Frontend/src/app/app.component.ts).
- Non esiste una suite di test formale né una pipeline CI nel repository.

## Miglioramenti Consigliati

- Aggiungere un file `.env.example` versionato per backend e frontend.
- Normalizzare le porte locali tra backend, frontend e default dei redirect auth.
- Rimuovere oppure ripristinare i utility `src/scripts` mancanti dichiarati in `package.json`.
- Aggiungere almeno un test di integrazione backend per auth/session e uno smoke test frontend per il routing.
- Sostituire lo script di migrazione manuale duplicato con un percorso idempotente unico, via SQL o Prisma.
- Correggere il fallback logo email e l’attributo HTML non valido nella pagina pubblica backend.
- Introdurre una strategia di seed per tabelle lookup e cataloghi.
- Valutare una workflow CI per build, lint e test.

## Conclusioni

SmartFare è una piattaforma di viaggio piuttosto completa, con una separazione netta tra scoperta pubblica, creazione di itinerari e pianificazione assistita dall’IA. Il frontend gestisce una UX ricca e la SEO runtime, mentre il backend centralizza persistenza, moderazione, controllo sessioni, upload media e orchestrazione IA. Il repository è funzionale, ma resta privo di copertura test, CI, contratto ambientale documentato e di alcuni punti di pulizia negli script e negli helper email/deploy.

## Riassunto Analisi File

Questo README è stato prodotto dopo aver ispezionato la struttura del repository e i file runtime rilevanti di entrambe le applicazioni più le cartelle di utilità.

### Root

- [README.md](README.md) - contenuto sostituito con questa analisi del progetto.
- `.vscode/settings.json` - sole impostazioni workspace.

### File Backend Analizzati

- [Smartfare-Backend/package.json](Smartfare-Backend/package.json) - script, dipendenze e target mancanti.
- [Smartfare-Backend/package-lock.json](Smartfare-Backend/package-lock.json) - lock file generato delle dipendenze.
- [Smartfare-Backend/server.ts](Smartfare-Backend/server.ts) - bootstrap server.
- [Smartfare-Backend/src/app.ts](Smartfare-Backend/src/app.ts) - configurazione app Express.
- [Smartfare-Backend/prisma.config.ts](Smartfare-Backend/prisma.config.ts) - configurazione schema e datasource Prisma.
- [Smartfare-Backend/prisma/schema.prisma](Smartfare-Backend/prisma/schema.prisma) - modello dati principale.
- [Smartfare-Backend/prisma/migrations/20260508_add_chat_sessions.sql](Smartfare-Backend/prisma/migrations/20260508_add_chat_sessions.sql) - migrazione chat session.
- [Smartfare-Backend/prisma/migrations/20260510_add_auth_sessions.sql](Smartfare-Backend/prisma/migrations/20260510_add_auth_sessions.sql) - migrazione auth session.
- [Smartfare-Backend/prisma/migrations/20260514_add_image_to_location.sql](Smartfare-Backend/prisma/migrations/20260514_add_image_to_location.sql) - migrazione immagine location.
- [Smartfare-Backend/prisma/migrations/manual_remove_transport.sql](Smartfare-Backend/prisma/migrations/manual_remove_transport.sql) - migrazione di pulizia transport.
- [Smartfare-Backend/src/config/prisma.ts](Smartfare-Backend/src/config/prisma.ts) - wiring client Prisma.
- [Smartfare-Backend/src/config/cloudinary.ts](Smartfare-Backend/src/config/cloudinary.ts) - configurazione upload Cloudinary.
- [Smartfare-Backend/src/middleware/auth.middleware.ts](Smartfare-Backend/src/middleware/auth.middleware.ts) - auth JWT e auth opzionale.
- [Smartfare-Backend/src/middleware/content-moderation.middleware.ts](Smartfare-Backend/src/middleware/content-moderation.middleware.ts) - moderazione server-side.
- [Smartfare-Backend/src/middleware/error.middleware.ts](Smartfare-Backend/src/middleware/error.middleware.ts) - gestione validazione/errori.
- [Smartfare-Backend/src/routes/auth.route.ts](Smartfare-Backend/src/routes/auth.route.ts) - endpoint auth.
- [Smartfare-Backend/src/routes/location.route.ts](Smartfare-Backend/src/routes/location.route.ts) - endpoint località.
- [Smartfare-Backend/src/routes/itinerary.route.ts](Smartfare-Backend/src/routes/itinerary.route.ts) - endpoint itinerari.
- [Smartfare-Backend/src/routes/ai.route.ts](Smartfare-Backend/src/routes/ai.route.ts) - endpoint IA.
- [Smartfare-Backend/src/routes/chat.route.ts](Smartfare-Backend/src/routes/chat.route.ts) - endpoint sessioni Voyager.
- [Smartfare-Backend/src/routes/activity.route.ts](Smartfare-Backend/src/routes/activity.route.ts) - endpoint attività.
- [Smartfare-Backend/src/routes/accommodation.route.ts](Smartfare-Backend/src/routes/accommodation.route.ts) - endpoint accommodation.
- [Smartfare-Backend/src/routes/upload.route.ts](Smartfare-Backend/src/routes/upload.route.ts) - endpoint upload.
- [Smartfare-Backend/src/routes/profile.route.ts](Smartfare-Backend/src/routes/profile.route.ts) - endpoint profilo, follower, preferenze, account.
- [Smartfare-Backend/src/routes/follow.route.ts](Smartfare-Backend/src/routes/follow.route.ts) - endpoint grafo follow.
- [Smartfare-Backend/src/routes/moderation.route.ts](Smartfare-Backend/src/routes/moderation.route.ts) - endpoint token moderazione.
- [Smartfare-Backend/src/services/auth/auth.service.ts](Smartfare-Backend/src/services/auth/auth.service.ts) - flussi auth e logica OAuth/email.
- [Smartfare-Backend/src/services/email/email.service.ts](Smartfare-Backend/src/services/email/email.service.ts) - astrazione invio email.
- [Smartfare-Backend/src/services/image/image.service.ts](Smartfare-Backend/src/services/image/image.service.ts) - fetch immagini località.
- [Smartfare-Backend/src/services/itinerary/itinerary.service.ts](Smartfare-Backend/src/services/itinerary/itinerary.service.ts) - CRUD itinerari e aggregazione workspace.
- [Smartfare-Backend/src/services/itinerary/itinerary-item-timing.util.ts](Smartfare-Backend/src/services/itinerary/itinerary-item-timing.util.ts) - normalizzazione timing item.
- [Smartfare-Backend/src/services/ai/chat.service.ts](Smartfare-Backend/src/services/ai/chat.service.ts) - orchestrazione chat Voyager.
- [Smartfare-Backend/src/services/ai/gemini.service.ts](Smartfare-Backend/src/services/ai/gemini.service.ts) - generazione/modifica itinerari con Gemini.
- [Smartfare-Backend/src/services/moderation/textModeration.service.ts](Smartfare-Backend/src/services/moderation/textModeration.service.ts) - rilevamento token moderazione.
- [Smartfare-Backend/src/services/moderation/moderation-tokens.json](Smartfare-Backend/src/services/moderation/moderation-tokens.json) - catalogo token moderazione.
- [Smartfare-Backend/src/utils/planner-ready.util.ts](Smartfare-Backend/src/utils/planner-ready.util.ts) - helper readiness planner.
- [Smartfare-Backend/src/utils/user-preference.util.ts](Smartfare-Backend/src/utils/user-preference.util.ts) - caricamento preferenze e prompt block.
- [Smartfare-Backend/src/models/auth.model.ts](Smartfare-Backend/src/models/auth.model.ts) - contratti auth.
- [Smartfare-Backend/src/models/chat.model.ts](Smartfare-Backend/src/models/chat.model.ts) - contratti chat.
- [Smartfare-Backend/src/models/ai.model.ts](Smartfare-Backend/src/models/ai.model.ts) - contratti IA.
- [Smartfare-Backend/src/schemas/auth.schema.ts](Smartfare-Backend/src/schemas/auth.schema.ts) - validazione auth.
- [Smartfare-Backend/src/schemas/itinerary.schema.ts](Smartfare-Backend/src/schemas/itinerary.schema.ts) - validazione itinerari.
- [Smartfare-Backend/src/schemas/ai.schema.ts](Smartfare-Backend/src/schemas/ai.schema.ts) - validazione chat IA.
- [Smartfare-Backend/src/schemas/ai-generate.schema.ts](Smartfare-Backend/src/schemas/ai-generate.schema.ts) - validazione generazione IA.
- [Smartfare-Backend/src/schemas/accommodation.schema.ts](Smartfare-Backend/src/schemas/accommodation.schema.ts) - validazione accommodation.
- [Smartfare-Backend/public/index.html](Smartfare-Backend/public/index.html) - pagina statica server.
- [Smartfare-Backend/check_db.ts](Smartfare-Backend/check_db.ts) - helper ispezione DB.
- [Smartfare-Backend/run-migration.ts](Smartfare-Backend/run-migration.ts) - helper migrazione manuale.
- [Smartfare-Backend/run-auth-session-migration.ts](Smartfare-Backend/run-auth-session-migration.ts) - helper migrazione auth session.
- [Smartfare-Backend/scratch/check-locations.ts](Smartfare-Backend/scratch/check-locations.ts) - helper dump località.
- [Smartfare-Backend/tsconfig.json](Smartfare-Backend/tsconfig.json) - configurazione TypeScript.
- [Smartfare-Backend/vercel.json](Smartfare-Backend/vercel.json) - configurazione deploy.
- [Smartfare-Backend/.gitignore](Smartfare-Backend/.gitignore) - regole di ignore.

### File Frontend Analizzati

- [Smartfare-Frontend/package.json](Smartfare-Frontend/package.json) - script e dipendenze frontend.
- [Smartfare-Frontend/package-lock.json](Smartfare-Frontend/package-lock.json) - lock file generato.
- [Smartfare-Frontend/angular.json](Smartfare-Frontend/angular.json) - build, asset, style, script e budget Angular.
- [Smartfare-Frontend/tsconfig.json](Smartfare-Frontend/tsconfig.json) - configurazione TypeScript.
- [Smartfare-Frontend/tsconfig.app.json](Smartfare-Frontend/tsconfig.app.json) - configurazione TS app.
- [Smartfare-Frontend/tsconfig.spec.json](Smartfare-Frontend/tsconfig.spec.json) - configurazione TS test.
- [Smartfare-Frontend/vercel.json](Smartfare-Frontend/vercel.json) - configurazione SPA deploy.
- [Smartfare-Frontend/.gitignore](Smartfare-Frontend/.gitignore) - regole di ignore.
- [Smartfare-Frontend/.editorconfig](Smartfare-Frontend/.editorconfig) - regole di formattazione.
- [Smartfare-Frontend/scripts/generate-sitemap.mjs](Smartfare-Frontend/scripts/generate-sitemap.mjs) - generazione sitemap.
- [Smartfare-Frontend/src/main.ts](Smartfare-Frontend/src/main.ts) - bootstrap Angular.
- [Smartfare-Frontend/src/index.html](Smartfare-Frontend/src/index.html) - shell applicativa.
- [Smartfare-Frontend/src/styles.css](Smartfare-Frontend/src/styles.css) - tema globale e motion.
- [Smartfare-Frontend/src/environments/environment.ts](Smartfare-Frontend/src/environments/environment.ts) - endpoint dev.
- [Smartfare-Frontend/src/environments/environment.prod.ts](Smartfare-Frontend/src/environments/environment.prod.ts) - endpoint production.
- [Smartfare-Frontend/src/app/app.component.ts](Smartfare-Frontend/src/app/app.component.ts) - componente shell.
- [Smartfare-Frontend/src/app/app.component.html](Smartfare-Frontend/src/app/app.component.html) - template shell.
- [Smartfare-Frontend/src/app/app.component.css](Smartfare-Frontend/src/app/app.component.css) - stili shell.
- [Smartfare-Frontend/src/app/app.config.ts](Smartfare-Frontend/src/app/app.config.ts) - provider e interceptor HTTP.
- [Smartfare-Frontend/src/app/app.routes.ts](Smartfare-Frontend/src/app/app.routes.ts) - tabella routing.
- [Smartfare-Frontend/src/app/core/auth/auth.service.ts](Smartfare-Frontend/src/app/core/auth/auth.service.ts) - stato token e social auth.
- [Smartfare-Frontend/src/app/core/guards/auth.guard.ts](Smartfare-Frontend/src/app/core/guards/auth.guard.ts) - protezione route.
- [Smartfare-Frontend/src/app/core/interceptors/auth.interceptor.ts](Smartfare-Frontend/src/app/core/interceptors/auth.interceptor.ts) - aggiunta bearer token.
- [Smartfare-Frontend/src/app/core/interceptors/content-moderation.interceptor.ts](Smartfare-Frontend/src/app/core/interceptors/content-moderation.interceptor.ts) - moderazione client.
- [Smartfare-Frontend/src/app/core/interceptors/loader.interceptor.ts](Smartfare-Frontend/src/app/core/interceptors/loader.interceptor.ts) - gestione loader.
- [Smartfare-Frontend/src/app/core/services/alert.service.ts](Smartfare-Frontend/src/app/core/services/alert.service.ts) - stato alert/toast.
- [Smartfare-Frontend/src/app/core/services/cookie-consent.service.ts](Smartfare-Frontend/src/app/core/services/cookie-consent.service.ts) - stato consenso cookie.
- [Smartfare-Frontend/src/app/core/services/legal.service.ts](Smartfare-Frontend/src/app/core/services/legal.service.ts) - stato modali legali.
- [Smartfare-Frontend/src/app/core/services/script-loader.service.ts](Smartfare-Frontend/src/app/core/services/script-loader.service.ts) - attualmente stub.
- [Smartfare-Frontend/src/app/core/services/loader.service.ts](Smartfare-Frontend/src/app/core/services/loader.service.ts) - stato loader globale.
- [Smartfare-Frontend/src/app/core/services/location.service.ts](Smartfare-Frontend/src/app/core/services/location.service.ts) - client API località.
- [Smartfare-Frontend/src/app/core/services/activity.service.ts](Smartfare-Frontend/src/app/core/services/activity.service.ts) - client API attività.
- [Smartfare-Frontend/src/app/core/services/hotel.service.ts](Smartfare-Frontend/src/app/core/services/hotel.service.ts) - client API accommodation.
- [Smartfare-Frontend/src/app/core/services/geocoding.service.ts](Smartfare-Frontend/src/app/core/services/geocoding.service.ts) - client Nominatim.
- [Smartfare-Frontend/src/app/core/services/itinerary.service.ts](Smartfare-Frontend/src/app/core/services/itinerary.service.ts) - persistenza bozza e client API itinerari.
- [Smartfare-Frontend/src/app/core/services/itinerary-export.service.ts](Smartfare-Frontend/src/app/core/services/itinerary-export.service.ts) - pipeline export.
- [Smartfare-Frontend/src/app/core/services/profile.service.ts](Smartfare-Frontend/src/app/core/services/profile.service.ts) - client API profilo/follow.
- [Smartfare-Frontend/src/app/core/services/ui-state.service.ts](Smartfare-Frontend/src/app/core/services/ui-state.service.ts) - stato UI condiviso.
- [Smartfare-Frontend/src/app/core/services/voyager-chat.service.ts](Smartfare-Frontend/src/app/core/services/voyager-chat.service.ts) - stato sessioni/chat Voyager.
- [Smartfare-Frontend/src/app/core/seo/seo.service.ts](Smartfare-Frontend/src/app/core/seo/seo.service.ts) - SEO consapevole della route.
- [Smartfare-Frontend/src/app/core/seo/seo.config.ts](Smartfare-Frontend/src/app/core/seo/seo.config.ts) - registry SEO e voci sitemap.
- [Smartfare-Frontend/src/app/core/i18n/i18n.service.ts](Smartfare-Frontend/src/app/core/i18n/i18n.service.ts) - lingua e traduzione DOM.
- [Smartfare-Frontend/src/app/core/i18n/translate.pipe.ts](Smartfare-Frontend/src/app/core/i18n/translate.pipe.ts) - pipe di traduzione.
- [Smartfare-Frontend/src/app/core/i18n/translations.ts](Smartfare-Frontend/src/app/core/i18n/translations.ts) - catalogo traduzioni.
- [Smartfare-Frontend/src/app/core/models/*.ts](Smartfare-Frontend/src/app/core/models) - modelli di dominio condivisi.
- [Smartfare-Frontend/src/app/core/utils/*.ts](Smartfare-Frontend/src/app/core/utils) - helper planner, POI display e timing.
- [Smartfare-Frontend/src/app/shared/components/itinerary-card/itinerary-card.component.ts](Smartfare-Frontend/src/app/shared/components/itinerary-card/itinerary-card.component.ts) e template/stili correlati - UI card condivisa.
- [Smartfare-Frontend/src/app/features/home/...](Smartfare-Frontend/src/app/features/home) - componenti della home.
- [Smartfare-Frontend/src/app/features/discover/...](Smartfare-Frontend/src/app/features/discover) - schermate discover e risultati mappa.
- [Smartfare-Frontend/src/app/features/interactive-map/...](Smartfare-Frontend/src/app/features/interactive-map) - feature mappa Leaflet.
- [Smartfare-Frontend/src/app/features/planner/...](Smartfare-Frontend/src/app/features/planner) - planner, builder, preview e sottocomponenti.
- [Smartfare-Frontend/src/app/features/auth/...](Smartfare-Frontend/src/app/features/auth) - login, register, reset, verify e callback OAuth.
- [Smartfare-Frontend/src/app/features/profile/...](Smartfare-Frontend/src/app/features/profile) - profilo, follower, impostazioni, itinerari.
- [Smartfare-Frontend/src/app/features/ui/...](Smartfare-Frontend/src/app/features/ui) - navbar, footer, loader, modali, alert, cookie consent, privacy, TOS.
- [Smartfare-Frontend/src/app/features/voyager-ai/voyager-ai.component.ts](Smartfare-Frontend/src/app/features/voyager-ai/voyager-ai.component.ts) - schermata chat Smartfare AI.

### File di Utilità Analizzati

- [utils/docs/TESINA_SmartFare.md](utils/docs/TESINA_SmartFare.md)
- [utils/docs/parti.md](utils/docs/parti.md)
- [utils/docs/generate_tesina.py](utils/docs/generate_tesina.py)
- [utils/generate activities/script.js](utils/generate%20activities/script.js)
- [utils/generate activities/enrich.mjs](utils/generate%20activities/enrich.mjs)
- [utils/generate activities/check_output.mjs](utils/generate%20activities/check_output.mjs)
- [utils/generate activities/overpass.txt](utils/generate%20activities/overpass.txt)
- [utils/generate activities/activityCategory.csv](utils/generate%20activities/activityCategory.csv)
- [utils/generate activities/Location_rows.csv](utils/generate%20activities/Location_rows.csv)
- [utils/generate qr/main.py](utils/generate%20qr/main.py)
- [utils/generate qr/smartfare_qr_final.png](utils/generate%20qr/smartfare_qr_final.png)

## File Ignorati o Non Semantici

Questi file non sono stati analizzati riga per riga perché sono generati, binari, cache-like o comunque non semantici per il comportamento dell’applicazione:

- `utils/generate activities/.cache/*` - cache generate.
- `utils/generate qr/smartfare_qr_final.png` - output immagine generata.
- Export documentali binari sotto `utils/docs/*.pdf` e `utils/docs/*.docx` - artefatti documentali generati.
- Media statici sotto `Smartfare-Frontend/public/assets` e cartelle asset simili - risorse visuali, non codice.
- Tree di dipendenze come `node_modules` e l’ambiente virtuale locale sotto `.venv` - artefatti runtime/build esterni.

## Nota Finale

Se vuoi, il prossimo passo utile è trasformare questo README in una specifica tecnica viva aggiungendo:

1. un `.env.example` per entrambe le app;
2. una guida seed/migrazioni per il database;
3. una piccola suite di test per auth, salvataggio itinerari e generazione planner.
