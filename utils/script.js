
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pLimit from "p-limit";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

const OUTPUT_ACTIVITY = path.join(ROOT, "Activity_rows.csv");
const OUTPUT_ACCOMMODATION = path.join(ROOT, "Accommodation_rows.csv");
const LOCATION_CSV = path.join(ROOT, "Location_rows.csv");
const ACTIVITY_CATEGORY_CSV = path.join(ROOT, "activityCategory.csv");

const CACHE_DIR = path.join(ROOT, ".cache");
const REVERSE_CACHE_FILE = path.join(CACHE_DIR, "reverseCache.json");
const IMAGE_CACHE_FILE = path.join(CACHE_DIR, "imageCache.json");

const CONCURRENCY = Number(process.env.CONCURRENCY || 16);
const ENRICH_MODE = (process.env.ENRICH_MODE || "basic").toLowerCase();
const ENABLE_REVERSE = ENRICH_MODE === "full";
const ENABLE_IMAGES = ENRICH_MODE !== "none";
const PROGRESS_EVERY = Number(process.env.PROGRESS_EVERY || 5000);
const MAX_ELEMENTS = process.env.MAX_ELEMENTS
  ? Number(process.env.MAX_ELEMENTS)
  : null;

const REVERSE_DELAY_MS = Number(process.env.REVERSE_DELAY_MS || 1100);

/** JSON da non importare come export Overpass */
const SKIP_JSON_FILES = new Set([
  "utilis.json",
  "package.json",
  "package-lock.json",
  "reversecache.json",
  "imagecache.json",
]);

const limit = pLimit(CONCURRENCY);

const ACTIVITY_CATEGORY_MAP = new Map([
  ["amenity:bicycle_rental", 1],
  ["sport:climbing", 2],
  ["sport:canoe", 3],
  ["sport:skiing", 4],
  ["leisure:horse_riding", 5],
  ["sport:fishing", 6],
  ["leisure:spa", 7],
  ["leisure:swimming_pool", 8],
  ["leisure:park", 9],
  ["landuse:forest", 10],
  ["boundary:protected_area", 11],
  ["natural:peak", 12],
  ["waterway:waterfall", 13],
  ["tourism:camp_site", 14],
  ["tourism:picnic_site", 15],
  ["highway:path", 16],
  ["highway:cycleway", 17],
  ["railway:station", 18],
  ["highway:bus_stop", 19],
  ["amenity:parking", 20],
  ["amenity:fast_food", 21],
  ["amenity:cafe", 22],
  ["amenity:ice_cream", 23],
  ["shop:bakery", 24],
  ["shop:wine", 25],
  ["amenity:restaurant", 26],
  ["amenity:bar", 27],
  ["amenity:pub", 28],
  ["amenity:theatre", 33],
  ["amenity:concert_hall", 34],
  ["amenity:library", 35],
  ["leisure:stadium", 36],
  ["tourism:museum", 37],
  ["amenity:cinema", 38],
  ["shop:mall", 39],
  ["amenity:marketplace", 40],
  ["amenity:place_of_worship", 43],
  ["historic:abbey", 44],
  ["tourism:viewpoint", 46],
  ["tourism:attraction", 47],
  ["historic:castle", 49],
  ["historic:monument", 50],
  ["amenity:toilets", 51],
  ["amenity:drinking_water", 52],
  ["amenity:fuel", 53],
  ["amenity:pharmacy", 54],
  ["amenity:nightclub", 55],
]);

const CATEGORY_IMAGE_MAP = new Map([
  [1, "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1200&auto=format&fit=crop"],
  [2, "https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=1200&auto=format&fit=crop"],
  [3, "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1200&auto=format&fit=crop"],
  [4, "https://images.unsplash.com/photo-1517825738774-7de9363ef735?q=80&w=1200&auto=format&fit=crop"],
  [5, "https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=1200&auto=format&fit=crop"],
  [6, "https://images.unsplash.com/photo-1464983953574-0892a716854b?q=80&w=1200&auto=format&fit=crop"],
  [7, "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?q=80&w=1200&auto=format&fit=crop"],
  [8, "https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=1200&auto=format&fit=crop"],
  [9, "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200&auto=format&fit=crop"],
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
  [43, "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop"],
  [44, "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=1200&auto=format&fit=crop"],
  [46, "https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=1200&auto=format&fit=crop"],
  [47, "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1200&auto=format&fit=crop"],
  [49, "https://images.unsplash.com/photo-1520637836862-4d197d17c93a?q=80&w=1200&auto=format&fit=crop"],
  [50, "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1200&auto=format&fit=crop"],
  [55, "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1200&auto=format&fit=crop"],
]);

