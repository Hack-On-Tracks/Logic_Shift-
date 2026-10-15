# RescueVision AI — Full-Stack Platform Architecture & Implementation Plan

## 1. System Overview
RescueVision AI (LIVE TRACK by Logic Shift) is a real-time emergency disaster-response platform combining:
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Leaflet GIS, Lucide React, and Recharts.
- **Backend**: Python 3.14 + FastAPI with async route handlers, WebSocket dispatch broadcasting, and CORS support.
- **Database**: SQLite with SQLAlchemy ORM (support for PostgreSQL via `DATABASE_URL`).
- **AI Vision**: Ultralytics YOLO (`YOLO("yolo26s.pt")`) for real-time bounding-box aerial and ground object detection.
- **AI Rescue Assistant**: Google Gemini API via official `google-genai` SDK for incident summarization, triage guidance, and transparent criticality scoring.
- **GIS & Tactical Routing**: Leaflet with OpenStreetMap tiles, live team GPS tracking, and OSRM routing with road-blockage intersection warnings.
- **Reporting Engine**: ReportLab downloadable vector PDF generator with formal incident dossiers.

---

## 2. Implementation Phases

### Phase A: Python FastAPI Backend Foundation
- [ ] Create `backend/` directory structure.
- [ ] `database.py`: SQLAlchemy engine, session maker, base model.
- [ ] `models.py`: 
  - `Incident`: title, description, disaster_type, severity, status, lat, lng, location_name, people_at_risk, reported_at, updated_at, assigned_team, notes, criticality_score.
  - `ImageAnalysis`: file_path, annotated_path, incident_id, timestamp, model_name, inference_status.
  - `Detection`: analysis_id, class_name, confidence, x1, y1, x2, y2.
  - `RescueTask`: title, description, incident_id, assigned_team, priority, status, due_date, created_at, completed_at, notes.
  - `TeamLocation`: team_name, responder_id, lat, lng, timestamp, is_active.
  - `RoadBlockage`: title, road_segment, lat, lng, status (reported, under_review, verified, cleared), incident_id, notes, verified_at.
  - `IncidentReport`: incident_id, title, summary, generated_at, pdf_path, is_demo.
  - `ActivityLog`: action, category, details, timestamp.
- [ ] `schemas.py`: Pydantic V2 schemas for validation of all request/response models.

### Phase B: Core Backend Services
- [ ] **YOLO Vision Service (`backend/services/yolo_service.py`)**:
  - Load `YOLO("yolo26s.pt")` with fallback to standard pretrained weights if the specific custom checkpoint is unavailable.
  - Process image uploads (JPG, JPEG, PNG, validate file sizes).
  - Perform real inference; generate bounding boxes with classes (`person`, `car`, `truck`, `bus`, `boat`, etc.), confidence scores, coordinates.
  - Draw bounding boxes on the image and save both original and annotated images to `uploads/`.
- [ ] **Gemini AI Rescue Assistant Service (`backend/services/gemini_service.py`)**:
  - Connect via `google-genai` with configured API key.
  - Triage summarization, situation reports, missing data inquiry, and multi-factor transparent criticality calculation.
- [ ] **OSRM Routing Service (`backend/services/routing_service.py`)**:
  - Call OSRM public or self-hosted API for driving routes between responder and incident.
  - Intersect geometry with verified `RoadBlockage` markers to alert operators of unsafe passage.
- [ ] **ReportLab PDF Service (`backend/services/pdf_service.py`)**:
  - Generate official PDF documents with incident summary, detections, directives, and map coordinates.

### Phase C: API Endpoints & Real-time WebSockets
- [ ] `/api/health`: Service health and model status check.
- [ ] `/api/dashboard`: Aggregated live statistics.
- [ ] `/api/incidents`: CRUD with coordinate and severity validation.
- [ ] `/api/vision/analyze`: Multipart image upload, YOLO inference, storage of detections.
- [ ] `/api/tasks`: CRUD with status updates.
- [ ] `/api/teams/location`: Post and get GPS coordinates.
- [ ] `/api/road-blockages`: Register, verify, and query closures.
- [ ] `/api/routing`: OSRM calculation with closure warnings.
- [ ] `/api/assistant/chat`: Gemini-powered emergency response assistant.
- [ ] `/api/assistant/score`: Explainable criticality priority score calculation.
- [ ] `/api/reports`: Report generation and PDF binary stream download.
- [ ] `/ws/live`: WebSocket connection for broadcasting new incidents, GPS team movements, and task changes.

### Phase D: Frontend Pages & API Integration
- [ ] Centralize API client in `lib/api.ts` using `NEXT_PUBLIC_API_URL || 'http://localhost:8000'`.
- [ ] Update Sidebar with 2 additional pages:
  - **Road Blockage Analysis** (`/blockages`)
  - **AI Rescue Assistant** (`/assistant`)
- [ ] Wire `/analysis` to upload real images to `POST /api/vision/analyze` and render actual bounding boxes.
- [ ] Wire `/map` to show real incident markers, road closures, GPS tracking toggle, and OSRM route drawer.
- [ ] Wire `/incidents` and `/tasks` to sync with backend database.
- [ ] Implement `/blockages/page.tsx` for operator road-closure verification.
- [ ] Implement `/assistant/page.tsx` for Gemini conversational emergency intelligence and criticality scoring.
- [ ] Wire `/reports` to trigger ReportLab PDF generation and download.
- [ ] Ensure full offline fallback / graceful degradation if backend or external API is offline.
