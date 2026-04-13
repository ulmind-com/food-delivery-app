import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Animated from 'react-native-reanimated';

export default function MapComponent({ restaurantLat, restaurantLng, userLat, userLng, routeCoords, isActive, animatedPulseStyle }: any) {
  // Safety: validate all coordinates are real numbers before rendering
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

  return (
    <MapView
      style={StyleSheet.absoluteFillObject}
      initialRegion={{
        latitude: (rLat + uLat) / 2,
        longitude: (rLng + uLng) / 2,
        latitudeDelta: Math.abs(rLat - uLat) * 1.6 + 0.015,
        longitudeDelta: Math.abs(rLng - uLng) * 1.6 + 0.015,
      }}
    >
      <Marker coordinate={{ latitude: rLat, longitude: rLng }}>
        <View style={styles.restMarker}>
          <Text style={{ fontSize: 16 }}>🍽️</Text>
        </View>
      </Marker>
      <Marker coordinate={{ latitude: uLat, longitude: uLng }}>
        <View style={styles.userMarker}>
          {isActive && <Animated.View style={[styles.pulsingUserMarker, animatedPulseStyle]} />}
          <View style={styles.userDotMarker}>
            <Text style={{ fontSize: 16 }}>🏠</Text>
          </View>
        </View>
      </Marker>
      {Array.isArray(routeCoords) && routeCoords.length > 0 && (
        <Polyline 
          coordinates={routeCoords} 
          strokeWidth={4} 
          strokeColor={'#FC8019'} 
          lineDashPattern={[10, 8]}
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  restMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EA580C', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', elevation: 4 },
  userMarker: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48 },
  pulsingUserMarker: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(34,197,94,0.3)' },
  userDotMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', elevation: 4 },
});
