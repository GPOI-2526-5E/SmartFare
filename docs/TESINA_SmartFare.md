# SmartFare — Tesina di Esame di Stato

**Dominici Nicolas**  
**Pansardi Nicolò**  
**Tsaturyan Igor**  

**5°E Informatica**  
**Anno scolastico 2025/2026**

---

## Sommario

1. [Prefazione](#10-prefazione)
2. [Introduzione](#11-introduzione)
3. [Perché abbiamo scelto questo progetto](#12-perché-abbiamo-scelto-questo-progetto)
4. [Tecnologie utilizzate](#20-tecnologie-utilizzate)
   - 2.1 TypeScript
   - 2.2 Angular
   - 2.3 Node.js ed Express
   - 2.4 PostgreSQL e Prisma ORM
   - 2.5 Autenticazione: JWT, bcrypt e sessioni server-side
   - 2.6 Zod — validazione input
   - 2.7 Google Gemini — intelligenza artificiale generativa
   - 2.8 Leaflet e OpenStreetMap
   - 2.9 Altre integrazioni
5. [Architettura del sistema e difficoltà affrontate](#30-architettura-del-sistema-e-difficoltà-affrontate)
6. [Il database relazionale](#40-il-database-relazionale)
7. [Descrizione delle principali funzionalità](#50-descrizione-delle-principali-funzionalità)
8. [Esempi di utilizzo end-to-end](#60-esempi-di-utilizzo-end-to-end)
9. [Conclusioni](#70-conclusioni)

---

## 1.0 Prefazione

SmartFare è una piattaforma web **full-stack** per la pianificazione di viaggi in Italia. L’utente descrive destinazione, date, stile del viaggio e compagno di viaggio; il sistema combina un **database relazionale** di località, hotel e attività con modelli di **intelligenza artificiale generativa** (Google Gemini) per produrre itinerari strutturati, modificabili e visualizzabili su mappa.

Il progetto integra competenze del percorso di Informatica: programmazione web client-server, basi di dati, sicurezza applicativa, API REST, esperienza utente e integrazione di servizi cloud.

---

## 1.1 Introduzione

L’applicazione è organizzata in **tre livelli** disaccoppiati:

| Livello | Tecnologia | Ruolo |
|--------|------------|--------|
| Presentazione | Angular 21 (SPA) | Interfaccia utente, mappe, chat Voyager |
| Logica applicativa | Node.js + Express 5 | API REST, autenticazione, integrazione AI |
| Dati | PostgreSQL + Prisma ORM | Persistenza relazionale (utenti, itinerari, POI, chat) |

A differenza di un assistente che risponde solo in testo libero, SmartFare **ancora l’IA ai dati reali** del territorio: attività con coordinate, strutture ricettive, preferenze utente. Il risultato è un itinerario salvabile, modificabile nel builder e condivisibile nella sezione Discover.

---

## 1.2 Perché abbiamo scelto questo progetto?

La scelta nasce dall’interesse per il **turismo digitale** e per l’**IA generativa** applicata a problemi concreti — non come chat generica, ma come strumento che opera su dati strutturati.

**Motivazioni principali:**

1. **Problema reale** — Organizzare un viaggio richiede incrociare date, luoghi, preferenze e offerte locali; un assistente che struttura le informazioni riduce il carico cognitivo.
2. **Competenze del percorso** — Integra frontend, backend, database, sicurezza e API esterne in un unico prodotto dimostrabile all’esame.
3. **Valore didattico** — Mostra un flusso completo: dall’interfaccia alla persistenza su PostgreSQL, passando per validazione e streaming AI.
4. **Differenziazione** — L’IA usa POI e hotel già nel database, riducendo allucinazioni e rendendo il risultato **mappabile** nel builder.

**Nota sull’evoluzione del progetto:** nelle fasi iniziali il dominio includeva il confronto di biglietti ferroviari; il modello dati è stato **riallineato** verso itinerari turistici (tappe, visibilità pubblica/privata, community). L’architettura a tre livelli (Angular, Express, PostgreSQL) è rimasta invariata.

---

## 2.0 Tecnologie utilizzate

Per ogni tecnologia indichiamo: **cos’è**, **come funziona**, **dove la usiamo in SmartFare** e **perché l’abbiamo preferita ad alternative comuni**.

---

### 2.1 TypeScript

**Cos’è e come funziona**  
TypeScript è un **superset di JavaScript** che aggiunge tipi statici verificati in fase di compilazione (`tsc`). Il codice viene transpilato in JavaScript eseguibile da browser e Node.js. I tipi permettono di definire interfacce per modelli complessi (`Itinerary`, `PlannerState`, payload API) e di individuare errori prima del runtime.

**Uso in SmartFare**  
Stesso linguaggio su frontend (`Smartfare-Frontend`) e backend (`Smartfare-Backend`), con modelli condivisi concettualmente (itinerari, chat, preferenze).

**Perché TypeScript e non JavaScript puro**  
In un progetto con decine di route, servizi AI e schema Prisma generato, gli errori di tipo (campo mancante, tipo sbagliato nel JSON) sono frequenti in JS puro. TypeScript li intercetta in IDE e in build.

**Perché non un backend in Java/C#**  
Avrebbe separato il team su due linguaggi e rallentato l’integrazione con Angular e con l’SDK Gemini per Node; la scelta Node+TS mantiene **un solo ecosistema** (npm, async/await, JSON).

---

### 2.2 Angular — framework frontend

**Cos’è e come funziona**  
Angular è un **framework** per Single Page Application (SPA): l’intera UI vive in una pagina e il **router** carica i componenti senza ricaricare l’HTML. Versione usata: **Angular 21**, con **componenti standalone** (senza NgModule obbligatori), **dependency injection** per i servizi e **signals/computed** per lo stato reattivo (es. Voyager, Discover).

Il **lazy loading** (`loadComponent: () => import(...)`) scarica il codice di una sezione solo quando l’utente la visita, riducendo il bundle iniziale.

**Uso in SmartFare**  
- Routing in `app.routes.ts`: home, discover, builder, voyager, profilo, mappa Italia.  
- Servizi in `core/services/`: `VoyagerChatService`, `ItineraryService`, `AiChatService`.  
- **Interceptor JWT** (`auth.interceptor.ts`): aggiunge `Authorization: Bearer` alle chiamate verso il backend.

**Perché Angular e non React**  
React è molto diffuso, ma richiede scelte manuali per router, form complessi e struttura cartelle. Angular offre **CLI, router e DI integrati**, utili per un progetto con molte aree (Discover, Builder, Voyager, Profilo) e per uniformare il lavoro in trio.

**Perché Angular e non Vue**  
Curva di apprendimento simile; in ambito scolastico/enterprise Angular è spesso più presente nei materiali e offre un’opinione strutturata “batteries included”.

**Perché una SPA e non pagine PHP/HTML statiche**  
Mappe Leaflet, chat in streaming, autosave del builder e filtri Discover richiedono **interattività continua** senza ricaricare la pagina.

---

### 2.3 Node.js ed Express — backend

**Cos’è e come funziona**  
**Node.js** esegue JavaScript/TypeScript lato server con modello **event-driven** e I/O non bloccante, adatto a molte richieste HTTP concorrenti. **Express** è un framework minimale per definire **route**, **middleware** e gestione errori.

In `createApp()` (`Smartfare-Backend/src/app.ts`) configuriamo:

- **Helmet** — header HTTP di sicurezza.  
- **Rate limiting** — globale 50 richieste / 15 minuti; route AI più restrittive (20/min).  
- **CORS** — whitelist del frontend (localhost, Vercel, Render).  
- **JSON body** — limite 1 MB.  
- Mount route: `/api/itineraries`, `/api/ai`, `/api/chat`, `/auth`, ecc.

**Perché Node + Express e non NestJS**  
NestJS aggiunge moduli, decoratori e pattern da framework enterprise; per la dimensione del progetto Express è **più leggero** e più diretto da spiegare in tesina, mantenendo comunque separazione route / servizi / middleware.

**Perché non Fastify**  
Performance leggermente migliori, ma ecosistema middleware meno “standard” nei corsi; Express è la scelta didattica più immediata.

**Perché non PHP/Laravel**  
Stack diverso dal frontend TypeScript; meno coerenza con Prisma Client e SDK Google AI in JavaScript.

---

### 2.4 PostgreSQL e Prisma ORM

**Cos’è e come funziona**  
**PostgreSQL** è un DBMS **relazionale** open-source: dati in **tabelle** con chiavi primarie e esterne, transazioni **ACID**, linguaggio **SQL** per query e join.

**Prisma** è un ORM moderno: lo schema si scrive in `prisma/schema.prisma`, si genera un **client type-safe** (`PrismaClient`) e si gestiscono le migration. In produzione usiamo PostgreSQL ospitato (es. Supabase) tramite `DATABASE_URL` e adapter `@prisma/adapter-pg` con pool `pg`.

**Uso in SmartFare**  
Tutte le entità persistenti passano da Prisma: `User`, `Itinerary`, `ItineraryItem`, `Activity`, `Accommodation`, `Location`, `ChatSession`, `ChatMessage`, `Follow`, `AuthSession`, ecc.

**Perché PostgreSQL e non MongoDB**  
Il dominio è naturalmente relazionale: un itinerario ha molte tappe ordinate che **referenziano** attività o hotel; i follow e i preferiti sono relazioni N:N. In un document store JSON sarebbe più difficile garantire integrità (tappe orfane, ID inesistenti) e query Discover complesse.

**Perché PostgreSQL e non SQLite**  
SQLite è ottimo in locale; per deploy condiviso (Render + più utenti) serve un server DB con concorrenza e backup.

**Perché Prisma e non solo SQL grezzo**  
Il client generato allinea i tipi TypeScript alle tabelle; riduce errori nelle query e velocizza lo sviluppo. SQL resta disponibile per migration e report avanzati.

**Perché non Firebase come database principale**  
Firebase semplifica auth e realtime, ma le query del builder (workspace con attività, categorie, hotel per `locationId`) e Discover (join itinerari/utenti/like) sono più naturali in SQL.

---

### 2.5 Autenticazione: JWT, bcrypt e sessioni server-side

**Cos’è e come funziona**  
- **JWT (JSON Web Token)** — standard per trasmettere claims firmati tra client e server. Il client invia `Authorization: Bearer <token>`; il server verifica la firma con `JWT_SECRET` senza memorizzare lo stato della richiesta nel token stesso.  
- **bcrypt** — funzione di hash per password con salt; anche se il DB fosse compromesso, le password non sono in chiaro.  
- **AuthSession** — tabella server-side con `sessionId` nel JWT: il middleware `authenticateJWT` verifica token **e** che la sessione non sia **revocata** (`revokedAt`), permettendo logout da tutti i dispositivi.

**Uso in SmartFare**  
Registrazione, login locale, OAuth Google/GitHub, verifica email, reset password OTP, route protette con `authGuard` (frontend) e `authenticateJWT` (backend).

**Perché JWT Bearer e non solo cookie di sessione**  
La SPA Angular è spesso servita da un dominio diverso dall’API (Vercel + Render). Il pattern Bearer + CORS configurato è lo standard per SPA moderne.

**Perché sessioni in tabella oltre al JWT**  
Un JWT puro non si può “revocare” finché non scade; la tabella `AuthSession` permette invalidazione immediata (sicurezza account).

**Perché bcrypt e non hash custom**  
bcrypt è collaudato, lento by design (anti brute-force) e semplice da integrare con `bcryptjs`.

---

### 2.6 Zod — validazione input

**Cos’è e come funziona**  
**Zod** è una libreria **TypeScript-first** per definire schemi di validazione a runtime (`z.object`, `z.string`, `z.coerce.number()`). Se il body HTTP non rispetta lo schema, si risponde subito con **400** e messaggi chiari, prima di chiamare Gemini o Prisma.

**Uso in SmartFare**  
Schemi in `Smartfare-Backend/src/schemas/` (es. generazione itinerario AI, stream chat, aggiornamento profilo). Riduce errori 500 causati da payload malformati o campi mancanti.

**Perché Zod e non Joi**  
Joi è valido in Node, ma Zod integra meglio l’inferenza dei tipi TypeScript nello stesso progetto.

**Perché Zod e non validazione manuale**  
Con decine di campi opzionali nelle API AI, `if (!body.prompt)` ripetuti sono fragili; Zod centralizza le regole e i messaggi d’errore.

---

### 2.7 Google Gemini — intelligenza artificiale generativa

**Cos’è e come funziona**  
**Gemini** è un **LLM** (Large Language Model) di Google, accessibile via SDK `@google/generative-ai`. Riceve un **system prompt** (regole, tono, contesto) e messaggi utente; può restituire testo o JSON strutturato per itinerari.

**Uso in SmartFare (tre pipeline distinte)**  

1. **Generazione iniziale** — `POST /api/ai/itinerary/generate`: da prompt libero → identificazione destinazione → caricamento workspace DB → `generateInitialItinerary`.  
2. **Modifica nel builder** — `POST /api/ai/itinerary/chat`: chat contestuale sulla bozza aperta.  
3. **Identificazione destinazione** — `identifyLocation`: regex su nomi città nel prompt, poi Gemini come fallback → `locationId` nel catalogo.  
4. **Voyager** — `POST /api/chat/sessions/:id/stream`: conversazione multi-turno con risposta **in streaming** (SSE), stato planner in `metadata` JSON.

Il servizio gestisce **retry** su quota API, **fallback** tra modelli (`gemini-2.5-flash`, ecc.) e arricchimento stato conversazione (`plannerState`).

**Perché Gemini e non OpenAI GPT**  
Entrambi sono LLM cloud; la scelta dipende da API key, quota e SDK disponibili nel progetto. Il principio architetturico (prompt + dati DB) resterebbe uguale.

**Perché non un modello solo locale**  
Richiederebbe GPU, manutenzione e latenza variabile; poco adatto a demo scolastica e deploy cloud.

**Perché non solo regole if/else**  
Non capirebbero frasi come “weekend rilassante in Puglia in trullo”; l’LLM interpreta il linguaggio naturale e noi vincoliamo l’output ai POI reali del database.

**Differenziatore SmartFare**  
L’IA non inventa musei o hotel a caso: legge `activities` e `accommodations` per `locationId` → itinerario **georeferenziato** e modificabile su mappa.

---

### 2.8 Leaflet e OpenStreetMap — mappe interattive

**Cos’è e come funziona**  
**Leaflet** è una libreria JavaScript open-source per mappe interattive (zoom, pan, marker, polyline). Le **tile** (immagini della mappa) provengono da **OpenStreetMap**, progetto collaborativo a **dati aperti**.

**Uso in SmartFare**  
- Anteprima itinerario (`preview-map.component.ts`) — marker tappe, percorso arancione.  
- Builder — mappa con drag delle tappe.  
- Discover e mappa Italia — cluster di POI (`leaflet.markercluster`).

Esempio inizializzazione:

```typescript
this.map = L.map(this.mapHost.nativeElement).setView([44.4056, 8.9463], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(this.map);
```

**Perché Leaflet + OSM e non Google Maps API**  
- **Costo** — tile OSM gratuite per uso didattico/prototipo; Google Maps ha piani a consumo.  
- **Controllo** — marker, colori e layer custom (tema scuro SmartFare).  
- **Licenza** — dati aperti vs vincoli Google.

**Perché non Mapbox solo**  
Ottimo ma richiede token e billing; OSM + Leaflet è sufficiente per l’Italia e per la tesina.

---

### 2.9 Altre integrazioni

| Servizio / libreria | Uso in SmartFare | Perché questa scelta |
|---------------------|------------------|----------------------|
| **Cloudinary** | Upload immagini copertina itinerario | CDN e resize automatici senza gestire storage file sul server |
| **Nodemailer / SendGrid** | Email verifica account e reset password OTP | Affidabilità invio mail transazionali |
| **Google / GitHub OAuth** | Login social (`angularx-social-login` + verifica token server) | Riduce attrito registrazione; password gestita dal provider |
| **Helmet + express-rate-limit** | Sicurezza HTTP e anti-abuso (soprattutto `/api/ai`) | Protezione base OWASP e limitazione costi API Gemini |
| **RxJS** | Autosave builder, debounce ricerca Discover | Standard con Angular per flussi asincroni |
| **Bootstrap 5** | Layout, componenti UI, icone | Prototipazione rapida interfaccia coerente |
| **Supabase** | Hosting PostgreSQL (`DATABASE_URL`) | DB gestito con backup; non usiamo tutte le feature BaaS |

---

## 3.0 Architettura del sistema e difficoltà affrontate

### 3.1 Schema logico client–server–database

Il sistema segue un’architettura a **tre livelli** disaccoppiati:

1. **Browser** — esegue l’SPA Angular; non accede mai direttamente al database.  
2. **Server Node/Express** — espone API REST JSON; applica auth, validazione Zod, logica AI.  
3. **PostgreSQL** — persistenza; accesso solo tramite Prisma dal server.

**Flusso tipico (generazione itinerario da prompt):**

1. Componente Angular → `AiChatService.generateItinerary(prompt)`.  
2. `POST /api/ai/itinerary/generate` con JWT.  
3. Middleware `authenticateJWT` / `optionalAuthenticateJWT`.  
4. Validazione Zod del body.  
5. `identifyLocation` + `getWorkspaceData(locationId)`.  
6. Chiamata Gemini → struttura giorni/tappe.  
7. Risposta JSON al client → builder / anteprima con mappa.

`[INSERIRE SCREENSHOT: schema a blocchi client – server – database]`

---

### 3.2 Routing frontend e lazy loading

```typescript
// Smartfare-Frontend/src/app/app.routes.ts (estratto)
{ path: 'discover', loadComponent: () => import('./features/discover/...') },
{ path: 'itineraries/builder', loadComponent: () => import('./features/planner/itinerary-builder/...') },
{ path: 'voyager', loadComponent: () => import('./features/voyager-ai/...'), canActivate: [authGuard] },
{ path: 'interactive-map', loadComponent: () => import('./features/interactive-map/...') },
```

Le route sensibili usano **`authGuard`**: senza login si viene reindirizzati. Il lazy loading migliora il tempo di caricamento iniziale della home.

---

### 3.3 Pipeline di generazione itinerario (backend)

```typescript
// Flusso semplificato — Smartfare-Backend/src/routes/ai.route.ts
const { prompt } = aiItineraryGenerateSchema.parse(req.body);
const locations = await prisma.location.findMany({ select: { id: true, name: true } });
const locationId = await geminiService.identifyLocation(prompt, locations);
const workspace = await itineraryService.getWorkspaceData(locationId, userId);
const response = await geminiService.generateInitialItinerary(prompt, { /* workspace */ });
res.json({ success: true, itinerary: { ...response, locationId, location: workspace.location } });
```

`workspace` contiene attività, hotel e categorie **reali** per quella destinazione: è il vincolo che lega l’IA al territorio.

---

### 3.4 Voyager AI — chat con risposta in streaming

**Voyager** (`/voyager`) è l’assistente conversazionale: risposta **token per token** (SSE su `POST /api/chat/sessions/:id/stream`), sessioni persistenti (`ChatSession`, `ChatMessage`), pin e titoli automatici.

**Difficoltà:** due pipeline AI (Voyager streaming vs builder sincrono). **Soluzione:** `chat.service.ts` per stream e sessioni; `gemini.service.ts` per prompt e chiamate modello — responsabilità separate.

Quando la conversazione raccoglie dati sufficienti, compare la card **“Itinerario pronto”** e si può generare l’itinerario nel builder (`POST /api/chat/sessions/:id/generate-itinerary`).

`[INSERIRE SCREENSHOT: Voyager con card Itinerario pronto]`

---

### 3.5 Altre difficoltà affrontate

| Difficoltà | Soluzione adottata |
|-----------|-------------------|
| Modelli Gemini deprecati | Mappa nomi modello + catena fallback; retry con backoff su quota |
| Orari tappe su più giorni | Utility `itinerary-item-timing` (`groupStartAt` / `groupEndAt`) |
| CORS produzione (Vercel + Render) | `FRONTEND_URL` + opzione `*.vercel.app` |
| Mappe in layout responsive | `ResizeObserver` + `invalidateSize()` su Leaflet |
| IA senza login obbligatorio | `optionalAuthenticateJWT` su alcune route; builder completo con auth |
| Testo “itinerario pronto” vs flag metadata | Allineamento `readyToGenerate` con stato conversazione e validazione su generate |

---

## 4.0 Il database relazionale

### 4.1 Perché un database relazionale?

SmartFare non memorizza solo testo generato dall’IA: persiste utenti, preferenze, itinerari con molte tappe, riferimenti ad attività e hotel reali, relazioni social (follow, preferiti) e storico chat. Questi dati sono **fortemente collegati** e devono rispettare regole di integrità.

Un database relazionale (PostgreSQL) è appropriato perché:

- **Integrità referenziale** — chiavi esterne impediscono tappe orfane, follow duplicati, itinerari senza utente valido.  
- **Transazioni ACID** — salvataggio itinerario + decine di `ItineraryItem` in modo coerente.  
- **Query complesse** — Discover unisce itinerari, utenti, località; il builder carica workspace con join su `Activity`, `Accommodation`, categorie.  
- **Schema stabile** — giorni, ordine tappe, visibilità PUBLIC/PRIVATE si prestano a tabelle normalizzate più che a documenti JSON che cambiano forma a ogni versione.

**Entità principali (descrizione testuale):**

- **User**, **UserProfile**, **UserPreference** — account e personalizzazione viaggio.  
- **Location** — destinazioni italiane (nome, coordinate, immagine).  
- **Activity**, **ActivityCategory** — punti di interesse.  
- **Accommodation** — strutture ricettive per location.  
- **Itinerary**, **ItineraryItem** — viaggio e tappe ordinate per giorno.  
- **ChatSession**, **ChatMessage** — cronologia Voyager.  
- **Follow**, **ItineraryFavorite** — social e preferiti.  
- **AuthSession** — sessioni JWT revocabili.

---

### 4.2 Rappresentazione concettuale

`[INSERIRE QUI IL DIAGRAMMA ER / MODELLO CONCETTUALE]`

*(Questa sezione resta volutamente vuota: va completata con il diagramma preparato dal gruppo.)*

---

### 4.3 Rappresentazione logica

`[INSERIRE QUI LO SCHEMA LOGICO / TABELLE E CHIAVI]`

*(Questa sezione resta volutamente vuota: va completata con lo schema logico preparato dal gruppo.)*

---

## 5.0 Descrizione delle principali funzionalità

### 5.1 Home e accesso rapido all’IA

La home presenta il prodotto e una **barra prompt** per avviare la pianificazione senza navigazione complessa. Da qui l’utente può essere portato su Voyager o sulla generazione itinerario.

`[INSERIRE SCREENSHOT: Home con prompt AI]`

---

### 5.2 Discover — community

**Discover** è la vetrina degli itinerari **pubblici**: ricerca per itinerari, utenti e luoghi; top creator; mappa del percorso selezionato. Collega l’esperienza personale alla **community** (follow, like).

`[INSERIRE SCREENSHOT: Pagina Discover]`

---

### 5.3 Pianificatore manuale e builder

Flusso:

1. **Manual planner** — scelta destinazione e date.  
2. **Builder** — mappa Leaflet, elenco tappe per giorno, chat AI laterale, autosave.  
3. **Preview** — timeline + mappa anteprima prima della pubblicazione.

`[INSERIRE SCREENSHOT: Itinerary builder]`

---

### 5.4 Voyager AI

Chat multi-sessione, modalità **planner** e **assistant**, risposta in **streaming**, card **“Itinerario pronto”** e generazione nel builder. Richiede autenticazione (`authGuard`).

`[INSERIRE SCREENSHOT: Voyager AI]`

---

### 5.5 Profilo e libreria itinerari

Gestione avatar, bio, **preferenze di viaggio** (stile, ritmo, compagno, interessi), elenco bozze e itinerari pubblicati.

`[INSERIRE SCREENSHOT: Profilo / I miei itinerari]`

---

### 5.6 Mappa interattiva d’Italia

Esplorazione geografica delle attività con **marker cluster** e filtri per categoria — utile per scoprire POI prima di pianificare.

`[INSERIRE SCREENSHOT: Mappa interattiva Italia]`

---

### 5.7 Autenticazione

Registrazione con verifica email, login locale, **OAuth** Google, reset password con OTP, sessioni revocabili e rate limit sulle route `/auth`.

`[INSERIRE SCREENSHOT: Login / Registrazione]`

---

## 6.0 Esempi di utilizzo end-to-end

### Esempio A — Itinerario da prompt (home o Voyager)

1. L’utente scrive: *«3 giorni in Puglia, ritmo rilassato, pernottamento in trullo»*.  
2. Il backend identifica la destinazione e carica attività/hotel dal DB.  
3. Gemini propone giorni e tappe.  
4. L’utente apre il **builder**, rifinisce e salva.  
5. Opzionale: pubblica su **Discover**.

`[INSERIRE SCREENSHOT: sequenza prompt → card pronto → builder]`

---

### Esempio B — Modifica in linguaggio naturale nel builder

1. Utente con bozza aperta.  
2. Scrive: *«Aggiungi un museo il secondo giorno»*.  
3. `POST /api/ai/itinerary/chat` aggiorna tappe e mappa.

`[INSERIRE SCREENSHOT: Chat nel builder]`

---

### Esempio C — Discover e follow

1. Utente A pubblica itinerario (visibilità PUBLIC).  
2. Utente B cerca in Discover, apre la scheda, segue A.  
3. Dal profilo di A visualizza altri viaggi condivisi.

`[INSERIRE SCREENSHOT: Dettaglio itinerario pubblico]`

---

## 7.0 Conclusioni

SmartFare dimostra come integrare in un unico prodotto **frontend moderno**, **API REST sicure**, **database relazionale** e **IA generativa** vincolata a dati territoriali reali. Le scelte tecnologiche (TypeScript end-to-end, Angular, Express, PostgreSQL/Prisma, Gemini, Leaflet/OSM) rispondono a esigenze concrete: manutenibilità, tipizzazione, integrità dati, costi mappe contenuti e UX da assistente di viaggio.

**Limiti attuali:** dipendenza da API esterne (Gemini, email, Cloudinary); catalogo località/attività da mantenere aggiornato; destinazioni regionali generiche (es. “Puglia”) richiedono città presenti nel database per la generazione automatica.

**Sviluppi futuri possibili:** export PDF/ICS dell’itinerario; commenti e valutazioni su itinerari pubblici; routing OSRM tra tappe; notifiche promemoria.

---

## Allegato — Struttura del repository

```
SmartFare/
├── Smartfare-Frontend/src/app/
│   ├── core/          # auth, guards, services, interceptors
│   └── features/      # home, discover, planner, voyager, profile, maps
├── Smartfare-Backend/src/
│   ├── routes/        # API REST
│   ├── services/      # AI, itinerary, email
│   ├── middleware/    # auth, errori
│   └── schemas/       # Zod
└── Smartfare-Backend/prisma/schema.prisma
```

---

*Documento aggiornato per la consegna tesina — completare §4.2 e §4.3 con i diagrammi del gruppo e sostituire i placeholder screenshot prima della stampa.*
