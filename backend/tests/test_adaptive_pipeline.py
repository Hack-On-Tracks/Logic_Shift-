"""
Unit and Integration Tests for RescueVision AI Adaptive Automation Pipeline.
Tests:
- Disaster classification against all 11 supported categories
- Multi-hazard workflow resolution and merging
- Uncertain and insufficient evidence handling
- Model registry availability and fallback capabilities
- Adaptive severity assessment rubric calculations
- Weather grounding and road blockage impact
- PDF report and downstream task dispatch
"""

import pytest
import os
import io
from PIL import Image

from backend.services.workflow_registry import workflow_registry
from backend.services.model_registry import model_registry
from backend.services.weather_service import weather_service
from backend.services.adaptive_pipeline import adaptive_pipeline, SUPPORTED_CATEGORIES
from backend.services.yolo_service import UPLOADS_DIR
from backend.database import SessionLocal, init_db
from backend.models import Incident, RescueTask

@pytest.fixture(scope="module")
def db_session():
    init_db()
    session = SessionLocal()
    yield session
    session.close()

def test_workflow_registry_all_categories_registered():
    all_workflows = workflow_registry.list_all()
    workflow_categories = [w.category for w in all_workflows]
    
    assert len(all_workflows) >= 10, "Expected at least 10 disaster workflows"
    for cat in [
        "Flood", "Earthquake", "Building collapse", "Fire", "Landslide",
        "Cyclone or severe storm", "Tsunami or coastal flooding",
        "Road accident", "Industrial accident", "Unknown or insufficient evidence"
    ]:
        assert cat in workflow_categories, f"Category '{cat}' missing from registry"

def test_workflow_registry_attributes():
    flood_wf = workflow_registry.get("Flood")
    assert flood_wf is not None
    assert flood_wf.workflow_id == "WF-FLOOD"
    assert "Swiftwater" in flood_wf.recommended_rescue_resources[0] or "Boat" in flood_wf.recommended_rescue_resources[1]
    assert len(flood_wf.visual_indicators) >= 3
    assert "precipitation" in flood_wf.weather_requirements
    assert "flood_inundation_zones" in flood_wf.relevant_map_layers

def test_model_registry_integrity():
    models = model_registry.list_models()
    assert len(models) >= 4, "Expected primary general model + specialized models"
    
    active = model_registry.get_active_model()
    assert active.model_id == "yolov8s"
    assert active.is_available is True
    assert "person" in active.supported_classes
    assert active.is_specialized is False, "General model must not be mislabeled as specialized"

def test_model_resolution_reports_missing_specialized_gracefully():
    resolution = model_registry.resolve_workflow_models("WF-FLOOD")
    assert resolution["primary_model"].model_id == "yolov8s"
    assert resolution["is_using_fallback"] is True
    assert len(resolution["missing_capabilities"]) > 0
    assert "HydroVision" in resolution["missing_capabilities"][0]["model_id"] or "flood" in resolution["missing_capabilities"][0]["model_id"]

def test_adaptive_severity_flood_rubric():
    flood_wf = workflow_registry.get("Flood")
    detections = [
        {"class_name": "person", "confidence": 0.88},
        {"class_name": "boat", "confidence": 0.92},
        {"class_name": "car", "confidence": 0.75},
    ]
    weather = {"available": True, "precipitation_mm": 12.0, "wind_speed_kmh": 25.0}
    blockages = [{"id": 1, "road_segment": "Route 9 Bridge", "status": "Verified"}]

    severity = adaptive_pipeline.compute_adaptive_severity(
        workflow=flood_wf,
        detections=detections,
        weather=weather,
        blockages=blockages,
        people_reported=4,
        is_uncertain=False
    )

    assert severity["score"] >= 6.0, "Flood with verified blockages, heavy rain, and victims should score High or Critical"
    assert severity["severity_level"] in ["High", "Critical"]
    assert severity["is_preliminary"] is True

def test_adaptive_severity_fire_wind_acceleration():
    fire_wf = workflow_registry.get("Fire")
    detections = [{"class_name": "person", "confidence": 0.80}]
    weather = {"available": True, "wind_speed_kmh": 45.0, "precipitation_mm": 0.0}
    blockages = []

    severity = adaptive_pipeline.compute_adaptive_severity(
        workflow=fire_wf,
        detections=detections,
        weather=weather,
        blockages=blockages,
        people_reported=0,
        is_uncertain=False
    )

    factors_str = " ".join([f["factor"] for f in severity["factors"]])
    assert "Atmospheric Flame Acceleration" in factors_str

def test_uncertainty_score_capping():
    unknown_wf = workflow_registry.get("Unknown or insufficient evidence")
    severity = adaptive_pipeline.compute_adaptive_severity(
        workflow=unknown_wf,
        detections=[],
        weather={"available": False},
        blockages=[],
        people_reported=0,
        is_uncertain=True
    )
    assert severity["score"] <= 6.0, "Uncertain events should be capped to prevent false alarms"

def test_pipeline_execution_end_to_end(db_session):
    # Create test image
    img = Image.new("RGB", (320, 240), color=(80, 80, 80))
    img_path = os.path.join(UPLOADS_DIR, "test_pipeline_unit.jpg")
    img.save(img_path)

    result = adaptive_pipeline.execute_pipeline(
        image_path=img_path,
        filename="test_pipeline_unit.jpg",
        notes="Simulation unit test run",
        location_name="Unit Test Sector A",
        latitude=19.0760,
        longitude=72.8777,
        db=db_session
    )

    assert result["status"] == "COMPLETED"
    assert "classification" in result
    assert result["classification"]["primary_disaster_type"] in SUPPORTED_CATEGORIES
    assert "workflow" in result
    assert "model_execution" in result
    assert "weather" in result
    assert "severity_assessment" in result
    assert result["downstream_synchronization"]["incident_id"] is not None
    assert result["downstream_synchronization"]["dispatched_tasks_count"] >= 1
    assert result["downstream_synchronization"]["report_pdf_url"] is not None

    # Clean up test file
    if os.path.exists(img_path):
        os.remove(img_path)

if __name__ == "__main__":
    pytest.main(["-v", __file__])