const ACCOMMODATION_TAGS = new Map([
  ["tourism:hotel", { starsDefault: 3 }],
  ["tourism:guest_house", { starsDefault: 2 }],
  ["tourism:hostel", { starsDefault: 2 }],
  ["tourism:farm", { starsDefault: 3 }],
]);

let lastReverseCall = 0;

function log(message) {
  const now = new Date().toISOString().slice(11, 19);
  console.log(`[${now}] ${message}`);
}

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function loadJsonCache(file) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return new Map(Object.entries(JSON.parse(raw)));
  } catch {
    return new Map();
  }
}

async function saveJsonCache(file, map) {
  await fs.writeFile(
    file,
    JSON.stringify(Object.fromEntries(map), null, 2),
    "utf8"
  );
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function csvEscape(value) {
  if (value === undefined || value === null) return "";

  const str = String(value);

  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

function rowsToCsv(rows, headers) {
  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }

  return `${lines.join("\n")}\n`;
}

function parseCsvLine(line) {
  const result = [];
  let token = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];

    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        token += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(token);
      token = "";
    } else {
      token += c;
    }
  }

  result.push(token);
  return result;
}

function buildStreet(tags = {}) {
  const street = tags["addr:street"];
  const number = tags["addr:housenumber"];

  if (street && number) return `${street} ${number}`;
  if (street) return street;

  return "";
}

function normalizeName(tags = {}, fallback) {
  return (
    tags.name ||
    tags.brand ||
    tags.operator ||
    fallback ||
    null
  );
}

function starsFromTags(tags = {}, fallback = 3) {
  const raw = tags.stars || tags["hotel:stars"];

  if (!raw) return fallback;

  const match = String(raw).match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

function detectCategoryId(tags = {}) {
  const checks = [
    ["amenity", tags.amenity],
    ["tourism", tags.tourism],
    ["shop", tags.shop],
    ["sport", tags.sport],
    ["leisure", tags.leisure],
    ["landuse", tags.landuse],
    ["boundary", tags.boundary],
    ["natural", tags.natural],
    ["waterway", tags.waterway],
    ["highway", tags.highway],
    ["railway", tags.railway],
    ["historic", tags.historic],
  ];

  for (const [k, v] of checks) {
    if (!v) continue;

    const id = ACTIVITY_CATEGORY_MAP.get(`${k}:${v}`);

    if (id) return id;
  }

  return null;
}

function detectAccommodation(tags = {}) {
  for (const [key, config] of ACCOMMODATION_TAGS.entries()) {
    const [field, expected] = key.split(":");

    if (tags[field] === expected) {
      return config;
    }
  }

  return null;
}

function inferDescription(tags = {}, categoryName, poiName) {
  if (tags.description) return tags.description;
  if (tags["description:it"]) return tags["description:it"];

  if (categoryName && poiName) {
    return `${poiName} - ${categoryName}`;
  }

  if (categoryName) {
    return `Esperienza dedicata a ${categoryName.toLowerCase()}.`;
  }

  return "Punto di interesse turistico.";
}

async function reverseGeocode(lat, lon, reverseCache) {
  if (!ENABLE_REVERSE) {
    return null;
  }

  const cacheKey = `${lat.toFixed(5)},${lon.toFixed(5)}`;

  if (reverseCache.has(cacheKey)) {
    return reverseCache.get(cacheKey);
  }

  const diff = Date.now() - lastReverseCall;

  if (diff < REVERSE_DELAY_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, REVERSE_DELAY_MS - diff)
    );
  }

  lastReverseCall = Date.now();

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          "User-Agent": "SmartFareImporter/1.0",
        },
      }
    );

    if (!response.ok) {
      reverseCache.set(cacheKey, null);
      return null;
    }

    const data = await response.json();
    const addr = data.address || {};

    const result = {
      street:
        addr.road ||
        addr.pedestrian ||
        addr.path ||
        addr.footway ||
        "",
      city:
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        "",
    };

    reverseCache.set(cacheKey, result);

    return result;
  } catch {
    reverseCache.set(cacheKey, null);
    return null;
  }
}

