"""
Weather and Environmental Service for RescueVision AI.
Fetches real-time meteorological conditions via Open-Meteo API
to ground disaster severity assessments and tactical route safety.
"""

import logging
import requests
from typing import Dict, Any, Optional

logger = logging.getLogger("rescuevision.weather")

WMO_WEATHER_CODES = {
    0: "Clear Sky",
    1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing Rime Fog",
    51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Dense Drizzle",
    61: "Slight Rain", 63: "Moderate Rain", 65: "Heavy Torrential Rain",
    71: "Slight Snow", 73: "Moderate Snow", 75: "Heavy Snow",
    80: "Slight Rain Showers", 81: "Moderate Rain Showers", 82: "Violent Rain Showers",
    95: "Thunderstorm", 96: "Thunderstorm with Slight Hail", 99: "Severe Thunderstorm with Heavy Hail"
}

class WeatherService:
    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1/forecast"

    def get_weather(self, latitude: Optional[float], longitude: Optional[float]) -> Dict[str, Any]:
        """
        Retrieves real-time weather observations for the target coordinates.
        If coordinates are missing or call fails, returns a clear status object.
        """
        if latitude is None or longitude is None:
            return {
                "available": False,
                "reason": "Geographic coordinates (latitude/longitude) not provided for this sector.",
                "temperature_c": None,
                "precipitation_mm": None,
                "rain_mm": None,
                "wind_speed_kmh": None,
                "wind_direction_deg": None,
                "wind_gusts_kmh": None,
                "condition": "Coordinates Required for Live Meteorological Ground-Truth",
                "risk_impact": "Environmental factors unmeasured; human responder must verify local weather."
            }

        try:
            params = {
                "latitude": latitude,
                "longitude": longitude,
                "current": [
                    "temperature_2m",
                    "relative_humidity_2m",
                    "precipitation",
                    "rain",
                    "weather_code",
                    "wind_speed_10m",
                    "wind_direction_10m",
                    "wind_gusts_10m",
                    "surface_pressure"
                ],
                "timezone": "auto"
            }
            resp = requests.get(self.base_url, params=params, timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                current = data.get("current", {})

                w_code = current.get("weather_code", 0)
                condition = WMO_WEATHER_CODES.get(w_code, "Variable Weather")
                wind_speed = current.get("wind_speed_10m", 0.0)
                wind_gusts = current.get("wind_gusts_10m", 0.0)
                precip = current.get("precipitation", 0.0)
                temp = current.get("temperature_2m", 20.0)
                humidity = current.get("relative_humidity_2m", 50.0)

                # Determine environmental risk impact
                impacts = []
                if wind_speed > 40 or wind_gusts > 55:
                    impacts.append(f"High wind hazard ({wind_speed} km/h, gusts {wind_gusts} km/h) promotes rapid flame spread and structural debris dislodgement.")
                if precip > 10:
                    impacts.append(f"Torrential rainfall ({precip} mm) amplifies flash flooding and slope saturation.")
                elif precip > 2:
                    impacts.append(f"Active rainfall ({precip} mm) creates slick road surfaces and decreases visibility.")
                if temp > 38 and humidity < 25:
                    impacts.append(f"Extreme heat ({temp}°C) and arid humidity ({humidity}%) creates severe wildfire and rescuer heat-exhaustion risk.")
                if not impacts:
                    impacts.append("Current atmospheric conditions within standard operational tolerance.")

                return {
                    "available": True,
                    "latitude": latitude,
                    "longitude": longitude,
                    "temperature_c": temp,
                    "humidity_pct": humidity,
                    "precipitation_mm": precip,
                    "rain_mm": current.get("rain", 0.0),
                    "wind_speed_kmh": wind_speed,
                    "wind_direction_deg": current.get("wind_direction_10m", 0),
                    "wind_gusts_kmh": wind_gusts,
                    "surface_pressure_hpa": current.get("surface_pressure", 1013.25),
                    "condition": condition,
                    "risk_impact": " ".join(impacts)
                }
            else:
                logger.warning(f"Open-Meteo returned status {resp.status_code}")
        except Exception as e:
            logger.warning(f"Failed to fetch live weather: {e}")

        # Graceful fallback when network call fails
        return {
            "available": False,
            "reason": "Meteorological telemetry service temporarily unreachable.",
            "temperature_c": None,
            "precipitation_mm": None,
            "rain_mm": None,
            "wind_speed_kmh": None,
            "wind_direction_deg": None,
            "wind_gusts_kmh": None,
            "condition": "Telemetry Offline",
            "risk_impact": "Local weather unconfirmed. Verify ground observations before flight operations."
        }

weather_service = WeatherService()
