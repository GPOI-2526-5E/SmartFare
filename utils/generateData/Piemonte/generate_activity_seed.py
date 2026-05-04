import csv
import json
import math
from pathlib import Path
from urllib.parse import quote


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "generated"

PIEMONTE_PROVINCES = {"TO", "CN", "AT", "AL", "BI", "NO", "VC", "VCO"}


CATEGORY_DEFINITIONS = [
    {"id": 1, "name": "Noleggio bici", "description": "Punti di noleggio biciclette utili per itinerari su due ruote.", "iconUrl": None},
    {"id": 2, "name": "Arrampicata", "description": "Falesie, palestre e punti dedicati all'arrampicata.", "iconUrl": None},
    {"id": 3, "name": "Kayak e canoa", "description": "Centri e spot per kayak e canoa.", "iconUrl": None},
    {"id": 4, "name": "Sci e impianti sciistici", "description": "Piste e infrastrutture per sport invernali.", "iconUrl": None},
    {"id": 5, "name": "Maneggi", "description": "Centri equestri e maneggi.", "iconUrl": None},
    {"id": 6, "name": "Pesca", "description": "Luoghi dedicati alla pesca sportiva o ricreativa.", "iconUrl": None},
    {"id": 7, "name": "Centri benessere", "description": "Spa, terme e strutture wellness.", "iconUrl": None},
    {"id": 8, "name": "Piscine", "description": "Piscine e impianti per il nuoto.", "iconUrl": None},
    {"id": 9, "name": "Parchi", "description": "Parchi urbani e aree verdi attrezzate.", "iconUrl": None},
    {"id": 10, "name": "Foreste", "description": "Aree boschive e foreste di interesse naturalistico.", "iconUrl": None},
    {"id": 11, "name": "Riserve naturali", "description": "Aree protette e riserve naturali.", "iconUrl": None},
    {"id": 12, "name": "Picchi e montagne", "description": "Cime, picchi e punti notevoli in quota.", "iconUrl": None},
    {"id": 13, "name": "Cascate", "description": "Cascate e salti d'acqua di interesse turistico.", "iconUrl": None},
    {"id": 14, "name": "Campeggi", "description": "Campeggi e aree per soggiorni outdoor.", "iconUrl": None},
    {"id": 15, "name": "Aree picnic", "description": "Aree attrezzate per picnic e pause all'aperto.", "iconUrl": None},
    {"id": 16, "name": "Sentieri", "description": "Sentieri escursionistici utili per percorsi a piedi.", "iconUrl": None},
    {"id": 17, "name": "Piste ciclabili", "description": "Percorsi ciclabili dedicati o protetti.", "iconUrl": None},
    {"id": 18, "name": "Stazioni", "description": "Stazioni ferroviarie per itinerari multimodali.", "iconUrl": None},
    {"id": 19, "name": "Fermate bus", "description": "Fermate autobus utili per gli spostamenti locali.", "iconUrl": None},
    {"id": 20, "name": "Parcheggi", "description": "Parcheggi di supporto agli itinerari.", "iconUrl": None},
    {"id": 21, "name": "Fast food", "description": "Punti ristoro veloci.", "iconUrl": None},
    {"id": 22, "name": "Caffe", "description": "Bar caffetteria e caffe storici.", "iconUrl": None},
    {"id": 23, "name": "Gelaterie", "description": "Gelaterie artigianali e punti dessert.", "iconUrl": None},
    {"id": 24, "name": "Panetterie", "description": "Forni, panetterie e punti bakery.", "iconUrl": None},
    {"id": 25, "name": "Enoteche", "description": "Enoteche e negozi specializzati in vino.", "iconUrl": None},
    {"id": 26, "name": "Ristoranti", "description": "Ristoranti e locali per la ristorazione tradizionale.", "iconUrl": None},
    {"id": 27, "name": "Bar", "description": "Bar e locali informali.", "iconUrl": None},
    {"id": 28, "name": "Pub", "description": "Pub e birrerie.", "iconUrl": None},
    {"id": 29, "name": "Hotel", "description": "Strutture alberghiere per soggiorni multi-giorno.", "iconUrl": None},
    {"id": 30, "name": "B&B", "description": "Guest house e bed & breakfast.", "iconUrl": None},
    {"id": 31, "name": "Ostelli", "description": "Ostelli per soggiorni economici.", "iconUrl": None},
    {"id": 32, "name": "Agriturismi", "description": "Agriturismi e strutture rurali ricettive.", "iconUrl": None},
    {"id": 33, "name": "Teatri", "description": "Teatri e sale per spettacoli dal vivo.", "iconUrl": None},
    {"id": 34, "name": "Sale concerti", "description": "Spazi dedicati a concerti ed eventi musicali.", "iconUrl": None},
    {"id": 35, "name": "Biblioteche", "description": "Biblioteche e spazi culturali di consultazione.", "iconUrl": None},
    {"id": 36, "name": "Stadi", "description": "Stadi e grandi impianti sportivi.", "iconUrl": None},
    {"id": 37, "name": "Musei", "description": "Musei e raccolte visitabili.", "iconUrl": None},
    {"id": 38, "name": "Cinema", "description": "Cinema e sale di proiezione.", "iconUrl": None},
    {"id": 39, "name": "Centri commerciali", "description": "Mall e grandi poli commerciali.", "iconUrl": None},
    {"id": 40, "name": "Mercati", "description": "Mercati e piazze di vendita tradizionali.", "iconUrl": None},
    {"id": 41, "name": "Abbigliamento", "description": "Negozi di abbigliamento.", "iconUrl": None},
    {"id": 42, "name": "Artigianato locale", "description": "Botteghe e negozi di artigianato.", "iconUrl": None},
    {"id": 43, "name": "Chiese", "description": "Chiese e principali luoghi di culto visitabili.", "iconUrl": None},
    {"id": 44, "name": "Abbazie", "description": "Abbazie e complessi monastici storici.", "iconUrl": None},
    {"id": 45, "name": "Santuari", "description": "Santuari e luoghi devozionali di rilievo.", "iconUrl": None},
    {"id": 46, "name": "Punti panoramici", "description": "Belvedere e viewpoint panoramici.", "iconUrl": None},
    {"id": 47, "name": "Landmark", "description": "Attrazioni e punti di interesse iconici.", "iconUrl": None},
    {"id": 48, "name": "Ponti famosi", "description": "Ponti di interesse storico o paesaggistico.", "iconUrl": None},
    {"id": 49, "name": "Castelli", "description": "Castelli e fortificazioni storiche.", "iconUrl": None},
    {"id": 50, "name": "Monumenti", "description": "Monumenti e memoriali di interesse turistico.", "iconUrl": None},
    {"id": 51, "name": "Bagni", "description": "Servizi igienici pubblici.", "iconUrl": None},
    {"id": 52, "name": "Fontanelle", "description": "Punti di acqua potabile e fontanelle.", "iconUrl": None},
    {"id": 53, "name": "Benzinai", "description": "Stazioni di rifornimento carburante.", "iconUrl": None},
    {"id": 54, "name": "Farmacie", "description": "Farmacie e punti salute utili in viaggio.", "iconUrl": None},
]

