import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * Drop-in replacement for react-native-maps MapView on Android.
 * Uses OpenStreetMap + Leaflet (100% free, no API key needed).
 * Supports initialRegion, onRegionChangeComplete, style, and children are ignored on native
 * (markers are rendered inside the Leaflet HTML).
 */
const NativeMapView = forwardRef((props: any, ref: any) => {
  const { initialRegion, onRegionChangeComplete, style, showsUserLocation, ...rest } = props;
  const webRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  const lat = initialRegion?.latitude ?? 22.0531;
  const lng = initialRegion?.longitude ?? 88.0772;
  const zoom = 15;

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: any, duration?: number) => {
      if (webRef.current) {
        webRef.current.injectJavaScript(`
          map.flyTo([${region.latitude}, ${region.longitude}], 16, { duration: ${(duration || 500) / 1000} });
          true;
        `);
      }
    },
  }));

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
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], ${zoom});
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        map.on('moveend', function() {
          var c = map.getCenter();
          var b = map.getBounds();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'regionChange',
            latitude: c.lat,
            longitude: c.lng,
            latitudeDelta: b.getNorth() - b.getSouth(),
            longitudeDelta: b.getEast() - b.getWest(),
          }));
        });
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'regionChange' && onRegionChangeComplete) {
        onRegionChangeComplete({
          latitude: data.latitude,
          longitude: data.longitude,
          latitudeDelta: data.latitudeDelta,
          longitudeDelta: data.longitudeDelta,
        });
      }
    } catch {}
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webRef}
        source={{ html: leafletHTML }}
        style={StyleSheet.absoluteFillObject}
        onMessage={handleMessage}
        onLoad={() => setReady(true)}
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
});

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
});

export default NativeMapView;
