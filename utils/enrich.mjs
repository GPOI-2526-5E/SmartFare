/**
 * enrich.mjs — SmartFare Overpass Enricher (v2, zero deps)
 *
 * Legge tutti i .json Overpass dalla cartella utils/, arricchisce ogni elemento con:
 *  - Indirizzo (addr:street OSM → Nominatim fallback)
 *  - Descrizione (tags OSM → Wikipedia IT → fallback testuale)
 *  - Immagine (Wikimedia Commons → Unsplash by-category → default)
 *
 * Output: Activity_rows.csv + Accommodation_rows.csv
 *
 * USO:
 *   node enrich.mjs                          # modalità basic (immagini categoria, no reverse)
 *   ENRICH_MODE=full node enrich.mjs         # + Nominatim + Wikipedia (lento ma completo)
 *   MAX_ELEMENTS=500 node enrich.mjs         # test su un sottoinsieme
 *   CONCURRENCY=8 node enrich.mjs            # controlla parallelismo (default 12)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

const OUTPUT_ACTIVITY      = path.join(ROOT, "Activity_rows.csv");
const OUTPUT_ACCOMMODATION = path.join(ROOT, "Accommodation_rows.csv");
const LOCATION_CSV         = path.join(ROOT, "Location_rows.csv");
const ACTIVITY_CATEGORY_CSV= path.join(ROOT, "activityCategory.csv");
const CACHE_DIR            = path.join(ROOT, ".cache");

const ENRICH_MODE   = (process.env.ENRICH_MODE || "basic").toLowerCase(); // none | basic | full
const CONCURRENCY   = Number(process.env.CONCURRENCY   || 12);
const MAX_ELEMENTS  = process.env.MAX_ELEMENTS ? Number(process.env.MAX_ELEMENTS) : null;
const PROGRESS_EVERY= Number(process.env.PROGRESS_EVERY || 2000);

const ENABLE_REVERSE = ENRICH_MODE === "full";
const ENABLE_WIKI    = ENRICH_MODE === "full";
const ENABLE_IMAGES  = ENRICH_MODE !== "none";

// Nominatim: massimo 1 req/s come da ToS
const NOMINATIM_DELAY_MS = 1100;
// Wikipedia: max 10 req/s, usiamo 120ms di gap
const WIKI_DELAY_MS = 120;

const SKIP_JSON_FILES = new Set([
  "utilis.json", "package.json", "package-lock.json",
  "reversecache.json", "imagecache.json", "wikicache.json",
]);

// ─────────────────────────────────────────────
//  MAPPE CATEGORIA
// ─────────────────────────────────────────────
const ACTIVITY_CATEGORY_MAP = new Map([
  ["amenity:bicycle_rental",   1],
  ["sport:climbing",           2],
  ["sport:canoe",              3],
  ["sport:skiing",             4],
  ["leisure:horse_riding",     5],
  ["sport:fishing",            6],
  ["leisure:spa",              7],
  ["leisure:swimming_pool",    8],
  ["leisure:park",             9],
  ["landuse:forest",          10],
  ["boundary:protected_area", 11],
  ["natural:peak",            12],
  ["waterway:waterfall",      13],
  ["tourism:camp_site",       14],
  ["tourism:picnic_site",     15],
  ["highway:path",            16],
  ["highway:cycleway",        17],
  ["railway:station",         18],
  ["highway:bus_stop",        19],
  ["amenity:parking",         20],
  ["amenity:fast_food",       21],
  ["amenity:cafe",            22],
  ["amenity:ice_cream",       23],
  ["shop:bakery",             24],
  ["shop:wine",               25],
  ["amenity:restaurant",      26],
  ["amenity:bar",             27],
  ["amenity:pub",             28],
  ["amenity:theatre",         33],
  ["amenity:concert_hall",    34],
  ["amenity:library",         35],
  ["leisure:stadium",         36],
  ["tourism:museum",          37],
  ["amenity:cinema",          38],
  ["shop:mall",               39],
  ["amenity:marketplace",     40],
  // Abbigliamento (41)
  ["shop:clothes",            41],
  ["shop:fashion",            41],
  ["shop:shoes",              41],
  ["shop:bags",               41],
  ["shop:accessories",        41],
  ["shop:clothing",           41],
  ["shop:boutique",           41],
  ["shop:sports",             41],
  // Artigianato locale (42)
  ["shop:art",                42],
  ["shop:craft",              42],
  ["shop:gift",               42],
  ["shop:jewelry",            42],
  ["shop:jewellery",          42],
  ["shop:antiques",           42],
  ["shop:pottery",            42],
  ["shop:leather",            42],
  ["amenity:place_of_worship",43],
  ["historic:abbey",          44],
  // Santuari (45)
  ["historic:wayside_shrine", 45],
  ["historic:shrine",         45],
  ["amenity:shrine",          45],
  ["tourism:viewpoint",       46],
  ["tourism:attraction",      47],
  ["historic:castle",         49],
  ["historic:monument",       50],
  ["amenity:toilets",         51],
  ["amenity:drinking_water",  52],
  ["amenity:fuel",            53],
  ["amenity:pharmacy",        54],
  ["amenity:nightclub",       55],
]);

const ACCOMMODATION_TAGS = new Map([
  ["tourism:hotel",      { starsDefault: 3 }],
  ["tourism:guest_house",{ starsDefault: 2 }],
  ["tourism:hostel",     { starsDefault: 2 }],
  ["tourism:farm",       { starsDefault: 3 }],
]);

// Immagini Unsplash per categoria (URL deterministici, no API key richiesta)
const CATEGORY_IMAGE_MAP = new Map([
  [ 1, "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1200&auto=format&fit=crop"],
  [ 2, "https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=1200&auto=format&fit=crop"],
  [ 3, "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1200&auto=format&fit=crop"],
  [ 4, "https://images.unsplash.com/photo-1517825738774-7de9363ef735?q=80&w=1200&auto=format&fit=crop"],
  [ 5, "https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=1200&auto=format&fit=crop"],
  [ 6, "https://images.unsplash.com/photo-1464983953574-0892a716854b?q=80&w=1200&auto=format&fit=crop"],
  [ 7, "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?q=80&w=1200&auto=format&fit=crop"],
  [ 8, "https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=1200&auto=format&fit=crop"],
  [ 9, "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200&auto=format&fit=crop"],
  [10, "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop"],
  [11, "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1200&auto=format&fit=crop"],
  [12, "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200&auto=format&fit=crop"],
  [13, "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop"],
  [14, "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop"],
  [15, "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop"],
  [16, "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop"],
  [17, "https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1200&auto=format&fit=crop"],
  [18, "https://images.unsplash.com/photo-1474487548417-781cb71495f3?q=80&w=1200&auto=format&fit=crop"],
  [19, "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop"],
  [20, "https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1200&auto=format&fit=crop"],
  [21, "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop"],
  [22, "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop"],
  [23, "https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=1200&auto=format&fit=crop"],
  [24, "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1200&auto=format&fit=crop"],
  [25, "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=1200&auto=format&fit=crop"],
  [26, "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop"],
  [27, "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1200&auto=format&fit=crop"],
  [28, "https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=1200&auto=format&fit=crop"],
  [33, "https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=1200&auto=format&fit=crop"],
  [34, "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1200&auto=format&fit=crop"],
  [35, "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1200&auto=format&fit=crop"],
  [36, "https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1200&auto=format&fit=crop"],
  [37, "https://images.unsplash.com/photo-1518998053901-5348d3961a04?q=80&w=1200&auto=format&fit=crop"],
  [38, "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop"],
  [39, "https://images.unsplash.com/photo-1481437156560-3205f6a55735?q=80&w=1200&auto=format&fit=crop"],
  [40, "https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=1200&auto=format&fit=crop"],
  [41, "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop"],
  [42, "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?q=80&w=1200&auto=format&fit=crop"],
  [43, "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop"],
  [44, "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=1200&auto=format&fit=crop"],
  [45, "https://images.unsplash.com/photo-1548625361-58a9d46c0a5d?q=80&w=1200&auto=format&fit=crop"],
  [46, "https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=1200&auto=format&fit=crop"],
  [47, "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1200&auto=format&fit=crop"],
  [49, "https://images.unsplash.com/photo-1520637836862-4d197d17c93a?q=80&w=1200&auto=format&fit=crop"],
  [50, "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1200&auto=format&fit=crop"],
  [51, "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200&auto=format&fit=crop"],
  [52, "https://images.unsplash.com/photo-1518791841217-8f162f1912da?q=80&w=1200&auto=format&fit=crop"],
  [53, "https://images.unsplash.com/photo-1545262810-77515befe149?q=80&w=1200&auto=format&fit=crop"],
  [54, "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=1200&auto=format&fit=crop"],
  [55, "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1200&auto=format&fit=crop"],
]);

const ACCOMMODATION_DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop";

// Descrizioni fallback per categoria (italiano)
const CATEGORY_DESCRIPTION_MAP = new Map([
  [ 1, "Punto di noleggio biciclette per esplorare la zona in modo ecologico e divertente."],
  [ 2, "Struttura o falesia dedicata all'arrampicata sportiva e all'outdoor climbing."],
  [ 3, "Centro o spot ideale per kayak, canoa e attività acquatiche."],
  [ 4, "Impianto sciistico con piste e infrastrutture per sport invernali."],
  [ 5, "Centro equestre e maneggio per attività a cavallo."],
  [ 6, "Area dedicata alla pesca sportiva o ricreativa in un contesto naturale."],
  [ 7, "Centro benessere, spa o struttura wellness per il relax e la cura del corpo."],
  [ 8, "Piscina pubblica o impianto natatorio per il nuoto e l'attività fisica."],
  [ 9, "Parco urbano o area verde attrezzata, ideale per passeggiate e momenti all'aperto."],
  [10, "Area boschiva e foresta di interesse naturalistico, perfetta per escursioni."],
  [11, "Riserva naturale protetta con flora e fauna di grande pregio ambientale."],
  [12, "Picco o cima montuosa di interesse alpinistico e panoramico."],
  [13, "Cascata o salto d'acqua di grande bellezza naturalistica."],
  [14, "Campeggio attrezzato per soggiorni en plein air immersi nella natura."],
  [15, "Area picnic attrezzata per pause e pranzi all'aperto in un ambiente rilassante."],
  [16, "Sentiero escursionistico per trekking e passeggiate nella natura."],
  [17, "Pista ciclabile dedicata o protetta per pedalate sicure e piacevoli."],
  [18, "Stazione ferroviaria e snodo per itinerari multimodali sul territorio."],
  [19, "Fermata bus per gli spostamenti locali e la mobilità urbana."],
  [20, "Area di parcheggio a supporto delle attrazioni e dei centri urbani."],
  [21, "Punto ristoro veloce con cucina rapida, ideale durante le escursioni."],
  [22, "Bar, caffetteria o caffè storico dove assaporare la tradizione locale."],
  [23, "Gelateria artigianale con proposte di gusti locali e ingredienti freschi."],
  [24, "Panetteria o forno artigianale per prodotti da forno freschi ogni giorno."],
  [25, "Enoteca o negozio specializzato in vini locali e produzioni regionali."],
  [26, "Ristorante con cucina tipica locale, ideale per scoprire i sapori del territorio."],
  [27, "Bar e locale informale per un aperitivo o una pausa rigenerante."],
  [28, "Pub e birreria con selezione di birre artigianali e atmosfera conviviale."],
  [33, "Teatro e sala per spettacoli dal vivo, concerti e rappresentazioni culturali."],
  [34, "Sala concerti e spazio dedicato a eventi musicali di ogni genere."],
  [35, "Biblioteca pubblica con collezioni consultabili e spazi di studio."],
  [36, "Stadio e impianto sportivo per grandi eventi e partite."],
  [37, "Museo con collezioni permanenti e temporanee di arte, storia e scienza."],
  [38, "Cinema e sala di proiezione per film, festival e rassegne culturali."],
  [39, "Centro commerciale e mall con negozi, ristorazione e servizi."],
  [40, "Mercato e piazza di vendita con prodotti freschi e artigianato locale."],
  [41, "Negozio di abbigliamento, moda e accessori per uomo, donna e bambino."],
  [42, "Bottega artigianale con prodotti locali, oggetti d'arte e souvenir fatti a mano."],
  [43, "Chiesa o luogo di culto visitabile, spesso di rilevante valore storico e artistico."],
  [44, "Abbazia o complesso monastico di grande interesse storico, artistico e spirituale."],
  [45, "Santuario e luogo di devozione di rilievo storico, artistico e spirituale."],
  [46, "Punto panoramico e belvedere con vista spettacolare sul paesaggio circostante."],
  [47, "Attrazione turistica e punto di interesse iconico del territorio."],
  [49, "Castello o fortezza storica con architettura medievale e panorami suggestivi."],
  [50, "Monumento o memoriale di interesse storico e culturale."],
  [51, "Servizi igienici pubblici disponibili per i visitatori."],
  [52, "Fontanella di acqua potabile pubblica, utile durante le passeggiate."],
  [53, "Stazione di rifornimento carburante e servizi per veicoli."],
  [54, "Farmacia con personale qualificato per assistenza sanitaria in viaggio."],
  [55, "Discoteca o locale notturno per vivere la movida e il divertimento serale."],
]);

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function log(msg) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${msg}`);
}

function toNumber(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function csvEscape(v) {
  if (v === undefined || v === null) return "";
  const s = String(v).replace(/\r?\n/g, " ").trim();
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(rows, headers) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n") + "\n";
}

function parseCsvLine(line) {
  const result = [];
  let token = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { token += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) {
      result.push(token); token = "";
    } else token += c;
  }
  result.push(token);
  return result;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Concurrency limiter senza dipendenze esterne
function makeLimiter(concurrency) {
  let active = 0;
  const queue = [];
  function run() {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => { active--; run(); });
  }
  return (fn) => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    run();
  });
}

// ─────────────────────────────────────────────
//  CACHE PERSISTENTE
// ─────────────────────────────────────────────
async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function loadCache(file) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return new Map(Object.entries(JSON.parse(raw)));
  } catch { return new Map(); }
}

async function saveCache(file, map) {
  await fs.writeFile(file, JSON.stringify(Object.fromEntries(map), null, 2), "utf8");
}

// ─────────────────────────────────────────────
//  FETCH CON RETRY
// ─────────────────────────────────────────────
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        await sleep(attempt * 1500);
        continue;
      }
      return res; // 404 ecc. → ritorna comunque
    } catch (e) {
      if (attempt === retries) return null;
      await sleep(attempt * 800);
    }
  }
  return null;
}

// ─────────────────────────────────────────────
//  NOMINATIM — reverse geocoding
// ─────────────────────────────────────────────
let lastNominatimCall = 0;
const nominatimCache = new Map(); // verrà caricata

async function reverseGeocode(lat, lon) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (nominatimCache.has(key)) return nominatimCache.get(key);

  // Rate limit 1 req/s
  const gap = Date.now() - lastNominatimCall;
  if (gap < NOMINATIM_DELAY_MS) await sleep(NOMINATIM_DELAY_MS - gap);
  lastNominatimCall = Date.now();

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
  const res = await fetchWithRetry(url, { headers: { "User-Agent": "SmartFare-Enricher/2.0 (educational)" } });

  if (!res) { nominatimCache.set(key, null); return null; }

  try {
    const data = await res.json();
    const addr = data.address || {};
    const result = {
      street: addr.road || addr.pedestrian || addr.path || addr.footway || addr.cycleway || "",
      houseNumber: addr.house_number || "",
      city: addr.city || addr.town || addr.village || addr.municipality || addr.suburb || "",
    };
    nominatimCache.set(key, result);
    return result;
  } catch {
    nominatimCache.set(key, null);
    return null;
  }
}

// ─────────────────────────────────────────────
//  WIKIPEDIA — estratto + immagine in italiano
// ─────────────────────────────────────────────
let lastWikiCall = 0;
const wikiCache = new Map();

/**
 * Cerca su Wikipedia IT per "name" e restituisce { extract, imageUrl }
 */