async function readLocations() {
  const csv = await fs.readFile(LOCATION_CSV, "utf8");
  const lines = csv.split(/\r?\n/).filter(Boolean);

  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);

    const id = Number(cols[0]);
    const name = cols[1];
    const lat = Number(cols[4]);
    const lon = Number(cols[5]);

    if (Number.isFinite(id) && Number.isFinite(lat) && Number.isFinite(lon)) {
      rows.push({
        id,
        name,
        lat,
        lon,
        key: name?.trim().toLowerCase() || "",
      });
    }
  }

  return rows;
}

async function readActivityCategories() {
  const csv = await fs.readFile(ACTIVITY_CATEGORY_CSV, "utf8");
  const lines = csv.split(/\r?\n/).filter(Boolean);

  const byId = new Map();

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);

    const id = Number(cols[0]);
    const name = cols[1];

    if (Number.isFinite(id) && name) {
      byId.set(id, {
        id,
        name,
      });
    }
  }

  return byId;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;

  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Indice spaziale sui comuni: evita O(n*m) haversine su decine di migliaia di POI.
 */
class LocationIndex {
  constructor(locations) {
    this.locations = locations;
    this.cityByKey = new Map();
    this.cellSize = 0.42;
    this.grid = new Map();

    for (const loc of locations) {
      if (loc.key) {
        this.cityByKey.set(loc.key, loc.id);
      }
      const cell = this.cellKey(loc.lat, loc.lon);
      if (!this.grid.has(cell)) {
        this.grid.set(cell, []);
      }
      this.grid.get(cell).push(loc);
    }
  }

  cellKey(lat, lon) {
    const clat = Math.floor(lat / this.cellSize);
    const clon = Math.floor(lon / this.cellSize);
    return `${clat}:${clon}`;
  }

  nearestInCells(lat, lon, radiusCells = 1) {
    const clat = Math.floor(lat / this.cellSize);
    const clon = Math.floor(lon / this.cellSize);
    let best = null;

    for (let dLat = -radiusCells; dLat <= radiusCells; dLat += 1) {
      for (let dLon = -radiusCells; dLon <= radiusCells; dLon += 1) {
        const bucket = this.grid.get(`${clat + dLat}:${clon + dLon}`);
        if (!bucket) continue;

        for (const location of bucket) {
          const d = haversineKm(lat, lon, location.lat, location.lon);
          if (!best || d < best.distance) {
            best = { id: location.id, distance: d };
          }
        }
      }
    }

    return best;
  }

  find(lat, lon, cityName) {
    if (cityName) {
      const id = this.cityByKey.get(cityName.trim().toLowerCase());
      if (id) return id;
    }

    let best = this.nearestInCells(lat, lon, 1);
    if (!best) {
      best = this.nearestInCells(lat, lon, 3);
    }
    if (!best) {
      for (const location of this.locations) {
        const d = haversineKm(lat, lon, location.lat, location.lon);
        if (!best || d < best.distance) {
          best = { id: location.id, distance: d };
        }
      }
    }

    return best ? best.id : 1;
  }
}

