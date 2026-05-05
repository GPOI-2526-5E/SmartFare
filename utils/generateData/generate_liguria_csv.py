import csv
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Dict, List, Optional, Tuple


ROOT = Path(__file__).resolve().parents[1]
LIGURIA_DIR = ROOT / "generateData" / "Liguria"
LOCATION_CSV = ROOT / "location_rows.csv"
ACTIVITY_CATEGORY_CSV = ROOT / "activityCategory_rows.csv"
ACTIVITY_OUT = ROOT / "activity.csv"
ACCOMMODATION_OUT = ROOT / "accommodation.csv"
LIGURIA_PROVINCES = {"GE", "IM", "SP", "SV"}
DEFAULT_ACTIVITY_IMAGE = (
    "https://www.ilrestodelcarlino.it/image-service/view/acePublic/alias/contentid/"
    "ZWI5N2MwYjItYmExOS00/0/oltre-32mila-visitatori-ai-tour-in-citta-investiamo-"
    "sullospitalita-diffusa.jpg"
)
DEFAULT_ACCOMMODATION_IMAGE = (
    "https://rpcgfwithmoyezrdeahj.supabase.co/storage/v1/object/public/hotels/hotel.avif"
)


def normalize_text(value: Optional[str]) -> str:
    text = (value or "").strip().lower()
    text = re.sub(r"\([a-z]{2}\)", "", text)
    text = "".join(
        ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch)
    )
    text = text.replace("'", " ").replace("-", " ")
    text = re.sub(r"\b(localita|località|loc|comune di|frazione)\b", " ", text)
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def parse_star_count(raw_value: Optional[str]) -> int:
    if not raw_value:
        return 0
    match = re.search(r"\d+", raw_value)
    return int(match.group()) if match else 0


def build_street(tags: dict) -> str:
    if tags.get("addr:full"):
        return tags["addr:full"].strip()

    parts = [tags.get("addr:street", "").strip(), tags.get("addr:housenumber", "").strip()]
    street = " ".join(part for part in parts if part)
    if street:
        return street

    for fallback_key in ("addr:place", "addr:city", "contact:city"):
        fallback_value = (tags.get(fallback_key) or "").strip()
        if fallback_value:
            return fallback_value

    return ""


def extract_coordinates(element: dict) -> Tuple[Optional[float], Optional[float]]:
    if "lat" in element and "lon" in element:
        return element["lat"], element["lon"]

    center = element.get("center") or {}
    if "lat" in center and "lon" in center:
        return center["lat"], center["lon"]

    return None, None


def load_liguria_locations() -> Tuple[List[dict], Dict[str, List[dict]]]:
    locations = []
    by_name = {}

    with LOCATION_CSV.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["province"] not in LIGURIA_PROVINCES:
                continue

            location = {
                "id": int(row["id"]),
                "name": row["name"],
                "province": row["province"],
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"]),
                "normalized_name": normalize_text(row["name"]),
            }
            locations.append(location)
            by_name.setdefault(location["normalized_name"], []).append(location)

    return locations, by_name


def resolve_location_id(tags: dict, latitude: float, longitude: float, locations: List[dict], by_name: Dict[str, List[dict]]) -> int:
    province = (tags.get("addr:province") or "").strip().upper()
    for candidate_key in ("addr:city", "contact:city", "addr:place"):
        raw_city = tags.get(candidate_key)
        if not raw_city:
            continue

        matches = by_name.get(normalize_text(raw_city), [])
        if not matches:
            continue

        if len(matches) == 1:
            return matches[0]["id"]

        if province:
            province_matches = [match for match in matches if match["province"] == province]
            if len(province_matches) == 1:
                return province_matches[0]["id"]

        return matches[0]["id"]

    best_location = min(
        locations,
        key=lambda location: (location["latitude"] - latitude) ** 2 + (location["longitude"] - longitude) ** 2,
    )
    return best_location["id"]