CATEGORY_BY_NAME = {category["name"]: category["id"] for category in CATEGORY_DEFINITIONS}


SOURCE_FILES = [
    "attività.json",
    "cultura.json",
    "food.json",
    "natura.json",
    "night-life.json",
    "parcheggi.json",
    "religion.json",
    "shopping.json",
    "tourism.json",
    "utility.json",
]


def get_coordinates(element):
    if "lat" in element and "lon" in element:
        return float(element["lat"]), float(element["lon"])
    if "center" in element:
        center = element["center"]
        return float(center["lat"]), float(center["lon"])
    return None, None


def normalize_commons_image(value):
    if not value:
        return None
    if value.startswith("http://") or value.startswith("https://"):
        return value
    cleaned = value
    if cleaned.startswith("File:"):
        cleaned = cleaned[5:]
    return f"https://commons.wikimedia.org/wiki/Special:FilePath/{quote(cleaned)}"


def pick_image_url(tags):
    return (
        tags.get("image")
        or normalize_commons_image(tags.get("wikimedia_commons"))
        or None
    )


def build_street(tags):
    street = tags.get("addr:street")
    house_number = tags.get("addr:housenumber")
    if street and house_number:
        return f"{street} {house_number}"
    return street or None


def compact_name(value):
    return " ".join(value.split()) if value else value


