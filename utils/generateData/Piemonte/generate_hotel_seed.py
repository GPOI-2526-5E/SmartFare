import csv
import json
import math
import re
from pathlib import Path
from urllib.parse import quote

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "generated"

PIEMONTE_PROVINCES = {"TO", "CN", "AT", "AL", "BI", "NO", "VC", "VCO"}
SOURCE_FILE = "hotel.json"

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

def parse_stars(tags):
    stars_str = tags.get("stars")
    if not stars_str:
        return None
    try:
        match = re.search(r"(\d+)", stars_str)
        if match:
            stars = int(match.group(1))
            if 1 <= stars <= 5:
                return stars
    except:
        pass
    return None

def build_fallback_name(location_name, osm_type, osm_id):
    if location_name:
        return f"Hotel - {location_name}"
    return f"Hotel OSM {osm_type} {osm_id}"

def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    locations = load_locations()
    location_grid, cell_size = build_location_grid(locations)

    hotels = []
    seen = {}

    data = json.loads((BASE_DIR / SOURCE_FILE).read_text(encoding="utf-8"))
    
    for element in data.get("elements", []):
        tags = element.get("tags", {})
        
        tourism = tags.get("tourism")
        if tourism not in {"hotel", "guest_house", "hostel", "motel", "chalet"}:
            # Fallback per sicurezza, anche se hotel.json dovrebbe contenere solo questi
            if not tourism and not tags.get("amenity") == "hotel":
                continue
            
        lat, lon = get_coordinates(element)
        if lat is None or lon is None:
            continue

        osm_key = f"{element.get('type')}:{element.get('id')}"
        location = nearest_location(lat, lon, location_grid, cell_size)
        if not location:
            continue
            
        name = compact_name(tags.get("name")) or build_fallback_name(
            location_name=location["name"],
            osm_type=element.get("type"),
            osm_id=element.get("id"),
        )
        
        stars = parse_stars(tags)

        record = {
            "id": None,
            "name": name[:255],
            "street": build_street(tags),
            "stars": stars,
            "latitude": round(lat, 7),
            "longitude": round(lon, 7),
            "imageUrl": pick_image_url(tags),
            "locationId": location["id"],
            "osmType": element.get("type"),
            "osmId": element.get("id"),
        }

        existing = seen.get(osm_key)
        if existing is None:
            seen[osm_key] = record
        else:
            current_score = sum(1 for key in ("street", "imageUrl", "stars") if existing.get(key) is not None)
            new_score = sum(1 for key in ("street", "imageUrl", "stars") if record.get(key) is not None)
            if new_score > current_score:
                seen[osm_key] = record

    hotels = list(seen.values())
    hotels.sort(key=lambda item: (item["name"].lower(), item["osmId"]))
    for index, hotel in enumerate(hotels, start=1):
        hotel["id"] = index

    hotels_path = OUTPUT_DIR / "hotels_seed.json"
    hotels_csv_path = OUTPUT_DIR / "hotels_seed.csv"

    hotel_export = [
        {
            "id": hotel["id"],
            "name": hotel["name"],
            "street": hotel["street"],
            "stars": hotel["stars"] if hotel["stars"] is not None else 0,
            "latitude": hotel["latitude"],
            "longitude": hotel["longitude"],
            "imageUrl": hotel["imageUrl"],
            "locationId": hotel["locationId"],
        }
        for hotel in hotels
    ]
    hotels_path.write_text(
        json.dumps(hotel_export, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    with hotels_csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "id",
                "name",
                "street",
                "stars",
                "latitude",
                "longitude",
                "imageUrl",
                "locationId",
            ],
        )
        writer.writeheader()
        for hotel in hotel_export:
            writer.writerow(hotel)

    print(f"Generated {len(hotels)} hotels")
    print(f"Output directory: {OUTPUT_DIR}")

    # Generate SQL file to avoid CSV import issues in Supabase
    hotels_sql_path = OUTPUT_DIR / "hotels_seed.sql"
    with hotels_sql_path.open("w", encoding="utf-8") as handle:
        handle.write('INSERT INTO "Hotel" ("id", "name", "street", "stars", "latitude", "longitude", "imageUrl", "locationId") VALUES\n')
        values = []
        for h in hotel_export:
            id_val = h["id"]
            name_val = f"'{h['name'].replace(chr(39), chr(39)+chr(39))}'" if h["name"] else "NULL"
            street_val = f"'{h['street'].replace(chr(39), chr(39)+chr(39))}'" if h["street"] else "NULL"
            stars_val = h["stars"] if h["stars"] is not None else 0
            lat_val = h["latitude"]
            lon_val = h["longitude"]
            img_val = f"'{h['imageUrl'].replace(chr(39), chr(39)+chr(39))}'" if h["imageUrl"] else "NULL"
            loc_val = h["locationId"]
            values.append(f"({id_val}, {name_val}, {street_val}, {stars_val}, {lat_val}, {lon_val}, {img_val}, {loc_val})")
        handle.write(",\n".join(values) + ";\n")

if __name__ == "__main__":
    main()