def load_elements(filename: str) -> List[dict]:
    with (LIGURIA_DIR / filename).open(encoding="utf-8") as handle:
        return json.load(handle)["elements"]


def activity_category_id(source_file: str, tags: dict) -> Optional[int]:
    amenity = tags.get("amenity")
    tourism = tags.get("tourism")
    sport = tags.get("sport")
    leisure = tags.get("leisure")
    shop = tags.get("shop")
    historic = tags.get("historic")
    natural = tags.get("natural")
    highway = tags.get("highway")
    railway = tags.get("railway")

    if source_file == "activity.json":
        if amenity == "bicycle_rental" or shop in {"bicycle", "rental"}:
            return 1
        if sport == "climbing":
            return 2
        if sport == "canoe":
            return 3
        if sport == "swimming" or leisure == "swimming_pool":
            return 8
        if leisure == "horse_riding" or sport == "equestrian" or tourism == "trail_riding_station" or amenity == "stables":
            return 5
        if tourism == "viewpoint":
            return 46
        if tourism == "attraction":
            return 47
        return None

    if source_file == "bagni.json":
        return {
            "toilets": 51,
            "drinking_water": 52,
            "fuel": 53,
            "pharmacy": 54,
        }.get(amenity)

    if source_file == "castelli.json":
        if historic == "castle":
            return 49
        if historic in {"monument", "memorial"}:
            return 50
        if tourism == "viewpoint":
            return 46
        if tourism == "attraction":
            return 47
        if amenity == "place_of_worship":
            return 43
        return None

    if source_file == "cultura.json":
        if amenity == "theatre":
            return 33
        if amenity == "library":
            return 35
        if leisure == "stadium":
            return 36
        if tourism == "museum":
            return 37
        if amenity == "cinema":
            return 38
        return None

    if source_file == "food.json":
        if amenity == "fast_food":
            return 21
        if amenity == "cafe":
            return 22
        if amenity == "ice_cream" or shop == "ice_cream":
            return 23
        if shop == "bakery":
            return 24
        if shop == "wine":
            return 25
        if amenity == "restaurant":
            return 26
        if amenity == "bar":
            return 27
        if amenity == "pub":
            return 28
        return None

    if source_file == "monumenti.json":
        if historic == "monastery":
            return 44
        if historic in {"wayside_shrine"}:
            return 45
        if historic in {"church", "chapel"} or amenity == "place_of_worship":
            return 43
        if historic == "castle":
            return 49
        if historic == "monument":
            return 50
        if tourism == "museum":
            return 37
        if tourism in {"attraction", "artwork"} or historic in {"ruins", "archaeological_site"}:
            return 47
        return None

    if source_file == "shop.json":
        if shop in {"mall", "department_store"}:
            return 39
        if amenity == "marketplace":
            return 40
        if shop in {"clothes", "shoes", "fashion_accessories", "tailor"}:
            return 41
        if shop in {"gift", "art", "antiques", "craft", "pottery"} or tourism == "gallery":
            return 42
        return None

    if source_file == "parck.json":
        if leisure == "park":
            return 9
        if natural == "wood":
            return 10
        if leisure == "nature_reserve":
            return 11
        if natural == "peak":
            return 12
        if tourism == "camp_site":
            return 14
        if tourism == "picnic_site" or leisure == "picnic_table":
            return 15
        if tourism == "viewpoint":
            return 46
        if tourism == "attraction":
            return 47
        if historic == "memorial":
            return 50
        return None

    if source_file == "parcking.json":
        if amenity == "parking":
            return 20
        if tourism == "caravan_site":
            return 14
        if highway == "path":
            return 16
        if highway == "cycleway":
            return 17
        if railway == "station":
            return 18
        if highway == "bus_stop" or amenity == "bus_station":
            return 19
        if historic == "bridge":
            return 48
        if historic == "monument":
            return 50
        if tourism == "attraction":
            return 47
        return None

    return None


