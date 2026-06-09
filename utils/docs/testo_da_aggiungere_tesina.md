# Testo da aggiungere alla tesina SmartFare

## Approfondimento sull'Itinerary Builder

Una delle parti piu importanti di SmartFare e l'Itinerary Builder, cioe l'ambiente in cui l'utente puo costruire, modificare e salvare il proprio viaggio. Il builder non e una semplice pagina di inserimento dati, ma un vero workspace interattivo composto da piu aree coordinate: intestazione, sidebar dei punti di interesse, mappa, riepilogo dell'itinerario, chat AI e editor dei singoli POI.

Quando l'utente entra nel builder, il frontend controlla prima se esiste gia un itinerario in memoria. Se l'utente e autenticato, viene caricato l'ultimo draft dal backend; se invece e un ospite, il sistema prova a recuperare una bozza dal `localStorage`. Questo permette di non perdere subito il lavoro anche prima del login. Se manca una destinazione, l'utente viene riportato al planner manuale o alla home, perche il builder ha bisogno di una `locationId` per caricare il workspace corretto.

Il workspace e formato da tre gruppi principali di dati: la destinazione selezionata, gli alloggi disponibili e le attivita presenti in quella localita. Questi dati vengono caricati dal backend tramite l'endpoint `/api/itineraries/workspace`, che recupera dal database la location, gli accommodation, le activity e le categorie. Nel frontend questi dati vengono trasformati in `BuilderPoi`, un modello unico che permette di trattare in modo simile hotel, ristoranti, musei, monumenti, stazioni, parchi e altri punti di interesse.

Il builder gestisce anche il salvataggio automatico. Ogni volta che l'utente aggiunge, rimuove, sposta o modifica una tappa, lo stato dell'itinerario viene aggiornato tramite Angular Signals. Se l'utente e registrato, il salvataggio viene inviato al backend con un debounce di circa 700 ms, evitando richieste continue al server. Se l'utente non e autenticato, la bozza viene conservata in locale. Questa scelta rende l'app piu fluida: l'utente puo lavorare senza premere continuamente "salva", ma il sistema mantiene comunque uno stato persistente.

Un'altra funzione importante e la cronologia undo/redo. Il servizio degli itinerari conserva una lista degli ultimi stati del viaggio, fino a 50 modifiche, e permette di tornare indietro o avanti. Questa funzione e utile perche il builder e molto dinamico: durante la pianificazione l'utente puo provare combinazioni diverse di tappe, giorni e orari senza paura di perdere il lavoro precedente.

## Sidebar del builder

La sidebar del builder e il pannello laterale che permette di esplorare tutti i POI disponibili per la destinazione scelta. Al suo interno sono presenti hotel e attivita, filtrabili per tipologia e categoria. La sidebar include anche una ricerca testuale con debounce: quando l'utente digita, il filtro non viene applicato a ogni singolo carattere istantaneamente, ma dopo un breve intervallo, migliorando le prestazioni e rendendo l'interfaccia piu stabile.

I POI vengono divisi in sezioni collassabili. Gli alloggi vengono raccolti in "Hotel & Alloggi", mentre le attivita vengono raggruppate per categoria, ad esempio musei, monumenti, food, parchi o vita notturna. Ogni elemento puo essere visualizzato in anteprima sulla mappa oppure aggiunto direttamente all'itinerario. Se un POI e gia stato inserito, la sidebar lo riconosce tramite una chiave univoca, come `activity-id` o `accommodation-id`, evitando duplicazioni.

La sidebar non serve solo a mostrare un elenco: e uno strumento di costruzione. L'utente puo cercare un luogo, aprirlo sulla mappa, confrontarlo con altri punti vicini e aggiungerlo al giorno selezionato. In questo modo il builder unisce una logica di catalogo a una logica geografica.

## Summary dell'itinerario

Il Summary e la parte che mostra la struttura finale del viaggio. Qui l'itinerario viene organizzato per giorni, con data, tappe, immagini e gruppi orari. Ogni giorno contiene le attivita e gli alloggi ordinati secondo `dayNumber` e `orderInt`, cioe il numero del giorno e la posizione della tappa.

Una funzione importante e il raggruppamento delle tappe. L'utente puo selezionare piu POI e creare un gruppo, ad esempio "Mattina culturale", "Pranzo", "Pomeriggio panoramico" o "Cena". Il gruppo puo avere un nome e un intervallo orario comune. Quando un gruppo ha un orario, il sistema lo propaga alle tappe interne grazie a una funzione di normalizzazione degli orari, cosi il frontend e il backend mantengono una rappresentazione coerente.

