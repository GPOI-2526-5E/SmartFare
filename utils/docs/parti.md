# SmartFare - Funzionalita del progetto

Questo README raccoglie le principali funzionalita del progetto in formato utile per la presentazione.
Per ogni argomento trovi il nome, le caratteristiche principali e un campo da collegare al membro del team che se ne e occupato.

<!-- ## 1. Autenticazione
Parola: Sicurezza
Membro team: [nome]

- Login con email e password con verifica lato backend.
- Registrazione utente con hashing della password tramite bcrypt.
- Autenticazione JWT con token firmato e controllato server-side.
- Sessioni persistenti salvate nel database e revocabili al logout.
- Supporto OAuth con Google e GitHub.
- Gestione del profilo utente dopo il login con token e dati decodificati lato frontend.
- Protezione delle route riservate tramite middleware di autenticazione. -->

<!-- ## 2. Builder
Parola: Pianificazione
Membro team: [nome]

- Creazione e modifica di itinerari con struttura per giorni e attivita.
- Autosave dei draft per utenti autenticati.
- Salvataggio locale dei draft per utenti non autenticati.
- Undo e redo per recuperare rapidamente le modifiche.
- Clonazione di itinerari pubblici o esistenti per creare nuove versioni.
- Validazione dei riferimenti a location, attivita e accommodation.
- Gestione dei tempi e dell'ordine degli elementi dell'itinerario.
- Collegamento con la chat AI per generare o rifinire il piano di viaggio. -->

## 3. Routes
Parola: API
Membro team: [nome]

- Organizzazione delle route per dominio funzionale: auth, itineraries, profile, follow, chat, ai, upload e moderation.
- Separazione tra route pubbliche e route protette.
- Uso di middleware JWT per controllare l'accesso alle API.
- Presenza di route opzionalmente autenticate per gestire sia utenti guest sia loggati.
- Validazione dei payload con schema prima di entrare nella logica di business.
- Endpoint dedicati al workspace, ai preferiti, al clone e al discover.
- Struttura REST chiara per lettura, creazione, modifica e cancellazione.

## 4. Design
Parola: UI
Membro team: [nome]

- Homepage con effetto visivo forte e animazioni di ingresso.
- Componenti standalone per una UI modulare e riutilizzabile.
- Navbar responsive con supporto mobile e gestione del menu laterale.
- Layout coerente tra home, discover, auth, profilo e pagine legali.
- Loader e stati di caricamento per migliorare la percezione di fluidita.
- Supporto a motion reduction e risparmio dati per maggiore accessibilita.
- Uso di gradienti, card, overlay e gerarchia visiva ben definita.

## 5. Discover
Parola: Esplorazione
Membro team: [nome]

- Vetrina iniziale con itinerari in evidenza, trending, recenti e creatori top.
- Ricerca unificata su itinerari, utenti e luoghi.
- Filtri e ordinamenti nei risultati per migliorare l'esplorazione.
- Modalita mappa e modalita zone per cambiare contesto di navigazione.
- Selezione rapida dei luoghi tramite carousel.
- Apertura dei profili e preview degli itinerari direttamente dai risultati.
- Gestione di stati vuoti, caricamento e fallback dei contenuti.

## 6. Cookie
Parola: Consenso
Membro team: [nome]

- Banner di consenso cookie con accetta, rifiuta e preferenze personalizzate.
- Persistenza delle preferenze nel browser.
- Separazione tra cookie necessari e cookie funzionali.
- Modalita responsive e integrata nel layout globale dell'app.
- Riapertura del pannello preferenze dal footer o da altre sezioni legali.
- Aggiornamento dello stato con signals per una UI reattiva.

## 7. Privacy
Parola: Dati
Membro team: [nome]

- Modali dedicate per privacy policy, cookie policy e termini di servizio.
- Collegamento diretto dal footer alle sezioni legali.
- Gestione centralizzata della visibilita dei modali con un service dedicato.
- Salvataggio e revoca del consenso in modo esplicito.
- Interceptor frontend per bloccare payload non consentiti.
- Middleware backend per moderare contenuti prima dell'elaborazione.
- Pulizia dei dati locali al logout per ridurre la permanenza di informazioni sensibili.

## 8. SEO
Parola: Visibilita
Membro team: [nome]

- Meta title e description specifici per ogni route.
- Canonical link dinamici per evitare duplicazioni.
- Open Graph e Twitter Card per anteprime social.
- Structured data JSON-LD per motori di ricerca e siti social.
- SEO configurato per route tramite chiavi `seoKey`.
- Sitemap e robots per migliorare l'indicizzazione.
- Supporto multilingua con impatto positivo sulla rilevabilita delle pagine.

