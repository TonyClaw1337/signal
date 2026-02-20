from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, and_
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import httpx
from datetime import datetime, timedelta
import random

from .models import Base, Location, TrackSegment, TrainPassage, NoiseCalculation, TrainType
from .overpass import get_cached_or_fetch_tracks
from .noise import calculate_noise, calculate_distance

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/signal")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SIGNAL - Train Frequency & Noise Info")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models
class LocationCreate(BaseModel):
    name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None

class LocationResponse(BaseModel):
    id: int
    name: Optional[str]
    lat: float
    lng: float
    address: Optional[str]

class TrackResponse(BaseModel):
    id: int
    name: str
    track_type: str
    electrified: bool
    multi_track: bool
    geojson_geometry: Dict[str, Any]
    properties: Dict[str, Any]

class TrainResponse(BaseModel):
    id: int
    train_type: str
    train_number: Optional[str]
    direction: Optional[str]
    scheduled_time: datetime
    operator: Optional[str]
    speed_kmh: Optional[int]
    minutes_until: int

class StatsResponse(BaseModel):
    trains_per_day: int
    trains_per_night: int
    max_per_hour: int
    freight_percentage: float
    avg_speed: float

class NoiseResponse(BaseModel):
    distance_m: float
    day_level_db: float
    night_level_db: float
    max_level_db: float

