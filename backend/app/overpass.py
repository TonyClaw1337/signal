import httpx
import json
from typing import List, Dict, Any
from .noise import get_track_stats_by_type

async def fetch_nearby_tracks(lat: float, lng: float, radius: int = 2000) -> Dict[str, Any]:
    """
    Fetch railway tracks from Overpass API within radius of coordinates.
    """
    query = f"""
    [out:json][timeout:25];
    (
      way["railway"="rail"](around:{radius},{lat},{lng});
      way["railway"="light_rail"](around:{radius},{lat},{lng});
    );
    out body geom;
    """
    
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
            resp = await client.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": query},
            )
            return resp.json()
    except Exception as e:
        print(f"Overpass API error: {e}")
        return {"elements": []}

def classify_track_type(tags: Dict[str, str]) -> str:
    """
    Classify track type based on OSM tags.
    """
    usage = tags.get("usage", "")
    service = tags.get("service", "")
    railway = tags.get("railway", "")
    
    # Freight classification
    if usage in ["industrial", "military"] or service == "siding":
        return "freight"
    
    # Light rail / S-Bahn
    if railway == "light_rail" or tags.get("electrified") == "contact_line":
        return "main"
    
    # Branch lines
    if usage == "branch" or service == "branch":
        return "branch"
    
    # Default to main line
    return "main"

def process_track_data(overpass_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Process raw Overpass data into structured track segments.
    """
    tracks = []
    
    for element in overpass_data.get("elements", []):
        if element["type"] != "way":
            continue
            
        tags = element.get("tags", {})
        geometry = element.get("geometry", [])
        
        track_type = classify_track_type(tags)
        stats = get_track_stats_by_type(track_type)
        
        # Convert geometry to GeoJSON format
        coordinates = [[node["lon"], node["lat"]] for node in geometry]
        
        track_data = {
            "id": element["id"],
            "name": tags.get("name", f"Gleis {element['id']}"),
            "segment_id": str(element["id"]),
            "track_type": track_type,
            "electrified": tags.get("electrified") is not None,
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
                **stats
            }
        }
        
        tracks.append(track_data)
    
    return tracks

async def get_cached_or_fetch_tracks(lat: float, lng: float, radius: int = 2000) -> List[Dict[str, Any]]:
    """
    Get tracks from cache or fetch from Overpass API.
    In production, this would check the database first.
    """
    # For now, always fetch fresh data
    # In production, implement caching based on lat/lng grid
    overpass_data = await fetch_nearby_tracks(lat, lng, radius)
    return process_track_data(overpass_data)