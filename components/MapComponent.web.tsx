import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

/* ── Polyline decoder (Valhalla encoded shape, precision 6) ─────────── */
function decodePolyline(encoded: string, precision = 6): [number, number][] {
  const factor = Math.pow(10, precision);
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lat / factor, lng / factor]);
  }
  return coords;
}

export default function MapComponent({ restaurantLat, restaurantLng, userLat, userLng, isActive }: any) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Dynamically load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Dynamically load Leaflet JS
    const loadLeaflet = (): Promise<any> => {
      return new Promise((resolve) => {
        if ((window as any).L) {
          resolve((window as any).L);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve((window as any).L);
        document.head.appendChild(script);
      });
    };

    const init = async () => {
      const L = await loadLeaflet();
      if (!mapRef.current || leafletMapRef.current) return;

      const hasRestaurant = restaurantLat != null && restaurantLng != null;
      const hasUser = userLat != null && userLng != null;

      const centerLat = hasRestaurant ? restaurantLat : hasUser ? userLat : 22.5726;
      const centerLng = hasRestaurant ? restaurantLng : hasUser ? userLng : 88.3639;

      const map = L.map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom: hasUser && hasRestaurant ? 13 : 15,
        zoomControl: false,
        attributionControl: false,
      });

      // Premium CartoDB Voyager tiles — same as website
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      // ── Restaurant marker (orange teardrop pin) ──
      if (hasRestaurant) {
        const restaurantIcon = L.divIcon({
          html: `<div style="
            position:relative;
            width:44px;height:44px;
            border-radius:50% 50% 50% 0;
            background:linear-gradient(135deg,#f97316,#ea580c);
            transform:rotate(-45deg);
            box-shadow:0 6px 16px rgba(249,115,22,0.55);
            border:3px solid white;
            display:flex;align-items:center;justify-content:center;
          ">
            <span style="transform:rotate(45deg);font-size:18px;line-height:1;">🍽️</span>
          </div>`,
          className: '',
          iconSize: [44, 44],
          iconAnchor: [22, 44],
          popupAnchor: [0, -44],
        });
        L.marker([restaurantLat, restaurantLng], { icon: restaurantIcon })
          .addTo(map)
          .bindPopup("<b style='font-size:13px'>🍽️ Restaurant</b><br><span style='font-size:11px;color:#666'>Your food is being prepared here</span>");
      }

      // ── Delivery marker (green pin, pulsing ring for active orders) ──
      if (hasUser) {
        const pulseRing = isActive
          ? `<div style="
              position:absolute;top:-8px;left:-8px;
              width:60px;height:60px;
              border-radius:50%;
              background:rgba(34,197,94,0.25);
              animation:pulse-ring 1.8s ease-out infinite;
            "></div>
            <style>
              @keyframes pulse-ring {
                0%   { transform:scale(0.6); opacity:1; }
                100% { transform:scale(1.4); opacity:0; }
              }
            </style>`
          : '';

        const userIcon = L.divIcon({
          html: `<div style="position:relative;width:44px;height:44px;">
            ${pulseRing}
            <div style="
              position:relative;z-index:1;
              width:44px;height:44px;
              border-radius:50% 50% 50% 0;
              background:linear-gradient(135deg,#22c55e,#16a34a);
              transform:rotate(-45deg);
              box-shadow:0 6px 16px rgba(34,197,94,0.55);
              border:3px solid white;
              display:flex;align-items:center;justify-content:center;
            ">
              <span style="transform:rotate(45deg);font-size:18px;line-height:1;">🏠</span>
            </div>
          </div>`,
          className: '',
          iconSize: [44, 44],
          iconAnchor: [22, 44],
          popupAnchor: [0, -44],
        });
        L.marker([userLat, userLng], { icon: userIcon })
          .addTo(map)
          .bindPopup("<b style='font-size:13px'>🏠 Delivery Location</b><br><span style='font-size:11px;color:#666'>Your order arrives here</span>");
      }

      // ── Route line between restaurant and delivery address ──
      if (hasRestaurant && hasUser) {
        const drawRoute = (coords: [number, number][], dist: number, dur: number) => {
          L.polyline(coords, {
            color: '#f97316',
            weight: 5,
            opacity: 0.95,
            dashArray: '14, 8',
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
          map.fitBounds(L.latLngBounds(coords), { padding: [55, 55] });
          setDistance(`${(dist / 1000).toFixed(1)} km`);
          setEta(`~${Math.ceil(dur / 60)} min`);
        };

        const fetchRoute = async () => {
          // 1st: Valhalla
          try {
            const valBody = JSON.stringify({
              locations: [
                { lon: restaurantLng, lat: restaurantLat },
                { lon: userLng, lat: userLat },
              ],
              costing: 'auto',
              directions_options: { units: 'km' },
            });
            const valRes = await fetch('https://valhalla1.openstreetmap.de/route', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: valBody,
            });
            if (valRes.ok) {
              const valData = await valRes.json();
              const leg = valData.trip?.legs?.[0];
              if (leg?.shape) {
                const decoded = decodePolyline(leg.shape, 6);
                const distM = valData.trip.summary.length * 1000;
                const durS = valData.trip.summary.time;
                drawRoute(decoded, distM, durS);
                return;
              }
            }
          } catch { /* fall through */ }

          // 2nd: OSRM
          try {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${restaurantLng},${restaurantLat};${userLng},${userLat}?overview=full&geometries=geojson&alternatives=false&steps=false`;
            const osrmRes = await fetch(osrmUrl);
            const osrmData = await osrmRes.json();
            if (osrmData.routes?.[0]) {
              const route = osrmData.routes[0];
              const coords: [number, number][] = route.geometry.coordinates.map(
                ([lng, lat]: [number, number]) => [lat, lng]
              );
              drawRoute(coords, route.distance, route.duration);
              return;
            }
          } catch { /* fall through */ }

          // 3rd: straight line
          const straightCoords: [number, number][] = [
            [restaurantLat, restaurantLng],
            [userLat, userLng],
          ];
          L.polyline(straightCoords, {
            color: '#f97316',
            weight: 4,
            opacity: 0.75,
            dashArray: '10, 6',
          }).addTo(map);
          map.fitBounds(L.latLngBounds(straightCoords), { padding: [55, 55] });
        };

        fetchRoute();
      }

      leafletMapRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);
      setLoaded(true);
    };

    init();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [restaurantLat, restaurantLng, userLat, userLng, isActive]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden' }}
      />

      {/* Legend (top-right) — same as web */}
      {loaded && (
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          padding: '8px 12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          border: '1px solid #E5E7EB',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, color: '#1F2937', fontFamily: 'Inter, sans-serif' }}>
            <span>🍽️</span> Restaurant
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, color: '#1F2937', fontFamily: 'Inter, sans-serif' }}>
            <span>🏠</span> Your Location
          </div>
        </div>
      )}

    </div>
  );
}