async function loadOverpassElements() {
  const fileNames = await fs.readdir(ROOT);

  const jsonFiles = fileNames.filter((f) => {
    const lower = f.toLowerCase();
    if (!lower.endsWith(".json")) return false;
    if (lower.startsWith(".")) return false;
    if (SKIP_JSON_FILES.has(lower)) return false;
    if (f.includes(".cache")) return false;
    return true;
  });

  const all = [];

  for (const fileName of jsonFiles) {
    const full = path.join(ROOT, fileName);

    log(`Loading ${fileName}...`);

    const raw = await fs.readFile(full, "utf8");
    const parsed = JSON.parse(raw);

    const elements = Array.isArray(parsed.elements)
      ? parsed.elements
      : [];

    for (const element of elements) {
      const lat = toNumber(element.lat ?? element.center?.lat);
      const lon = toNumber(element.lon ?? element.center?.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        continue;
      }

      all.push({
        ...element,
        lat,
        lon,
      });
    }
  }

  if (MAX_ELEMENTS && all.length > MAX_ELEMENTS) {
    log(`MAX_ELEMENTS=${MAX_ELEMENTS}: uso solo i primi elementi (test).`);
    return all.slice(0, MAX_ELEMENTS);
  }

  return all;
}

function processElementSync(
  element,
  locationIndex,
  categoryById
) {
  const tags = element.tags || {};

  const accommodationCfg = detectAccommodation(tags);
  const categoryId = detectCategoryId(tags);

  if (!accommodationCfg && !categoryId) {
    return null;
  }

  const category = categoryId ? categoryById.get(categoryId) : null;

  const street = buildStreet(tags);
  const city =
    tags["addr:city"] ||
    tags["addr:town"] ||
    tags["addr:village"] ||
    "";

  const locationId = locationIndex.find(
    element.lat,
    element.lon,
    city
  );

  const name = normalizeName(
    tags,
    `${tags.amenity || tags.tourism || "POI"} ${element.id}`
  );

  if (accommodationCfg) {
    return {
      type: "accommodation",
      row: {
        name,
        street,
        stars: starsFromTags(tags, accommodationCfg.starsDefault),
        latitude: element.lat,
        longitude: element.lon,
        imageUrl:
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop",
        locationId,
      },
    };
  }

  const imageUrl = ENABLE_IMAGES
    ? CATEGORY_IMAGE_MAP.get(categoryId) || ""
    : "";

  return {
    type: "activity",
    row: {
      name,
      description: inferDescription(tags, category?.name, name),
      street,
      latitude: element.lat,
      longitude: element.lon,
      imageUrl,
      locationId,
      categoryId,
    },
  };
}

async function processElement(
  element,
  locationIndex,
  categoryById,
  reverseCache
) {
  const tags = element.tags || {};

  const accommodationCfg = detectAccommodation(tags);
  const categoryId = detectCategoryId(tags);

  if (!accommodationCfg && !categoryId) {
    return null;
  }

  const category = categoryId
    ? categoryById.get(categoryId)
    : null;

  let street = buildStreet(tags);

  let city =
    tags["addr:city"] ||
    tags["addr:town"] ||
    tags["addr:village"] ||
    "";

  if (ENABLE_REVERSE && (!street || !city)) {
    const geo = await reverseGeocode(
      element.lat,
      element.lon,
      reverseCache
    );

    if (geo) {
      street = street || geo.street || "";
      city = city || geo.city || "";
    }
  }

  const locationId = locationIndex.find(element.lat, element.lon, city);

  const name = normalizeName(
    tags,
    `${tags.amenity || tags.tourism || "POI"} ${element.id}`
  );

  if (accommodationCfg) {
    return {
      type: "accommodation",
      row: {
        name,
        street,
        stars: starsFromTags(tags, accommodationCfg.starsDefault),
        latitude: element.lat,
        longitude: element.lon,
        imageUrl:
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop",
        locationId,
      },
    };
  }

  const imageUrl = ENABLE_IMAGES
    ? CATEGORY_IMAGE_MAP.get(categoryId) || ""
    : "";

  return {
    type: "activity",
    row: {
      name,
      description: inferDescription(
        tags,
        category?.name,
        name
      ),
      street,
      latitude: element.lat,
      longitude: element.lon,
      imageUrl,
      locationId,
      categoryId,
    },
  };
}

