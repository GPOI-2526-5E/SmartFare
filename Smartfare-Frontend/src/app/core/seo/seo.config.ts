export interface SeoPageConfig {
  title: string;
  description: string;
  keywords?: string;
  path: string;
  robots?: string;
  ogType?: string;
  /** Sitelink label shown in structured data (navbar-aligned). */
  navLabel?: string;
}

/** Canonical site URL — override via environment.siteUrl in production. */
export const DEFAULT_SITE_URL = 'https://smartfare.nicolas-dominici.it';

export const SITE_NAME = 'SmartFare';
export const SITE_TAGLINE = 'Pianifica viaggi in Italia con AI, mappe e itinerari su misura';
export const DEFAULT_OG_IMAGE = '/assets/preview6.png';

/**
 * Primary navigation mirrored in Google Sitelinks (SiteNavigationElement).
 * Only public, indexable routes — no auth-gated pages.
 */
export const SITE_NAVIGATION: ReadonlyArray<{
  name: string;
  url: string;
  description?: string;
}> = [
  {
    name: 'Home',
    url: '/',
    description: 'Homepage SmartFare: pianifica viaggi, scopri destinazioni e inizia subito.'
  },
  {
    name: 'Esplora',
    url: '/discover',
    description: 'Scopri destinazioni, zone e itinerari della community in tutta Italia.'
  },
  {
    name: 'Crea',
    url: '/itineraries/new',
    description: 'Crea un nuovo itinerario: scegli date, meta e costruisci il tuo viaggio.'
  },
  {
    name: 'Mappa interattiva',
    url: '/interactive-map',
    description: 'Esplora l\'Italia su mappa interattiva con categorie e punti di interesse.'
  },
  {
    name: 'Accedi',
    url: '/login',
    description: 'Accedi al tuo account SmartFare per salvare itinerari e usare tutti gli strumenti.'
  }
];

