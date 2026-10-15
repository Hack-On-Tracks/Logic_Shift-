import os
import math
import logging
import httpx
from typing import List, Dict, Any, Optional

logger = logging.getLogger("rescuevision.routing")

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class RoutingService:
    def __init__(self):
        self.osrm_base_url = os.getenv("OSRM_BASE_URL", "https://router.project-osrm.org").rstrip("/")

    async def calculate_route(
        self,
        start_lat: float,
        start_lng: float,
        end_lat: float,
        end_lng: float,
        verified_blockages: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Calculates a route using OSRM, evaluates road-closure safety,
        and returns geometry with warnings.
        """
        # OSRM expects coordinates in {lon},{lat} format
        url = f"{self.osrm_base_url}/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?overview=full&geometries=geojson&steps=true"
        
        geometry = []
        distance_meters = 0.0
        duration_seconds = 0.0
        route_status = "OK"

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    routes = data.get("routes", [])
                    if routes:
                        r = routes[0]
                        distance_meters = r.get("distance", 0.0)
                        duration_seconds = r.get("duration", 0.0)
                        # GeoJSON coordinates are [lon, lat], convert to Leaflet [lat, lon]
                        raw_coords = r.get("geometry", {}).get("coordinates", [])
                        geometry = [[c[1], c[0]] for c in raw_coords]
        except Exception as e:
            logger.warning(f"OSRM routing query failed ({e}); generating direct corridor fallback.")
            route_status = "FALLBACK"

        # If OSRM returned empty or failed, generate linear corridor with intermediate tactical waypoints
        if not geometry:
            steps = 20
            geometry = [
                [
                    start_lat + (end_lat - start_lat) * (i / steps),
                    start_lng + (end_lng - start_lng) * (i / steps)
                ]
                for i in range(steps + 1)
            ]
            distance_meters = haversine_distance_meters(start_lat, start_lng, end_lat, end_lng) * 1.3 # Add 30% winding factor
            duration_seconds = (distance_meters / 11.1) # approx 40 km/h

        # Evaluate route safety against verified road closures
        has_warning = False
        intersecting = []
        warning_msg = None

        if verified_blockages:
            for b in verified_blockages:
                b_lat = b.get("latitude")
                b_lng = b.get("longitude")
                if b_lat is None or b_lng is None:
                    continue

                # Check if closure is within 250 meters of any point on the route
                min_dist = float("inf")
                for p in geometry:
                    d = haversine_distance_meters(p[0], p[1], b_lat, b_lng)
                    if d < min_dist:
                        min_dist = d

                if min_dist <= 250.0:
                    has_warning = True
                    intersecting.append(b)

        if has_warning:
            road_names = ", ".join([b.get("road_segment", "Sector Corridor") for b in intersecting])
            warning_msg = (
                f"SAFETY ADVISORY: Proposed ingress corridor intersects {len(intersecting)} verified road blockage(s) "
                f"({road_names}). Human operator verification required before tactical squad movement."
            )

        return {
            "status": route_status,
            "distance_meters": round(distance_meters, 1),
            "duration_seconds": round(duration_seconds, 1),
            "geometry": geometry,
            "has_closure_warning": has_warning,
            "warning_details": warning_msg,
            "intersecting_closures": intersecting,
        }

routing_service = RoutingService()