def infer_category(tags):
    name = (tags.get("name") or "").lower()
    amenity = tags.get("amenity")
    shop = tags.get("shop")
    tourism = tags.get("tourism")
    leisure = tags.get("leisure")
    sport = tags.get("sport")
    historic = tags.get("historic")
    natural = tags.get("natural")
    highway = tags.get("highway")
    railway = tags.get("railway")
    boundary = tags.get("boundary")
    waterway = tags.get("waterway")
    landuse = tags.get("landuse")
    piste_type = tags.get("piste:type")
    bridge = tags.get("bridge")
    building = tags.get("building")

    if amenity == "bicycle_rental":
        return "Noleggio bici"
    if sport == "climbing" or leisure == "climbing":
        return "Arrampicata"
    if sport == "canoe":
        return "Kayak e canoa"
    if piste_type:
        return "Sci e impianti sciistici"
    if leisure == "horse_riding" or sport == "equestrian":
        return "Maneggi"
    if leisure == "fishing":
        return "Pesca"
    if leisure == "spa":
        return "Centri benessere"
    if leisure == "swimming_pool" or sport == "swimming":
        return "Piscine"
    if leisure == "park":
        return "Parchi"
    if landuse == "forest" or natural == "wood":
        return "Foreste"
    if boundary == "protected_area" or leisure == "nature_reserve":
        return "Riserve naturali"
    if natural == "peak":
        return "Picchi e montagne"
    if waterway == "waterfall":
        return "Cascate"
    if tourism == "camp_site":
        return "Campeggi"
    if tourism == "picnic_site":
        return "Aree picnic"
    if highway == "path":
        return "Sentieri"
    if highway == "cycleway":
        return "Piste ciclabili"
    if railway == "station":
        return "Stazioni"
    if highway == "bus_stop":
        return "Fermate bus"
    if amenity == "parking":
        return "Parcheggi"
    if tourism == "hotel":
        return "Hotel"
    if tourism == "guest_house":
        return "B&B"
    if tourism == "hostel":
        return "Ostelli"
    if tourism == "farm":
        return "Agriturismi"
    if amenity == "fast_food":
        return "Fast food"
    if amenity == "cafe":
        return "Caffe"
    if amenity == "ice_cream" or shop == "ice_cream":
        return "Gelaterie"
    if shop == "bakery":
        return "Panetterie"
    if shop == "wine":
        return "Enoteche"
    if amenity == "restaurant":
        return "Ristoranti"
    if amenity == "bar":
        return "Bar"
    if amenity == "pub":
        return "Pub"
    if amenity == "theatre":
        return "Teatri"
    if amenity == "concert_hall":
        return "Sale concerti"
    if amenity == "library":
        return "Biblioteche"
    if leisure == "stadium":
        return "Stadi"
    if tourism == "museum":
        return "Musei"
    if amenity == "cinema":
        return "Cinema"
    if shop == "mall":
        return "Centri commerciali"
    if amenity == "marketplace":
        return "Mercati"
    if shop == "clothes":
        return "Abbigliamento"
    if shop == "craft":
        return "Artigianato locale"
    if "abbazia" in name or historic == "abbey":
        return "Abbazie"
    if "santuario" in name or building == "shrine":
        return "Santuari"
    if amenity == "place_of_worship" or historic == "church" or building in {"church", "chapel", "cathedral", "basilica"}:
        return "Chiese"
    if tourism == "viewpoint":
        return "Punti panoramici"
    if historic == "castle":
        return "Castelli"
    if historic == "monument":
        return "Monumenti"
    if bridge == "yes":
        return "Ponti famosi"
    if tourism == "attraction":
        return "Landmark"
    if amenity == "toilets":
        return "Bagni"
    if amenity == "drinking_water":
        return "Fontanelle"
    if amenity == "fuel":
        return "Benzinai"
    if amenity == "pharmacy" or shop == "chemist":
        return "Farmacie"
    return None


def build_fallback_name(category_name, location_name, osm_type, osm_id):
    base = category_name
    if location_name:
        return f"{base} - {location_name}"
    return f"{base} OSM {osm_type} {osm_id}"


def build_description(category_name, tags, location_name):
    explicit = compact_name(tags.get("description"))
    if explicit:
        return explicit[:500]

    parts = []
    if tags.get("operator"):
        parts.append(f"Gestito da {tags['operator']}")
    if tags.get("cuisine"):
        cuisine = tags["cuisine"].replace(";", ", ")
        parts.append(f"Cucina: {cuisine}")
    if tags.get("opening_hours"):
        parts.append(f"Orari: {tags['opening_hours']}")
    if tags.get("denomination"):
        parts.append(f"Denominazione: {tags['denomination'].replace('_', ' ')}")
    if tags.get("sport") and tags.get("sport") not in {"swimming", "climbing", "canoe", "equestrian"}:
        parts.append(f"Sport: {tags['sport'].replace('_', ' ')}")
    if location_name:
        parts.append(f"Comune di riferimento: {location_name}")

    if not parts:
        return None
    return "; ".join(parts)[:500]


def load_locations():
    locations = []
    with (BASE_DIR / "locations_rows.csv").open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if row["province"] not in PIEMONTE_PROVINCES:
                continue
            lat = float(row["latitude"])
            lon = float(row["longitude"])
            locations.append(
                {
                    "id": int(row["id"]),
                    "name": row["name"],
                    "province": row["province"],
                    "lat": lat,
                    "lon": lon,
                }
            )
    return locations


