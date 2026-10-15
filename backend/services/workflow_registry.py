"""
Central Disaster Workflow Registry for RescueVision AI.
Defines disaster-specific workflows, models, severity rubrics, map layers,
rescue resource recommendations, hazards, and reporting requirements.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class DisasterWorkflow(BaseModel):
    workflow_id: str
    category: str
    display_name: str
    description: str
    relevant_yolo_models: List[str] = ["yolov8s"]
    supported_classes: List[str] = []
    visual_indicators: List[str] = []
    severity_criteria: Dict[str, Any] = {}
    weather_requirements: List[str] = []
    relevant_map_layers: List[str] = []
    recommended_rescue_resources: List[str] = []
    potential_hazards: List[str] = []
    recommended_next_steps: List[str] = []
    report_sections: List[str] = []
    missing_data_requirements: List[str] = []

class WorkflowRegistry:
    def __init__(self):
        self._workflows: Dict[str, DisasterWorkflow] = {}
        self._initialize_default_workflows()

    def register(self, workflow: DisasterWorkflow):
        self._workflows[workflow.workflow_id] = workflow
        # Also map category name lowercased for quick lookup
        self._workflows[workflow.category.lower()] = workflow

    def get(self, key: str) -> Optional[DisasterWorkflow]:
        if not key:
            return self.get_default()
        k = key.strip().lower()
        # Direct lookup by workflow_id or category
        if key in self._workflows:
            return self._workflows[key]
        if k in self._workflows:
            return self._workflows[k]
        # Partial match
        for w in self._workflows.values():
            if w.category.lower() in k or k in w.category.lower() or w.workflow_id.lower() == k:
                return w
        return self.get_default()

    def get_default(self) -> DisasterWorkflow:
        return self._workflows.get("WF-UNKNOWN") or self._workflows.get("unknown")

    def list_all(self) -> List[DisasterWorkflow]:
        # Return unique workflows by workflow_id
        seen = set()
        unique = []
        for w in self._workflows.values():
            if w.workflow_id not in seen:
                seen.add(w.workflow_id)
                unique.append(w)
        return unique

    def _initialize_default_workflows(self):
        # 1. Flood Workflow
        self.register(DisasterWorkflow(
            workflow_id="WF-FLOOD",
            category="Flood",
            display_name="Inundation & Aquatic Rescue Protocol",
            description="Automated response for flash floods, river overflows, and deep urban water inundation.",
            relevant_yolo_models=["yolov8s"],
            supported_classes=["person", "boat", "car", "truck", "bus"],
            visual_indicators=[
                "Visible brown or muddy floodwaters",
                "Submerged or stranded motor vehicles",
                "Water marks on building facades",
                "Individuals stranded on rooftops, balconies, or high ground",
                "Floating debris clusters and downed power lines near water"
            ],
            severity_criteria={
                "Critical": "Water levels exceeding building 1st floor; stranded individuals in moving current; multiple submerged vehicles.",
                "High": "Street-level flooding >1 meter; access roads completely submerged; vulnerable structures threatened.",
                "Medium": "Shallow street water (0.2 - 0.5m); vehicular traffic blocked; drainage overflow.",
                "Low": "Nuisance water pooling; road edges wet; minimal structural threat."
            },
            weather_requirements=["precipitation", "rain", "precipitation_probability", "river_discharge", "soil_moisture"],
            relevant_map_layers=["flood_inundation_zones", "drainage_basins", "aquatic_staging_areas", "submerged_roads"],
            recommended_rescue_resources=[
                "Swiftwater Rescue Teams (SRT)",
                "Motorized Inflatable Boats (MIB)",
                "High-Clearance Military/Rescue Trucks",
                "Helicopter Winch Extraction Squads",
                "Personal Floatation Devices (PFD) and Throw Bags"
            ],
            potential_hazards=[
                "Electrocution from downed utility power lines in water",
                "Hidden subsurface open manholes and storm drains",
                "Contaminated biohazard floodwaters and fuel slicks",
                "Hypothermia from prolonged water immersion",
                "Structural erosion of building foundations"
            ],
            recommended_next_steps=[
                "Deploy aerial thermal recon to locate isolated victims on rooftops.",
                "Coordinate with local utility dispatch to de-energize submerged power grids.",
                "Stage shallow-draft watercraft at designated boat ramp access corridors.",
                "Verify upstream dam discharge rates and rainfall totals."
            ],
            report_sections=[
                "Inundation Boundary & Depth Estimate",
                "Stranded Population & Rooftop Triage",
                "Access Corridor Submersion Audit",
                "Secondary Waterborne Hazard Assessment",
                "Evacuation & Boat Dispatch Plan"
            ],
            missing_data_requirements=[
                "Current river/gauge stage level readings",
                "Ground-truth water depth measurements along primary evacuation routes",
                "Status of electrical sub-station grid isolation"
            ]
        ))

        # 2. Earthquake & Building Collapse Workflow
        self.register(DisasterWorkflow(
            workflow_id="WF-COLLAPSE",
            category="Building collapse",
            display_name="Structural Collapse & USAR Extraction Protocol",
            description="Urban Search and Rescue (USAR) protocol for catastrophic building and infrastructure failures.",
            relevant_yolo_models=["yolov8s"],
            supported_classes=["person", "car", "truck", "obstacle"],
            visual_indicators=[
                "Pancake, V-shape, or lean-to structural collapse patterns",
                "Shattered concrete slabs, exposed rebar, and rubble mounds",
                "Cracked or deformed load-bearing columns and shear walls",
                "Crushed vehicles under collapsed masonry",
                "Plumes of pulverized concrete dust and shattered glass fields"
            ],
            severity_criteria={
                "Critical": "Multi-story residential/commercial total collapse; void spaces with trapped occupants suspected; active gas leak.",
                "High": "Partial collapse of structural bays; severe facade shearing; unstable debris hanging over accessways.",
                "Medium": "Non-structural masonry failure; interior partition collapse; building declared unsafe for entry.",
                "Low": "Minor plaster cracks; broken glazing; structural frame intact."
            },
            weather_requirements=["temperature", "wind_speed", "precipitation"],
            relevant_map_layers=["usar_structural_grids", "collapse_perimeters", "gas_shutoff_valves", "heavy_crane_staging"],
            recommended_rescue_resources=[
                "Certified Heavy Urban Search and Rescue (USAR) Task Force",
                "Canine Search Teams (Live Find & Human Remains Detection)",
                "Acoustic & Seismic Void Listening Devices",
                "Heavy Hydraulic Spreaders, Cutters, and Shoring Systems",
                "Emergency Structural Engineers (FEMA / INSARAG equivalent)"
            ],
            potential_hazards=[
                "Secondary progressive collapse and aftershocks",
                "Ruptured natural gas mains and explosive vapor pockets",
                "Asbestos and toxic crystalline silica dust inhalation",
                "Confined space asphyxiation and toxic sewer gas accumulation"
            ],
            recommended_next_steps=[
                "Establish a 1.5x building height collapse perimeter cordon immediately.",
                "Mandate silence periods for acoustic void detection sweeps.",
                "Isolate natural gas and municipal water feeds into the sector.",
                "Inspect surrounding structures for lean angles or foundation fissures."
            ],
            report_sections=[
                "Structural Damage Categorization & INSARAG Marking",
                "Void Space Survivability & Acoustic Recon",
                "Perimeter Shoring & Crane Placement Logistics",
                "Hazardous Utility Isolation Log",
                "USAR Squad Assignment Matrix"
            ],
            missing_data_requirements=[
                "Building architectural blueprints and occupant roll call",
                "Gas company confirmation of pipeline pressure drop",
                "Structural engineer safety sign-off before interior penetration"
            ]
        ))

        self.register(DisasterWorkflow(
            workflow_id="WF-EARTHQUAKE",
            category="Earthquake",
            display_name="Seismic Catastrophe & Multi-Structure Triage Protocol",
            description="Regional seismic event triage incorporating multi-structure collapse, ground ruptures, and utility failure.",
            relevant_yolo_models=["yolov8s"],
            supported_classes=["person", "car", "truck", "obstacle"],
            visual_indicators=[
                "Widespread surface fissuring and ground ruptures",
                "Buckled bridges, overpasses, and transit lines",
                "Multiple localized building structural failures",
                "Displaced utility poles and water main geysers",
                "Mass civilian displacement into open parks and roads"
            ],
            severity_criteria={
                "Critical": "Regional structural collapse; critical lifelines severed; aftershocks occurring with active casualties.",
                "High": "Multiple damaged buildings; transit bridges impassable; hospitals operating on generator backup.",
                "Medium": "Moderate structural cracking; chimneys collapsed; localized utility outages.",
                "Low": "Architectural surface damage; non-structural fixtures fallen."
            },
            weather_requirements=["temperature", "wind_speed", "precipitation"],
            relevant_map_layers=["seismic_epicenter_shake_map", "fault_traces", "liquefaction_susceptibility", "bridge_integrity_status"],
            recommended_rescue_resources=[
                "Multi-Agency Tactical USAR Battalions",
                "Mobile Field Hospital & Trauma Stabilization Units",
                "Satellite Communications Fly-away Kits (BGAN/Starlink)",
                "Heavy Earthmoving & Bridge Repair Equipment",
                "Airborne Forward Reconnaissance Drones"
            ],
            potential_hazards=[
                "Severe aftershocks destabilizing compromised masonry",
                "Liquefaction causing foundation sliding",
                "Conflagration fires ignited by severed electrical lines and broken gas pipes",
                "Disrupted hospital and water sanitation networks"
            ],
            recommended_next_steps=[
                "Activate Regional Emergency Operations Center (EOC).",
                "Conduct aerial road corridor reconnaissance for rapid route clearance.",
                "Prioritize search of critical public infrastructure (schools, care homes).",
                "Inspect water reservoirs and flood levees for seismic cracks."
            ],
            report_sections=[
                "Regional Impact & Macro-Triage Assessment",
                "Bridge & Lifeline Transit Corridors",
                "Secondary Fire & Hazmat Threat Analysis",
                "Mass Casualty Staging & Field Hospital Allocation",
                "Aftershock Mitigation Guidelines"
            ],
            missing_data_requirements=[
                "Peak ground acceleration (PGA) seismic sensor logs",
                "Bridge structural inspection clearance reports",
                "Municipal water line pressure diagnostics"
            ]
        ))

        # 3. Fire Workflow
        self.register(DisasterWorkflow(
            workflow_id="WF-FIRE",
            category="Fire",
            display_name="Conflagration & Thermal Suppression Protocol",
            description="Wildfire, structural inferno, and industrial thermal event coordination.",
            relevant_yolo_models=["yolov8s"],
            supported_classes=["person", "car", "truck", "bus"],
            visual_indicators=[
                "Visible open flames, combustion glow, or burning embers",
                "Thick black (hydrocarbon) or white/grey (vegetation) smoke plumes",
                "Charred or consumed structural roofing and timbers",
                "Crowds fleeing downwind of heat and smoke dispersal",
                "Emergency fire apparatus deployed on scene"
            ],
            severity_criteria={
                "Critical": "Uncontained crown fire or 4+ alarm structural fire; trapped civilians downwind; rapid flame spread.",
                "High": "Multi-structure active blaze; flame impingement on adjacent buildings; smoke plume causing severe asphyxiation hazard.",
                "Medium": "Contained single-structure fire; defensive perimeter established; no immediate exposure threat.",
                "Low": "Smoldering debris or localized brush fire with minimal fuel load."
            },
            weather_requirements=["wind_speed", "wind_direction", "wind_gusts", "temperature", "relative_humidity"],
            relevant_map_layers=["fire_perimeter_isochrones", "hydrant_flow_networks", "smoke_dispersion_plumes", "evacuation_choke_points"],
            recommended_rescue_resources=[
                "Structural Engine & Ladder Companies",
                "Wildland Handcrews & Bulldozer Operators",
                "Aerial Water-Dropping Helitack / Air Tankers",
                "Mass Evacuation Transit Busses",
                "Rehab & Respiratory Care Medical Units"
            ],
            potential_hazards=[
                "Flashover and explosive backdraft events",
                "Toxic carbon monoxide and cyanide smoke inhalation",
                "Rapid fire spread driven by shifting wind gusts",
                "Structural roof and wall burn-through collapse",
                "Boiling Liquid Expanding Vapor Explosion (BLEVE) from nearby fuel tanks"
            ],
            recommended_next_steps=[
                "Analyze downwind smoke trajectory and declare mandatory evacuation zones.",
                "Check municipal water pressure and establish continuous water relay shuttle.",
                "Designate secondary escape routes upwind of the advancing fire front.",
                "Request real-time meteorological wind speed and direction updates."
            ],
            report_sections=[
                "Combustion Footprint & Thermal Isochrone Projection",
                "Wind Velocity & Downwind Smoke Dispersion",
                "Structural Exposure Risk Analysis",
                "Water Supply & Hydrant Grid Status",
                "Fireline Containment & Evacuation Log"
            ],
            missing_data_requirements=[
                "Real-time anemometer wind gust readings at ground level",
                "Presence of hazardous materials or pressurized gas cylinders inside structures",
                "Confirmed evacuation headcount of affected structures"
            ]
        ))

        # 4. Landslide Workflow
        self.register(DisasterWorkflow(
            workflow_id="WF-LANDSLIDE",
            category="Landslide",
            display_name="Mass Earth Movement & Debris Flow Protocol",
            description="Geotechnical slope failure, mudslide, rockfall, and earth displacement triage.",
            relevant_yolo_models=["yolov8s"],
            supported_classes=["person", "car", "truck", "obstacle"],
            visual_indicators=[
                "Displaced soil, rock debris, and mud inundating roadways",
                "Scarred, bare hillside slopes showing scarp lines",
                "Uprooted trees and tilted telephone poles (pistol-butted timber)",
                "Crushed or swept-away roadside structures",
                "Damming of natural river channels by earth slide material"
            ],
            severity_criteria={
                "Critical": "Massive mudflow engulfing inhabited buildings; active slope movement continuing; road links severed.",
                "High": "Debris completely blocking lifeline highway; threat of secondary slope slide above rescue teams.",
                "Medium": "Shallow mud across secondary roadway; single structure damaged; slope stabilized.",
                "Low": "Minor rockfall cleared by light equipment; stable soil."
            },
            weather_requirements=["precipitation", "rain", "soil_moisture", "precipitation_probability"],
            relevant_map_layers=["slope_incline_heatmaps", "geotechnical_slip_zones", "blocked_mountain_passes", "debris_catchment_basins"],
            recommended_rescue_resources=[
                "Geotechnical Engineering Assessment Unit",
                "Tracked Excavators and Front-End Wheel Loaders",
                "Canine USAR Scent Detection Units",
                "Laser Total-Station Slope Monitoring Relays",
                "Aerial Geo-Hazard Drone Teams"
            ],
            potential_hazards=[
                "Secondary catastrophic slide triggered by vibration or rainfall",
                "Upstream flash flooding caused by landslide dam failure",
                "Unstable soil collapsing under heavy rescue vehicle weight",
                "Severed underground high-pressure gas or fuel conduits"
            ],
            recommended_next_steps=[
                "Deploy laser slope monitors to give early acoustic warning of secondary earth movement.",
                "Evacuate both crest above and toe below the active slide zone.",
                "Inspect drainage waterways for temporary damming that could cause flash flooding.",
                "Halt heavy machinery until geotechnical engineers approve ground bearing capacity."
            ],
            report_sections=[
                "Slide Volume & Runout Distance Calculations",
                "Slope Incline & Saturation Risk Profile",
                "Corridor Clearance & Heavy Machinery Dispatch",
                "Landslide Dam Flash Flood Risk Assessment",
                "Evacuation Boundary Delineation"
            ],
            missing_data_requirements=[
                "Cumulative 48-hour precipitation measurements",
                "Geotechnical soil core data and historical slip plane maps",
                "Presence of subterranean water table springs in the slope"
            ]
        ))

        # 5. Cyclone or Severe Storm Workflow
        self.register(DisasterWorkflow(
            workflow_id="WF-STORM",
            category="Cyclone or severe storm",
            display_name="High-Velocity Tropical Cyclone & Severe Gale Protocol",
            description="Hurricane, typhoon, tornado, and severe gale damage mitigation.",
            relevant_yolo_models=["yolov8s"],
            supported_classes=["person", "car", "truck", "obstacle"],
            visual_indicators=[
                "Torn roofs, shattered gables, and blown-off sheet metal",
                "Snapping and shearing of large mature trees and utility poles",
                "Overturned high-profile commercial vehicles",
                "Localized wind-driven rain flooding and debris fields across highways",
                "Damaged telecommunication towers and antennas"
            ],
            severity_criteria={
                "Critical": "Category 4/5 cyclone eyewall passage; total infrastructure disruption; widespread roof destructuring.",
                "High": "Category 2/3 gale damage; major power grid outage; trees blocking 60%+ of transport roads.",
                "Medium": "Category 1 winds; non-structural damage; isolated tree falls and signage loss.",
                "Low": "Sub-gale gusts; localized trash and leaf debris; minor power flickers."
            },
            weather_requirements=["wind_speed", "wind_gusts", "surface_pressure", "precipitation", "rain"],
            relevant_map_layers=["cyclone_track_cone", "wind_swath_severity", "storm_surge_coastal_boundary", "power_grid_outage_heatmap"],
            recommended_rescue_resources=[
                "Mobile Storm Chainsaw & Road Clearing Task Forces",
                "High-Output Mobile Emergency Power Generators",
                "Temporary Roof Tarping & Blue-Sky Teams",
                "Water Purification & Desalination Mobile Units",
                "Emergency Satellite Comms Transceivers"
            ],
            potential_hazards=[
                "Live electrical wires concealed beneath wet fallen branches",
                "Airborne high-velocity kinetic projectiles (roofing sheets, signs)",
                "Structural roof collapse caused by subsequent rain weight on compromised rafters",
                "Surge water rising rapidly in low-lying coastal estuaries"
            ],
            recommended_next_steps=[
                "Wait for sustained winds to drop below 60 km/h before deploying elevated bucket trucks.",
                "Clear designated critical emergency routes to hospitals first.",
                "Deploy auxiliary generators to emergency radio repeaters and medical clinics.",
                "Assess structural safety of designated civilian storm shelters."
            ],
            report_sections=[
                "Sustained Wind Speed & Gust Field Analysis",
                "Roofing & Infrastructure Failure Rates",
                "Power Grid & Telecommunications Outage Extent",
                "Road Obstacle & Tree Removal Prioritization",
                "Post-Storm Humanitarian Relief Inventory"
            ],
            missing_data_requirements=[
                "Barometric pressure trend curve",
                "Estimated time of tropical cyclone eyewall departure",
                "Electrical sub-station blackout telemetry"
            ]
        ))

        # 6. Tsunami or Coastal Flooding Workflow
        self.register(DisasterWorkflow(
            workflow_id="WF-COASTAL",
            category="Tsunami or coastal flooding",
            display_name="Marine Inundation & Coastal Surge Protocol",
            description="Tsunami runup, oceanic surge, and coastal defense breach operations.",
            relevant_yolo_models=["yolov8s"],
            supported_classes=["person", "boat", "car", "truck", "obstacle"],
            visual_indicators=[
                "Seawater inundation extending hundreds of meters inland",
                "Boats and maritime vessels deposited in urban roadways or fields",
                "Scouring and complete stripping of coastal vegetation and sand dunes",
                "Heavy sea debris, shipping containers, and fishing gear deposited inland",
                "Destroyed sea walls, piers, and harbor infrastructure"
            ],
            severity_criteria={
                "Critical": "Wave runup >5 meters penetrating urban core; multi-vessel collision on land; mass displacement.",
                "High": "Wave surge 1-3 meters; ground-floor scouring; harbors compromised.",
                "Medium": "Localized coastal overtopping; seawall breaches; beachfront damage.",
                "Low": "High-tide astronomical surge with minimal structural ingress."
            },
            weather_requirements=["surface_pressure", "wind_speed", "wind_direction"],
            relevant_map_layers=["tsunami_evacuation_contour_lines", "elevation_contours", "coastal_harbor_facilities", "sea_defense_breach_points"],
            recommended_rescue_resources=[
                "Coast Guard & Maritime Patrol Watercraft",
                "Amphibious All-Terrain Rescue Vehicles (AAV)",
                "Helicopter Maritime Search Units",
                "Mass Triage & Decontamination Units (Saltwater/Sewage)",
                "Coastal Evacuation Transit Units"
            ],
            potential_hazards=[
                "Receding suction surge and subsequent larger tsunami wave trains",
                "Hazardous materials and marine fuel released from destroyed harbors",
                "Severely compromised sea bridges and undermined road sub-bases",
                "Displaced maritime navigation hazards and submerged containers"
            ],
            recommended_next_steps=[
                "Enforce immediate vertical evacuation above 20 meters elevation.",
                "Do NOT allow responders onto beaches or low areas until official all-clear is declared.",
                "Inspect harbor fuel depots for marine diesel leaks into coastal waterways.",
                "Verify status of coastal bridge footings for tidal scouring."
            ],
            report_sections=[
                "Tsunami Wave Height & Runup Penetration Boundary",
                "Maritime Vessel Inland Displacement Audit",
                "Coastal Infrastructure & Seawall Breaches",
                "Subsequent Wave Train Hazard Timeline",
                "High-Ground Evacuation Staging Report"
            ],
            missing_data_requirements=[
                "Tidal gauge telemetry and offshore DART buoy wave height readings",
                "Seismic epicenter underwater fault displacement report",
                "Civil defense coastal warning siren confirmation"
            ]
        ))

        # 7. Road Accident Workflow
        self.register(DisasterWorkflow(
            workflow_id="WF-ROAD-ACCIDENT",
            category="Road accident",
            display_name="Vehicular Collision & Traffic Extrication Protocol",
            description="Multi-vehicle pileup, rollover, and highway transit corridor extrication.",
            relevant_yolo_models=["yolov8s"],
            supported_classes=["person", "car", "truck", "bus", "obstacle"],
            visual_indicators=[
                "Deformed, overturned, or jackknifed passenger/commercial vehicles",
                "Scattered vehicle parts, shattered safety glass, and engine fluids on asphalt",
                "Skid marks and damaged highway crash barriers/guardrails",
                "Deployments of vehicle airbags visible inside cabins",
                "Traffic backup extending along ingress corridors"
            ],
            severity_criteria={
                "Critical": "Multi-vehicle pileup with heavy extrication required; commercial bus or hazardous fuel tanker involved.",
                "High": "High-speed rollover with trapped occupants; major arterial highway completely blocked.",
                "Medium": "Two-vehicle collision with minor injuries; traffic restricted to single shoulder.",
                "Low": "Fender-bender with no entrapment; vehicles moved out of travel lane."
            },
            weather_requirements=["temperature", "precipitation", "wind_speed"],
            relevant_map_layers=["highway_mile_markers", "traffic_cctv_feeds", "nearest_trauma_centers", "detour_routing_networks"],
            recommended_rescue_resources=[
                "Heavy Rescue Squads with Hydraulic 'Jaws of Life' Cutters/Spreaders",
                "Advanced Life Support (ALS) Trauma Ambulances",
                "Heavy Rotator Wrecker Towing Units",
                "Hazmat Absorbent & Fuel Spill Mitigation Units",
                "Highway Patrol Incident Traffic Controllers"
            ],
            potential_hazards=[
                "Secondary collisions from high-speed oncoming traffic",
                "Fuel spills igniting on hot exhaust components",
                "Electric vehicle (EV) high-voltage battery thermal runaway",
                "Deploying unspent airbag inflators during extrication operations"
            ],
            recommended_next_steps=[
                "Deploy highway patrol cruisers to establish upstream flare/cone tapering at 1 km distance.",
                "De-energize vehicle 12V batteries and isolate EV high-voltage service disconnects.",
                "Apply spill control absorbent booms around leaking hydrocarbons.",
                "Coordinate OSRM detour bypass routing for emergency vehicular access."
            ],
            report_sections=[
                "Collision Geometry & Involved Vehicle Typology",
                "Passenger Extrication Status & Trauma Destination",
                "Roadway Fluid Contamination & Spill Control",
                "Corridor Re-opening Timeline Projection",
                "Traffic Detour Configuration Audit"
            ],
            missing_data_requirements=[
                "Presence of electric vehicle (EV) lithium battery packs in involved models",
                "Commercial shipping manifests (Bill of Lading) for involved freight trucks",
                "Current emergency room bed capacity at nearest Level 1 Trauma Center"
            ]
        ))

        # 8. Industrial Accident Workflow
        self.register(DisasterWorkflow(
            workflow_id="WF-INDUSTRIAL",
            category="Industrial accident",
            display_name="Industrial Facility & Hazardous Material Protocol",
            description="Chemical plant, manufacturing facility, refinery, and hazardous material emergencies.",
            relevant_yolo_models=["yolov8s"],
            supported_classes=["person", "truck", "obstacle"],
            visual_indicators=[
                "Pipes, tanks, or distillation columns venting steam, gas, or colored smoke",
                "Chemical storage drums ruptured or leaking liquid onto industrial pads",
                "Industrial structural collapse (crane failures, scaffolding drops)",
                "Workers evacuating in high-visibility PPE or hazmat suits",
                "Containment dikes filled with spilled liquid"
            ],
            severity_criteria={
                "Critical": "Toxic gas release exceeding ERPG-3 threshold; uncontrolled refinery fire; multiple industrial casualties.",
                "High": "Flammable chemical spill with vapor cloud forming; containment wall breach.",
                "Medium": "Localized machinery entrapment or small chemical spill contained within dike.",
                "Low": "Minor plant alarm; no off-site chemical migration; routine maintenance incident."
            },
            weather_requirements=["wind_speed", "wind_direction", "temperature", "relative_humidity"],
            relevant_map_layers=["hazmat_plume_erg_isopleths", "facility_piping_pids", "shelter_in_place_zones", "hazmat_decon_stations"],
            recommended_rescue_resources=[
                "Certified Hazmat Level A/B Entry Team",
                "Industrial Chemical Foam Firefighting Units",
                "Gas Chromatography & PID Vapor Detection Squad",
                "Mass Chemical Decontamination Trailers",
                "Facility Chemical Safety Engineers"
            ],
            potential_hazards=[
                "Toxic vapor inhalation causing respiratory paralysis",
                "Explosion from flammable air-fuel mixtures in confined spaces",
                "Corrosive chemical burns to skin and equipment",
                "Runoff water carrying toxic chemicals into municipal storm sewers"
            ],
            recommended_next_steps=[
                "Approach incident strictly from UPWIND and UPHILL.",
                "Establish Hot, Warm, and Cold Hazmat operational zones with decontamination corridor.",
                "Consult DOT Emergency Response Guidebook (ERG) using UN chemical identification placards.",
                "Order immediate Shelter-in-Place for communities within downwind vapor plume corridor."
            ],
            report_sections=[
                "Hazardous Substance UN/CAS Identification & ERG Guide",
                "Atmospheric Monitoring & PID Vapor Concentration Log",
                "Downwind Isolation & Shelter-in-Place Boundary",
                "Runoff Containment & Environmental Safeguards",
                "Facility Incident Command Integration Report"
            ],
            missing_data_requirements=[
                "Safety Data Sheet (SDS) and UN Chemical Identification Number",
                "Estimated quantity of chemical stored in breached tank or vessel",
                "Operational status of on-site automated chemical scrubbing systems"
            ]
        ))

        # 9. Other Disaster Workflow
        self.register(DisasterWorkflow(
            workflow_id="WF-OTHER",
            category="Other disaster",
            display_name="General Multi-Hazard Emergency Protocol",
            description="Flexible baseline protocol for unconventional or compound emergency events.",
            relevant_yolo_models=["yolov8s"],
            supported_classes=["person", "car", "truck", "obstacle"],
            visual_indicators=[
                "Visual evidence of public safety disturbance or infrastructure impact",
                "Crowd congregation or emergency vehicle dispatch",
                "Damaged physical structures or terrain"
            ],
            severity_criteria={
                "Critical": "Direct threat to life; massive disruption; multi-agency response required.",
                "High": "Significant localized hazard requiring organized rescue deployment.",
                "Medium": "Controlled incident with specialized rescue needs.",
                "Low": "Minor disturbance without casualty risk."
            },
            weather_requirements=["temperature", "precipitation", "wind_speed"],
            relevant_map_layers=["general_triage_zones", "incident_perimeter"],
            recommended_rescue_resources=[
                "Multi-Agency Emergency Response Corps",
                "Incident Command Mobile Command Post",
                "Public Safety Liaison Squad"
            ],
            potential_hazards=["Unclassified environmental threats", "Secondary localized risks"],
            recommended_next_steps=[
                "Deploy forward recon team to collect high-resolution ground truth.",
                "Establish inter-agency unified command post.",
                "Request specialist evaluation according to observed hazards."
            ],
            report_sections=[
                "Preliminary Scene Observation & Classification",
                "Resource Allocation & Staging",
                "Tactical Recommendations for Responders"
            ],
            missing_data_requirements=["Ground responder on-site verification report"]
        ))

        # 10. Unknown or Insufficient Evidence Workflow
        self.register(DisasterWorkflow(
            workflow_id="WF-UNKNOWN",
            category="Unknown or insufficient evidence",
            display_name="Uncertain Reconnaissance & Evidence Acquisition Protocol",
            description="Conservative baseline protocol when aerial evidence is ambiguous, low-resolution, or inconclusive.",
            relevant_yolo_models=["yolov8s"],
            supported_classes=["person", "car", "truck", "obstacle"],
            visual_indicators=[
                "Image clarity insufficient for definitive disaster categorization",
                "No visible flames, standing water, structural destruction, or vehicle collisions",
                "Generic landscape, cloudy drone feed, or ambiguous terrain"
            ],
            severity_criteria={
                "Critical": "Unconfirmed report of critical emergency; urgent verification needed.",
                "High": "Potential hazard suspected but unverified by imagery.",
                "Medium": "Unclear aerial data; normal operations pending verification.",
                "Low": "No discernible disaster damage detected in current image pass."
            },
            weather_requirements=["temperature", "precipitation", "wind_speed"],
            relevant_map_layers=["pending_verification_zones"],
            recommended_rescue_resources=[
                "Aerial Drone Pilot for Secondary Inspection Pass",
                "Forward Scout Observer Patrol",
                "Remote Telemetry Sensor Check"
            ],
            potential_hazards=["Unconfirmed hazards pending ground verification"],
            recommended_next_steps=[
                "Do NOT execute disaster-specific high-risk tactics autonomously.",
                "Request secondary higher-resolution drone pass or oblique camera angles.",
                "Contact nearest dispatch unit to provide eyewitness ground report.",
                "Maintain general situational awareness on tactical map."
            ],
            report_sections=[
                "Image Quality & Inconclusive Evidence Audit",
                "General Object Detection Findings",
                "Required Additional Aerial & Field Data Points",
                "Human Commander Verification Request"
            ],
            missing_data_requirements=[
                "Clear high-resolution aerial imagery taken below cloud cover",
                "Accurate GPS coordinate verification",
                "On-ground responder verbal situational report"
            ]
        ))

workflow_registry = WorkflowRegistry()
