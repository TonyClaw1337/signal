import httpx
import asyncio
import time
import math
from typing import List, Dict, Any, Tuple
from .noise import get_track_stats_by_type

# In-memory cache: {grid_key: (timestamp, tracks)}
_cache: Dict[str, Tuple[float, List[Dict]]] = {}
CACHE_TTL = 7200  # 2 hours

OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]


def _grid_key(lat: float, lng: float, radius: int) -> str:
    """Round to ~500m grid cells for caching."""
    return f"{round(lat, 2)}:{round(lng, 2)}:{radius}"


def _find_cached(lat: float, lng: float, radius: int) -> List[Dict] | None:
    """Check if any nearby cache entry covers this request."""
    now = time.time()
    # Check exact grid
    key = _grid_key(lat, lng, radius)
    if key in _cache:
        ts, tracks = _cache[key]
        if now - ts < CACHE_TTL:
            return tracks
    # Check neighboring grid cells (wider coverage)
    for dlat in [-0.01, 0, 0.01]:
        for dlng in [-0.01, 0, 0.01]:
            k = _grid_key(lat + dlat, lng + dlng, radius)
            if k in _cache:
                ts, tracks = _cache[k]
                if now - ts < CACHE_TTL:
                    return tracks
    return None


async def fetch_nearby_tracks(lat: float, lng: float, radius: int = 2000) -> Dict[str, Any]:
    """Fetch railway tracks from Overpass API with server failover."""
    query = f"""[out:json][timeout:30];
(
  way["railway"="rail"](around:{radius},{lat},{lng});
  way["railway"="light_rail"](around:{radius},{lat},{lng});
);
out body geom;"""

    for server in OVERPASS_SERVERS:
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(45.0, connect=10.0)
                ) as client:
                    resp = await client.post(
                        server,
                        data={"data": query},
                        headers={"User-Agent": "SIGNAL-App/1.0"}
                    )

                    if resp.status_code == 429:
                        print(f"Overpass 429 from {server}, waiting...")
                        await asyncio.sleep(2 ** attempt)
                        continue

                    if resp.status_code == 504 or resp.status_code >= 500:
                        print(f"Overpass {resp.status_code} from {server}")
                        break  # Try next server

                    if resp.status_code != 200:
                        print(f"Overpass HTTP {resp.status_code} from {server}")
                        break

                    text = resp.text
                    if not text.strip().startswith("{"):
                        print(f"Overpass non-JSON from {server}: {text[:100]}")
                        break

                    data = resp.json()
                    elements = data.get("elements", [])
                    print(f"Overpass OK from {server}: {len(elements)} elements")
                    return data

            except httpx.TimeoutException:
                print(f"Overpass timeout from {server} (attempt {attempt+1})")
                if attempt == 0:
                    await asyncio.sleep(1)
            except Exception as e:
                print(f"Overpass error from {server}: {e}")
                break

    print("All Overpass servers failed")
    return {"elements": []}


def classify_track_type(tags: Dict[str, str]) -> str:
    """Classify track type based on OSM tags."""
    usage = tags.get("usage", "")
    service = tags.get("service", "")
    railway = tags.get("railway", "")

    if usage in ["industrial", "military"] or service in ["siding", "yard"]:
        return "freight"
    if usage == "branch" or service == "branch" or railway in ["light_rail", "subway"]:
        return "branch"
    return "main"


def process_track_data(overpass_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Process raw Overpass data into structured track segments."""
    tracks = []

    for element in overpass_data.get("elements", []):
        if element["type"] != "way":
            continue

        tags = element.get("tags", {})
        geometry = element.get("geometry", [])

        if not geometry or len(geometry) < 2:
            continue

        track_type = classify_track_type(tags)
        stats = get_track_stats_by_type(track_type)
        coordinates = [[node["lon"], node["lat"]] for node in geometry]

        name = tags.get("name", "")
        if not name:
            ref = tags.get("ref", "")
            if ref:
                name = f"Strecke {ref}"
            elif track_type == "main":
                name = "Hauptstrecke"
            elif track_type == "branch":
                name = "Nebenstrecke"
            elif track_type == "freight":
                name = "Güterstrecke"
            else:
                name = "Bahnstrecke"

        tracks.append({
            "id": element["id"],
            "name": name,
            "segment_id": str(element["id"]),
            "track_type": track_type,
            "electrified": tags.get("electrified", "no") != "no",
            "multi_track": int(tags.get("tracks", "1")) > 1,
            "geojson_geometry": {
                "type": "LineString",
                "coordinates": coordinates
            },
            "properties": {
                "usage": tags.get("usage", ""),
                "service": tags.get("service", ""),
                "operator": tags.get("operator", ""),
                "maxspeed": tags.get("maxspeed", ""),
                "gauge": tags.get("gauge", ""),
                "ref": tags.get("ref", ""),
                **stats
            }
        })

    return tracks


async def get_cached_or_fetch_tracks(lat: float, lng: float, radius: int = 2000) -> List[Dict[str, Any]]:
    """Get tracks from cache or fetch from Overpass API."""
    # Check cache
    cached = _find_cached(lat, lng, radius)
    if cached is not None:
        print(f"Cache hit for {lat:.3f},{lng:.3f} ({len(cached)} tracks)")
        return cached

    # Fetch fresh
    overpass_data = await fetch_nearby_tracks(lat, lng, radius)
    tracks = process_track_data(overpass_data)

    # Cache
    key = _grid_key(lat, lng, radius)
    _cache[key] = (time.time(), tracks)

    # Prune stale entries
    now = time.time()
    stale = [k for k, (ts, _) in _cache.items() if now - ts > CACHE_TTL * 2]
    for k in stale:
        del _cache[k]

    return tracks
