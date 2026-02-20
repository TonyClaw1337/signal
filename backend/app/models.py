from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSON
from datetime import datetime
import enum

Base = declarative_base()

class TrackType(str, enum.Enum):
    MAIN = "main"
    BRANCH = "branch"
    FREIGHT = "freight"

class TrainType(str, enum.Enum):
    FERNVERKEHR = "fernverkehr"
    REGIONALVERKEHR = "regionalverkehr"
    GUETERVERKEHR = "gueterverkehr"
    SBAHN = "sbahn"

class Location(Base):
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    address = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    noise_calculations = relationship("NoiseCalculation", back_populates="location")
    saved_analyses = relationship("SavedAnalysis", back_populates="location")

class TrackSegment(Base):
    __tablename__ = "track_segments"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    segment_id = Column(String(100), unique=True)
    track_type = Column(Enum(TrackType), nullable=False)
    electrified = Column(Boolean, default=False)
    multi_track = Column(Boolean, default=False)
    geojson_geometry = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    train_passages = relationship("TrainPassage", back_populates="track_segment")
    noise_calculations = relationship("NoiseCalculation", back_populates="track_segment")
    saved_analyses = relationship("SavedAnalysis", back_populates="track_segment")

class TrainPassage(Base):
    __tablename__ = "train_passages"
    
    id = Column(Integer, primary_key=True)
    track_segment_id = Column(Integer, ForeignKey("track_segments.id"))
    train_type = Column(Enum(TrainType), nullable=False)
    train_number = Column(String(50))
    direction = Column(String(100))
    scheduled_time = Column(DateTime, nullable=False)
    actual_time = Column(DateTime)
    operator = Column(String(100))
    speed_kmh = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    track_segment = relationship("TrackSegment", back_populates="train_passages")

class NoiseCalculation(Base):
    __tablename__ = "noise_calculations"
    
    id = Column(Integer, primary_key=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    track_segment_id = Column(Integer, ForeignKey("track_segments.id"))
    distance_m = Column(Float, nullable=False)
    day_level_db = Column(Float)
    night_level_db = Column(Float)
    max_level_db = Column(Float)
    freight_percentage = Column(Float)
    trains_per_day = Column(Integer)
    calculated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    location = relationship("Location", back_populates="noise_calculations")
    track_segment = relationship("TrackSegment", back_populates="noise_calculations")

class SavedAnalysis(Base):
    __tablename__ = "saved_analyses"
    
    id = Column(Integer, primary_key=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    track_segment_id = Column(Integer, ForeignKey("track_segments.id"))
    data_json = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    location = relationship("Location", back_populates="saved_analyses")
    track_segment = relationship("TrackSegment", back_populates="saved_analyses")