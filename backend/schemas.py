from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

# ----------------- Incidents -----------------
class IncidentBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    disaster_type: str
    severity: str = "Medium"
    status: str = "Reported"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: str
    people_at_risk: int = 0
    assigned_team: str = "Unassigned"
    notes: Optional[str] = None

class IncidentCreate(IncidentBase):
    id: Optional[str] = None

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    disaster_type: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    people_at_risk: Optional[int] = None
    assigned_team: Optional[str] = None
    notes: Optional[str] = None
    is_verified: Optional[bool] = None
    criticality_score: Optional[float] = None
    criticality_explanation: Optional[str] = None

class IncidentOut(IncidentBase):
    id: str
    reported_at: datetime
    updated_at: datetime
    criticality_score: float = 0.0
    criticality_explanation: Optional[str] = None
    is_verified: bool = False

    class Config:
        from_attributes = True

# ----------------- Detections & Vision -----------------
class DetectionOut(BaseModel):
    id: int
    class_name: str
    confidence: float
    x1: float
    y1: float
    x2: float
    y2: float

    class Config:
        from_attributes = True

class ImageAnalysisOut(BaseModel):
    id: str
    incident_id: str
    file_path: str
    annotated_path: Optional[str] = None
    file_name: str
    location: Optional[str] = None
    notes: Optional[str] = None
    uploaded_at: datetime
    model_name: str
    inference_status: str
    total_detections: int
    detections: List[DetectionOut] = []

    class Config:
        from_attributes = True

# ----------------- Rescue Tasks -----------------
class TaskBase(BaseModel):
    title: str = Field(..., min_length=3)
    description: str
    incident_id: Optional[str] = None
    assigned_team: str
    priority: str = "Medium"
    status: str = "Pending"
    due_date: Optional[str] = None
    notes: Optional[str] = None

class TaskCreate(TaskBase):
    id: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    incident_id: Optional[str] = None
    assigned_team: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None

class TaskOut(TaskBase):
    id: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ----------------- Team GPS Tracking -----------------
class TeamLocationCreate(BaseModel):
    team_name: str
    responder_id: str
    latitude: float
    longitude: float
    battery_level: Optional[int] = None

class TeamLocationOut(BaseModel):
    id: int
    team_name: str
    responder_id: str
    latitude: float
    longitude: float
    timestamp: datetime
    is_active: bool
    battery_level: Optional[int] = None

    class Config:
        from_attributes = True

# ----------------- Road Blockages -----------------
class RoadBlockageBase(BaseModel):
    title: str
    road_segment: str
    latitude: float
    longitude: float
    status: str = "Reported" # Reported, Under Review, Verified, Cleared
    incident_id: Optional[str] = None
    notes: Optional[str] = None
    verified_by: Optional[str] = None

class RoadBlockageCreate(RoadBlockageBase):
    id: Optional[str] = None

class RoadBlockageUpdate(BaseModel):
    title: Optional[str] = None
    road_segment: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = None
    incident_id: Optional[str] = None
    notes: Optional[str] = None
    verified_by: Optional[str] = None

class RoadBlockageOut(RoadBlockageBase):
    id: str
    verified_at: Optional[datetime] = None
    reported_at: datetime

    class Config:
        from_attributes = True

# ----------------- Routing -----------------
class RouteRequest(BaseModel):
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    incident_id: Optional[str] = None

class RouteResponse(BaseModel):
    status: str
    distance_meters: float
    duration_seconds: float
    geometry: List[List[float]] # [[lat, lng], ...]
    has_closure_warning: bool = False
    warning_details: Optional[str] = None
    intersecting_closures: List[RoadBlockageOut] = []

# ----------------- AI Rescue Assistant -----------------
class ChatMessage(BaseModel):
    role: str # user or model
    content: str

class ChatRequest(BaseModel):
    message: str
    incident_id: Optional[str] = None
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str
    suggested_actions: List[str] = []
    grounded_facts: List[str] = []

class CriticalityScoreRequest(BaseModel):
    incident_id: str

class CriticalityScoreResponse(BaseModel):
    incident_id: str
    score: float # 0.0 to 10.0
    severity_level: str
    factors: List[dict] # [{factor: "Casualty threat", weight: 3.5, impact: "+2.5", note: "..."}]
    explanation: str
    is_validated: bool = False

# ----------------- Reports -----------------
class ReportCreate(BaseModel):
    incident_id: str
    title: Optional[str] = None
    operator_notes: Optional[str] = None

class ReportOut(BaseModel):
    id: str
    incident_id: str
    title: str
    summary: str
    pdf_path: Optional[str] = None
    is_demo: bool = False
    generated_at: datetime
    operator_notes: Optional[str] = None

    class Config:
        from_attributes = True

# ----------------- Dashboard -----------------
class DashboardStats(BaseModel):
    total_incidents: int
    active_incidents: int
    resolved_incidents: int
    images_analyzed: int
    people_detected: int
    vehicles_detected: int
    obstacles_detected: int
    open_tasks: int
    in_progress_tasks: int
    completed_tasks: int
    active_teams: int
    verified_blockages: int
