# SmartFare - AI-powered travel planner e biglietteria vettori

SmartFare è una piattaforma web in fase di sviluppo concepita per assistere gli utenti nella pianificazione di viaggi end-to-end, offrendo sia un Itinerary Builder manuale e personalizzabile sia, in prospettiva, un pianificatore gestito tramite intelligenza artificiale. Funge anche da comparatore di tratte ferroviarie ed accomodation alberghiere.

Il progetto è suddiviso in un **Backend** (Node.js/Express) ed un **Frontend** (Angular 21) completamente disaccoppiati, mantenendo il focus sull'offrire un'interfaccia utente dal design distintivo, moderno e premium (tramite l'uso di estetiche quali il glassmorphism).

## 🛠️ Tecnologie Utilizzate nel Backend

Il Backend è un'applicazione REST solida, pensata per prestazioni veloci ed un'alta sicurezza, dotata delle seguenti tecnologie:

* **Node.js & Express.js**: Il motore principale dell'applicazione server. Express è adoperato per lo smistamento delle route API (es. route `/api/itineraries`, `/api/locations` e `/auth`), per i middleware custom e per la gestione del transito globale degli errori.
* **TypeScript**: Integra controlli di tipo statico a compile-time a garanzia di un codice robusto.
* **Prisma ORM**: Il cuore interfacciato al database. Prisma gestisce lo schema in modo rigoroso stabilendo il design Entità-Relazione (Utenti, Profili, Preferenze, Itinerari, Località, Accommodation, Stazioni) fornendo query database di tipo strict, fortemente adatte per architetture relazionali complesse.
* **PostgreSQL (su Supabase)**: Database target su cui è riversata la persistenza relazionale dell'applicazione, sfruttato via Prisma assieme a connettori base (`@prisma/adapter-pg` e `pg`).
* **Zod**: Utilizzato per la definizione degli schemi e la severa validazione dei dati a runtime in ingresso (sicurezza dei payload HTTP per login, registrazioni dati, e salvataggi degli itinerari manuali).
* **Sicurezza e Auth (Bcrypt.js & JWT)**: Le password sono processate tramite funzioni di hashing ad alto livello usando `bcryptjs`. L'autenticazione stateless utilizza invece `jsonwebtoken` emettendo token di sicurezza per mantenere le sessioni sia degli utenti normali loggati sia quelle "guest", prevenendo accessi trasversali o sovrascrittura d'itinerari impropria.
* **Google Auth Library**: Estende l'accesso alle feature di Autenticazione Singola (Single Sign-On) appoggiandosi ai token di Google, offrendo ai fruitori un metodo d'accesso in ambiente web sicuro.
* **Nodemailer**: Strutturato per l'integrazione di workflow mail tramite servizi SMTP. Impiegato specificamente nel flusso applicativo di sicurezza "Forgot/Reset Password".
* **Google Generative AI**: Libreria integrata pronta per supportare il pivoting della piattaforma verso un assistente virtuale di viaggi (AI Planner).

## 💻 Tecnologie Utilizzate nel Frontend

Il Frontend fornisce l'esperienza interattiva SPA (Single Page Application) focalizzandosi sull'estetica moderna.

* **Angular 21**: Framework di riferimento, usato per il suo approccio rigoroso e component-driven, che facilita logiche di form complessi e gestione dello stato. Eredita la struttura applicativa in *features* ed offre lazy loading per i vari contesti (Auth, Visualizzazione Planner, Landing Page).
* **TypeScript**: Estende le solide garanzie di tipo anche sul client.
* **Bootstrap 5**: Core CSS base. Impiegato prevalentemente per il layer di struttura griglia, mixato strettamente ad un CSS Vanilla su misura volto alla produzione di moduli e componenti in puro stile "glassmorphism" (elementi sfumati, bordi lucidi).
* **AOS (Animate On Scroll)**: Utilizzato per aggiungere transizioni fluide guidate dallo scorrimento, esaltando notevolmente il colpo d'occhio sulle sezioni della home e nel builder, fornendo feedback utente dinamici e micro-animazioni.
* **@abacritt/angularx-social-login**: Plugin Angular in simbiosi al provider backend studiato per garantire flussi "Login with Google" del tutto scorrevoli, importando rapidamente avatar utente e dati profilo del cliente.
* **Bootstrap Icons**: Font ad icone integrate omogeneamente assieme a grafiche custom (che assicurano un'estensione vettoriale senza perdite).

---

## 🖇️ Riferimenti e Documentazione Utile

**SCHEMA ER (Database):**
[Visualizza su Lucidchart](https://lucid.app/lucidchart/df79e3dd-bb8b-41d4-8a37-12219b014141/edit?view_items=WqHJQ-NGyE-L&page=0_0&invitationId=inv_cec24f75-da3b-4)

**Esempi Curl Utili (Ricerca Comparativa)**

Ricerche relative ai Treni (Endpoint Backend):

```bash
curl -X POST "http://localhost:3200/api/trains/search" \
  -H "Content-Type: application/json" \
  -d "{\"originStationId\":900917,\"destinationStationId\":900474,\"date\":\"2026-01-09\",\"passengers\":1}"
```

Ricerche relative agli Hotel (Endpoint Backend):

```bash
curl -X POST "http://localhost:3900/api/hotels/search" \
  -H "Content-Type: application/json" \
  -d "{\"destination\":\"Rimini\",\"checkin\":\"2026-07-10\",\"checkout\":\"2026-07-13\",\"guests\":2,\"userPreference\":\"voglio spendere poco ma stare vicino al mare\",\"page\":1,\"limit\":10}"
```