Il Summary supporta anche il drag and drop tramite Angular CDK. L'utente puo spostare tappe tra giorni diversi, riordinarle nello stesso giorno o inserirle dentro un gruppo. Dopo ogni spostamento, il sistema ricalcola l'ordine delle tappe e aggiorna la durata complessiva dell'itinerario. Se una tappa viene spostata in un giorno che non esiste ancora, la data di fine viaggio viene estesa automaticamente.

Dal Summary l'utente puo anche modificare note, orari, gruppi, copertina del viaggio e singoli POI. Inoltre e possibile esportare l'itinerario in formati diversi: JSON, HTML e PDF tramite una finestra stampabile. Questo rende SmartFare non solo uno strumento di creazione, ma anche uno strumento di consegna del viaggio.

## Collegamento con mappe e Google Maps

La componente mappa del builder usa Leaflet e OpenStreetMap per visualizzare la destinazione, i POI disponibili e le tappe salvate. La mappa e divisa in layer: un layer per la location, uno per i POI disponibili, uno per i POI salvati, uno per l'anteprima, uno per il percorso e uno per i marker di partenza e arrivo.

Per gestire molti punti di interesse, SmartFare usa anche il clustering dei marker tramite `leaflet.markercluster`. Quando ci sono molti POI vicini, la mappa li raggruppa in un cluster, evitando una visualizzazione confusa. Ogni marker ha un'icona coerente con la categoria: hotel, musei, ristoranti, natura, shopping, arte, spiagge o luoghi religiosi. Il colore puo essere determinato dalla categoria o personalizzato per i giorni dell'itinerario.

Il builder calcola anche il percorso tra le tappe. Per farlo interroga servizi OSRM pubblici: prima prova `routing.openstreetmap.de`, poi usa `router.project-osrm.org` come fallback. Se il routing stradale non e disponibile, viene disegnata una linea tratteggiata indicativa tra i punti, cosi l'utente mantiene comunque un riferimento visivo.

Il collegamento con Google Maps avviene in due modi. Il primo e il link di ricerca per un singolo POI: nel popup della mappa sono presenti pulsanti che aprono Google Maps o una ricerca Google relativa al punto selezionato. Il secondo e la generazione di un URL di direzione: quando un giorno ha almeno due tappe, SmartFare costruisce un link `https://www.google.com/maps/dir/` con origine, destinazione, modalita driving e fino a otto waypoint intermedi. In questo modo l'utente puo passare dal planning interno dell'app alla navigazione reale su Google Maps.

## Funzionamento dell'intelligenza artificiale

SmartFare utilizza l'IA in due contesti diversi. Il primo e Voyager AI, una chat autonoma accessibile dalla sezione `/voyager`; il secondo e l'assistente del builder, che modifica un itinerario gia aperto.

Voyager AI funziona tramite sessioni di chat salvate nel database. Ogni sessione ha un titolo, una modalita e una cronologia di messaggi. Le modalita principali sono `planner` e `assistant`. In Planner Mode l'obiettivo e raccogliere le informazioni essenziali per creare un itinerario: destinazione, durata, tipo di viaggio, numero di viaggiatori, interessi, ritmo, stile, periodo e preferenze sull'alloggio. In Assistant Mode, invece, l'IA risponde a domande piu generali su destinazioni, quartieri, musei, food, nightlife e consigli di viaggio, senza generare automaticamente un itinerario.

La chat Voyager usa streaming SSE. Il frontend invia il messaggio con `fetch`, riceve blocchi progressivi dal backend e aggiorna in tempo reale l'ultimo messaggio dell'assistente. Questo rende la risposta piu naturale, perche l'utente vede il testo comparire mentre viene generato. Alla fine dello streaming il server invia anche metadati: stato del planner, suggerimenti, azioni disponibili e indicazione se l'itinerario e pronto per essere generato.

Il backend usa Google Gemini tramite il pacchetto `@google/generative-ai`. Sono previsti modelli di fallback, ad esempio `gemini-2.5-flash-lite`, `gemini-2.5-flash` e `gemini-2.0-flash`, per aumentare la robustezza in caso di limiti o problemi temporanei. Il server gestisce anche errori di rete, rate limit e sovraccarico, restituendo messaggi comprensibili all'utente.