def category_name_lookup() -> Dict[int, str]:
    with ACTIVITY_CATEGORY_CSV.open(encoding="utf-8", newline="") as handle:
        return {int(row["id"]): row["name"] for row in csv.DictReader(handle)}


def location_name_lookup(locations: List[dict]) -> Dict[int, str]:
    return {location["id"]: location["name"] for location in locations}


def generate_accommodation_csv(locations: List[dict], by_name: Dict[str, List[dict]], location_names: Dict[int, str]) -> int:
    rows = []
    seen = set()

    for element in load_elements("hotel.json"):
        tags = element.get("tags", {})
        name = (tags.get("name") or "").strip()
        latitude, longitude = extract_coordinates(element)
        if not name or latitude is None or longitude is None:
            continue

        source_id = (element.get("type"), element.get("id"))
        if source_id in seen:
            continue
        seen.add(source_id)

        location_id = resolve_location_id(tags, latitude, longitude, locations, by_name)
        street = build_street(tags) or location_names[location_id]

        rows.append(
            {
                "name": name,
                "street": street,
                "stars": parse_star_count(tags.get("stars")),
                "latitude": latitude,
                "longitude": longitude,
                "imageUrl": DEFAULT_ACCOMMODATION_IMAGE,
                "locationId": location_id,
            }
        )

    rows.sort(key=lambda row: (row["locationId"], row["name"].lower()))

    with ACCOMMODATION_OUT.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["name", "street", "stars", "latitude", "longitude", "imageUrl", "locationId"],
        )
        writer.writeheader()
        writer.writerows(rows)

    return len(rows)


def generate_activity_csv(locations: List[dict], by_name: Dict[str, List[dict]], location_names: Dict[int, str]) -> Tuple[int, Counter]:
    rows = []
    category_counter: Counter = Counter()
    seen = set()

    source_files = [
        "activity.json",
        "bagni.json",
        "castelli.json",
        "cultura.json",
        "food.json",
        "monumenti.json",
        "shop.json",
        "parck.json",
        "parcking.json",
    ]

    for source_file in source_files:
        for element in load_elements(source_file):
            tags = element.get("tags", {})
            name = (tags.get("name") or "").strip()
            latitude, longitude = extract_coordinates(element)
            category_id = activity_category_id(source_file, tags)

            if not name or latitude is None or longitude is None or category_id is None:
                continue

            source_id = (element.get("type"), element.get("id"), category_id)
            if source_id in seen:
                continue
            seen.add(source_id)

            location_id = resolve_location_id(tags, latitude, longitude, locations, by_name)
            street = build_street(tags) or location_names[location_id]

            rows.append(
                {
                    "name": name,
                    "description": (tags.get("description") or tags.get("tourism:description") or "").strip(),
                    "street": street,
                    "latitude": latitude,
                    "longitude": longitude,
                    "imageUrl": DEFAULT_ACTIVITY_IMAGE,
                    "locationId": location_id,
                    "categoryId": category_id,
                }
            )
            category_counter[category_id] += 1

    rows.sort(key=lambda row: (row["categoryId"], row["locationId"], row["name"].lower()))

    with ACTIVITY_OUT.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
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
        writer.writerows(rows)

    return len(rows), category_counter


def main() -> None:
    locations, by_name = load_liguria_locations()
    category_names = category_name_lookup()
    location_names = location_name_lookup(locations)

    accommodation_count = generate_accommodation_csv(locations, by_name, location_names)
    activity_count, category_counter = generate_activity_csv(locations, by_name, location_names)

    print(f"Created {ACCOMMODATION_OUT.name}: {accommodation_count} rows")
    print(f"Created {ACTIVITY_OUT.name}: {activity_count} rows")
    print("Activity rows by category:")
    for category_id, count in sorted(category_counter.items()):
        print(f"  {category_id:>2} - {category_names.get(category_id, 'Unknown')}: {count}")


if __name__ == "__main__":
    main()
