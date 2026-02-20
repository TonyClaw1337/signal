import httpx
import json
import time
from typing import List, Dict, Any
from .noise import get_track_stats_by_type

# Simple in-memory cache: {grid_key: (timestamp, tracks)}
_cache: Dict[str, tuple] = {}
CACHE_TTL = 3600  # 1 hour

def _grid_key(lat: float, lng: float, radius: int) -> str:
    """Round to ~200m grid for caching"""
    return f"{round(lat, 3)}:{round(lng, 3)}:{radius}"


async def fetch_nearby_tracks(lat: float, lng: float, radius: int = 2000) -> Dict[str, Any]:
    """Fetch railway tracks from Overpass API within radius of coordinates."""
    query = f"""[out:json][timeout:30];
(
  way["railway"="rail"](around:{radius},{lat},{lng});
  way["railway"="light_rail"](around:{radius},{lat},{lng});
  way["railway"="subway"](around:{radius},{lat},{lng});
);
out body geom;"""

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=15.0)) as client:
                resp = await client.post(
                    "https://overpass-api.de/api/interpreter",
                    data={"data": query},
                    headers={"User-Agent": "SIGNAL-App/1.0 (TonyClaw Platform)"}
                )
                if resp.status_code == 429:
                    # Rate limited — wait and retry
                    wait = 2 ** attempt
                    print(f"Overpass rate limited, waiting {wait}s (attempt {attempt+1})")
                    import asyncio
                    await asyncio.sleep(wait)
                    continue
                    
                if resp.status_code != 200:
                    print(f"Overpass HTTP {resp.status_code}: {resp.text[:200]}")
                    return {"elements": []}
                
                text = resp.text
                if not text or not text.strip().startswith("{"):
                    print(f"Overpass non-JSON response: {text[:200]}")
                    if attempt < 2:
                        import asyncio
                        await asyncio.sleep(1)
                        continue
                    return {"elements": []}
                
                return resp.json()
                
        except httpx.TimeoutException as e:
            print(f"Overpass timeout (attempt {attempt+1}): {e}")
            if attempt < 2:
                import asyncio
                await asyncio.sleep(1)
        except Exception as e:
            print(f"Overpass error (attempt {attempt+1}): {e}")
            if attempt < 2:
                import asyncio
                await asyncio.sleep(1)
    
    return {"elements": []}


def classify_track_type(tags: Dict[str, str]) -> str:
    """Classify track type based on OSM tags."""
    usage = tags.get("usage", "")
    service = tags.get("service", "")
    railway = tags.get("railway", "")

    if usage in ["industrial", "military"] or service in ["siding", "yard"]:
        return "freight"
    if usage == "branch" or service == "branch":
        return "branch"
    if railway == "light_rail":
        return "branch"
    if railway == "subway":
        return "branch"
    # main by default
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
            usage = tags.get("usage", track_type)
            name = f"Strecke {ref}" if ref else f"Gleis ({usage})"

        track_data = {
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
        }

        tracks.append(track_data)

    return tracks


async def get_cached_or_fetch_tracks(lat: float, lng: float, radius: int = 2000) -> List[Dict[str, Any]]:
    """Get tracks from cache or fetch from Overpass API."""
    key = _grid_key(lat, lng, radius)
    
    # Check cache
    if key in _cache:
        ts, cached_tracks = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return cached_tracks

    overpass_data = await fetch_nearby_tracks(lat, lng, radius)
    tracks = process_track_data(overpass_data)
    
    # Cache result
    _cache[key] = (time.time(), tracks)
    
    # Prune old cache entries
    now = time.time()
    stale = [k for k, (ts, _) in _cache.items() if now - ts > CACHE_TTL * 2]
    for k in stale:
        del _cache[k]
    
    return tracks