Quando la conversazione e pronta, l'utente puo generare l'itinerario. Il backend controlla che i dati minimi siano presenti, trova la destinazione nel catalogo, carica il workspace della localita e chiede a Gemini di produrre un itinerario usando solo POI realmente presenti nel database. Dopo la generazione, il server salva l'itinerario e le sue tappe tramite Prisma, collega l'itinerario alla sessione chat e blocca la sessione per evitare generazioni duplicate.

L'assistente del builder lavora in modo diverso. Qui non deve raccogliere informazioni da zero, ma modificare un itinerario gia esistente. Riceve il messaggio dell'utente, l'itinerario corrente, la destinazione, gli hotel, le attivita e le categorie disponibili. L'IA deve restituire JSON valido con risposta, suggerimenti, azioni e, se necessario, l'itinerario aggiornato. Le regole del prompt sono molto precise: non puo inventare luoghi, deve usare solo `activityId` e `accommodationId` presenti nel workspace, deve conservare le tappe esistenti quando possibile e deve applicare modifiche concrete come aggiungere, rimuovere, spostare o ottimizzare tappe.

Per alcune richieste semplici il backend prova anche una modifica diretta senza chiamare completamente l'IA. Ad esempio, se l'utente chiede di aggiungere una tappa come prima del giorno 1 o di rimuovere un luogo specifico, il servizio cerca il POI piu coerente nel catalogo e modifica direttamente la struttura dell'itinerario. Questo riduce tempi e consumo di token.

L'IA tiene conto anche delle preferenze dell'utente. Nel profilo sono presenti stile di viaggio, ritmo, compagno di viaggio, note e categorie di interesse. Questi dati vengono trasformati in un blocco di prompt e inviati a Gemini. Le preferenze salvate influenzano la generazione quando l'utente lascia liberta creativa, mentre una richiesta esplicita nel messaggio corrente ha priorita.

## Funzionalita social e community

SmartFare contiene una vera dimensione social. Gli utenti possono creare un profilo personale con nome, cognome, citta, biografia, avatar, immagine di sfondo e link social come Instagram e Twitter/X. Il profilo non e solo decorativo: viene usato per mostrare creator, itinerari pubblici, follower e statistiche.

Il sistema di follow permette a un utente di seguirne un altro. Nel database questa relazione e rappresentata dal modello `Follow`, con una coppia composta da `followerId` e `followingId`. Il backend impedisce di seguire se stessi, controlla che l'utente target esista e aggiorna i contatori di follower e following. Sono presenti endpoint per seguire, smettere di seguire e verificare lo stato del follow.

La piattaforma valorizza anche i contenuti pubblici. Gli itinerari possono essere privati o pubblici tramite `visibilityCode` e `isPublished`. Gli itinerari pubblici possono comparire nella Discover, essere cercati, clonati o aggiunti ai preferiti. Il backend puo ordinare gli itinerari anche in base al numero di preferiti, creando una logica di itinerari "trending".

Nel profilo e nella Discover sono presenti funzioni come top creators, featured explorers, ricerca utenti e itinerari vicini. Gli itinerari vicini vengono calcolati partendo dall'ultima destinazione dell'utente e confrontando le coordinate con altre location tramite la formula di Haversine, oppure usando la provincia quando disponibile. Questo permette di proporre viaggi coerenti con gli interessi recenti dell'utente.

Un dettaglio importante e la notifica ai follower. Quando un utente pubblica un itinerario, il backend puo recuperare i follower e inviare email di notifica con il nome dell'autore, il titolo del viaggio, il link al profilo e l'immagine dell'itinerario. In questo modo la parte community non si limita alla visualizzazione, ma crea anche un meccanismo di aggiornamento tra utenti.

## Autenticazione, sessioni e social login

L'autenticazione di SmartFare supporta email/password, Google e GitHub. Con email/password, la password viene salvata come hash tramite `bcrypt`, mentre la verifica dell'email avviene con token generati casualmente, salvati in forma hashata e con scadenza. Sono presenti anche flussi di recupero password e cambio password tramite codice a 6 cifre inviato via email.

Per Google, il backend verifica l'`idToken` usando `google-auth-library`. Per GitHub, invece, viene usato il flusso OAuth: il server genera un URL di autorizzazione, protegge il redirect con uno `state` firmato, scambia il code con un access token e recupera profilo ed email dall'API GitHub. Se l'utente social non esiste ancora, SmartFare non crea automaticamente un account completo, ma genera un token temporaneo di registrazione e chiede di completare i dati.

