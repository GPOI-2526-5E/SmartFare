<div align="center">
  <img src="./Smartfare-Frontend/public/icons/icon-192x192.png" alt="SmartFare Logo" width="100"/>
  <h1>SmartFare</h1>
  <p><strong>L'intelligenza artificiale al servizio del tuo prossimo viaggio</strong></p>
</div>

<br />

**SmartFare** è una piattaforma innovativa che ti aiuta a pianificare itinerari di viaggio personalizzati. Sfruttando un'IA avanzata e preferenze altamente personalizzabili, SmartFare genera automaticamente un piano di viaggio con tappe, hotel, ristoranti e attività su misura per te, sia che tu stia viaggiando da solo, in coppia o in famiglia.

---

## 🌟 Funzionalità Principali

- 🤖 **Pianificazione Assistita da IA**: Chatbot intelligente che funge da consulente di viaggio o che genera l'itinerario in completa autonomia basandosi sulle tue preferenze.
- 🛠 **Preferenze Personalizzabili**: Seleziona il tuo compagno di viaggio, i tuoi stili preferiti (Culturale, Relax, Avventura) e il ritmo (Lento, Moderato, Intenso).
- 🗺 **Mappa Interattiva**: Visualizza tutte le tappe del tuo viaggio su una mappa interattiva.
- 🗂 **Gestione Itinerari**: Salva, modifica e pubblica i tuoi itinerari, rendendoli visibili alla community o tenendoli privati.
- 🔒 **Sicurezza Account Avanzata**: Autenticazione sicura tramite JWT, reset della password via OTP e integrazione Social Login.

---

## 🏗 Architettura di Sistema

SmartFare è diviso in tre layer principali per garantire scalabilità e performance:

1. **Frontend (Angular 18)**
   - Single Page Application (SPA) reattiva e veloce.
   - Design mozzafiato con temi scuri, glassmorphism e icone vettoriali.
2. **Backend (Node.js & Express)**
   - API RESTful robuste con validazione (Zod) e protezione Rate Limit.
   - Connessione al database tramite Prisma ORM.
3. **Database (PostgreSQL via Supabase)**
   - Schema relazionale normalizzato per scalabilità (Utenti, Itinerari, Preferenze, Attività, Categorie).

---

## 📸 Anteprime

Ecco alcune schermate dell'applicazione:

*(Aggiungi qui i tuoi screenshot. Sostituisci i placeholder con i percorsi reali delle immagini)*

<div align="center">
  <img src="https://via.placeholder.com/600x350.png?text=Dashboard+Principale" alt="Dashboard Principale" width="45%"/>
  &nbsp;
  <img src="https://via.placeholder.com/600x350.png?text=Pianificatore+IA" alt="Pianificatore IA" width="45%"/>
</div>
<br />
<div align="center">
  <img src="https://via.placeholder.com/600x350.png?text=Mappa+Itinerario" alt="Mappa Itinerario" width="45%"/>
  &nbsp;
  <img src="https://via.placeholder.com/600x350.png?text=Impostazioni+Account" alt="Impostazioni Account" width="45%"/>
</div>

---

## 🚀 Prerequisiti

Prima di iniziare, assicurati di avere installati sul tuo sistema locale:

- [Node.js](https://nodejs.org/) (v18 o superiore)
- [npm](https://www.npmjs.com/) o [Yarn](https://yarnpkg.com/)
- Un account Supabase (o un database PostgreSQL locale equivalente)
- Le chiavi API per i servizi di terze parti (Es. Cloudinary per le immagini, Servizio Email, IA)

---

## 🛠 Installazione

### 1. Clonazione del repository
\`\`\`bash
git clone https://github.com/tuo-username/SmartFare.git
cd SmartFare
\`\`\`

### 2. Configurazione Backend
Spostati nella cartella del backend, installa le dipendenze e configura le variabili d'ambiente:

\`\`\`bash
cd Smartfare-Backend
npm install
\`\`\`

Copia il file `.env.example` in un nuovo file `.env` e compila le variabili richieste:
\`\`\`bash
cp .env.example .env
\`\`\`

Pusha lo schema del database (ATTENZIONE: Assicurati di non sovrascrivere dati di produzione):
\`\`\`bash
npx prisma db push
\`\`\`

Avvia il server di sviluppo:
\`\`\`bash
npm run dev
\`\`\`

### 3. Configurazione Frontend
Apri una nuova finestra del terminale, spostati nella cartella del frontend e avvia l'app:

\`\`\`bash
cd Smartfare-Frontend
npm install
npm start
\`\`\`

L'applicazione sarà visibile all'indirizzo `http://localhost:4200/`.

---

## 📜 Licenza

Questo progetto è rilasciato sotto licenza MIT. Vedi il file `LICENSE` per i dettagli.
