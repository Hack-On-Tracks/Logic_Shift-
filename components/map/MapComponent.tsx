'use client';
import { useEffect, useRef } from 'react';
import { Incident } from '@/lib/types';
import { markerColor } from '@/lib/utils';

interface MapComponentProps {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function MapComponent({ incidents, selectedId, onSelect }: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markersRef = useRef<import('leaflet').CircleMarker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const init = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      const map = L.map(containerRef.current!, {
        center: [22, 80],
        zoom: 5,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      mapRef.current = map;
    };

    init();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const L_module = async () => {
      const L = (await import('leaflet')).default;
      const map = mapRef.current!;

      // Clear existing
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      const withCoords = incidents.filter(i => i.latitude && i.longitude);

      withCoords.forEach(inc => {
        const color = markerColor(inc.priority);
        const isSelected = inc.id === selectedId;
        const marker = L.circleMarker([inc.latitude!, inc.longitude!], {
          radius: isSelected ? 14 : 10,
          fillColor: color,
          color: isSelected ? '#fff' : color,
          weight: isSelected ? 3 : 1.5,
          opacity: 1,
          fillOpacity: 0.85,
        });

        marker.bindPopup(`
          <div style="min-width:200px">
            <div style="font-weight:600;color:#F8FAFC;margin-bottom:4px">${inc.title}</div>
            <div style="color:#94A3B8;font-size:11px;margin-bottom:8px">${inc.locationName}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
              <span style="padding:2px 8px;border-radius:4px;background:rgba(255,255,255,0.08);color:#F8FAFC;font-size:11px">${inc.disasterType}</span>
              <span style="padding:2px 8px;border-radius:4px;background:rgba(255,255,255,0.08);color:${color};font-size:11px">${inc.priority}</span>
            </div>
            <div style="color:#64748B;font-size:10px">${inc.status} · ${inc.assignedTeam}</div>
          </div>
        `);

        marker.on('click', () => onSelect(inc.id));
        marker.addTo(map);
        markersRef.current.push(marker);
      });

      // Fit bounds if incidents
      if (withCoords.length > 0) {
        const bounds = L.latLngBounds(withCoords.map(i => [i.latitude!, i.longitude!]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10 });
      }
    };

    L_module();
  }, [incidents, selectedId, onSelect]);

  return <div ref={containerRef} className="w-full h-full rounded-xl" />;
}