Quando il login ha successo, il backend crea una riga nella tabella `AuthSession` e genera un JWT contenente `userId`, email, `sessionId` e dati profilo. A ogni richiesta protetta, il middleware non si limita a verificare la firma del token: controlla anche che la sessione esista, non sia revocata e appartenga allo stesso utente. Questo permette il logout reale, perche il server puo revocare una sessione anche se il JWT non e ancora scaduto.

## Gestione dei cookie

La gestione dei cookie e progettata in modo semplice ma coerente con la privacy. Il frontend salva due cookie: `sf_cookie_consent`, che indica che l'utente ha espresso una scelta, e `sf_cookie_prefs`, che contiene le preferenze codificate in JSON. Le categorie previste sono cookie necessari e cookie funzionali. I necessari sono sempre attivi, mentre i funzionali possono essere accettati o rifiutati.

Il servizio `CookieConsentService` usa Angular Signals per rendere reattivo lo stato del consenso. La modale dei cookie permette di accettare tutto, rifiutare tutto o salvare preferenze personalizzate. I cookie vengono impostati con `SameSite=Lax` e, se il sito e servito in HTTPS, anche con flag `Secure`.

Questa logica e collegata anche ai social login. Il login con provider esterni viene considerato una funzione che richiede cookie funzionali, quindi l'interfaccia puo bloccarlo se l'utente non ha dato il consenso. In questo modo l'app non tratta il banner cookie come un elemento isolato, ma lo integra nel comportamento reale della piattaforma.

## Upload immagini e Cloudinary

SmartFare usa Cloudinary per salvare immagini caricate dagli utenti. La configurazione si trova nel backend e usa `multer-storage-cloudinary`, in modo che l'upload multipart venga inviato direttamente allo storage cloud. Le immagini vengono salvate nella cartella `smartfare_itineraries`.

Il sistema accetta solo formati immagine sicuri e comuni: JPEG, PNG, WebP e AVIF. Inoltre impone un limite massimo di 5 MB e una sola immagine per richiesta. Durante l'upload viene applicata una trasformazione massima 1920x1080 con crop `limit`, utile per evitare immagini troppo pesanti e mantenere buone prestazioni nelle copertine.

Gli upload vengono usati in piu punti: immagine di copertina dell'itinerario, avatar del profilo e immagine di sfondo del profilo. Quando viene caricata una copertina associata a un itinerario, il backend controlla che l'itinerario appartenga all'utente autenticato prima di aggiornare il database. In questo modo un utente non puo modificare immagini di viaggi altrui.

Il progetto gestisce anche la pulizia delle immagini. Quando un account viene eliminato, il backend prova a rimuovere da Cloudinary avatar, sfondo e immagini degli itinerari associati, evitando di lasciare file inutilizzati nello storage.

## Altre funzioni importanti del server

Il backend Express centralizza molte responsabilita. All'avvio configura `helmet` per gli header di sicurezza, `trust proxy` per funzionare correttamente dietro proxy o piattaforme cloud, CORS con allowlist, rate limiting globale, parsing JSON limitato a 1 MB, logging delle richieste e gestione errori globale. E presente anche un endpoint `/health`, utile per controlli automatici di deploy.

Le route sono separate per dominio: auth, locations, itineraries, AI, chat, activity, accommodation, upload, profile, follow e moderation. Questa divisione rende il backend piu leggibile e permette di isolare le responsabilita. La validazione degli input viene fatta con Zod, riducendo il rischio di payload incompleti o malformati.

Un'altra funzione importante e la moderazione dei contenuti. Il backend applica un middleware di content moderation, mentre il frontend ha un interceptor dedicato. Questo permette di filtrare o bloccare contenuti non adatti prima che entrino nei flussi principali dell'applicazione.

Il servizio itinerari e uno dei piu complessi. Oltre a salvare e caricare viaggi, normalizza gli item, controlla che activity e accommodation appartengano alla location corretta, elimina riferimenti non validi, gestisce duplicazioni, clona itinerari pubblici, calcola durata dei viaggi, gestisce preferiti e recupera itinerari vicini. Quando salva una bozza puo anche arricchire l'itinerario con un'immagine automatica della destinazione, usando un'immagine gia in cache nella location oppure recuperandone una nuova tramite il servizio immagini.

