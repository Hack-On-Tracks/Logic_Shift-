import os
import logging
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

logger = logging.getLogger("rescuevision.gemini")

class GeminiAssistantService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.client = None
        if self.api_key and not self.api_key.startswith("your_"):
            try:
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Google Gemini API client initialized successfully.")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini client: {e}")

    def is_available(self) -> bool:
        return self.client is not None

    def chat_with_assistant(
        self,
        message: str,
        incident_context: Optional[Dict[str, Any]] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Disaster response tactical AI assistant.
        Provides grounded advice, identifies missing information, and suggests actions.
        """
        system_instruction = (
            "You are the Tactical AI Rescue Assistant for RescueVision AI (LIVE TRACK by Logic Shift). "
            "You provide real-time, grounded advice for emergency response operators and dispatch commanders. "
            "CRITICAL RULES:\n"
            "1. Ground all situational facts strictly in the provided incident context.\n"
            "2. Distinguish confirmed facts from suggestions or hypotheses.\n"
            "3. Never fabricate victims, team coordinates, or road statuses.\n"
            "4. Highlight missing information that human operators must verify.\n"
            "5. Do NOT make final life-safety dispatch decisions autonomously; frame guidance as operator assistance.\n"
            "6. Keep replies concise, authoritative, and formatted in clear tactical bullet points where appropriate."
        )

        context_str = ""
        if incident_context:
            context_str = f"\nACTIVE INCIDENT CONTEXT:\n{incident_context}\n"

        prompt = f"{context_str}\nOPERATOR INQUIRY: {message}"

        if self.client:
            try:
                response = self.client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.2,
                    )
                )
                text = response.text or "No response generated."
                return {
                    "reply": text,
                    "suggested_actions": [
                        "Verify current sector aerial imagery",
                        "Confirm road blockage status on tactical map",
                        "Audit team GPS telemetry and battery status",
                    ],
                    "grounded_facts": [
                        f"Incident Target: {incident_context.get('title', 'General Triage') if incident_context else 'None'}",
                        f"Reported Type: {incident_context.get('disaster_type', 'N/A') if incident_context else 'N/A'}",
                    ]
                }
            except Exception as e:
                logger.error(f"Gemini API call failed: {e}")

        # Fallback heuristic response
        return self._generate_fallback_chat(message, incident_context)

    def calculate_criticality_score(
        self,
        incident: Dict[str, Any],
        detections: List[Dict[str, Any]],
        tasks: List[Dict[str, Any]],
        blockages: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Computes an explainable, multi-factor transparent criticality score from 0.0 to 10.0.
        Factors:
        - Baseline severity (0.5 to 4.0)
        - Casualties reported (+0.5 per 5 people, max 3.0)
        - AI detections (+0.3 per person detected, +0.2 per obstacle)
        - Access constraints / road blockages (+1.5 if verified blockage)
        - Open task backlog (+0.2 per open task, max 1.5)
        """
        score = 0.0
        factors = []

        # 1. Base Severity
        sev = incident.get("severity", "Medium")
        sev_map = {"Critical": 4.0, "High": 3.0, "Medium": 1.8, "Low": 0.8}
        sev_val = sev_map.get(sev, 1.5)
        score += sev_val
        factors.append({
            "factor": "Reported Severity Level",
            "weight": sev_val,
            "impact": f"+{sev_val:.1f}",
            "note": f"Initial severity registered as '{sev}'."
        })

        # 2. People at Risk
        people = incident.get("people_at_risk", 0)
        if people > 0:
            p_val = min(3.0, round((people / 5.0) * 0.5, 1))
            score += p_val
            factors.append({
                "factor": "Population at Risk",
                "weight": p_val,
                "impact": f"+{p_val:.1f}",
                "note": f"{people} individuals reported in danger sector."
            })
        else:
            factors.append({
                "factor": "Population at Risk",
                "weight": 0.5,
                "impact": "+0.5 (Uncertainty)",
                "note": "Exact casualty count unconfirmed; uncertainty buffer applied."
            })
            score += 0.5

        # 3. Vision Detections
        detected_people = sum(1 for d in detections if "person" in d.get("class_name", "").lower())
        detected_obstacles = sum(1 for d in detections if any(w in d.get("class_name", "").lower() for w in ["obstacle", "debris", "car"]))
        if detected_people > 0 or detected_obstacles > 0:
            det_val = min(2.0, (detected_people * 0.4) + (detected_obstacles * 0.2))
            score += det_val
            factors.append({
                "factor": "Aerial Vision Detections",
                "weight": det_val,
                "impact": f"+{det_val:.1f}",
                "note": f"{detected_people} persons and {detected_obstacles} vehicles/obstacles detected in aerial reconnaissance."
            })

        # 4. Road Blockages
        verified_blocks = [b for b in blockages if b.get("status") == "Verified"]
        if verified_blocks:
            score += 1.5
            factors.append({
                "factor": "Access Constraints",
                "weight": 1.5,
                "impact": "+1.5",
                "note": f"{len(verified_blocks)} verified road closure(s) impedes rescue response."
            })

        # 5. Task Backlog
        open_tasks = [t for t in tasks if t.get("status") in ["Pending", "In Progress"]]
        if open_tasks:
            t_val = min(1.0, len(open_tasks) * 0.2)
            score += t_val
            factors.append({
                "factor": "Operational Task Backlog",
                "weight": t_val,
                "impact": f"+{t_val:.1f}",
                "note": f"{len(open_tasks)} directives pending completion."
            })

        final_score = min(10.0, max(1.0, round(score, 1)))

        level = "CRITICAL" if final_score >= 8.0 else ("HIGH" if final_score >= 6.0 else ("MEDIUM" if final_score >= 3.5 else "LOW"))

        explanation = (
            f"Incident criticality is calculated at {final_score}/10 ({level}). "
            f"The primary driver is the reported {sev} severity combined with "
            f"{'verified road closures restricting access' if verified_blocks else 'open response directives requiring immediate squad deployment'}."
        )

        return {
            "incident_id": incident.get("id", ""),
            "score": final_score,
            "severity_level": level,
            "factors": factors,
            "explanation": explanation,
            "is_validated": False,
        }

    def _generate_fallback_chat(self, message: str, incident: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        inc_title = incident.get("title", "Selected Sector") if incident else "General Incident"
        return {
            "reply": (
                f"### Tactical Guidance // {inc_title}\n\n"
                f"- **Immediate Action**: Confirm field squad communication and inspect live GPS telemetry.\n"
                f"- **Aerial Reconnaissance**: Review drone passes for victim clusters and debris blockades.\n"
                f"- **Route Safeguard**: Verify that ingress corridors do not intersect confirmed road closures.\n"
                f"- **Notice**: AI advice is preliminary. Operational dispatch decisions require human commander authorization."
            ),
            "suggested_actions": [
                "Inspect high-resolution drone pass",
                "Review verified road blockages on map",
                "Update task status for Alpha Unit",
            ],
            "grounded_facts": [
                f"Target: {inc_title}",
                "System: RescueVision AI Local Mode",
            ]
        }

gemini_service = GeminiAssistantService()