# Geocoding helper
async def geocode_address(address: str) -> Dict[str, float]:
    """Geocode address using Nominatim API"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": address,
                "format": "json",
                "limit": 1,
                "countrycodes": "de"
            },
            headers={"User-Agent": "SIGNAL-App/1.0"}
        )
        results = resp.json()
        if results:
            return {
                "lat": float(results[0]["lat"]),
                "lng": float(results[0]["lon"])
            }
        raise HTTPException(status_code=404, detail="Address not found")

# Mock train data generator
def generate_mock_trains(track_type: str, hours: int = 24) -> List[Dict[str, Any]]:
    """Generate realistic mock train schedule"""
    trains = []
    now = datetime.now()
    
    # Base frequencies by track type
    freq_map = {
        "main": {"day": 20, "night": 4, "freight_pct": 0.3},
        "branch": {"day": 6, "night": 1, "freight_pct": 0.1}, 
        "freight": {"day": 3, "night": 3, "freight_pct": 0.8}
    }
    
    freq = freq_map.get(track_type, freq_map["main"])
    
    for hour in range(hours):
        target_time = now + timedelta(hours=hour)
        
        # Determine trains per hour (day vs night)
        if 6 <= target_time.hour <= 22:
            trains_this_hour = freq["day"]
        else:
            trains_this_hour = freq["night"]
            
        # Generate trains for this hour
        for i in range(trains_this_hour):
            minutes = random.randint(0, 59)
            train_time = target_time.replace(minute=minutes, second=0, microsecond=0)
            
            # Determine train type
            if random.random() < freq["freight_pct"]:
                train_type = TrainType.GUETERVERKEHR
                operator = random.choice(["DB Cargo", "TX Logistik", "RTB Cargo"])
                speed = random.randint(40, 80)
                train_num = f"G{random.randint(1000, 9999)}"
            else:
                train_type = random.choice([TrainType.FERNVERKEHR, TrainType.REGIONALVERKEHR, TrainType.SBAHN])
                if train_type == TrainType.FERNVERKEHR:
                    operator = "DB Fernverkehr"
                    speed = random.randint(120, 200)
                    train_num = f"ICE {random.randint(1, 999)}"
                elif train_type == TrainType.REGIONALVERKEHR:
                    operator = random.choice(["DB Regio", "agilis", "Meridian"])
                    speed = random.randint(80, 140)
                    train_num = f"RE {random.randint(1, 99)}"
                else:
                    operator = "S-Bahn"
                    speed = random.randint(60, 100)
                    train_num = f"S{random.randint(1, 8)}"
            
            direction = random.choice(["Nord", "Süd", "Ost", "West"])
            
            trains.append({
                "id": random.randint(1000000, 9999999),
                "train_type": train_type.value,
                "train_number": train_num,
                "scheduled_time": train_time,
                "operator": operator,
                "direction": direction,
                "speed_kmh": speed,
                "minutes_until": int((train_time - now).total_seconds() / 60)
            })
    
    # Sort by time
    trains.sort(key=lambda x: x["scheduled_time"])
    return trains

# API Routes

@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "signal"}

@app.get("/api/version")
async def version():
    return {"app": "signal", "version": "1.0.0", "name": "SIGNAL"}

@app.post("/api/location", response_model=LocationResponse)
async def create_location(location: LocationCreate, db: Session = Depends(get_db)):
    """Save a location or geocode address"""
    
    # If address provided without coordinates, geocode it
    if location.address and (location.lat is None or location.lng is None):
        coords = await geocode_address(location.address)
        location.lat = coords["lat"]
        location.lng = coords["lng"]
    
    # Create location
    db_location = Location(
        name=location.name,
        lat=location.lat,
        lng=location.lng,
        address=location.address
    )
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    
    return db_location

@app.get("/api/tracks", response_model=List[TrackResponse])
async def get_nearby_tracks(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: int = Query(2000)
):
    """Get nearby railway tracks"""
    tracks = await get_cached_or_fetch_tracks(lat, lng, radius)
    return tracks

@app.get("/api/tracks/{track_id}/trains", response_model=List[TrainResponse])
async def get_track_trains(track_id: str, hours: int = Query(24)):
    """Get train schedule for a track segment"""
    # Mock implementation - in production, query real train data
    trains = generate_mock_trains("main", hours)  # Would classify based on track_id
    
    return [TrainResponse(**train) for train in trains if train["minutes_until"] >= 0]

@app.get("/api/tracks/{track_id}/stats", response_model=StatsResponse)
async def get_track_stats(track_id: str):
    """Get frequency statistics for a track segment"""
    # Mock stats based on track type
    # In production, aggregate from train_passages table
    
    return StatsResponse(
        trains_per_day=180,
        trains_per_night=36,
        max_per_hour=25,
        freight_percentage=0.3,
        avg_speed=140.0
    )

@app.get("/api/tracks/{track_id}/noise", response_model=NoiseResponse)
async def get_noise_calculation(track_id: str, distance: float = Query(100)):
    """Calculate noise levels for given distance"""
    
    # Mock calculation - would use real track data
    trains_per_hour = 15.0
    freight_pct = 0.3
    
    noise_levels = calculate_noise(distance, trains_per_hour, freight_pct)
    
    return NoiseResponse(
        distance_m=distance,
        **noise_levels
    )

@app.get("/api/dashboard")
async def get_dashboard_data(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: int = Query(2000)
):
    """Get combined overview data for dashboard"""
    
    tracks = await get_cached_or_fetch_tracks(lat, lng, radius)
    
    # Calculate nearest track
    nearest_track = None
    min_distance = float('inf')
    
    for track in tracks:
        if track["geojson_geometry"]["coordinates"]:
            # Calculate distance to first point of track
            coords = track["geojson_geometry"]["coordinates"][0]
            distance = calculate_distance(lat, lng, coords[1], coords[0])
            if distance < min_distance:
                min_distance = distance
                nearest_track = track
    
    result = {
        "location": {"lat": lat, "lng": lng},
        "tracks_found": len(tracks),
        "nearest_track": nearest_track,
        "nearest_distance_m": min_distance if nearest_track else None
    }
    
    return result

# Static files (React build)
STATIC_DIR = "/app/static"

@app.get("/")
async def serve_frontend():
    return FileResponse(f"{STATIC_DIR}/index.html")

@app.get("/{path:path}")
async def serve_frontend_paths(path: str):
    from pathlib import Path as P
    file_path = P(f"{STATIC_DIR}/{path}")
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    return FileResponse(f"{STATIC_DIR}/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9500)