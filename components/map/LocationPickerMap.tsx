'use client';
import { useEffect, useRef } from 'react';

interface LocationPickerMapProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onChange,
  height = '340px',
  className = '',
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let destroyed = false;

    const init = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (destroyed || !containerRef.current) return;

      const initialLat = latitude ?? 19.0760;
      const initialLng = longitude ?? 72.8777;

      const map = L.map(containerRef.current, {
        center: [initialLat, initialLng],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      // Custom Brutalist Pin Marker Icon
      const customIcon = L.divIcon({
        className: 'custom-picker-pin',
        html: `
          <div style="
            position: relative;
            width: 28px;
            height: 28px;
            background: #EF4444;
            border: 2px solid #000;
            box-shadow: 3px 3px 0px #000;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: translate(-14px, -28px);
            cursor: grab;
          ">
            <div style="width: 8px; height: 8px; background: #FFF; border: 1px solid #000;"></div>
            <div style="
              position: absolute;
              bottom: -6px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-top: 6px solid #EF4444;
            "></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const marker = L.marker([initialLat, initialLng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      const circle = L.circle([initialLat, initialLng], {
        radius: 400,
        color: '#EF4444',
        fillColor: '#EF4444',
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: '4, 4',
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        circle.setLatLng(pos);
        onChange(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)));
      });

      map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        circle.setLatLng([lat, lng]);
        onChange(Number(lat.toFixed(5)), Number(lng.toFixed(5)));
      });

      markerRef.current = marker;
      circleRef.current = circle;
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

  // Update position if latitude or longitude change externally
  useEffect(() => {
    if (mapRef.current && markerRef.current && circleRef.current && latitude !== null && longitude !== null) {
      const cur = markerRef.current.getLatLng();
      if (Math.abs(cur.lat - latitude) > 0.0001 || Math.abs(cur.lng - longitude) > 0.0001) {
        markerRef.current.setLatLng([latitude, longitude]);
        circleRef.current.setLatLng([latitude, longitude]);
        mapRef.current.panTo([latitude, longitude], { animate: true });
      }
    }
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={`w-full border-2 border-black shadow-[4px_4px_0px_#000] relative overflow-hidden ${className}`}
    />
  );
}
