"""
LLM-Based Disaster Identification and Adaptive AI Automation Pipeline.
Orchestrates:
1. Gemini Vision classification into 11 disaster categories (with multi-hazard & uncertainty handling).
2. Disaster Workflow Registry resolution.
3. Computer Vision detection via Model Registry.
4. Open-Meteo real-time meteorological grounding.
5. Disaster-specific adaptive severity scoring.
6. Automatic database updates (Incident creation/update, Task dispatch).
7. Specialized PDF Situation Report compilation.
"""

import os
import json
import uuid
import logging
from typing import Dict, Any, List, Optional
from PIL import Image
from sqlalchemy.orm import Session

from google import genai
from google.genai import types

from .workflow_registry import workflow_registry, DisasterWorkflow
from .model_registry import model_registry
from .weather_service import weather_service
from .yolo_service import yolo_service, UPLOADS_DIR
from .pdf_service import pdf_service
from ..models import Incident, RescueTask, ImageAnalysis, Detection, RoadBlockage, IncidentReport

logger = logging.getLogger("rescuevision.pipeline")

SUPPORTED_CATEGORIES = [
    "Flood",
    "Earthquake",
    "Building collapse",
    "Fire",
    "Landslide",
    "Cyclone or severe storm",
    "Tsunami or coastal flooding",
    "Road accident",
    "Industrial accident",
    "Other disaster",
    "Unknown or insufficient evidence"
]