/** SEO metadata keyed by route `data.seoKey`. */
export const SEO_PAGES: Record<string, SeoPageConfig> = {
  home: {
    title: 'SmartFare: pianifica viaggi in Italia | Sito ufficiale',
    description:
      'Crea itinerari su misura, esplora destinazioni, usa l\'AI Planner e la mappa interattiva. SmartFare è la piattaforma italiana per viaggiare in modo intelligente.',
    keywords:
      'SmartFare, pianificare viaggio, itinerari Italia, AI travel planner, mappa viaggi, creare itinerario',
    path: '/',
    ogType: 'website',
    navLabel: 'Home'
  },
  discover: {
    title: 'Esplora destinazioni e itinerari | SmartFare',
    description:
      'Scopri luoghi, zone e viaggi della community. Cerca destinazioni in Italia e trova ispirazione per il tuo prossimo itinerario.',
    keywords: 'esplora viaggi, destinazioni Italia, itinerari community, scoprire luoghi',
    path: '/discover',
    navLabel: 'Esplora'
  },
  'itineraries-new': {
    title: 'Crea il tuo itinerario di viaggio | SmartFare',
    description:
      'Scegli date e meta, aggiungi tappe e costruisci il piano giorno per giorno con mappe leggibili e preview immersive.',
    keywords: 'creare itinerario, planner viaggio, pianificare vacanza, tappe viaggio',
    path: '/itineraries/new',
    navLabel: 'Crea'
  },
  voyager: {
    title: 'AI Planner: viaggi personalizzati con intelligenza artificiale | SmartFare',
    description:
      'Chiedi all\'assistente AI di progettare il tuo viaggio in Italia. Genera itinerari intelligenti, salva le conversazioni e passa al builder.',
    keywords: 'AI planner viaggi, assistente viaggio, itinerario AI, chat viaggio',
    path: '/voyager',
    robots: 'noindex, follow'
  },
  'interactive-map': {
    title: 'Mappa interattiva dell\'Italia | SmartFare',
    description:
      'Esplora categorie, punti di interesse e destinazioni sulla mappa interattiva SmartFare. Filtra, cerca e pianifica dal territorio.',
    keywords: 'mappa Italia viaggi, mappa interattiva, POI turistici, esplorare destinazioni',
    path: '/interactive-map',
    navLabel: 'Mappa interattiva'
  },
  login: {
    title: 'Accedi al tuo account | SmartFare',
    description:
      'Accedi a SmartFare con email o social login. Salva itinerari, usa l\'AI Planner e gestisci il profilo viaggiatore.',
    keywords: 'accedi SmartFare, login viaggi, account viaggiatore',
    path: '/login',
    robots: 'noindex, follow',
    navLabel: 'Accedi'
  },
  register: {
    title: 'Registrati gratis su SmartFare | Crea il tuo account',
    description:
      'Crea un account SmartFare in pochi secondi. Registrati per salvare itinerari, seguire creator e usare l\'AI Planner.',
    keywords: 'registrati SmartFare, creare account viaggi, iscrizione gratuita',
    path: '/register',
    robots: 'noindex, follow'
  },
  'forgot-password': {
    title: 'Recupera password | SmartFare',
    description:
      'Hai dimenticato la password? Inserisci la tua email e ricevi le istruzioni per reimpostare l\'accesso a SmartFare.',
    keywords: 'recupero password, reset accesso SmartFare',
    path: '/forgot-password',
    robots: 'noindex, follow'
  },
  'reset-password': {
    title: 'Reimposta password | SmartFare',
    description: 'Imposta una nuova password sicura per il tuo account SmartFare.',
    path: '/reset-password',
    robots: 'noindex, nofollow'
  },
  'verify-email': {
    title: 'Verifica email | SmartFare',
    description: 'Conferma il tuo indirizzo email per attivare l\'account SmartFare.',
    path: '/verify-email',
    robots: 'noindex, nofollow'
  },
  'oauth-callback': {
    title: 'Accesso in corso | SmartFare',
    description: 'Completamento accesso con provider esterno.',
    path: '/oauth/callback',
    robots: 'noindex, nofollow'
  },
  'manual-planner': {
    title: 'Planner manuale itinerari | SmartFare',
    description:
      'Pianifica manualmente date, destinazione e struttura del viaggio prima di passare al builder dettagliato.',
    keywords: 'planner manuale, creare viaggio, pianificazione tappe',
    path: '/manual/planner'
  },
  itineraries: {
    title: 'I tuoi itinerari | SmartFare',
    description:
      'Visualizza, modifica e organizza tutti i tuoi itinerari salvati. Riprendi bozze e viaggi già pubblicati.',
    keywords: 'miei itinerari, gestione viaggi, bozze itinerario',
    path: '/itineraries',
    robots: 'noindex, follow'
  },
  'profile-itineraries': {
    title: 'I miei itinerari salvati | SmartFare',
    description:
      'Accedi alla libreria personale: itinerari creati, preferiti e viaggi da riaprire in qualsiasi momento.',
    keywords: 'itinerari salvati, preferiti viaggio, libreria personale',
    path: '/profile/itineraries',
    robots: 'noindex, follow'
  },
  'itineraries-preview': {
    title: 'Anteprima itinerario | SmartFare',
    description:
      'Anteprima immersiva del tuo itinerario con mappa, tappe e riepilogo giornaliero prima della pubblicazione.',
    keywords: 'anteprima itinerario, preview viaggio',
    path: '/itineraries/preview',
    robots: 'noindex, follow'
  },
  'itineraries-builder': {
    title: 'Builder itinerario | SmartFare',
    description: 'Modifica tappe, orari, mappe e dettagli del tuo itinerario in tempo reale.',
    path: '/itineraries/builder',
    robots: 'noindex, nofollow'
  },
  profile: {
    title: 'Il tuo profilo viaggiatore | SmartFare',
    description:
      'Gestisci il profilo pubblico, bio, social e gli itinerari condivisi con la community SmartFare.',
    keywords: 'profilo viaggiatore, account SmartFare',
    path: '/profile',
    robots: 'noindex, follow'
  },
  'profile-public': {
    title: 'Profilo utente | SmartFare',
    description: 'Scopri itinerari e viaggi pubblicati da questo utente sulla community SmartFare.',
    path: '/profile',
    robots: 'noindex, follow'
  },
  settings: {
    title: 'Impostazioni account | SmartFare',
    description:
      'Aggiorna dati personali, avatar, preferenze di viaggio, password e impostazioni privacy del tuo account.',
    keywords: 'impostazioni account, preferenze viaggio, privacy profilo',
    path: '/settings',
    robots: 'noindex, follow'
  },
  'profile-followers': {
    title: 'I tuoi follower | SmartFare',
    description: 'Elenco dei follower del tuo profilo. Visibile solo a te.',
    path: '/profile/followers',
    robots: 'noindex, follow'
  }
};

/** Public URLs included in sitemap.xml and prerendered at build time. */
export const SITEMAP_ENTRIES: ReadonlyArray<{
  loc: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}> = [
  { loc: '/', changefreq: 'weekly', priority: 1.0 },
  { loc: '/discover', changefreq: 'daily', priority: 0.95 },
  { loc: '/itineraries/new', changefreq: 'weekly', priority: 0.9 },
  { loc: '/interactive-map', changefreq: 'weekly', priority: 0.85 },
  { loc: '/manual/planner', changefreq: 'monthly', priority: 0.7 }
];