## Database e modello dati

Il database e gestito con Prisma e PostgreSQL. I modelli principali sono `User`, `AuthSession`, `UserProfile`, `UserPreference`, `Location`, `Accommodation`, `Activity`, `ActivityCategory`, `Itinerary`, `ItineraryItem`, `ItineraryFavorite`, `ChatSession`, `ChatMessage` e `Follow`.

La struttura mostra chiaramente le aree funzionali del progetto. Gli utenti hanno profilo, preferenze, sessioni di autenticazione, itinerari, preferiti, chat e relazioni social. Le location contengono alloggi e attivita. Gli itinerari sono composti da item ordinati per giorno e posizione, collegati a una activity o a un accommodation. Le chat sono persistenti e possono essere collegate a un itinerario, permettendo di ricostruire il contesto della generazione AI.

Questa modellazione permette a SmartFare di essere piu di un generatore di viaggi: e una piattaforma completa in cui dati geografici, contenuti degli utenti, preferenze personali, AI e community sono collegati tra loro.

## SEO, internazionalizzazione e utilita

Il frontend Angular include anche una parte SEO. Le route hanno una chiave `seoKey`, usata per impostare metadati, canonical URL e informazioni strutturate. Sono presenti anche `robots.txt`, `sitemap.xml` e uno script di generazione sitemap. Questo e importante per una piattaforma pubblica, perche itinerari, discover e pagine informative devono poter essere indicizzati correttamente.

L'app gestisce anche l'internazionalizzazione tramite un servizio i18n e una pipe di traduzione. Anche se il progetto e orientato principalmente all'italiano, questa struttura permette di centralizzare i testi e facilita eventuali estensioni future.

Nella cartella `utils` sono presenti strumenti di supporto al progetto. La parte `generate activities` contiene script e dataset per arricchire le attivita delle regioni italiane, mentre `generate qr` contiene uno script Python per generare QR code. Questi strumenti mostrano che SmartFare non e composto solo da frontend e backend, ma anche da pipeline di preparazione dati e materiali di presentazione.

## Conclusione ampliata

SmartFare e un progetto completo per la pianificazione di viaggi in Italia. La sua forza sta nell'integrazione di piu aspetti: una UI moderna in Angular, un backend sicuro in Express, un database relazionale con Prisma, un builder visuale, una mappa interattiva, un sistema AI basato su Gemini, funzioni social, upload immagini su Cloudinary, gestione cookie e flussi di autenticazione completi.

Il progetto dimostra come un'applicazione web moderna non debba limitarsi a una singola funzione. In SmartFare, la pianificazione nasce da dati reali, viene arricchita dall'intelligenza artificiale, puo essere modificata manualmente nel builder, visualizzata sulla mappa, esportata, pubblicata e condivisa con altri utenti. Per questo motivo SmartFare puo essere descritto come una piattaforma di travel planning intelligente e collaborativa, in cui tecnologia, esperienza utente e organizzazione dei dati lavorano insieme.

## Approvvigionamento dati (Overpass Turbo) e generazione QR

Per popolare il catalogo territoriale SmartFare e stato utilizzato Overpass Turbo per estrarre nodi e way rilevanti (hotel, musei, ristoranti, parchi, ecc.). I dati grezzi estratti con query mirate sono stati successivamente normalizzati e mappati alle categorie interne del progetto prima di essere importati in PostgreSQL tramite script di import. Per facilitare la diffusione del progetto e l'accesso rapido alle risorse (ad esempio la pagina demo, la documentazione o PDF della tesina), nella cartella `utils/generate qr` e presente un semplice generatore di QR code: [utils/generate qr/main.py](utils/generate%20qr/main.py). Lo script prende in input un URL o un percorso locale e produce un'immagine PNG pronta per essere incorporata in presentazioni, poster o nella stessa documentazione del progetto.

Esempio d'uso (da eseguire in ambiente Python):

`python "utils/generate qr/main.py" --url "https://smartfare.example" --out "utils/generate qr/smartfare_qr_final.png"`

Il QR generato puo essere usato anche come deep-link: inserendo nell'URL parametri che identificano un itinerario o una vista mappa, si permette a chi scansiona di atterrare direttamente su una risorsa specifica dell'app (es. itinerario pubblico o preview). Questo semplice accorgimento migliora la fruibilita dei materiali cartacei e digitali prodotti per la presentazione della tesina.