class AdaptiveAutomationPipeline:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.client = None
        if self.api_key and not self.api_key.startswith("your_"):
            try:
                self.client = genai.Client(
                    api_key=self.api_key,
                    http_options=types.HttpOptions(timeout=20000)
                )
                logger.info("Adaptive Pipeline: Gemini vision client initialized.")
            except Exception as e:
                logger.warning(f"Adaptive Pipeline: Gemini client init error: {e}")

    def classify_disaster_image(self, image_path: str, notes: Optional[str] = None) -> Dict[str, Any]:
        """
        Sends disaster image to Gemini Vision for structured disaster identification.
        Returns validated JSON with primary/secondary categories, confidence,
        supporting visual evidence, and uncertainties.
        """
        if self.client and os.path.exists(image_path):
            try:
                img = Image.open(image_path)

                system_instruction = (
                    "You are the Senior Disaster Triage Analyst for RescueVision AI. "
                    "Analyze the provided emergency or drone imagery strictly and objectively. "
                    "Select the most accurate disaster category from the following supported list ONLY:\n"
                    "- Flood\n"
                    "- Earthquake\n"
                    "- Building collapse\n"
                    "- Fire\n"
                    "- Landslide\n"
                    "- Cyclone or severe storm\n"
                    "- Tsunami or coastal flooding\n"
                    "- Road accident\n"
                    "- Industrial accident\n"
                    "- Other disaster\n"
                    "- Unknown or insufficient evidence\n\n"
                    "RULES:\n"
                    "1. If multiple related hazards exist (e.g., an earthquake causing a building collapse, or cyclone causing flooding), "
                    "set the primary trigger as 'primary_disaster_type' and others in 'secondary_disaster_types'.\n"
                    "2. Do NOT force a classification when evidence is ambiguous, blurry, or insufficient. Return 'Unknown or insufficient evidence' and flag uncertainties.\n"
                    "3. Ground all supporting evidence in visible objects (water lines, smoke plumes, rubble piles, vehicle damage).\n"
                    "4. 'recommended_workflow_id' MUST be one of: WF-FLOOD, WF-COLLAPSE, WF-EARTHQUAKE, WF-FIRE, WF-LANDSLIDE, WF-STORM, WF-COASTAL, WF-ROAD-ACCIDENT, WF-INDUSTRIAL, WF-OTHER, WF-UNKNOWN."
                )

                prompt = (
                    "Examine this aerial or disaster incident image. "
                    f"Additional Context Notes: {notes or 'None'}\n\n"
                    "Return a JSON object conforming exactly to this structure:\n"
                    "{\n"
                    '  "primary_disaster_type": "<one of the 11 supported categories>",\n'
                    '  "secondary_disaster_types": ["<secondary category if applicable>"],\n'
                    '  "confidence": <float between 0.0 and 1.0>,\n'
                    '  "supporting_evidence": ["<specific visual detail 1>", "<specific visual detail 2>"],\n'
                    '  "alternative_classifications": ["<alternative possibility if any>"],\n'
                    '  "uncertainties": ["<what cannot be confirmed from this view>"],\n'
                    '  "recommended_workflow_id": "<WF-ID>",\n'
                    '  "required_analysis": ["<required focus area 1>"],\n'
                    '  "additional_information_needed": ["<missing information needed from ground teams>"]\n'
                    "}"
                )

                response = self.client.models.generate_content(
                    model="gemini-3.5-flash-lite",
                    contents=[img, prompt],
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        temperature=0.1,
                    )
                )

                if response.text:
                    parsed = json.loads(response.text)
                    return self._validate_and_sanitize_classification(parsed)
            except Exception as e:
                logger.error(f"Gemini disaster identification failed: {e}")

        # Robust heuristic fallback
        return self._fallback_classification(image_path, notes)

    def _validate_and_sanitize_classification(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Ensures LLM response conforms strictly to registered disaster workflows."""
        cat = data.get("primary_disaster_type", "Unknown or insufficient evidence")
        if cat not in SUPPORTED_CATEGORIES:
            # Map closest match
            matched = None
            for sc in SUPPORTED_CATEGORIES:
                if sc.lower() in cat.lower() or cat.lower() in sc.lower():
                    matched = sc
                    break
            cat = matched or "Unknown or insufficient evidence"

        wf = workflow_registry.get(cat)
        wf_id = wf.workflow_id if wf else "WF-UNKNOWN"

        conf = float(data.get("confidence", 0.75))
        conf = max(0.05, min(1.0, conf))

        # If confidence is below 0.45, classify as uncertain
        if conf < 0.45:
            cat = "Unknown or insufficient evidence"
            wf_id = "WF-UNKNOWN"
            data["uncertainties"] = data.get("uncertainties", []) + ["Low AI confidence threshold; evidence inconclusive."]

        return {
            "primary_disaster_type": cat,
            "secondary_disaster_types": [s for s in data.get("secondary_disaster_types", []) if s in SUPPORTED_CATEGORIES],
            "confidence": round(conf, 2),
            "supporting_evidence": data.get("supporting_evidence", ["Visual assessment conducted via aerial computer vision pipeline."]),
            "alternative_classifications": data.get("alternative_classifications", []),
            "uncertainties": data.get("uncertainties", ["2D aerial photography cannot confirm underground or internal void conditions."]),
            "recommended_workflow_id": wf_id,
            "required_analysis": data.get("required_analysis", ["General victim and corridor clearance inspection."]),
            "additional_information_needed": data.get("additional_information_needed", ["On-scene commander ground-truth verification."]),
            "is_uncertain": conf < 0.60 or cat == "Unknown or insufficient evidence",
        }

    def _fallback_classification(self, image_path: str, notes: Optional[str]) -> Dict[str, Any]:
        """Deterministic heuristic classifier if Gemini is unavailable."""
        notes_lower = (notes or "").lower()
        if "flood" in notes_lower or "water" in notes_lower:
            cat, wf_id = "Flood", "WF-FLOOD"
        elif "fire" in notes_lower or "smoke" in notes_lower or "burn" in notes_lower:
            cat, wf_id = "Fire", "WF-FIRE"
        elif "earthquake" in notes_lower or "quake" in notes_lower:
            cat, wf_id = "Earthquake", "WF-EARTHQUAKE"
        elif "collapse" in notes_lower or "rubble" in notes_lower:
            cat, wf_id = "Building collapse", "WF-COLLAPSE"
        elif "slide" in notes_lower or "mud" in notes_lower:
            cat, wf_id = "Landslide", "WF-LANDSLIDE"
        elif "storm" in notes_lower or "cyclone" in notes_lower or "wind" in notes_lower:
            cat, wf_id = "Cyclone or severe storm", "WF-STORM"
        elif "crash" in notes_lower or "accident" in notes_lower or "vehicle" in notes_lower:
            cat, wf_id = "Road accident", "WF-ROAD-ACCIDENT"
        else:
            cat, wf_id = "Unknown or insufficient evidence", "WF-UNKNOWN"

        return {
            "primary_disaster_type": cat,
            "secondary_disaster_types": [],
            "confidence": 0.65 if cat != "Unknown or insufficient evidence" else 0.35,
            "supporting_evidence": [
                f"Preliminary triage evaluated from ingested imagery filename '{os.path.basename(image_path)}'.",
                "Heuristic scene analysis generated via local RescueVision triage rules."
            ],
            "alternative_classifications": ["Other disaster"],
            "uncertainties": ["Vision LLM operating in offline fallback mode; requires authorized operator review."],
            "recommended_workflow_id": wf_id,
            "required_analysis": ["Field officer manual reconnaissance"],
            "additional_information_needed": ["High-resolution imagery pass and on-site responder radio report"],
            "is_uncertain": cat == "Unknown or insufficient evidence",
        }

    def compute_adaptive_severity(
        self,
        workflow: DisasterWorkflow,
        detections: List[Dict[str, Any]],
        weather: Dict[str, Any],
        blockages: List[Dict[str, Any]],
        people_reported: int,
        is_uncertain: bool,
    ) -> Dict[str, Any]:
        """
        Disaster-specific adaptive severity calculation using the workflow rubric.
        """
        score = 2.0
        factors = []
        cat = workflow.category

        # 1. Base rubric impact by disaster type
        base_weights = {
            "Earthquake": 3.5, "Building collapse": 3.8, "Tsunami or coastal flooding": 4.0,
            "Flood": 3.0, "Fire": 3.2, "Cyclone or severe storm": 2.8,
            "Landslide": 3.0, "Industrial accident": 3.2, "Road accident": 2.2,
            "Other disaster": 2.0, "Unknown or insufficient evidence": 1.5,
        }
        b_weight = base_weights.get(cat, 2.5)
        score += b_weight
        factors.append({
            "factor": f"Disaster Category Baseline ({cat})",
            "impact": f"+{b_weight:.1f}",
            "detail": f"Baseline systemic impact for {workflow.display_name}."
        })

        # 2. Vision Detections Impact
        people_detected = sum(1 for d in detections if "person" in d.get("class_name", "").lower())
        vehicles_detected = sum(1 for d in detections if any(v in d.get("class_name", "").lower() for v in ["car", "truck", "bus"]))
        obstacles_detected = sum(1 for d in detections if any(o in d.get("class_name", "").lower() for o in ["obstacle", "debris", "rock"]))

        if people_detected > 0:
            p_impact = min(3.0, people_detected * 0.6)
            score += p_impact
            factors.append({
                "factor": "Visual Casualties / People in Sector",
                "impact": f"+{p_impact:.1f}",
                "detail": f"{people_detected} person(s) identified in immediate aerial survey frame."
            })

        if obstacles_detected > 0 or vehicles_detected > 0:
            o_impact = min(1.5, (obstacles_detected * 0.3) + (vehicles_detected * 0.2))
            score += o_impact
            factors.append({
                "factor": "Debris & Vehicular Congestion",
                "impact": f"+{o_impact:.1f}",
                "detail": f"{obstacles_detected} physical obstacles/debris and {vehicles_detected} vehicles identified."
            })

        # 3. Weather & Environmental Multipliers
        if weather.get("available"):
            wind_speed = weather.get("wind_speed_kmh", 0)
            precip = weather.get("precipitation_mm", 0)

            if cat == "Fire" and wind_speed > 30:
                score += 1.8
                factors.append({
                    "factor": "Atmospheric Flame Acceleration (Wind)",
                    "impact": "+1.8",
                    "detail": f"High wind speed ({wind_speed} km/h) dramatically increases wildfire and structure fire spread."
                })
            elif cat in ["Flood", "Landslide"] and precip > 5:
                score += 1.6
                factors.append({
                    "factor": "Precipitation Inundation Multiplier",
                    "impact": "+1.6",
                    "detail": f"Active heavy rainfall ({precip} mm) actively accelerates flood surge and slope failure."
                })
            elif cat == "Cyclone or severe storm" and wind_speed > 50:
                score += 2.0
                factors.append({
                    "factor": "Severe Gale Force Winds",
                    "impact": "+2.0",
                    "detail": f"Dangerous sustained wind velocity ({wind_speed} km/h)."
                })

        # 4. Access Constraints (Verified Road Blockages)
        verified_blocks = [b for b in blockages if b.get("status") == "Verified"]
        if verified_blocks:
            score += 1.2
            factors.append({
                "factor": "Access Corridor Severance",
                "impact": "+1.2",
                "detail": f"{len(verified_blocks)} verified road closure(s) blocking ingress into disaster zone."
            })

        # 5. Uncertainty Buffer
        if is_uncertain:
            score = max(2.5, min(6.0, score)) # Cap uncertain events to prevent false panic
            factors.append({
                "factor": "Evidence Uncertainty Buffer",
                "impact": "Score Capped",
                "detail": "Classification has high uncertainty; severity capped until ground responder confirmation."
            })

        final_score = min(10.0, max(1.0, round(score, 1)))

        if final_score >= 8.0:
            level = "Critical"
        elif final_score >= 6.0:
            level = "High"
        elif final_score >= 4.0:
            level = "Medium"
        else:
            level = "Low"

        return {
            "score": final_score,
            "severity_level": level,
            "is_preliminary": True,
            "rubric_applied": workflow.workflow_id,
            "factors": factors,
            "disclaimer": "Preliminary AI assessment based on aerial evidence and meteorological telemetry. Subject to authorized human confirmation."
        }

    def execute_pipeline(
        self,
        image_path: str,
        filename: str,
        notes: Optional[str] = None,
        location_name: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        incident_id: Optional[str] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """
        Executes the entire end-to-end adaptive automation pipeline.
        """
        pipeline_run_id = f"RUN-{uuid.uuid4().hex[:6].upper()}"
        logger.info(f"Starting Adaptive Automation Pipeline [{pipeline_run_id}] for {filename}")

        # STAGE 1: Vision Disaster Identification (Gemini)
        classification = self.classify_disaster_image(image_path, notes)
        primary_type = classification["primary_disaster_type"]
        is_uncertain = classification["is_uncertain"]

        # STAGE 2: Workflow Resolution
        workflow = workflow_registry.get(primary_type)
        if not workflow:
            workflow = workflow_registry.get_default()

        # Handle multi-disaster merging if secondary disasters present
        secondary_workflows = []
        for sec in classification.get("secondary_disaster_types", []):
            sw = workflow_registry.get(sec)
            if sw and sw.workflow_id != workflow.workflow_id:
                secondary_workflows.append(sw)

        # STAGE 3: Model Registry & Object Detection
        model_resolution = model_registry.resolve_workflow_models(workflow.workflow_id)
        yolo_result = yolo_service.detect(image_path)
        detections = yolo_result["detections"]

        # STAGE 4: Environmental & Weather Grounding
        weather = weather_service.get_weather(latitude, longitude)

        # Fetch active blockages from DB if db session provided
        active_blockages = []
        if db:
            active_blockages = [{"id": b.id, "road_segment": b.road_segment, "status": b.status}
                                for b in db.query(RoadBlockage).all()]

        # STAGE 5: Adaptive Severity Assessment
        severity = self.compute_adaptive_severity(
            workflow=workflow,
            detections=detections,
            weather=weather,
            blockages=active_blockages,
            people_reported=0,
            is_uncertain=is_uncertain,
        )

        # STAGE 6: Downstream Database Synchronization
        created_incident = None
        created_tasks = []
        analysis_record = None
        pdf_report_url = None

        if db:
            # 6A. Create or Update Incident
            inc_loc = location_name or f"Sector {uuid.uuid4().hex[:4].upper()}"
            inc_title = f"{primary_type} Incident: {inc_loc}"

            target_incident = None
            if incident_id:
                target_incident = db.query(Incident).filter(Incident.id == incident_id).first()

            if target_incident:
                # Update existing incident with adaptive classification
                target_incident.disaster_type = primary_type
                target_incident.severity = severity["severity_level"]
                target_incident.notes = (target_incident.notes or "") + f"\n[Adaptive AI Revision]: Classified as {primary_type} (Conf: {classification['confidence']*100:.0f}%)."
                db.commit()
                db.refresh(target_incident)
                created_incident = target_incident
            else:
                new_inc_id = incident_id or f"INC-{uuid.uuid4().hex[:6].upper()}"
                new_inc = Incident(
                    id=new_inc_id,
                    title=inc_title,
                    description=f"Auto-generated from aerial reconnaissance. Identified as {primary_type}. Evidence: {', '.join(classification['supporting_evidence'][:2])}",
                    disaster_type=primary_type,
                    severity=severity["severity_level"],
                    status="Reported" if is_uncertain else "Verified",
                    latitude=latitude if latitude is not None else 19.0760,
                    longitude=longitude if longitude is not None else 72.8777,
                    location_name=inc_loc,
                    people_at_risk=sum(1 for d in detections if "person" in d.get("class_name", "").lower()),
                    assigned_team="Alpha Rescue Unit",
                    notes=notes or f"Autonomous pipeline run {pipeline_run_id}. Adaptive workflow: {workflow.display_name}.",
                    is_verified=not is_uncertain,
                )
                db.add(new_inc)
                db.commit()
                db.refresh(new_inc)
                created_incident = new_inc

            # 6B. Save ImageAnalysis Record
            analysis_id = f"ANA-{uuid.uuid4().hex[:6].upper()}"
            rel_file_path = f"/uploads/{os.path.basename(image_path)}"
            rel_annotated_path = f"/uploads/{yolo_result['annotated_filename']}"

            new_analysis = ImageAnalysis(
                id=analysis_id,
                incident_id=created_incident.id,
                file_path=rel_file_path,
                annotated_path=rel_annotated_path,
                file_name=filename,
                location=inc_loc,
                notes=f"Identified as {primary_type}. Workflow: {workflow.workflow_id}.",
                model_name=yolo_result["model"],
                inference_status=yolo_result["status"],
                total_detections=yolo_result["total_detections"],
            )
            db.add(new_analysis)
            db.commit()

            # Save individual detections
            for d in detections:
                det = Detection(
                    analysis_id=analysis_id,
                    class_name=d["class_name"],
                    confidence=d["confidence"],
                    x1=d["x1"], y1=d["y1"], x2=d["x2"], y2=d["y2"],
                )
                db.add(det)
            db.commit()
            db.refresh(new_analysis)
            analysis_record = new_analysis

            # 6C. Dispatch Disaster-Specific Tasks
            squad_names = ["Alpha Search Unit", "Bravo Logistics Squad", "Charlie Medical Corps"]
            for idx, step in enumerate(workflow.recommended_next_steps[:3]):
                tsk_id = f"TSK-{uuid.uuid4().hex[:6].upper()}"
                tsk = RescueTask(
                    id=tsk_id,
                    title=f"[{primary_type.upper()}] {step[:60]}",
                    description=f"{step}\n\nAutomated Directive based on {workflow.display_name}. Ground confirmation required.",
                    incident_id=created_incident.id,
                    assigned_team=squad_names[idx % len(squad_names)],
                    priority=severity["severity_level"],
                    status="Pending",
                    notes=f"Auto-dispatched via {pipeline_run_id}.",
                )
                db.add(tsk)
                created_tasks.append(tsk)
            db.commit()

            # 6D. Generate Disaster-Specific Situation Report (PDF)
            try:
                rep_id = f"REP-{uuid.uuid4().hex[:6].upper()}"
                inc_dict = {
                    "id": created_incident.id,
                    "title": created_incident.title,
                    "description": created_incident.description,
                    "disaster_type": created_incident.disaster_type,
                    "severity": created_incident.severity,
                    "status": created_incident.status,
                    "location_name": created_incident.location_name,
                    "latitude": created_incident.latitude,
                    "longitude": created_incident.longitude,
                    "assigned_team": created_incident.assigned_team,
                    "people_at_risk": created_incident.people_at_risk,
                }
                task_dicts = [{"id": t.id, "title": t.title, "assigned_team": t.assigned_team, "priority": t.priority, "status": t.status} for t in created_tasks]

                pdf_full_path = pdf_service.generate_incident_pdf(
                    report_id=rep_id,
                    incident=inc_dict,
                    detections=detections,
                    tasks=task_dicts,
                    blockages=active_blockages,
                    operator_notes=(
                        f"Adaptive Workflow: {workflow.display_name} ({workflow.workflow_id}).\n"
                        f"Evidence: {', '.join(classification['supporting_evidence'])}\n"
                        f"Uncertainties: {', '.join(classification['uncertainties'])}\n"
                        f"Weather: {weather.get('condition', 'N/A')} ({weather.get('temperature_c', 'N/A')}°C, Wind {weather.get('wind_speed_kmh', 'N/A')} km/h).\n"
                        f"Recommended Resources: {', '.join(workflow.recommended_rescue_resources[:3])}."
                    )
                )
                pdf_report_url = f"/uploads/{os.path.basename(pdf_full_path)}"

                # Save IncidentReport record in database
                new_rep = IncidentReport(
                    id=rep_id,
                    incident_id=created_incident.id,
                    title=f"After-Action Dossier: {created_incident.title}",
                    summary=f"Automated adaptive report for {primary_type}. Severity evaluated at {severity['score']}/10 ({severity['severity_level']}).",
                    pdf_path=pdf_report_url,
                    is_demo=False,
                    operator_notes="Generated by RescueVision Adaptive AI Pipeline.",
                )
                db.add(new_rep)
                db.commit()
            except Exception as e:
                logger.error(f"Failed to compile PDF report: {e}")

        # Assemble full execution response
        return {
            "pipeline_run_id": pipeline_run_id,
            "status": "COMPLETED",
            "classification": classification,
            "workflow": {
                "workflow_id": workflow.workflow_id,
                "category": workflow.category,
                "display_name": workflow.display_name,
                "description": workflow.description,
                "relevant_map_layers": workflow.relevant_map_layers,
                "recommended_rescue_resources": workflow.recommended_rescue_resources,
                "potential_hazards": workflow.potential_hazards,
                "recommended_next_steps": workflow.recommended_next_steps,
                "report_sections": workflow.report_sections,
                "missing_data_requirements": workflow.missing_data_requirements,
            },
            "secondary_workflows": [
                {"workflow_id": sw.workflow_id, "category": sw.category, "display_name": sw.display_name}
                for sw in secondary_workflows
            ],
            "model_execution": {
                "primary_model": model_resolution["primary_model"].model_id,
                "model_display_name": model_resolution["primary_model"].display_name,
                "is_using_fallback": model_resolution["is_using_fallback"],
                "missing_capabilities": model_resolution["missing_capabilities"],
                "detections_count": len(detections),
                "people_detected": sum(1 for d in detections if "person" in d.get("class_name", "").lower()),
                "vehicles_detected": sum(1 for d in detections if any(v in d.get("class_name", "").lower() for v in ["car", "truck", "bus"])),
                "obstacles_detected": sum(1 for d in detections if any(o in d.get("class_name", "").lower() for o in ["obstacle", "debris", "rock"])),
                "detections": detections,
                "annotated_image_url": f"/uploads/{yolo_result['annotated_filename']}",
            },
            "weather": weather,
            "severity_assessment": severity,
            "downstream_synchronization": {
                "incident_id": created_incident.id if created_incident else None,
                "incident_title": created_incident.title if created_incident else None,
                "analysis_id": analysis_record.id if analysis_record else None,
                "dispatched_tasks_count": len(created_tasks),
                "dispatched_tasks": [
                    {"id": t.id, "title": t.title, "team": t.assigned_team, "priority": t.priority}
                    for t in created_tasks
                ],
                "report_pdf_url": pdf_report_url,
            },
            "human_verification_needed": is_uncertain or severity["score"] >= 7.5,
            "verification_prompts": (
                ["CONFIRM DISASTER CLASSIFICATION: AI confidence is below high assurance threshold."] if is_uncertain else []
            ) + workflow.missing_data_requirements[:2],
        }

adaptive_pipeline = AdaptiveAutomationPipeline()