## 9. Mappe
Parola: Geolocalizzazione
Membro team: [nome]

- Integrazione con Leaflet per la visualizzazione delle mappe.
- Utilizzo delle tile OpenStreetMap come base cartografica.
- Routing pedonale con fallback tra due servizi esterni per piu affidabilita.
- Marker iniziale, finale e singolo in base ai punti disponibili.
- Adattamento automatico della mappa ai bounds del percorso.
- Modalita route e zone per raccontare il territorio in due modi diversi.

## 10. Gemini
Parola: Intelligenza
Membro team: [nome]

- Integrazione con Google Generative AI.
- Modalita chatbot e planner con comportamento differenziato.
- Gestione degli errori di quota e dei token esauriti.
- Estrazione e scoring delle parole chiave dal prompt.
- Generazione di suggerimenti e azioni per l'itinerario.
- Supporto alla costruzione di itinerari tramite chat.
- Fallback intelligenti per mantenere il servizio usabile anche in caso di errore.

## 11. Vercel
Parola: Deploy
Membro team: [nome]

- Configurazione backend per deployment serverless.
- Inclusione della cartella public nel bundle di build.
- Rewrite frontend verso index.html per supportare la SPA.
- Gestione di header CORS e credenziali in ambiente di deploy.
- Separazione tra configurazione frontend e backend.
- Preparazione del progetto per hosting cloud semplificato.

## 12. Prisma
Parola: Database
Membro team: [nome]

- Schema centralizzato per tutti i modelli dati.
- ORM type-safe per evitare errori nelle query.
- Adapter PostgreSQL con pool e SSL.
- Singleton del client per non aprire troppe connessioni.
- Modelli per utenti, sessioni, itinerari, follower, messaggi e preferenze.
- Supporto alle migration e all'evoluzione del database.
- Relazioni ben definite tra le entita principali del progetto.

## 13. Supabase
Parola: Cloud
Membro team: [nome]

- Database PostgreSQL ospitato su Supabase.
- Connessione sicura tramite URL dedicata e direct URL per gli strumenti di DB.
- Uso di storage pubblico per immagini di default e asset visivi.
- Supporto a un'infrastruttura cloud gia pronta per produzione.
- Integrazione naturale con Prisma e con il layer backend.
- Separazione tra dati applicativi e contenuti multimediali.

## 14. Profilo
Parola: Community
Membro team: [nome]

- Visualizzazione e modifica del profilo personale.
- Gestione delle preferenze di viaggio e dei dati personali.
- Upload di avatar e immagine di background.
- Sistema di follow e unfollow tra utenti.
- Visualizzazione di follower, seguito e creatori consigliati.
- Pagine profilo pubbliche e private.
- Ricerca utenti e ordinamento per popolarita o attivita.

## 15. Email
Parola: Notifiche
Membro team: [nome]

- Invio email di verifica account.
- Recupero password tramite codice o link dedicato.
- Notifiche agli utenti quando un creatore seguito pubblica un nuovo itinerario.
- Template HTML curati per migliorare la leggibilita.
- Supporto a SMTP o SendGrid come canali di invio.

## 16. Lingue
Parola: Traduzione
Membro team: [nome]

- App multilingua con lingua iniziale basata su localStorage o browser.
- Traduzione dinamica dei testi dell'interfaccia.
- Aggiornamento automatico di lang e attributi della pagina.
- Supporto alla traduzione di placeholder, title, aria-label e alt.
- Migliore esperienza per utenti internazionali.

## 17. Sicurezza
Parola: Protezione
Membro team: [nome]

- Controllo dei contenuti prima dell'invio alle API.
- Blocco di URL, spam e contenuti sensibili non consentiti.
- Middleware backend per moderare il traffico applicativo.
- Rate limiting per ridurre abusi e richieste ripetute.
- Helmet e CORS per una base di sicurezza piu robusta.
- Gestione della trust proxy per ambienti dietro reverse proxy.

## 18. Extra
Parola: Supporto
Membro team: [nome]

- Gestione della ricerca e del ranking dei risultati.
- Routing lato frontend con lazy loading delle pagine.
- Gestione dello stato con Angular Signals.
- Persistenza temporanea di sessioni, draft e registrazioni social.
- Integrazione con mappe, profili, itinerari e AI in un unico flusso.
- Esperienza utente orientata all'esplorazione del viaggio.

## Schema
Parola: Template

Puoi riutilizzare questo formato per ogni sezione:

```text
Nome funzionalita
- caratteristica 1
- caratteristica 2
- caratteristica 3
- caratteristica 4
- caratteristica 5
- Membro team: nome
```

