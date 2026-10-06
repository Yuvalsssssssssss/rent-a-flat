import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '../lib/geo';

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  html: string;
  size: number;
  tooltip?: string;
  front?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onDragEnd?: (lat: number, lng: number) => void;
};

type Props = {
  markers: MapMarker[];
  center: LatLng;
  zoom?: number;
  /** Fit the view to all markers once, on first render with markers. */
  fit?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
};

export default function LeafletMap({ markers, center, zoom = 15, fit = false, onMapClick, className }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const clickRef = useRef(onMapClick);
  const fitted = useRef(false);
  clickRef.current = onMapClick;

  useEffect(() => {
    const map = L.map(el.current!, { zoomControl: false }).setView([center.lat, center.lng], zoom);
    // Standard OSM tiles (free, no key); slightly dimmed by .map-dark in index.css.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      className: 'map-dark',
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.on('click', (e) => clickRef.current?.(e.latlng.lat, e.latlng.lng));
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // The map is created once; markers are synced by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    for (const m of markers) {
      const marker = L.marker([m.lat, m.lng], {
        icon: L.divIcon({ html: m.html, className: '', iconSize: [m.size, m.size], iconAnchor: [m.size / 2, m.size / 2] }),
        draggable: m.draggable,
        zIndexOffset: m.front ? 1000 : 0,
      });
      if (m.tooltip) marker.bindTooltip(m.tooltip, { direction: 'top', offset: [0, -m.size / 2] });
      if (m.onClick) marker.on('click', m.onClick);
      if (m.onDragEnd) marker.on('dragend', () => { const p = marker.getLatLng(); m.onDragEnd!(p.lat, p.lng); });
      layer.addLayer(marker);
    }
    if (fit && !fitted.current && markers.length > 1) {
      map.fitBounds(L.latLngBounds(markers.map((m) => [m.lat, m.lng])), { padding: [40, 40], maxZoom: 16 });
      fitted.current = true;
    }
  }, [markers, fit]);

  return <div ref={el} className={`relative isolate z-0 overflow-hidden border border-line ${className ?? ''}`} />;
}