async function fetchWikipedia(name) {
  if (!name || name.length < 3) return null;
  const key = name.toLowerCase().trim();
  if (wikiCache.has(key)) return wikiCache.get(key);

  // Rate limit
  const gap = Date.now() - lastWikiCall;
  if (gap < WIKI_DELAY_MS) await sleep(WIKI_DELAY_MS - gap);
  lastWikiCall = Date.now();

  // API Wikipedia REST (estratto)
  const encoded = encodeURIComponent(name);
  const searchUrl = `https://it.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  const res = await fetchWithRetry(searchUrl, {
    headers: { "Accept": "application/json", "User-Agent": "SmartFare-Enricher/2.0" }
  });

  if (!res || res.status === 404) {
    wikiCache.set(key, null);
    return null;
  }

  try {
    const data = await res.json();
    if (!data.extract || data.extract.length < 20) {
      wikiCache.set(key, null);
      return null;
    }

    // Tronca estratto a massimo 400 caratteri senza spezzare parole
    let extract = data.extract;
    if (extract.length > 400) {
      extract = extract.slice(0, 400).replace(/\s+\S*$/, "") + "…";
    }

    const imageUrl = data.thumbnail?.source || data.originalimage?.source || null;

    const result = { extract, imageUrl };
    wikiCache.set(key, result);
    return result;
  } catch {
    wikiCache.set(key, null);
    return null;
  }
}

/**
 * Prova prima il nome esatto, poi prova con nome + città
 */
async function wikiEnrich(name, city) {
  let result = await fetchWikipedia(name);
  if (!result && city) {
    result = await fetchWikipedia(`${name} ${city}`);
  }
  return result;
}

// ─────────────────────────────────────────────
//  WIKIMEDIA COMMONS — immagine per nome POI
// ─────────────────────────────────────────────
const wikimediaCache = new Map();

async function fetchWikimediaImage(name) {
  if (!name || name.length < 3) return null;
  const key = name.toLowerCase().trim();
  if (wikimediaCache.has(key)) return wikimediaCache.get(key);

  // Rate limit condiviso con Wikipedia
  const gap = Date.now() - lastWikiCall;
  if (gap < WIKI_DELAY_MS) await sleep(WIKI_DELAY_MS - gap);
  lastWikiCall = Date.now();

  const encoded = encodeURIComponent(name);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encoded}&prop=pageimages&format=json&pithumbsize=1200`;
  const res = await fetchWithRetry(url, { headers: { "User-Agent": "SmartFare-Enricher/2.0" } });

  if (!res) { wikimediaCache.set(key, null); return null; }

  try {
    const data = await res.json();
    const pages = data?.query?.pages || {};
    for (const p of Object.values(pages)) {
      const src = p?.thumbnail?.source;
      if (src) { wikimediaCache.set(key, src); return src; }
    }
    wikimediaCache.set(key, null);
    return null;
  } catch {
    wikimediaCache.set(key, null);
    return null;
  }
}