function collectRow(item, counters) {
  if (!item) return;

  if (item.type === "activity") {
    counters.activityRows.push({
      id: counters.activityId++,
      ...item.row,
    });
  } else {
    counters.accommodationRows.push({
      id: counters.accommodationId++,
      ...item.row,
    });
  }
}

async function buildRows() {
  await ensureCacheDir();

  const reverseCache = await loadJsonCache(REVERSE_CACHE_FILE);

  log("Loading locations...");
  const locations = await readLocations();
  const locationIndex = new LocationIndex(locations);
  log(`Location index: ${locations.length} comuni, ${locationIndex.grid.size} celle`);

  log("Loading categories...");
  const categoryById = await readActivityCategories();

  log("Loading JSON files...");
  const elements = await loadOverpassElements();

  log(`Processing ${elements.length} elements (mode=${ENRICH_MODE})...`);

  const counters = {
    activityRows: [],
    accommodationRows: [],
    activityId: 1,
    accommodationId: 1,
  };

  const started = Date.now();

  if (!ENABLE_REVERSE) {
    for (let i = 0; i < elements.length; i += 1) {
      collectRow(
        processElementSync(elements[i], locationIndex, categoryById),
        counters
      );

      if (PROGRESS_EVERY > 0 && (i + 1) % PROGRESS_EVERY === 0) {
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        log(`  ${i + 1}/${elements.length} (${elapsed}s)`);
      }
    }
  } else {
    const CHUNK = 400;
    for (let offset = 0; offset < elements.length; offset += CHUNK) {
      const chunk = elements.slice(offset, offset + CHUNK);
      const processed = await Promise.all(
        chunk.map((element) =>
          limit(() =>
            processElement(element, locationIndex, categoryById, reverseCache)
          )
        )
      );

      for (const item of processed) {
        collectRow(item, counters);
      }

      if (PROGRESS_EVERY > 0) {
        const done = Math.min(offset + CHUNK, elements.length);
        if (done % PROGRESS_EVERY < CHUNK || done === elements.length) {
          const elapsed = ((Date.now() - started) / 1000).toFixed(1);
          log(`  ${done}/${elements.length} (${elapsed}s) — cache reverse: ${reverseCache.size}`);
        }
      }

      if (offset % (CHUNK * 5) === 0) {
        await saveJsonCache(REVERSE_CACHE_FILE, reverseCache);
      }
    }

    await saveJsonCache(REVERSE_CACHE_FILE, reverseCache);
  }

  return {
    activityRows: counters.activityRows,
    accommodationRows: counters.accommodationRows,
  };
}

function printModeHelp() {
  log("Modalità velocità:");
  log("  ENRICH_MODE=none  → solo OSM, senza immagini (più veloce)");
  log("  ENRICH_MODE=basic → immagini Unsplash per categoria (default, consigliato)");
  log("  ENRICH_MODE=full  → + indirizzi Nominatim (~1 req/s, può richiedere ore)");
  log("Variabili utili: PROGRESS_EVERY=5000 MAX_ELEMENTS=1000 CONCURRENCY=16");
}

async function main() {
  console.time("TOTAL");

  printModeHelp();
  log(`ENRICH_MODE=${ENRICH_MODE}`);
  log(`CONCURRENCY=${CONCURRENCY}`);

  const { activityRows, accommodationRows } =
    await buildRows();

  log("Writing Activity CSV...");

  await fs.writeFile(
    OUTPUT_ACTIVITY,
    rowsToCsv(activityRows, [
      "id",
      "name",
      "description",
      "street",
      "latitude",
      "longitude",
      "imageUrl",
      "locationId",
      "categoryId",
    ]),
    "utf8"
  );

  log("Writing Accommodation CSV...");

  await fs.writeFile(
    OUTPUT_ACCOMMODATION,
    rowsToCsv(accommodationRows, [
      "id",
      "name",
      "street",
      "stars",
      "latitude",
      "longitude",
      "imageUrl",
      "locationId",
    ]),
    "utf8"
  );

  log(`Activities: ${activityRows.length}`);
  log(`Accommodations: ${accommodationRows.length}`);

  console.timeEnd("TOTAL");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});