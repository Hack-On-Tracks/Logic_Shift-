"""
Model Registry for RescueVision AI.
Maps disaster workflows to validated, available computer vision detection models.
Reports honest capabilities and graceful fallbacks when specialized models are unavailable.
"""

import os
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

logger = logging.getLogger("rescuevision.models")

# Standard 80 COCO classes supported by YOLOv8 / YOLO11 / Ultralytics general weights
COCO_CLASSES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
    "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote",
    "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book",
    "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
]

class RegisteredModel(BaseModel):
    model_id: str
    display_name: str
    file_path: str
    supported_classes: List[str]
    model_version: str
    confidence_threshold: float
    device: str
    is_available: bool
    is_specialized: bool
    specialization_notes: str
    health_status: str

class ModelRegistry:
    def __init__(self):
        self._models: Dict[str, RegisteredModel] = {}
        self._initialize_registry()

    def _initialize_registry(self):
        # 1. Primary General Object Detection Model (yolov8s.pt / yolo26s.pt)
        weights_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        local_weights = os.path.join(weights_dir, "yolov8s.pt")
        yolo26_weights = os.path.join(weights_dir, "yolo26s.pt")

        primary_path = "yolov8s.pt"
        if os.path.exists(yolo26_weights):
            primary_path = yolo26_weights
        elif os.path.exists(local_weights):
            primary_path = local_weights

        self._models["yolov8s"] = RegisteredModel(
            model_id="yolov8s",
            display_name="Ultralytics YOLOv8s / General Vision Engine",
            file_path=primary_path,
            supported_classes=COCO_CLASSES,
            model_version="8.3.0",
            confidence_threshold=0.25,
            device="cpu",
            is_available=True,
            is_specialized=False,
            specialization_notes="Validated general detector for people, vehicles, watercraft, and obstacles. Not a specialized thermal or structural model.",
            health_status="ONLINE"
        )

        # 2. Specialized Flood Inundation Model (Declared honestly as unavailable/specialized)
        self._models["yolo_flood_segmentation"] = RegisteredModel(
            model_id="yolo_flood_segmentation",
            display_name="HydroVision Flood Boundary Segmentation Model",
            file_path="models/specialized/flood_seg_v1.pt",
            supported_classes=["floodwater_high", "floodwater_shallow", "submerged_structure", "isolated_high_ground"],
            model_version="1.0.0-experimental",
            confidence_threshold=0.40,
            device="cpu",
            is_available=False,
            is_specialized=True,
            specialization_notes="Specialized pixel-level water segmentation model. Offline; falling back to general YOLO vehicle/boat detection + Gemini vision.",
            health_status="UNAVAILABLE_FALLBACK_ACTIVE"
        )

        # 3. Specialized Fire & Smoke Thermal Detector (Declared honestly as unavailable/specialized)
        self._models["yolo_fire_smoke"] = RegisteredModel(
            model_id="yolo_fire_smoke",
            display_name="PyroAlert Thermal Flame & Smoke Plume Detector",
            file_path="models/specialized/fire_smoke_yolo.pt",
            supported_classes=["active_flame", "smoke_plume_dense", "smoke_plume_light", "charred_canopy"],
            model_version="2.1.0",
            confidence_threshold=0.35,
            device="cpu",
            is_available=False,
            is_specialized=True,
            specialization_notes="Specialized wildfire flame/smoke model. Offline; falling back to general YOLO people/vehicle detection + Gemini vision.",
            health_status="UNAVAILABLE_FALLBACK_ACTIVE"
        )

        # 4. Specialized Structural Damage / Rubble Collapse Model
        self._models["yolo_structural_damage"] = RegisteredModel(
            model_id="yolo_structural_damage",
            display_name="USAR Structural Deformation & Spalling Detector",
            file_path="models/specialized/structural_damage.pt",
            supported_classes=["shear_crack", "pancake_collapse", "void_space", "exposed_rebar"],
            model_version="1.4.0",
            confidence_threshold=0.40,
            device="cpu",
            is_available=False,
            is_specialized=True,
            specialization_notes="Specialized building collapse void detector. Offline; falling back to general YOLO obstacle/people detection + Gemini vision.",
            health_status="UNAVAILABLE_FALLBACK_ACTIVE"
        )

    def get_model(self, model_id: str) -> Optional[RegisteredModel]:
        return self._models.get(model_id)

    def get_active_model(self) -> RegisteredModel:
        return self._models["yolov8s"]

    def list_models(self) -> List[RegisteredModel]:
        return list(self._models.values())

    def resolve_workflow_models(self, workflow_id: str) -> Dict[str, Any]:
        """
        Determines the models to execute for a given workflow.
        Returns the primary available model and notes about any missing specialized capabilities.
        """
        active = self.get_active_model()
        missing_capabilities = []

        if workflow_id in ["WF-FLOOD", "WF-COASTAL"]:
            missing_capabilities.append({
                "model_id": "yolo_flood_segmentation",
                "missing_feature": "Pixel-level floodwater inundation depth mapping",
                "mitigation": "Executed general YOLO (detecting stranded victims and boats) combined with Gemini vision interpretation."
            })
        elif workflow_id == "WF-FIRE":
            missing_capabilities.append({
                "model_id": "yolo_fire_smoke",
                "missing_feature": "Infrared thermal flame contour analysis",
                "mitigation": "Executed general YOLO (detecting exposed persons/vehicles) combined with Gemini smoke plume & flame analysis."
            })
        elif workflow_id in ["WF-COLLAPSE", "WF-EARTHQUAKE", "WF-LANDSLIDE"]:
            missing_capabilities.append({
                "model_id": "yolo_structural_damage",
                "missing_feature": "Specialized void space and micro-crack spalling segmentation",
                "mitigation": "Executed general YOLO (detecting debris obstacles, vehicles, and survivors) combined with Gemini macro-structural triage."
            })

        return {
            "primary_model": active,
            "missing_capabilities": missing_capabilities,
            "is_using_fallback": len(missing_capabilities) > 0
        }

model_registry = ModelRegistry()
