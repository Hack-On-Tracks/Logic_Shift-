"""
Guided Workflow Service for RescueVision AI.
Implements the 8-stage interactive, checkbox-driven disaster response pipeline:
1. Upload Disaster Image
2. AI Analysis (Gemini Vision + YOLO + Adaptive Rubric)
3. Human Review via Checkboxes
4. Location Confirmation (Leaflet Map / GPS)
5. Incident Creation & Dashboard Auto-Update
6. AI Rescue Recommendations (Checkbox Approval)
7. Rescue Map Auto-Update
8. Incident Report & Wrap-Up
"""

import os
import json
import uuid
import datetime
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from .adaptive_pipeline import adaptive_pipeline
from .workflow_registry import workflow_registry
from .weather_service import weather_service
from .yolo_service import yolo_service, UPLOADS_DIR
from .pdf_service import pdf_service
from ..models import (
    WorkflowSession, Incident, RescueTask, ImageAnalysis,
    Detection, RoadBlockage, IncidentReport
)

logger = logging.getLogger("rescuevision.workflow")

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

class GuidedWorkflowService:
    def start_session(
        self,
        db: Session,
        image_bytes: bytes,
        filename: str,
    ) -> WorkflowSession:
        """
        Step 1 & 2:
        Ingests disaster image, creates a WorkflowSession, runs Gemini Vision classification,
        runs YOLO detection, and prepares the session for Human Review (Step 3).
        """
        session_id = f"WFS-{uuid.uuid4().hex[:6].upper()}"
        ext = os.path.splitext(filename)[1].lower() or ".jpg"
        saved_filename = f"{session_id}_{filename}"
        disk_path = os.path.join(UPLOADS_DIR, saved_filename)

        with open(disk_path, "wb") as f:
            f.write(image_bytes)

        rel_image_path = f"/uploads/{saved_filename}"

        # Run Adaptive Pipeline Stages 1, 2, 3, 5
        # 1. Gemini Vision classification
        classification = adaptive_pipeline.classify_disaster_image(disk_path)
        primary_cat = classification["primary_disaster_type"]

        # 2. Workflow resolution
        workflow = workflow_registry.get(primary_cat) or workflow_registry.get("Unknown or insufficient evidence")

        # 3. YOLO detection
        yolo_result = yolo_service.detect(disk_path)
        detections = yolo_result.get("detections", [])
        rel_annotated_path = f"/uploads/{yolo_result.get('annotated_filename', saved_filename)}"

        # 4. Preliminary severity estimation
        severity = adaptive_pipeline.compute_adaptive_severity(
            workflow=workflow,
            detections=detections,
            weather={"available": False, "reason": "Location pending confirmation in Step 4"},
            blockages=[],
            people_reported=0,
            is_uncertain=classification.get("is_uncertain", False),
        )

        # 5. Create preliminary ImageAnalysis in DB so detections are persisted
        analysis_id = f"ANA-{uuid.uuid4().hex[:6].upper()}"
        image_analysis = ImageAnalysis(
            id=analysis_id,
            incident_id=None, # Will link when Incident is created in Step 5
            file_path=rel_image_path,
            annotated_path=rel_annotated_path,
            file_name=filename,
            location="Location verification pending",
            notes=f"Identified as {primary_cat} ({classification['confidence']*100:.0f}% conf). Workflow: {workflow.workflow_id}.",
            model_name=yolo_result.get("model", "YOLO26s"),
            inference_status=yolo_result.get("status", "Completed"),
            total_detections=len(detections),
        )
        db.add(image_analysis)
        db.commit()

        for d in detections:
            det = Detection(
                analysis_id=analysis_id,
                class_name=d["class_name"],
                confidence=d["confidence"],
                x1=d["x1"], y1=d["y1"], x2=d["x2"], y2=d["y2"],
            )
            db.add(det)
        db.commit()

        # Build session record ready for Human Review (Step 3)
        session = WorkflowSession(
            id=session_id,
            incident_id=None,
            analysis_id=analysis_id,
            report_id=None,
            current_step=3, # Ready for Step 3: Human Review
            status="PENDING_REVIEW",
            file_name=filename,
            image_path=rel_image_path,
            annotated_image_path=rel_annotated_path,
            classification_json=json.dumps(classification),
            detections_json=json.dumps({
                "total": len(detections),
                "people_count": sum(1 for d in detections if "person" in d["class_name"].lower()),
                "vehicle_count": sum(1 for d in detections if any(k in d["class_name"].lower() for k in ["car", "truck", "bus", "motorcycle"])),
                "obstacle_count": sum(1 for d in detections if any(k in d["class_name"].lower() for k in ["obstacle", "debris", "rock"])),
                "detections": detections,
            }),
            weather_json=json.dumps({"available": False, "status": "Pending location confirmation"}),
            severity_json=json.dumps(severity),
            review_json=None,
            location_json=None,
            recommendations_json=None,
            dispatched_tasks_json=None,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def approve_review(
        self,
        db: Session,
        session_id: str,
        disaster_type: Optional[str] = None,
        severity_level: Optional[str] = None,
        checkboxes: Optional[Dict[str, bool]] = None,
    ) -> WorkflowSession:
        """
        Step 3: Human Review via Checkboxes
        Stores verified/overridden disaster type and severity, records operator checkboxes,
        and advances to Step 4: Location Confirmation.
        """
        session = db.query(WorkflowSession).filter(WorkflowSession.id == session_id).first()
        if not session:
            raise ValueError(f"Workflow session {session_id} not found")

        # Update classification or severity if human provided override
        if disaster_type:
            classif = json.loads(session.classification_json or "{}")
            classif["primary_disaster_type"] = disaster_type
            classif["human_overridden"] = True
            session.classification_json = json.dumps(classif)

        if severity_level:
            sev = json.loads(session.severity_json or "{}")
            sev["severity_level"] = severity_level
            sev["human_overridden"] = True
            session.severity_json = json.dumps(sev)

        session.review_json = json.dumps({
            "approved_at": utcnow().isoformat(),
            "confirmed_disaster_type": disaster_type or json.loads(session.classification_json or "{}").get("primary_disaster_type"),
            "confirmed_severity": severity_level or json.loads(session.severity_json or "{}").get("severity_level"),
            "checkboxes": checkboxes or {
                "confirm_disaster_type": True,
                "confirm_severity": True,
                "confirm_detections": True,
                "acknowledge_evidence": True,
                "acknowledge_uncertainties": True,
            }
        })
        session.current_step = 4 # Advance to Step 4: Location Confirmation
        session.status = "PENDING_LOCATION"
        session.updated_at = utcnow()

        db.commit()
        db.refresh(session)
        return session

    def set_location_and_create_incident(
        self,
        db: Session,
        session_id: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_name: Optional[str] = None,
        is_unknown: bool = False,
    ) -> WorkflowSession:
        """
        Step 4 & 5:
        Gounds location, retrieves Open-Meteo weather, creates official Incident record,
        links ImageAnalysis to Incident, generates AI rescue recommendations, and advances
        to Step 6: AI Rescue Recommendations.
        """
        session = db.query(WorkflowSession).filter(WorkflowSession.id == session_id).first()
        if not session:
            raise ValueError(f"Workflow session {session_id} not found")

        # Determine coordinates and location name
        if is_unknown or latitude is None or longitude is None:
            lat = 19.0760 # Default triage reference (e.g. Mumbai Command Sector)
            lng = 72.8777
            loc_label = location_name or "Sector Unspecified (Ground Reconnaissance Required)"
            loc_source = "unknown"
        else:
            lat = float(latitude)
            lng = float(longitude)
            loc_label = location_name or f"GeoSector [{lat:.4f}, {lng:.4f}]"
            loc_source = "operator_selected"

        # Step 4.2: Fetch real-time weather from Open-Meteo
        weather = weather_service.get_weather(lat, lng)

        session.location_json = json.dumps({
            "latitude": lat,
            "longitude": lng,
            "location_name": loc_label,
            "source": loc_source,
            "is_unknown": is_unknown,
        })
        session.weather_json = json.dumps(weather)

        # Parse stored classification, detections, and severity
        classif = json.loads(session.classification_json or "{}")
        dets_data = json.loads(session.detections_json or "{}")
        sev_data = json.loads(session.severity_json or "{}")

        primary_disaster = classif.get("primary_disaster_type", "Other disaster")
        severity_level = sev_data.get("severity_level", "Medium")
        people_count = dets_data.get("people_count", 0)

        # Step 5: Automatically create official Incident
        inc_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
        weather_desc = f"{weather.get('condition', 'Normal')} ({weather.get('temperature_c', 28)}°C, Wind: {weather.get('wind_speed_kmh', 0)} km/h)" if weather.get("available") else "Weather telemetry offline"

        new_incident = Incident(
            id=inc_id,
            title=f"{primary_disaster} Emergency: {loc_label}",
            description=(
                f"Automated incident generated via RescueVision AI Guided Workflow. "
                f"Identified as {primary_disaster} with {classif.get('confidence', 0.9)*100:.0f}% confidence. "
                f"Environmental telemetry: {weather_desc}. "
                f"Visual verification: {people_count} person(s) detected in sector."
            ),
            disaster_type=primary_disaster,
            severity=severity_level,
            status="Verified",
            latitude=lat,
            longitude=lng,
            location_name=loc_label,
            people_at_risk=people_count,
            assigned_team="Alpha Search Unit",
            notes=f"Created from session {session.id}. AI Confidence: {classif.get('confidence', 0.9):.2f}.",
            is_verified=True,
        )
        db.add(new_incident)
        db.commit()
        db.refresh(new_incident)

        session.incident_id = new_incident.id

        # Link the ImageAnalysis record to the new incident
        if session.analysis_id:
            ana = db.query(ImageAnalysis).filter(ImageAnalysis.id == session.analysis_id).first()
            if ana:
                ana.incident_id = new_incident.id
                ana.location = loc_label
                db.commit()

        # Step 6: Generate Dynamic AI Rescue Recommendations tailored to disaster, weather, and victims
        recommendations = self._generate_recommendations(
            disaster_type=primary_disaster,
            severity_level=severity_level,
            people_count=people_count,
            weather=weather,
            location_name=loc_label,
        )
        session.recommendations_json = json.dumps(recommendations)
        session.current_step = 6 # Ready for Step 6: Checkbox Recommendation Approval
        session.status = "PENDING_RECOMMENDATIONS"
        session.updated_at = utcnow()

        db.commit()
        db.refresh(session)
        return session

    def approve_recommendations_and_finalize(
        self,
        db: Session,
        session_id: str,
        approved_tasks: List[Dict[str, Any]],
    ) -> WorkflowSession:
        """
        Step 6, 7 & 8:
        Dispatches approved tasks into rescue_tasks table, updates rescue map state,
        generates the comprehensive After-Action PDF Report, and finalizes the session.
        """
        session = db.query(WorkflowSession).filter(WorkflowSession.id == session_id).first()
        if not session:
            raise ValueError(f"Workflow session {session_id} not found")

        inc = db.query(Incident).filter(Incident.id == session.incident_id).first()
        if not inc:
            raise ValueError(f"Incident {session.incident_id} not found")

        dispatched_list = []
        for t_data in approved_tasks:
            task_id = f"TSK-{uuid.uuid4().hex[:6].upper()}"
            task = RescueTask(
                id=task_id,
                title=t_data.get("title", "Dispatched Rescue Operation"),
                description=t_data.get("description", "Ground operation authorized via RescueVision Guided Workflow."),
                incident_id=inc.id,
                assigned_team=t_data.get("assigned_team", "Alpha Search Unit"),
                priority=t_data.get("priority", inc.severity),
                status="Pending",
                notes=f"Authorized via session {session_id}.",
            )
            db.add(task)
            dispatched_list.append({
                "id": task_id,
                "title": task.title,
                "assigned_team": task.assigned_team,
                "priority": task.priority,
            })
        db.commit()

        session.dispatched_tasks_json = json.dumps(dispatched_list)

        # Generate After-Action PDF Dossier
        try:
            report_id = f"REP-{uuid.uuid4().hex[:6].upper()}"
            dets_data = json.loads(session.detections_json or "{}")
            raw_detections = dets_data.get("detections", [])
            classif = json.loads(session.classification_json or "{}")
            weather = json.loads(session.weather_json or "{}")

            inc_dict = {
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
            task_dicts = [{"id": t["id"], "title": t["title"], "assigned_team": t["assigned_team"], "priority": t["priority"], "status": "Pending"} for t in dispatched_list]
            blockages = [{"id": b.id, "road_segment": b.road_segment, "status": b.status} for b in db.query(RoadBlockage).all()]

            pdf_disk_path = pdf_service.generate_incident_pdf(
                report_id=report_id,
                incident=inc_dict,
                detections=raw_detections,
                tasks=task_dicts,
                blockages=blockages,
                operator_notes=(
                    f"Generated via RescueVision AI Checkbox-Driven Guided Workflow.\n"
                    f"Disaster Type: {inc.disaster_type} (Verified by operator).\n"
                    f"Weather Telemetry: {weather.get('condition', 'N/A')} ({weather.get('temperature_c', 'N/A')}°C, Wind: {weather.get('wind_speed_kmh', 'N/A')} km/h).\n"
                    f"Supporting Evidence: {', '.join(classif.get('supporting_evidence', []))}.\n"
                    f"Uncertainties: {', '.join(classif.get('uncertainties', []))}."
                )
            )

            rel_pdf_path = f"/uploads/{os.path.basename(pdf_disk_path)}"

            report = IncidentReport(
                id=report_id,
                incident_id=inc.id,
                title=f"After-Action Dossier: {inc.title}",
                summary=f"Automated incident dossier for {inc.disaster_type} at {inc.location_name}. Dispatched {len(dispatched_list)} operational directives.",
                pdf_path=rel_pdf_path,
                is_demo=False,
                operator_notes="Generated automatically at completion of Guided AI Workflow.",
            )
            db.add(report)
            db.commit()
            db.refresh(report)

            session.report_id = report.id
        except Exception as e:
            logger.error(f"Failed to generate PDF in guided workflow: {e}")

        session.current_step = 8 # Step 8: Incident Report & Wrap-Up
        session.status = "COMPLETED"
        session.updated_at = utcnow()
        db.commit()
        db.refresh(session)
        return session

    def _generate_recommendations(
        self,
        disaster_type: str,
        severity_level: str,
        people_count: int,
        weather: Dict[str, Any],
        location_name: str,
    ) -> List[Dict[str, Any]]:
        """
        Synthesizes high-priority, disaster-specific recommendations with pre-checked status.
        """
        recs = []
        is_critical = severity_level in ["Critical", "High"]

        # Universal Directive 1: Ground SAR Search
        target_team = "Alpha Search Unit" if people_count > 0 else "Reconnaissance Patrol"
        recs.append({
            "id": "REC-1",
            "title": f"Deploy {target_team} to {location_name}",
            "description": f"Conduct perimeter sweep and immediate triage for {max(1, people_count)} identified potential victims.",
            "assigned_team": target_team,
            "priority": "Critical" if people_count > 0 else severity_level,
            "checked": True,
            "icon": "Users",
        })

        # Disaster-Specific Directive 2
        d_lower = disaster_type.lower()
        if "flood" in d_lower or "tsunami" in d_lower:
            recs.append({
                "id": "REC-2",
                "title": "Deploy Zodiac Inflatable Boats & Water Rescue Squad",
                "description": "Establish shallow-water extraction routes and deploy personal flotation devices (PFDs) to stranded occupants.",
                "assigned_team": "Bravo Marine Rescue",
                "priority": "Critical",
                "checked": True,
                "icon": "Anchor",
            })
        elif "fire" in d_lower or "industrial" in d_lower:
            recs.append({
                "id": "REC-2",
                "title": "Establish Thermal Perimeter & Chemical Containment Barrier",
                "description": "Deploy foam suppressant monitors, enforce 500m upwind safety perimeter, and monitor air toxicity index.",
                "assigned_team": "Hazardous Materials Unit",
                "priority": "Critical",
                "checked": True,
                "icon": "Flame",
            })
        elif "earthquake" in d_lower or "collapse" in d_lower:
            recs.append({
                "id": "REC-2",
                "title": "Mobilize Heavy Hydraulic Shoring & Acoustic Void Detectors",
                "description": "Stabilize unstable load-bearing masonry and insert seismic microphones to detect survivors trapped under rubble.",
                "assigned_team": "Delta USAR Heavy Team",
                "priority": "Critical",
                "checked": True,
                "icon": "Building",
            })
        elif "landslide" in d_lower:
            recs.append({
                "id": "REC-2",
                "title": "Deploy Earthmoving Equipment & Slope Inclinometer Sensors",
                "description": "Clear blocked evacuation arteries and continuously monitor soil shear stresses for secondary mudflows.",
                "assigned_team": "Bravo Heavy Logistics",
                "priority": "High",
                "checked": True,
                "icon": "Construction",
            })
        else:
            recs.append({
                "id": "REC-2",
                "title": "Deploy Tactical Mobile Incident Command Post (ICP)",
                "description": "Establish satellite communications uplink and coordinate inter-agency tactical radio channels.",
                "assigned_team": "Bravo Logistics Squad",
                "priority": "High",
                "checked": True,
                "icon": "Radio",
            })

        # Directive 3: Medical / Triage
        recs.append({
            "id": "REC-3",
            "title": "Establish Advance Medical Triage Post (Level 2)",
            "description": "Position mobile trauma kits, oxygen concentrators, and prepare emergency casualty evacuation (CASEVAC).",
            "assigned_team": "Charlie Medical Corps",
            "priority": "High",
            "checked": True,
            "icon": "HeartPulse",
        })

        # Directive 4: Public Warning & Evacuation
        recs.append({
            "id": "REC-4",
            "title": "Broadcast Local Sector Evacuation Alert",
            "description": f"Trigger emergency cell broadcast warning residents within 1.5km radius of {location_name} to seek high ground / shelter.",
            "assigned_team": "Command Communications",
            "priority": "Medium",
            "checked": is_critical,
            "icon": "Megaphone",
        })

        # Directive 5: Weather Grounding Directive
        wind = weather.get("wind_speed_kmh", 0)
        rain = weather.get("precipitation_mm", 0)
        recs.append({
            "id": "REC-5",
            "title": f"Telemetry Watch: Monitor Winds ({wind} km/h) & Rain ({rain} mm)",
            "description": "Maintain continuous meteorological tracking via Open-Meteo to detect sudden adverse atmospheric changes affecting drone/air support.",
            "assigned_team": "Telemetry & GIS Unit",
            "priority": "Low",
            "checked": True,
            "icon": "CloudRain",
        })

        return recs

guided_workflow_service = GuidedWorkflowService()
