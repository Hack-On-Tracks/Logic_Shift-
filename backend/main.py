import os
import uuid
import datetime
import shutil
import logging
from typing import List, Optional

from fastapi import (
    FastAPI, Depends, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from .database import engine, get_db, init_db, SessionLocal
from .models import (
    Incident, RescueTask, ImageAnalysis, Detection, TeamLocation, RoadBlockage, IncidentReport, ActivityLog
)
from .schemas import (
    IncidentCreate, IncidentUpdate, IncidentOut,
    TaskCreate, TaskUpdate, TaskOut,
    ImageAnalysisOut, DetectionOut,
    TeamLocationCreate, TeamLocationOut,
    RoadBlockageCreate, RoadBlockageUpdate, RoadBlockageOut,
    RouteRequest, RouteResponse,
    ChatRequest, ChatResponse,
    CriticalityScoreRequest, CriticalityScoreResponse,
    ReportCreate, ReportOut,
    DashboardStats
)
from .services.yolo_service import yolo_service, UPLOADS_DIR
from .services.gemini_service import gemini_service
from .services.routing_service import routing_service
from .services.pdf_service import pdf_service
from .seed_data import seed_database_if_empty

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rescuevision.api")

# Load environment
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = FastAPI(
    title="RescueVision AI — LIVE TRACK Backend",
    version="1.0.0",
    description="Emergency Response Command Center Backend with YOLO Vision, Gemini AI, OSRM Routing, and GIS Telemetry",
)

# CORS configuration
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for static access
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# WebSocket Connection Manager for live tactical dispatch
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

@app.on_event("startup")
def on_startup():
    init_db()
    db = SessionLocal()
    try:
        seed_database_if_empty(db)
        logger.info("Database initialized and verified with seed telemetry.")
    finally:
        db.close()

# ----------------- WebSocket -----------------
@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open; receive ping or client commands
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ----------------- Health & Dashboard -----------------
@app.get("/api/health")
def health_check():
    return {
        "status": "ONLINE",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "vision_model": yolo_service.loaded_model_name,
        "gemini_available": gemini_service.is_available(),
        "osrm_endpoint": routing_service.osrm_base_url,
    }

@app.get("/api/dashboard", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    incidents = db.query(Incident).all()
    tasks = db.query(RescueTask).all()
    analyses = db.query(ImageAnalysis).all()
    detections = db.query(Detection).all()
    teams = db.query(TeamLocation).filter(TeamLocation.is_active == True).all()
    blockages = db.query(RoadBlockage).filter(RoadBlockage.status == "Verified").all()

    people_count = sum(1 for d in detections if "person" in d.class_name.lower())
    vehicle_count = sum(1 for d in detections if any(w in d.class_name.lower() for w in ["car", "bus", "truck", "motorcycle", "vehicle"]))
    obstacle_count = sum(1 for d in detections if any(w in d.class_name.lower() for w in ["obstacle", "debris", "rock", "block"]))

    total_inc = len(incidents)
    active_inc = sum(1 for i in incidents if i.status in ["Reported", "Verified", "Assigned", "In Progress"])
    resolved_inc = total_inc - active_inc

    return DashboardStats(
        total_incidents=total_inc,
        active_incidents=active_inc,
        resolved_incidents=resolved_inc,
        images_analyzed=len(analyses),
        people_detected=people_count,
        vehicles_detected=vehicle_count,
        obstacles_detected=obstacle_count,
        open_tasks=sum(1 for t in tasks if t.status == "Pending"),
        in_progress_tasks=sum(1 for t in tasks if t.status == "In Progress"),
        completed_tasks=sum(1 for t in tasks if t.status == "Completed"),
        active_teams=len(teams),
        verified_blockages=len(blockages),
    )

# ----------------- Incidents -----------------
@app.get("/api/incidents", response_model=List[IncidentOut])
def list_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    disaster_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    if severity:
        query = query.filter(Incident.severity == severity)
    if disaster_type:
        query = query.filter(Incident.disaster_type == disaster_type)
    return query.order_by(Incident.reported_at.desc()).all()

@app.post("/api/incidents", response_model=IncidentOut)
async def create_incident(inc: IncidentCreate, db: Session = Depends(get_db)):
    inc_id = inc.id or f"INC-{uuid.uuid4().hex[:6].upper()}"
    new_inc = Incident(
        id=inc_id,
        title=inc.title,
        description=inc.description,
        disaster_type=inc.disaster_type,
        severity=inc.severity,
        status=inc.status,
        latitude=inc.latitude,
        longitude=inc.longitude,
        location_name=inc.location_name,
        people_at_risk=inc.people_at_risk,
        assigned_team=inc.assigned_team,
        notes=inc.notes,
        is_verified=inc.status in ["Verified", "Response In Progress", "In Progress"],
    )
    db.add(new_inc)
    db.commit()
    db.refresh(new_inc)

    # Broadcast event
    await manager.broadcast({
        "event": "INCIDENT_CREATED",
        "data": {"id": new_inc.id, "title": new_inc.title, "severity": new_inc.severity}
    })
    return new_inc

@app.get("/api/incidents/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc

@app.patch("/api/incidents/{incident_id}", response_model=IncidentOut)
async def update_incident(incident_id: str, update: IncidentUpdate, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    data = update.dict(exclude_unset=True)
    for k, v in data.items():
        setattr(inc, k, v)
    
    inc.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(inc)

    await manager.broadcast({
        "event": "INCIDENT_UPDATED",
        "data": {"id": inc.id, "title": inc.title, "status": inc.status, "severity": inc.severity}
    })
    return inc

@app.delete("/api/incidents/{incident_id}")
async def delete_incident(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    db.delete(inc)
    db.commit()

    await manager.broadcast({"event": "INCIDENT_DELETED", "data": {"id": incident_id}})
    return {"status": "success", "message": f"Incident {incident_id} deleted"}

# ----------------- AI Image Analysis (YOLO26s) -----------------
@app.post("/api/vision/analyze", response_model=ImageAnalysisOut)
async def analyze_image(
    file: UploadFile = File(...),
    incident_id: str = Form(...),
    location: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png"]:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, and PNG images are supported.")

    analysis_id = f"ANA-{uuid.uuid4().hex[:6].upper()}"
    saved_filename = f"{analysis_id}_{file.filename}"
    saved_path = os.path.join(UPLOADS_DIR, saved_filename)

    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Run YOLO Vision Detection
    res = yolo_service.detect(saved_path)

    new_analysis = ImageAnalysis(
        id=analysis_id,
        incident_id=incident_id,
        file_path=f"/uploads/{saved_filename}",
        annotated_path=f"/uploads/{res['annotated_filename']}",
        file_name=file.filename,
        location=location,
        notes=notes,
        model_name=res["model"],
        inference_status=res["status"],
        total_detections=res["total_detections"],
    )
    db.add(new_analysis)
    db.commit()

    # Save individual detections
    for d in res["detections"]:
        det = Detection(
            analysis_id=analysis_id,
            class_name=d["class_name"],
            confidence=d["confidence"],
            x1=d["x1"],
            y1=d["y1"],
            x2=d["x2"],
            y2=d["y2"],
        )
        db.add(det)
    db.commit()
    db.refresh(new_analysis)

    await manager.broadcast({
        "event": "IMAGE_ANALYZED",
        "data": {
            "analysis_id": new_analysis.id,
            "incident_id": incident_id,
            "total_detections": new_analysis.total_detections
        }
    })

    return new_analysis

@app.get("/api/vision/analyses", response_model=List[ImageAnalysisOut])
def list_analyses(incident_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(ImageAnalysis)
    if incident_id:
        q = q.filter(ImageAnalysis.incident_id == incident_id)
    return q.order_by(ImageAnalysis.uploaded_at.desc()).all()

# ----------------- Tasks -----------------
@app.get("/api/tasks", response_model=List[TaskOut])
def list_tasks(
    incident_id: Optional[str] = None,
    assigned_team: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(RescueTask)
    if incident_id:
        q = q.filter(RescueTask.incident_id == incident_id)
    if assigned_team:
        q = q.filter(RescueTask.assigned_team == assigned_team)
    if status:
        q = q.filter(RescueTask.status == status)
    return q.order_by(RescueTask.created_at.desc()).all()

@app.post("/api/tasks", response_model=TaskOut)
async def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    t_id = task.id or f"TSK-{uuid.uuid4().hex[:6].upper()}"
    new_task = RescueTask(
        id=t_id,
        title=task.title,
        description=task.description,
        incident_id=task.incident_id,
        assigned_team=task.assigned_team,
        priority=task.priority,
        status=task.status,
        due_date=task.due_date,
        notes=task.notes,
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    await manager.broadcast({
        "event": "TASK_CREATED",
        "data": {"id": new_task.id, "title": new_task.title, "assigned_team": new_task.assigned_team}
    })
    return new_task

@app.patch("/api/tasks/{task_id}", response_model=TaskOut)
async def update_task(task_id: str, update: TaskUpdate, db: Session = Depends(get_db)):
    t = db.query(RescueTask).filter(RescueTask.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    data = update.dict(exclude_unset=True)
    for k, v in data.items():
        setattr(t, k, v)
    
    if t.status == "Completed" and not t.completed_at:
        t.completed_at = datetime.datetime.now(datetime.timezone.utc)

    db.commit()
    db.refresh(t)

    await manager.broadcast({
        "event": "TASK_UPDATED",
        "data": {"id": t.id, "title": t.title, "status": t.status}
    })
    return t

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str, db: Session = Depends(get_db)):
    t = db.query(RescueTask).filter(RescueTask.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(t)
    db.commit()
    await manager.broadcast({"event": "TASK_DELETED", "data": {"id": task_id}})
    return {"status": "success"}

# ----------------- GPS Rescue Team Tracking -----------------
@app.post("/api/teams/location", response_model=TeamLocationOut)
async def update_team_location(loc: TeamLocationCreate, db: Session = Depends(get_db)):
    team = db.query(TeamLocation).filter(TeamLocation.team_name == loc.team_name).first()
    now = datetime.datetime.now(datetime.timezone.utc)
    if team:
        team.latitude = loc.latitude
        team.longitude = loc.longitude
        team.timestamp = now
        team.is_active = True
        team.battery_level = loc.battery_level or team.battery_level
    else:
        team = TeamLocation(
            team_name=loc.team_name,
            responder_id=loc.responder_id,
            latitude=loc.latitude,
            longitude=loc.longitude,
            timestamp=now,
            is_active=True,
            battery_level=loc.battery_level,
        )
        db.add(team)
    db.commit()
    db.refresh(team)

    await manager.broadcast({
        "event": "GPS_LOCATION_UPDATE",
        "data": {
            "team_name": team.team_name,
            "latitude": team.latitude,
            "longitude": team.longitude,
            "timestamp": team.timestamp.isoformat(),
        }
    })
    return team

@app.get("/api/teams/locations", response_model=List[TeamLocationOut])
def get_team_locations(db: Session = Depends(get_db)):
    return db.query(TeamLocation).all()

# ----------------- Road Blockage Analysis -----------------
@app.get("/api/road-blockages", response_model=List[RoadBlockageOut])
def list_road_blockages(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(RoadBlockage)
    if status:
        q = q.filter(RoadBlockage.status == status)
    return q.order_by(RoadBlockage.reported_at.desc()).all()

@app.post("/api/road-blockages", response_model=RoadBlockageOut)
async def create_road_blockage(b: RoadBlockageCreate, db: Session = Depends(get_db)):
    b_id = b.id or f"BLK-{uuid.uuid4().hex[:6].upper()}"
    new_b = RoadBlockage(
        id=b_id,
        title=b.title,
        road_segment=b.road_segment,
        latitude=b.latitude,
        longitude=b.longitude,
        status=b.status,
        incident_id=b.incident_id,
        notes=b.notes,
        verified_by=b.verified_by,
        verified_at=datetime.datetime.now(datetime.timezone.utc) if b.status == "Verified" else None
    )
    db.add(new_b)
    db.commit()
    db.refresh(new_b)

    await manager.broadcast({
        "event": "BLOCKAGE_UPDATED",
        "data": {"id": new_b.id, "title": new_b.title, "status": new_b.status}
    })
    return new_b

@app.patch("/api/road-blockages/{blockage_id}", response_model=RoadBlockageOut)
async def update_road_blockage(blockage_id: str, update: RoadBlockageUpdate, db: Session = Depends(get_db)):
    b = db.query(RoadBlockage).filter(RoadBlockage.id == blockage_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Blockage record not found")

    data = update.dict(exclude_unset=True)
    for k, v in data.items():
        setattr(b, k, v)

    if b.status == "Verified" and not b.verified_at:
        b.verified_at = datetime.datetime.now(datetime.timezone.utc)

    db.commit()
    db.refresh(b)

    await manager.broadcast({
        "event": "BLOCKAGE_UPDATED",
        "data": {"id": b.id, "road_segment": b.road_segment, "status": b.status}
    })
    return b

# ----------------- Tactical Routing with Closure Avoidance -----------------
@app.post("/api/routing", response_model=RouteResponse)
async def get_route(req: RouteRequest, db: Session = Depends(get_db)):
    # Retrieve verified road blockages from database
    verified = db.query(RoadBlockage).filter(RoadBlockage.status == "Verified").all()
    blockages_dict = [
        {"id": b.id, "road_segment": b.road_segment, "latitude": b.latitude, "longitude": b.longitude, "status": b.status}
        for b in verified
    ]

    res = await routing_service.calculate_route(
        req.start_lat, req.start_lng, req.end_lat, req.end_lng, blockages_dict
    )
    return res

# ----------------- AI Rescue Assistant & Criticality -----------------
@app.post("/api/assistant/chat", response_model=ChatResponse)
def assistant_chat(req: ChatRequest, db: Session = Depends(get_db)):
    incident_dict = None
    if req.incident_id:
        inc = db.query(Incident).filter(Incident.id == req.incident_id).first()
        if inc:
            incident_dict = {
                "id": inc.id,
                "title": inc.title,
                "disaster_type": inc.disaster_type,
                "severity": inc.severity,
                "status": inc.status,
                "people_at_risk": inc.people_at_risk,
                "location_name": inc.location_name,
            }

    history_dicts = [{"role": h.role, "content": h.content} for h in req.history]
    return gemini_service.chat_with_assistant(req.message, incident_dict, history_dicts)

@app.post("/api/assistant/score", response_model=CriticalityScoreResponse)
def compute_criticality_score(req: CriticalityScoreRequest, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == req.incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    tasks = db.query(RescueTask).filter(RescueTask.incident_id == req.incident_id).all()
    analyses = db.query(ImageAnalysis).filter(ImageAnalysis.incident_id == req.incident_id).all()
    blockages = db.query(RoadBlockage).filter(RoadBlockage.incident_id == req.incident_id).all()

    detections = []
    for a in analyses:
        for d in a.detections:
            detections.append({"class_name": d.class_name, "confidence": d.confidence})

    tasks_dicts = [{"status": t.status, "priority": t.priority} for t in tasks]
    blocks_dicts = [{"status": b.status} for b in blockages]
    inc_dict = {
        "id": inc.id, "title": inc.title, "severity": inc.severity, "people_at_risk": inc.people_at_risk
    }

    result = gemini_service.calculate_criticality_score(inc_dict, detections, tasks_dicts, blocks_dicts)

    # Persist updated score to incident
    inc.criticality_score = result["score"]
    inc.criticality_explanation = result["explanation"]
    db.commit()

    return result

# ----------------- Reports & PDF Generation -----------------
@app.get("/api/reports", response_model=List[ReportOut])
def list_reports(db: Session = Depends(get_db)):
    return db.query(IncidentReport).order_by(IncidentReport.generated_at.desc()).all()

@app.post("/api/reports", response_model=ReportOut)
def generate_report(req: ReportCreate, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == req.incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Target incident not found")

    report_id = f"REP-{uuid.uuid4().hex[:6].upper()}"
    title = req.title or f"After-Action Dossier: {inc.title}"

    tasks = db.query(RescueTask).filter(RescueTask.incident_id == req.incident_id).all()
    analyses = db.query(ImageAnalysis).filter(ImageAnalysis.incident_id == req.incident_id).all()
    blockages = db.query(RoadBlockage).filter(RoadBlockage.incident_id == req.incident_id).all()

    detections = []
    for a in analyses:
        for d in a.detections:
            detections.append({
                "class_name": d.class_name, "confidence": d.confidence,
                "x1": d.x1, "y1": d.y1, "x2": d.x2, "y2": d.y2
            })

    inc_data = {
        "id": inc.id,
        "title": inc.title,
        "description": inc.description,
        "disaster_type": inc.disaster_type,
        "severity": inc.severity,
        "status": inc.status,
        "location_name": inc.location_name,
        "latitude": inc.latitude,
        "longitude": inc.longitude,
        "assigned_team": inc.assigned_team,
        "people_at_risk": inc.people_at_risk,
    }
    task_dicts = [{"id": t.id, "title": t.title, "assigned_team": t.assigned_team, "priority": t.priority, "status": t.status} for t in tasks]
    block_dicts = [{"id": b.id, "road_segment": b.road_segment, "latitude": b.latitude, "longitude": b.longitude, "status": b.status} for b in blockages]

    # Generate PDF with ReportLab
    pdf_full_path = pdf_service.generate_incident_pdf(
        report_id=report_id,
        incident=inc_data,
        detections=detections,
        tasks=task_dicts,
        blockages=block_dicts,
        operator_notes=req.operator_notes
    )

    pdf_rel_url = f"/uploads/{os.path.basename(pdf_full_path)}"

    summary_text = (
        f"Official After-Action Report compiled for {inc.title} ({inc.id}). "
        f"Documented {len(detections)} computer vision detections, {len(tasks)} field directives, "
        f"and {len(blockages)} monitored road segments."
    )

    new_report = IncidentReport(
        id=report_id,
        incident_id=inc.id,
        title=title,
        summary=summary_text,
        pdf_path=pdf_rel_url,
        is_demo=False,
        operator_notes=req.operator_notes,
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report

@app.get("/api/reports/{report_id}/pdf")
def download_report_pdf(report_id: str, db: Session = Depends(get_db)):
    r = db.query(IncidentReport).filter(IncidentReport.id == report_id).first()
    if not r or not r.pdf_path:
        raise HTTPException(status_code=404, detail="PDF report not found")

    filename = os.path.basename(r.pdf_path)
    full_path = os.path.join(UPLOADS_DIR, filename)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="PDF file does not exist on disk")

    return FileResponse(
        full_path,
        media_type="application/pdf",
        filename=f"RescueVision_{report_id}.pdf"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
