import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * Drop-in replacement for the order-details MapComponent on Android.
 * Uses OpenStreetMap + Leaflet — 100% free, no Google API key needed.
 * Shows restaurant marker, user marker, and a dashed polyline route.
 */
export default function MapComponent({ restaurantLat, restaurantLng, userLat, userLng, routeCoords, isActive, animatedPulseStyle }: any) {
  const rLat = Number(restaurantLat);
  const rLng = Number(restaurantLng);
  const uLat = Number(userLat);
  const uLng = Number(userLng);

  if (!isFinite(rLat) || !isFinite(rLng) || !isFinite(uLat) || !isFinite(uLng)) {
    return (
      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }]}>
        <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: '#9CA3AF' }}>Map coordinates unavailable</Text>
      </View>
    );
  }

  const centerLat = (rLat + uLat) / 2;
  const centerLng = (rLng + uLng) / 2;

  // Build route polyline JS
  const routeJS = Array.isArray(routeCoords) && routeCoords.length > 0
    ? `L.polyline([${routeCoords.map((c: any) => `[${c.latitude},${c.longitude}]`).join(',')}], { color: '#FC8019', weight: 4, dashArray: '10 8' }).addTo(map);`
    : '';

  const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; }
        html, body, #map { width: 100%; height: 100%; }
        .marker-emoji {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 50%; border: 3px solid #fff;
          font-size: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .rest-marker { background: #EA580C; }
        .user-marker { background: #16A34A; }
        ${isActive ? `
        .pulse-ring {
          position: absolute; width: 48px; height: 48px; border-radius: 50%;
          background: rgba(34,197,94,0.3); top: -9px; left: -9px;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100% { transform: scale(0.8); opacity: 0.7; } 50% { transform: scale(1.2); opacity: 0.2; } }
        ` : ''}
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var latDelta = Math.abs(${rLat} - ${uLat}) * 1.6 + 0.015;
        var lngDelta = Math.abs(${rLng} - ${uLng}) * 1.6 + 0.015;
        
        var map = L.map('map', { zoomControl: false }).setView([${centerLat}, ${centerLng}], 14);
        
        // Fit to bounds
        map.fitBounds([[${rLat}, ${rLng}], [${uLat}, ${uLng}]], { padding: [40, 40] });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OSM',
          maxZoom: 19,
        }).addTo(map);

        // Restaurant marker
        var restIcon = L.divIcon({
          className: '',
          html: '<div class="marker-emoji rest-marker">🍽️</div>',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
        L.marker([${rLat}, ${rLng}], { icon: restIcon }).addTo(map);

        // User marker
        var userIcon = L.divIcon({
          className: '',
          html: '${isActive ? '<div class="pulse-ring"></div>' : ''}<div class="marker-emoji user-marker">🏠</div>',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
        L.marker([${uLat}, ${uLng}], { icon: userIcon }).addTo(map);

        // Route polyline
        ${routeJS}
      </script>
    </body>
    </html>
  `;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <WebView
        source={{ html: leafletHTML }}
        style={StyleSheet.absoluteFillObject}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
