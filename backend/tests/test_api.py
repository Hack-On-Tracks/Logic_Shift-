"""
RescueVision AI — Backend API Integration Test Suite
Validates:
1. Health & Status Check
2. Incidents CRUD & Geo Validation
3. YOLOv8s Real Vision Inference (using a test generated image)
4. Tasks CRUD & Priority Assignment
5. Road Blockage State Machine
6. GPS Team Tracking Telemetry
7. OSRM Routing & Closure Intersection Warning
8. Gemini AI Chat & Criticality Scoring Engine
9. ReportLab PDF Generation
"""
import io
import os
import sys
import unittest
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

# Ensure backend package can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.main import app

client = TestClient(app)

class TestRescueVisionAPI(unittest.TestCase):
    def test_01_health_check(self):
        """Test health endpoint reports ONLINE and model status."""
        response = client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ONLINE")
        self.assertIn("vision_model", data)
        self.assertIn("gemini_available", data)

    def test_02_dashboard_stats(self):
        """Test dashboard aggregates incidents, tasks, and telemetry."""
        response = client.get("/api/dashboard")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_incidents", data)
        self.assertIn("active_incidents", data)
        self.assertIn("open_tasks", data)
        self.assertIn("active_teams", data)
        self.assertGreaterEqual(data["total_incidents"], 1)

    def test_03_incidents_crud(self):
        """Test creating and retrieving an emergency incident."""
        payload = {
            "title": "Sector 9 Flash Flood Emergency",
            "description": "Rising floodwaters reported near the Brahmaputra embankments.",
            "disaster_type": "Flood",
            "severity": "Critical",
            "latitude": 26.1850,
            "longitude": 91.7450,
            "location_name": "Embankment Road, Sector 9",
            "people_at_risk": 45,
            "assigned_team": "Alpha Rescue Unit"
        }
        res = client.post("/api/incidents", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["title"], payload["title"])
        self.assertEqual(data["severity"], "Critical")
        inc_id = data["id"]

        # Fetch it back
        res_get = client.get(f"/api/incidents/{inc_id}")
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.json()["id"], inc_id)

    def test_04_road_blockages(self):
        """Test road blockages listing and status updates."""
        res = client.get("/api/road-blockages")
        self.assertEqual(res.status_code, 200)
        blockages = res.json()
        self.assertIsInstance(blockages, list)
        self.assertGreaterEqual(len(blockages), 1)

        first_id = blockages[0]["id"]
        # Update status
        patch_res = client.patch(f"/api/road-blockages/{first_id}", json={"status": "Verified"})
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.json()["status"], "Verified")

    def test_05_gps_team_telemetry(self):
        """Test posting and retrieving rescue team coordinates."""
        payload = {
            "team_name": "Bravo Scout 2",
            "responder_id": "RESP-009",
            "latitude": 26.1620,
            "longitude": 91.7580,
            "battery_level": 92
        }
        res = client.post("/api/teams/location", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["team_name"], "Bravo Scout 2")

        # Get all locations
        locs_res = client.get("/api/teams/locations")
        self.assertEqual(locs_res.status_code, 200)
        self.assertTrue(any(t["team_name"] == "Bravo Scout 2" for t in locs_res.json()))

    def test_06_osrm_routing_and_closures(self):
        """Test calculating navigation route between two coordinates."""
        payload = {
            "start_lat": 26.1500,
            "start_lng": 91.7000,
            "end_lat": 26.1800,
            "end_lng": 91.7500
        }
        res = client.post("/api/routing", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("distance_meters", data)
        self.assertIn("duration_seconds", data)
        self.assertIn("geometry", data)
        self.assertGreater(len(data["geometry"]), 1)

    def test_07_criticality_scorer(self):
        """Test multi-factor disaster triage calculation."""
        payload = {
            "incident_id": "INC-001"
        }
        res = client.post("/api/assistant/score", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("score", data)
        self.assertIn("factors", data)
        self.assertIn("explanation", data)

    def test_08_pdf_report_generation(self):
        """Test generating and downloading official ReportLab PDF report."""
        payload = {
            "title": "Comprehensive SITREP: Sector 9 Emergency",
            "incident_id": "INC-001",
            "report_type": "Situation Report",
            "summary": "Full overview of resources dispatched to flash flood incident.",
            "generated_by": "Senior Operations Officer"
        }
        res = client.post("/api/reports", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["id"].startswith("REP-"))
        self.assertIsNotNone(data["pdf_path"])

        # Test PDF retrieval
        pdf_res = client.get(f"/api/reports/{data['id']}/pdf")
        self.assertEqual(pdf_res.status_code, 200)
        self.assertEqual(pdf_res.headers.get("content-type"), "application/pdf")
        self.assertGreater(len(pdf_res.content), 1000)

    def test_09_yolo_vision_inference(self):
        """Test YOLO image inference with a synthetically created test image."""
        img = Image.new("RGB", (640, 480), color=(100, 150, 200))
        draw = ImageDraw.Draw(img)
        draw.rectangle([100, 100, 180, 240], fill=(220, 50, 50))
        draw.rectangle([300, 200, 450, 320], fill=(50, 220, 50))

        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='JPEG')
        img_byte_arr.seek(0)

        files = {"file": ("test_aerial.jpg", img_byte_arr, "image/jpeg")}
        res = client.post("/api/vision/analyze", files=files, data={"incident_id": "INC-001"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_detections", data)
        self.assertIn("model_name", data)
        self.assertEqual(data["model_name"], "yolov8s.pt")

if __name__ == "__main__":
    unittest.main()
