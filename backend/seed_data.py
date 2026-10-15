import datetime
from sqlalchemy.orm import Session
from .models import Incident, RescueTask, RoadBlockage, TeamLocation, ActivityLog

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

def seed_database_if_empty(db: Session):
    if db.query(Incident).count() > 0:
        return

    # Seed initial incidents
    incidents = [
        Incident(
            id="INC-001",
            title="Riverdale Flash Flood Sector 4",
            description="Severe embankment breach along north river corridor. 14 residences submerged under 1.8m water. Multiple citizens stranded on rooftops.",
            disaster_type="Flood",
            severity="Critical",
            status="Response In Progress",
            latitude=28.6139,
            longitude=77.2090,
            location_name="North River Corridor, Sector 4",
            people_at_risk=28,
            assigned_team="Alpha Rescue Unit",
            reported_at=utcnow() - datetime.timedelta(hours=2, minutes=15),
            is_verified=True,
            criticality_score=8.7,
            criticality_explanation="High casualty risk and verified structural flood immersion.",
        ),
        Incident(
            id="INC-002",
            title="Highway 9 Overpass Structural Fracture",
            description="Major seismic tremor triggered beam fissure on elevated transit flyover. Road blocked in both directions. Risk of secondary structural collapse.",
            disaster_type="Building Collapse",
            severity="Critical",
            status="Under Investigation",
            latitude=28.6280,
            longitude=77.2180,
            location_name="Highway 9 Mile Marker 14",
            people_at_risk=12,
            assigned_team="Bravo Evac Squad",
            reported_at=utcnow() - datetime.timedelta(hours=4),
            is_verified=True,
            criticality_score=8.2,
            criticality_explanation="Transit corridor blockage and catastrophic collapse risk.",
        ),
        Incident(
            id="INC-003",
            title="Industrial Zone Chemical Warehouse Fire",
            description="Secondary chemical blaze in solvent packaging facility. High toxic smoke plume drifting south towards residential quarters. Fire crews establishing perimeter.",
            disaster_type="Fire",
            severity="High",
            status="Response In Progress",
            latitude=28.6010,
            longitude=77.1950,
            location_name="Industrial Area Phase 2, Unit 8",
            people_at_risk=45,
            assigned_team="Charlie Hazmat Team",
            reported_at=utcnow() - datetime.timedelta(hours=6, minutes=30),
            is_verified=True,
            criticality_score=7.4,
            criticality_explanation="Hazardous atmospheric toxic plume threat.",
        ),
        Incident(
            id="INC-004",
            title="Eastern Ridge Hillside Mudslide",
            description="Continuous precipitation caused slope failure on eastern ridge. Arterial access road completely severed by 400 tons of mud and timber.",
            disaster_type="Landslide",
            severity="Medium",
            status="Reported",
            latitude=28.6350,
            longitude=77.2300,
            location_name="Eastern Ridge Approach, Mile 3",
            people_at_risk=6,
            assigned_team="Delta Recon Flight",
            reported_at=utcnow() - datetime.timedelta(hours=8),
            is_verified=False,
            criticality_score=4.8,
            criticality_explanation="Slope failure blocking approach corridor.",
        ),
        Incident(
            id="INC-005",
            title="Commercial District Power Grid Substation Trip",
            description="Substation explosion knocked out grid for 3 hospitals and 40 commercial high-rises. Backup diesel generators active.",
            disaster_type="Other",
            severity="High",
            status="Under Investigation",
            latitude=28.6180,
            longitude=77.2020,
            location_name="Commercial Central Substation 2B",
            people_at_risk=0,
            assigned_team="Bravo Evac Squad",
            reported_at=utcnow() - datetime.timedelta(hours=11),
            is_verified=True,
            criticality_score=6.1,
            criticality_explanation="Infrastructure blackout affecting medical facilities.",
        ),
    ]
    for inc in incidents:
        db.add(inc)

    # Seed initial tasks
    tasks = [
        RescueTask(
            id="TSK-001",
            title="Deploy Zodiac Inflatable Rafts to Sector 4",
            description="Launch 3 motorized craft to evacuate 14 residents isolated on flooded single-story flat roofs.",
            incident_id="INC-001",
            assigned_team="Alpha Rescue Unit",
            priority="Critical",
            status="In Progress",
            due_date=str(datetime.date.today()),
            created_at=utcnow() - datetime.timedelta(hours=2),
        ),
        RescueTask(
            id="TSK-002",
            title="Inspect Structural Flyover Pier 3 Pillars",
            description="Structural laser survey to assess load-bearing integrity and install emergency hydraulic shoring jacks.",
            incident_id="INC-002",
            assigned_team="Bravo Evac Squad",
            priority="Critical",
            status="In Progress",
            due_date=str(datetime.date.today()),
            created_at=utcnow() - datetime.timedelta(hours=3, minutes=30),
        ),
        RescueTask(
            id="TSK-003",
            title="Establish Toxic Air Monitoring Perimeter",
            description="Deploy handheld multi-gas sensors downwind of warehouse fire at 200m intervals.",
            incident_id="INC-003",
            assigned_team="Charlie Hazmat Team",
            priority="High",
            status="Pending",
            due_date=str(datetime.date.today()),
            created_at=utcnow() - datetime.timedelta(hours=5),
        ),
        RescueTask(
            id="TSK-004",
            title="Clear Mudslide Roadway with Heavy Excavator",
            description="Deploy front-loader to reopen single lane on Eastern Ridge Approach road.",
            incident_id="INC-004",
            assigned_team="Delta Recon Flight",
            priority="Medium",
            status="Pending",
            due_date=str(datetime.date.today() + datetime.timedelta(days=1)),
            created_at=utcnow() - datetime.timedelta(hours=7),
        ),
    ]
    for t in tasks:
        db.add(t)

    # Seed initial Road Blockages
    blockages = [
        RoadBlockage(
            id="BLK-001",
            title="Highway 9 Overpass Full Span Closure",
            road_segment="Highway 9 Northbound & Southbound km 14-16",
            latitude=28.6285,
            longitude=77.2185,
            status="Verified",
            incident_id="INC-002",
            notes="Structural beam crack prevents any vehicular traversal. Reroute via West Ring road.",
            verified_by="Commander Reynolds",
            verified_at=utcnow() - datetime.timedelta(hours=3),
            reported_at=utcnow() - datetime.timedelta(hours=4),
        ),
        RoadBlockage(
            id="BLK-002",
            title="Sector 4 River Road High Water Inundation",
            road_segment="River Road between 3rd & 7th Avenue",
            latitude=28.6145,
            longitude=77.2095,
            status="Verified",
            incident_id="INC-001",
            notes="Water depth 1.6m. Impassable for all standard emergency vehicles. Amphibious craft only.",
            verified_by="Alpha Lead Patel",
            verified_at=utcnow() - datetime.timedelta(hours=2),
            reported_at=utcnow() - datetime.timedelta(hours=2, minutes=30),
        ),
        RoadBlockage(
            id="BLK-003",
            title="Eastern Ridge Debris Barrier",
            road_segment="Ridge Approach Mile 3.2",
            latitude=28.6355,
            longitude=77.2305,
            status="Under Review",
            incident_id="INC-004",
            notes="Fallen pine trees and loose shale across pavement.",
            reported_at=utcnow() - datetime.timedelta(hours=6),
        ),
    ]
    for b in blockages:
        db.add(b)

    # Seed Team Locations
    teams = [
        TeamLocation(
            team_name="Alpha Rescue Unit",
            responder_id="RES-01",
            latitude=28.6120,
            longitude=77.2060,
            timestamp=utcnow(),
            is_active=True,
            battery_level=92,
        ),
        TeamLocation(
            team_name="Bravo Evac Squad",
            responder_id="RES-02",
            latitude=28.6250,
            longitude=77.2150,
            timestamp=utcnow(),
            is_active=True,
            battery_level=78,
        ),
        TeamLocation(
            team_name="Charlie Hazmat Team",
            responder_id="RES-03",
            latitude=28.6040,
            longitude=77.1980,
            timestamp=utcnow(),
            is_active=True,
            battery_level=85,
        ),
    ]
    for tm in teams:
        db.add(tm)

    # Activity Log
    logs = [
        ActivityLog(action="SYSTEM_INITIALIZED", category="SYSTEM", details="Tactical Command Node started.", timestamp=utcnow() - datetime.timedelta(hours=12)),
        ActivityLog(action="INCIDENT_REGISTERED", category="INCIDENT", details="INC-001 Riverdale Flash Flood created.", timestamp=utcnow() - datetime.timedelta(hours=2, minutes=15)),
        ActivityLog(action="DIRECTIVE_ISSUED", category="TASK", details="TSK-001 dispatched to Alpha Rescue Unit.", timestamp=utcnow() - datetime.timedelta(hours=2)),
        ActivityLog(action="ROAD_CLOSURE_VERIFIED", category="BLOCKAGE", details="BLK-001 Highway 9 confirmed impassable.", timestamp=utcnow() - datetime.timedelta(hours=3)),
    ]
    for l in logs:
        db.add(l)

    db.commit()