// ─────────────────────────────────────────────
//  CSV HELPERS
// ─────────────────────────────────────────────
async function readLocations() {
  const csv = await fs.readFile(LOCATION_CSV, "utf8");
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    const id = Number(c[0]);
    const name = c[1];
    const lat = Number(c[4]);
    const lon = Number(c[5]);
    if (Number.isFinite(id) && Number.isFinite(lat) && Number.isFinite(lon)) {
      rows.push({ id, name, lat, lon, key: name?.trim().toLowerCase() || "" });
    }
  }
  return rows;
}

async function readActivityCategories() {
  const csv = await fs.readFile(ACTIVITY_CATEGORY_CSV, "utf8");
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const byId = new Map();
  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    const id = Number(c[0]);
    const name = c[1];
    if (Number.isFinite(id) && name) byId.set(id, { id, name });
  }
  return byId;
}

// ─────────────────────────────────────────────
//  SPATIAL INDEX PER COMUNI
// ─────────────────────────────────────────────
function haversineKm(la1, lo1, la2, lo2) {
  const toR = (v) => (v * Math.PI) / 180;
  const dLa = toR(la2 - la1);
  const dLo = toR(lo2 - lo1);
  const a = Math.sin(dLa/2)**2 + Math.cos(toR(la1))*Math.cos(toR(la2))*Math.sin(dLo/2)**2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

class LocationIndex {
  constructor(locs) {
    this.locs = locs;
    this.byKey = new Map();
    this.cellSize = 0.42;
    this.grid = new Map();
    for (const l of locs) {
      if (l.key) this.byKey.set(l.key, l.id);
      const cell = this._cell(l.lat, l.lon);
      if (!this.grid.has(cell)) this.grid.set(cell, []);
      this.grid.get(cell).push(l);
    }
  }
  _cell(lat, lon) {
    return `${Math.floor(lat/this.cellSize)}:${Math.floor(lon/this.cellSize)}`;
  }
  _nearest(lat, lon, r) {
    const cl = Math.floor(lat/this.cellSize);
    const co = Math.floor(lon/this.cellSize);
    let best = null;
    for (let dl = -r; dl <= r; dl++) {
      for (let do_ = -r; do_ <= r; do_++) {
        const bucket = this.grid.get(`${cl+dl}:${co+do_}`);
        if (!bucket) continue;
        for (const l of bucket) {
          const d = haversineKm(lat, lon, l.lat, l.lon);
          if (!best || d < best.dist) best = { id: l.id, dist: d };
        }
      }
    }
    return best;
  }
  find(lat, lon, cityName) {
    if (cityName) {
      const id = this.byKey.get(cityName.trim().toLowerCase());
      if (id) return id;
    }
    let b = this._nearest(lat, lon, 1) || this._nearest(lat, lon, 3);
    if (!b) for (const l of this.locs) {
      const d = haversineKm(lat, lon, l.lat, l.lon);
      if (!b || d < b.dist) b = { id: l.id, dist: d };
    }
    return b ? b.id : 1;
  }
}

// ─────────────────────────────────────────────
//  TAG HELPERS
// ─────────────────────────────────────────────
function detectCategoryId(tags) {
  // Caso speciale: amenity=place_of_worship ma nome contiene "Santuario" -> 45
  if (tags.amenity === "place_of_worship") {
    const nameStr = (tags.name || "").toLowerCase();
    if (nameStr.includes("santuario") || nameStr.includes("shrine")) {
      return 45; // Santuari
    }
  }

  const checks = [
    ["amenity",  tags.amenity],
    ["tourism",  tags.tourism],
    ["shop",     tags.shop],
    ["sport",    tags.sport],
    ["leisure",  tags.leisure],
    ["landuse",  tags.landuse],
    ["boundary", tags.boundary],
    ["natural",  tags.natural],
    ["waterway", tags.waterway],
    ["highway",  tags.highway],
    ["railway",  tags.railway],
    ["historic", tags.historic],
  ];
  for (const [k, v] of checks) {
    if (!v) continue;
    const id = ACTIVITY_CATEGORY_MAP.get(`${k}:${v}`);
    if (id) return id;
  }
  return null;
}

function detectAccommodation(tags) {
  for (const [key, cfg] of ACCOMMODATION_TAGS.entries()) {
    const [field, expected] = key.split(":");
    if (tags[field] === expected) return cfg;
  }
  return null;
}

function normalizeName(tags, fallback) {
  return tags.name || tags.brand || tags.operator || fallback || null;
}

function starsFromTags(tags, fallback = 3) {
  const raw = tags.stars || tags["hotel:stars"];
  if (!raw) return fallback;
  const m = String(raw).match(/\d+/);
  return m ? Math.min(5, Math.max(1, Number(m[0]))) : fallback;
}

function buildStreetFromTags(tags) {
  const street = tags["addr:street"];
  const number = tags["addr:housenumber"];
  if (street && number) return `${street}, ${number}`;
  if (street) return street;
  return "";
}

function buildCityFromTags(tags) {
  return tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || "";
}

/**
 * Costruisce la descrizione con questa priorità:
 * 1. Tag OSM (description:it, description)
 * 2. Estratto Wikipedia
 * 3. Testo fallback per categoria
 * 4. Generico
 */
function buildDescription(tags, categoryId, categoryName, poiName, wikiExtract) {
  // 1. Tags OSM
  const osmDesc = tags["description:it"] || tags.description;
  if (osmDesc && osmDesc.length > 15) return osmDesc.trim();

  // 2. Wikipedia
  if (wikiExtract && wikiExtract.length > 20) return wikiExtract;

  // 3. Fallback categoria
  if (categoryId && CATEGORY_DESCRIPTION_MAP.has(categoryId)) {
    return CATEGORY_DESCRIPTION_MAP.get(categoryId);
  }

  // 4. Generico
  if (categoryName && poiName) return `${poiName} — ${categoryName.toLowerCase()}.`;
  if (categoryName) return `Punto di interesse: ${categoryName.toLowerCase()}.`;
  return "Punto di interesse turistico.";
}

// ─────────────────────────────────────────────
//  CARICA JSON OVERPASS
// ─────────────────────────────────────────────
async function loadOverpassElements() {
  const files = await fs.readdir(ROOT);
  const jsonFiles = files.filter((f) => {
    const lo = f.toLowerCase();
    return lo.endsWith(".json") && !lo.startsWith(".") && !SKIP_JSON_FILES.has(lo) && !f.includes(".cache");
  });

  const all = [];
  for (const f of jsonFiles) {
    log(`Caricamento ${f}...`);
    try {
      const raw = await fs.readFile(path.join(ROOT, f), "utf8");
      const parsed = JSON.parse(raw);
      const elements = Array.isArray(parsed.elements) ? parsed.elements : [];
      let added = 0;
      for (const el of elements) {
        const lat = toNumber(el.lat ?? el.center?.lat);
        const lon = toNumber(el.lon ?? el.center?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        all.push({ ...el, lat, lon });
        added++;
      }
      log(`  → ${added} elementi validi (totale: ${all.length})`);
    } catch (e) {
      log(`  ERRORE ${f}: ${e.message}`);
    }
  }

  if (MAX_ELEMENTS && all.length > MAX_ELEMENTS) {
    log(`MAX_ELEMENTS=${MAX_ELEMENTS}: uso solo i primi.`);
    return all.slice(0, MAX_ELEMENTS);
  }
  return all;
}

// ─────────────────────────────────────────────
//  PROCESSA SINGOLO ELEMENTO
// ─────────────────────────────────────────────
async function processElement(el, locationIndex, categoryById) {
  const tags = el.tags || {};
  const accommodationCfg = detectAccommodation(tags);
  const categoryId = detectCategoryId(tags);

  if (!accommodationCfg && !categoryId) return null;

  const category = categoryId ? categoryById.get(categoryId) : null;

  // ── NOME ──
  const name = normalizeName(
    tags,
    `${tags.amenity || tags.tourism || tags.shop || "POI"} ${el.id}`
  );

  // ── INDIRIZZO ──
  let street = buildStreetFromTags(tags);
  let city   = buildCityFromTags(tags);

  if (ENABLE_REVERSE && (!street || !city)) {
    const geo = await reverseGeocode(el.lat, el.lon);
    if (geo) {
      if (!street && geo.street) {
        street = geo.houseNumber ? `${geo.street}, ${geo.houseNumber}` : geo.street;
      }
      if (!city && geo.city) city = geo.city;
    }
  }

  // ── WIKIPEDIA ──
  let wikiExtract = null;
  let wikiImage   = null;
  if (ENABLE_WIKI) {
    const wikiData = await wikiEnrich(name, city);
    if (wikiData) {
      wikiExtract = wikiData.extract;
      wikiImage   = wikiData.imageUrl;
    }
    // Se non c'è immagine Wiki, prova Wikimedia Commons
    if (!wikiImage && name) {
      wikiImage = await fetchWikimediaImage(name);
    }
  }

  // ── LOCATION ID ──
  const locationId = locationIndex.find(el.lat, el.lon, city);

  // ────────────────
  //  ACCOMMODATION
  // ────────────────
  if (accommodationCfg) {
    let imageUrl = wikiImage || ACCOMMODATION_DEFAULT_IMAGE;

    return {
      type: "accommodation",
      row: {
        name,
        street,
        stars: starsFromTags(tags, accommodationCfg.starsDefault),
        latitude:  el.lat,
        longitude: el.lon,
        imageUrl,
        locationId,
      },
    };
  }

  // ────────────────
  //  ACTIVITY
  // ────────────────
  const imageUrl = ENABLE_IMAGES
    ? (wikiImage || CATEGORY_IMAGE_MAP.get(categoryId) || "")
    : "";

  const description = buildDescription(tags, categoryId, category?.name, name, wikiExtract);

  return {
    type: "activity",
    row: {
      name,
      description,
      street,
      latitude:  el.lat,
      longitude: el.lon,
      imageUrl,
      locationId,
      categoryId,
    },
  };
}

// ─────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────
async function main() {
  console.time("TOTALE");

  log("═══════════════════════════════════════════════════");
  log(" SmartFare Overpass Enricher v2");
  log(`  ENRICH_MODE : ${ENRICH_MODE}`);
  log(`  CONCURRENCY : ${CONCURRENCY}`);
  log(`  ENABLE_REVERSE: ${ENABLE_REVERSE}`);
  log(`  ENABLE_WIKI   : ${ENABLE_WIKI}`);
  log(`  ENABLE_IMAGES : ${ENABLE_IMAGES}`);
  if (MAX_ELEMENTS) log(`  MAX_ELEMENTS  : ${MAX_ELEMENTS}`);
  log("═══════════════════════════════════════════════════");

  await ensureCacheDir();

  // Carica cache persistenti
  const REVERSE_CACHE_FILE  = path.join(CACHE_DIR, "reverseCache.json");
  const WIKI_CACHE_FILE     = path.join(CACHE_DIR, "wikiCache.json");
  const WIKIMEDIA_CACHE_FILE= path.join(CACHE_DIR, "wikimediaCache.json");

  const rcLoad = await loadCache(REVERSE_CACHE_FILE);
  rcLoad.forEach((v, k) => nominatimCache.set(k, v));

  const wcLoad = await loadCache(WIKI_CACHE_FILE);
  wcLoad.forEach((v, k) => wikiCache.set(k, v));

  const wmcLoad = await loadCache(WIKIMEDIA_CACHE_FILE);
  wmcLoad.forEach((v, k) => wikimediaCache.set(k, v));

  log(`Cache caricata: ${nominatimCache.size} reverse, ${wikiCache.size} wiki, ${wikimediaCache.size} wikimedia`);

  // Dati
  log("Caricamento comuni (Location_rows.csv)...");
  const locations = await readLocations();
  const locationIndex = new LocationIndex(locations);
  log(`  ${locations.length} comuni, ${locationIndex.grid.size} celle`);

  log("Caricamento categorie...");
  const categoryById = await readActivityCategories();
  log(`  ${categoryById.size} categorie`);

  log("Caricamento file JSON Overpass...");
  const elements = await loadOverpassElements();
  log(`Trovati ${elements.length} elementi totali da processare.`);

  // Processa in parallelo con limiter
  const limit = makeLimiter(CONCURRENCY);
  const activityRows = [];
  const accommodationRows = [];
  let activityId = 1;
  let accommodationId = 1;
  let processed = 0;
  let skipped = 0;
  const started = Date.now();

  // Salvataggio periodico cache (ogni 500 elementi)
  const SAVE_EVERY = 500;

  const tasks = elements.map((el, i) =>
    limit(async () => {
      const result = await processElement(el, locationIndex, categoryById);
      processed++;

      if (result) {
        if (result.type === "activity") {
          activityRows.push({ id: activityId++, ...result.row });
        } else {
          accommodationRows.push({ id: accommodationId++, ...result.row });
        }
      } else {
        skipped++;
      }

      // Progress log
      if (PROGRESS_EVERY > 0 && processed % PROGRESS_EVERY === 0) {
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        const speed = (processed / ((Date.now() - started) / 1000)).toFixed(0);
        log(`  ${processed}/${elements.length} (${elapsed}s, ${speed} el/s) — attività:${activityRows.length} soggiorni:${accommodationRows.length} saltati:${skipped}`);
      }

      // Salva cache periodicamente
      if (processed % SAVE_EVERY === 0) {
        await Promise.all([
          saveCache(REVERSE_CACHE_FILE,   nominatimCache),
          saveCache(WIKI_CACHE_FILE,      wikiCache),
          saveCache(WIKIMEDIA_CACHE_FILE, wikimediaCache),
        ]);
      }
    })
  );

  await Promise.all(tasks);

  // Salva cache finale
  log("Salvataggio cache finale...");
  await Promise.all([
    saveCache(REVERSE_CACHE_FILE,   nominatimCache),
    saveCache(WIKI_CACHE_FILE,      wikiCache),
    saveCache(WIKIMEDIA_CACHE_FILE, wikimediaCache),
  ]);

  // Scrittura CSV
  log("Scrittura Activity_rows.csv...");
  await fs.writeFile(
    OUTPUT_ACTIVITY,
    rowsToCsv(activityRows, ["id","name","description","street","latitude","longitude","imageUrl","locationId","categoryId"]),
    "utf8"
  );

  log("Scrittura Accommodation_rows.csv...");
  await fs.writeFile(
    OUTPUT_ACCOMMODATION,
    rowsToCsv(accommodationRows, ["id","name","street","stars","latitude","longitude","imageUrl","locationId"]),
    "utf8"
  );

  log("═══════════════════════════════════════════════════");
  log(` Attività generate     : ${activityRows.length}`);
  log(` Soggiorni generati    : ${accommodationRows.length}`);
  log(` Elementi saltati      : ${skipped}`);
  log(` Elementi processati   : ${processed}`);
  log("═══════════════════════════════════════════════════");
  console.timeEnd("TOTALE");
}

main().catch((err) => {
  console.error("ERRORE FATALE:", err);
  process.exit(1);
});
