"""
End-to-End Test Suite for RescueVision AI Guided 8-Step Checkbox Workflow.
Validates:
1. Session Initialization (Image upload -> Gemini Vision -> YOLO -> Review Step 3)
2. Human Review Approval (Operator checkboxes & override handling -> Location Step 4)
3. Location Setting & Auto-Incident Creation (Weather telemetry & Incident sync -> Recommendations Step 6)
4. Recommendation Approval & Final Wrap-Up (Task dispatching & PDF report -> Completed Step 8)
"""

import os
import io
import json
import pytest
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.models import WorkflowSession, Incident, RescueTask, ImageAnalysis, IncidentReport
from backend.services.guided_workflow_service import guided_workflow_service

TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture
def test_db():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def generate_test_image_bytes():
    buf = io.BytesIO()
    img = Image.new("RGB", (320, 240), color=(30, 80, 160))
    img.save(buf, format="JPEG")
    return buf.getvalue()

def test_guided_workflow_lifecycle_end_to_end(test_db):
    # STEP 1 & 2: Start session
    img_bytes = generate_test_image_bytes()
    session = guided_workflow_service.start_session(
        db=test_db,
        image_bytes=img_bytes,
        filename="recon_test_flood.jpg"
    )

    assert session.id.startswith("WFS-")
    assert session.current_step == 3 # Ready for Step 3: Human Review
    assert session.status == "PENDING_REVIEW"
    assert session.classification_json is not None
    assert session.detections_json is not None
    assert session.severity_json is not None

    # Verify preliminary image analysis was created and stored
    analysis = test_db.query(ImageAnalysis).filter(ImageAnalysis.id == session.analysis_id).first()
    assert analysis is not None
    assert analysis.total_detections >= 0

    # STEP 3: Human Review via Checkboxes
    updated_session = guided_workflow_service.approve_review(
        db=test_db,
        session_id=session.id,
        disaster_type="Flood",
        severity_level="High",
        checkboxes={
            "confirm_disaster_type": True,
            "confirm_severity": True,
            "confirm_detections": True,
            "acknowledge_evidence": True,
            "acknowledge_uncertainties": True,
        }
    )

    assert updated_session.current_step == 4 # Advanced to Step 4: Location
    assert updated_session.status == "PENDING_LOCATION"
    review_data = json.loads(updated_session.review_json)
    assert review_data["confirmed_disaster_type"] == "Flood"
    assert review_data["confirmed_severity"] == "High"
    assert review_data["checkboxes"]["confirm_disaster_type"] is True

    # STEP 4 & 5: Set Location and Auto-Create Incident
    loc_session = guided_workflow_service.set_location_and_create_incident(
        db=test_db,
        session_id=session.id,
        latitude=19.0760,
        longitude=72.8777,
        location_name="Coastal Sector Bravo",
        is_unknown=False,
    )

    assert loc_session.current_step == 6 # Advanced to Step 6: Recommendations
    assert loc_session.status == "PENDING_RECOMMENDATIONS"
    assert loc_session.incident_id is not None

    # Verify Incident record in database
    incident = test_db.query(Incident).filter(Incident.id == loc_session.incident_id).first()
    assert incident is not None
    assert incident.disaster_type == "Flood"
    assert incident.severity == "High"
    assert incident.latitude == pytest.approx(19.0760, rel=1e-3)
    assert incident.longitude == pytest.approx(72.8777, rel=1e-3)
    assert incident.is_verified is True

    # Verify weather telemetry was grounded
    weather_data = json.loads(loc_session.weather_json)
    assert "available" in weather_data

    # Verify dynamic AI recommendations generated
    recs = json.loads(loc_session.recommendations_json)
    assert len(recs) >= 3
    assert any("Zodiac" in r["title"] or "Marine" in r["assigned_team"] or "water" in r["description"].lower() for r in recs)

    # STEP 6, 7 & 8: Approve Recommendations, Dispatch Tasks & Generate Dossier
    approved_tasks = [
        {
            "title": recs[0]["title"],
            "description": recs[0]["description"],
            "assigned_team": recs[0]["assigned_team"],
            "priority": recs[0]["priority"],
        },
        {
            "title": recs[1]["title"],
            "description": recs[1]["description"],
            "assigned_team": recs[1]["assigned_team"],
            "priority": recs[1]["priority"],
        }
    ]

    final_session = guided_workflow_service.approve_recommendations_and_finalize(
        db=test_db,
        session_id=session.id,
        approved_tasks=approved_tasks,
    )

    assert final_session.current_step == 8 # Completed
    assert final_session.status == "COMPLETED"

    # Verify dispatched tasks in rescue_tasks table
    db_tasks = test_db.query(RescueTask).filter(RescueTask.incident_id == incident.id).all()
    assert len(db_tasks) == 2
    assert db_tasks[0].incident_id == incident.id

    # Verify After-Action PDF Report record
    if final_session.report_id:
        report = test_db.query(IncidentReport).filter(IncidentReport.id == final_session.report_id).first()
        assert report is not None
        assert report.incident_id == incident.id
        assert report.pdf_path is not None