def build_location_grid(locations, cell_size=0.25):
    grid = {}
    for location in locations:
        key = (int(location["lat"] / cell_size), int(location["lon"] / cell_size))
        grid.setdefault(key, []).append(location)
    return grid, cell_size


def haversine_km(lat1, lon1, lat2, lon2):
    radius = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * radius * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def nearest_location(lat, lon, grid, cell_size):
    base_key = (int(lat / cell_size), int(lon / cell_size))
    candidates = []
    for radius in range(0, 6):
        for dlat in range(-radius, radius + 1):
            for dlon in range(-radius, radius + 1):
                key = (base_key[0] + dlat, base_key[1] + dlon)
                candidates.extend(grid.get(key, []))
        if candidates:
            break
    if not candidates:
        return None

    best = min(candidates, key=lambda item: haversine_km(lat, lon, item["lat"], item["lon"]))
    return best


def iterate_source_elements():
    for filename in SOURCE_FILES:
        data = json.loads((BASE_DIR / filename).read_text(encoding="utf-8"))
        for element in data["elements"]:
            yield filename, element


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    locations = load_locations()
    location_grid, cell_size = build_location_grid(locations)

    activities = []
    seen = {}
    unmapped_count = 0

    for source_name, element in iterate_source_elements():
        tags = element.get("tags", {})
        category_name = infer_category(tags)
        if not category_name:
            unmapped_count += 1
            continue

        lat, lon = get_coordinates(element)
        if lat is None or lon is None:
            continue

        osm_key = f"{element.get('type')}:{element.get('id')}"
        location = nearest_location(lat, lon, location_grid, cell_size)
        if not location:
            continue
        name = compact_name(tags.get("name")) or build_fallback_name(
            category_name=category_name,
            location_name=location["name"],
            osm_type=element.get("type"),
            osm_id=element.get("id"),
        )

        record = {
            "id": None,
            "name": name[:255],
            "description": build_description(category_name, tags, location["name"]),
            "street": build_street(tags),
            "latitude": round(lat, 7),
            "longitude": round(lon, 7),
            "imageUrl": pick_image_url(tags),
            "locationId": location["id"],
            "categoryId": CATEGORY_BY_NAME[category_name],
            "sourceFile": source_name,
            "osmType": element.get("type"),
            "osmId": element.get("id"),
        }

        existing = seen.get(osm_key)
        if existing is None:
            seen[osm_key] = record
        else:
            current_score = sum(1 for key in ("description", "street", "imageUrl") if existing.get(key))
            new_score = sum(1 for key in ("description", "street", "imageUrl") if record.get(key))
            if new_score > current_score:
                seen[osm_key] = record

    activities = list(seen.values())
    activities.sort(key=lambda item: (item["categoryId"], item["name"].lower(), item["osmId"]))
    for index, activity in enumerate(activities, start=1):
        activity["id"] = index

    categories_path = OUTPUT_DIR / "activity_categories_seed.json"
    activities_path = OUTPUT_DIR / "activities_seed.json"
    categories_csv_path = OUTPUT_DIR / "activity_categories_seed.csv"
    activities_csv_path = OUTPUT_DIR / "activities_seed.csv"
    summary_path = OUTPUT_DIR / "seed_summary.json"

    categories_path.write_text(
        json.dumps(CATEGORY_DEFINITIONS, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    activity_export = [
        {
            "id": activity["id"],
            "name": activity["name"],
            "description": activity["description"],
            "street": activity["street"],
            "latitude": activity["latitude"],
            "longitude": activity["longitude"],
            "imageUrl": activity["imageUrl"],
            "locationId": activity["locationId"],
            "categoryId": activity["categoryId"],
        }
        for activity in activities
    ]
    activities_path.write_text(
        json.dumps(activity_export, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    with categories_csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["id", "name", "description", "iconUrl"])
        writer.writeheader()
        writer.writerows(CATEGORY_DEFINITIONS)

    with activities_csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "id",
                "name",
                "description",
                "street",
                "latitude",
                "longitude",
                "imageUrl",
                "locationId",
                "categoryId",
            ],
        )
        writer.writeheader()
        for activity in activities:
            writer.writerow({key: activity[key] for key in writer.fieldnames})

    summary = {
        "categoryCount": len(CATEGORY_DEFINITIONS),
        "activityCount": len(activities),
        "unmappedElementCount": unmapped_count,
        "activitiesByCategory": {
            category["name"]: sum(1 for activity in activities if activity["categoryId"] == category["id"])
            for category in CATEGORY_DEFINITIONS
        },
    }
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Generated {len(CATEGORY_DEFINITIONS)} categories")
    print(f"Generated {len(activities)} activities")
    print(f"Skipped {unmapped_count} unmapped elements")
    print(f"Output directory: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
