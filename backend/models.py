import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey
)
from sqlalchemy.orm import relationship
from .database import Base

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(50), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    disaster_type = Column(String(100), nullable=False) # Flood, Earthquake, Fire, Landslide, Building Collapse, Road Blockage, Other
    severity = Column(String(50), nullable=False, default="Medium") # Low, Medium, High, Critical
    status = Column(String(50), nullable=False, default="Reported") # Reported, Verified, Assigned, In Progress, Resolved, Closed
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(String(255), nullable=False)
    people_at_risk = Column(Integer, default=0)
    reported_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    assigned_team = Column(String(100), default="Unassigned")
    notes = Column(Text, nullable=True)
    criticality_score = Column(Float, default=0.0)
    criticality_explanation = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=False)

    tasks = relationship("RescueTask", back_populates="incident", cascade="all, delete-orphan")
    analyses = relationship("ImageAnalysis", back_populates="incident", cascade="all, delete-orphan")
    blockages = relationship("RoadBlockage", back_populates="incident")
    reports = relationship("IncidentReport", back_populates="incident", cascade="all, delete-orphan")

class ImageAnalysis(Base):
    __tablename__ = "image_analyses"

    id = Column(String(50), primary_key=True, index=True)
    incident_id = Column(String(50), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(500), nullable=False)
    annotated_path = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=utcnow)
    model_name = Column(String(100), default="YOLO26s")
    inference_status = Column(String(50), default="Pending") # Pending, Completed, Failed
    total_detections = Column(Integer, default=0)

    incident = relationship("Incident", back_populates="analyses")
    detections = relationship("Detection", back_populates="analysis", cascade="all, delete-orphan")

class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_id = Column(String(50), ForeignKey("image_analyses.id", ondelete="CASCADE"), nullable=False)
    class_name = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)
    x1 = Column(Float, nullable=False)
    y1 = Column(Float, nullable=False)
    x2 = Column(Float, nullable=False)
    y2 = Column(Float, nullable=False)

    analysis = relationship("ImageAnalysis", back_populates="detections")

class RescueTask(Base):
    __tablename__ = "rescue_tasks"

    id = Column(String(50), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    incident_id = Column(String(50), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True)
    assigned_team = Column(String(100), nullable=False)
    priority = Column(String(50), nullable=False, default="Medium")
    status = Column(String(50), nullable=False, default="Pending") # Pending, In Progress, Blocked, Completed, Cancelled
    due_date = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    incident = relationship("Incident", back_populates="tasks")

class TeamLocation(Base):
    __tablename__ = "team_locations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    team_name = Column(String(100), nullable=False, index=True)
    responder_id = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=utcnow)
    is_active = Column(Boolean, default=True)
    battery_level = Column(Integer, nullable=True)

class RoadBlockage(Base):
    __tablename__ = "road_blockages"

    id = Column(String(50), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    road_segment = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String(50), nullable=False, default="Reported") # Reported, Under Review, Verified, Cleared
    incident_id = Column(String(50), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    verified_by = Column(String(100), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    reported_at = Column(DateTime, default=utcnow)

    incident = relationship("Incident", back_populates="blockages")

class IncidentReport(Base):
    __tablename__ = "incident_reports"

    id = Column(String(50), primary_key=True, index=True)
    incident_id = Column(String(50), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=False)
    pdf_path = Column(String(500), nullable=True)
    is_demo = Column(Boolean, default=False)
    generated_at = Column(DateTime, default=utcnow)
    operator_notes = Column(Text, nullable=True)

    incident = relationship("Incident", back_populates="reports")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False) # INCIDENT, TASK, VISION, ROUTE, BLOCKAGE, AI
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=utcnow)
