'use client';
import { useEffect, useRef } from 'react';
import { Incident } from '@/lib/types';
import { ApiBlockage, ApiTeamLocation } from '@/lib/api';
import { markerColor } from '@/lib/utils';

interface MapComponentProps {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  blockages?: ApiBlockage[];
  teams?: ApiTeamLocation[];
  routeGeometry?: number[][] | null;
  onSelectBlockage?: (b: ApiBlockage) => void;
}

export default function MapComponent({
  incidents,
  selectedId,
  onSelect,
  blockages = [],
  teams = [],
  routeGeometry = null,
  onSelectBlockage,
}: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let destroyed = false;

    const init = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (destroyed || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [26.1445, 91.7362], // Centered around active regional emergency telemetry
        zoom: 7,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      if (destroyed) {
        map.remove();
        return;
      }
      mapRef.current = map;
    };

    init();

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const renderLayers = async () => {
      const L = (await import('leaflet')).default;
      const map = mapRef.current!;

      // Clear existing layers
      layersRef.current.forEach(layer => layer.remove());
      layersRef.current = [];

      const allPoints: [number, number][] = [];

      // 1. Incidents
      const withCoords = incidents.filter(i => i.latitude && i.longitude);
      withCoords.forEach(inc => {
        const color = markerColor(inc.priority);
        const isSelected = inc.id === selectedId;
        const marker = L.circleMarker([inc.latitude!, inc.longitude!], {
          radius: isSelected ? 14 : 9,
          fillColor: color,
          color: isSelected ? '#FFFFFF' : '#000000',
          weight: isSelected ? 3 : 2,
          opacity: 1,
          fillOpacity: 0.9,
        });

        marker.bindPopup(`
          <div style="font-family: monospace; min-width: 200px;">
            <div style="font-weight: 900; color: #FFFFFF; font-size: 13px; margin-bottom: 4px; text-transform: uppercase;">
              ${inc.title}
            </div>
            <div style="color: #94A3B8; font-size: 11px; margin-bottom: 8px;">
              📍 ${inc.locationName}
            </div>
            <div style="display: flex; gap: 6px; margin-bottom: 8px;">
              <span style="background: #2563EB; color: #FFF; padding: 2px 6px; font-weight: 800; font-size: 10px; border: 1px solid #000;">
                ${inc.disasterType}
              </span>
              <span style="background: ${color}; color: ${inc.priority === 'Medium' ? '#000' : '#FFF'}; padding: 2px 6px; font-weight: 800; font-size: 10px; border: 1px solid #000;">
                ${inc.priority}
              </span>
            </div>
            <div style="color: #64748B; font-size: 10px; font-weight: 700;">
              STATUS: ${inc.status} // TEAM: ${inc.assignedTeam}
            </div>
          </div>
        `);

        marker.on('click', () => onSelect(inc.id));
        marker.addTo(map);
        layersRef.current.push(marker);
        allPoints.push([inc.latitude!, inc.longitude!]);
      });

      // 2. Road Blockages
      blockages.forEach(b => {
        if (!b.latitude || !b.longitude) return;
        const blockageMarker = L.circleMarker([b.latitude, b.longitude], {
          radius: 10,
          fillColor: '#EF4444',
          color: '#000000',
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.95,
        });

        blockageMarker.bindPopup(`
          <div style="font-family: monospace; min-width: 200px;">
            <div style="background: #EF4444; color: #FFF; font-weight: 900; font-size: 11px; padding: 2px 6px; margin-bottom: 6px; border: 1px solid #000; display: inline-block;">
              ⚠️ ROAD CLOSURE // ${b.severity}
            </div>
            <div style="font-weight: 900; color: #FFF; font-size: 12px; margin-bottom: 4px;">
              ${b.title}
            </div>
            <div style="color: #94A3B8; font-size: 11px; margin-bottom: 4px;">
              ${b.locationName} (${b.blockageType})
            </div>
            <div style="color: #F87171; font-size: 10px; font-weight: bold;">
              STATUS: ${b.status}
            </div>
          </div>
        `);

        if (onSelectBlockage) {
          blockageMarker.on('click', () => onSelectBlockage(b));
        }
        blockageMarker.addTo(map);
        layersRef.current.push(blockageMarker);
        allPoints.push([b.latitude, b.longitude]);
      });

      // 3. Rescue Teams (GPS Telemetry)
      teams.forEach(t => {
        if (!t.latitude || !t.longitude) return;
        const teamMarker = L.circleMarker([t.latitude, t.longitude], {
          radius: 11,
          fillColor: '#4ADE80',
          color: '#000000',
          weight: 3,
          opacity: 1,
          fillOpacity: 1,
        });

        teamMarker.bindPopup(`
          <div style="font-family: monospace; min-width: 180px;">
            <div style="background: #4ADE80; color: #000; font-weight: 900; font-size: 11px; padding: 2px 6px; margin-bottom: 6px; border: 1px solid #000; display: inline-block;">
              📡 RESCUE TEAM // ${t.status}
            </div>
            <div style="font-weight: 900; color: #FFF; font-size: 13px; margin-bottom: 2px;">
              ${t.teamName}
            </div>
            <div style="color: #94A3B8; font-size: 10px;">
              DEVICE: ${t.deviceId}
            </div>
            <div style="color: #64748B; font-size: 9px; margin-top: 4px;">
              UPDATED: ${new Date(t.updatedAt).toLocaleTimeString()}
            </div>
          </div>
        `);

        teamMarker.addTo(map);
        layersRef.current.push(teamMarker);
        allPoints.push([t.latitude, t.longitude]);
      });

      // 4. Route Polyline
      if (routeGeometry && routeGeometry.length > 1) {
        // routeGeometry is array of [lat, lng]
        const polylineOutline = L.polyline(routeGeometry as [number, number][], {
          color: '#000000',
          weight: 7,
          opacity: 0.9,
        }).addTo(map);
        layersRef.current.push(polylineOutline);

        const polyline = L.polyline(routeGeometry as [number, number][], {
          color: '#2563EB',
          weight: 4,
          opacity: 1,
          dashArray: '8, 6',
        }).addTo(map);
        layersRef.current.push(polyline);

        routeGeometry.forEach(pt => allPoints.push([pt[0], pt[1]]));
      }

      // Fit bounds if we have points
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    };

    renderLayers();
  }, [incidents, selectedId, onSelect, blockages, teams, routeGeometry, onSelectBlockage]);

  return <div ref={containerRef} className="w-full h-full rounded-none" />;
}
