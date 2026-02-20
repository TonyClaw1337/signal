import math
from typing import Dict

def calculate_noise(distance_m: float, trains_per_hour: float, freight_pct: float) -> Dict[str, float]:
    """
    Calculate noise levels based on distance, frequency, and freight percentage.
    
    Args:
        distance_m: Distance from track in meters
        trains_per_hour: Average trains per hour
        freight_pct: Percentage of freight trains (0.0 - 1.0)
        
    Returns:
        Dictionary with day_level_db, night_level_db, max_level_db
    """
    # Base levels at 25m reference distance
    passenger_base = 75  # dB at 25m
    freight_base = 85    # dB at 25m
    
    # Weighted base level
    base = freight_pct * freight_base + (1 - freight_pct) * passenger_base
    
    # Distance attenuation (6dB per doubling of distance)
    if distance_m < 25:
        distance_m = 25
    attenuation = 20 * math.log10(distance_m / 25)
    
    # Frequency correction (more trains = higher continuous noise)
    freq_correction = 10 * math.log10(max(trains_per_hour, 0.1))
    
    level = base - attenuation + freq_correction
    
    return {
        "day_level_db": round(level, 1),
        "night_level_db": round(level - 5, 1),  # Less traffic at night
        "max_level_db": round(base - attenuation + 10, 1),  # Single loud freight train
    }

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate haversine distance between two points in meters.
    """
    R = 6371000  # Earth's radius in meters
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def get_track_stats_by_type(track_type: str) -> Dict[str, float]:
    """
    Get realistic train statistics based on track type.
    """
    stats = {
        "main": {
            "day_trains_per_hour": 20,
            "night_trains_per_hour": 4,
            "freight_percentage": 0.3,
            "avg_speed_kmh": 160
        },
        "branch": {
            "day_trains_per_hour": 6,
            "night_trains_per_hour": 1,
            "freight_percentage": 0.1,
            "avg_speed_kmh": 80
        },
        "freight": {
            "day_trains_per_hour": 3,
            "night_trains_per_hour": 3,
            "freight_percentage": 0.8,
            "avg_speed_kmh": 60
        }
    }
    
    return stats.get(track_type, stats["main"])