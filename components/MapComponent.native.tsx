import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Animated from 'react-native-reanimated';

export default function MapComponent({ restaurantLat, restaurantLng, userLat, userLng, routeCoords, isActive, animatedPulseStyle }: any) {
  return (
    <MapView
      style={StyleSheet.absoluteFillObject}
      initialRegion={{
        latitude: (restaurantLat + userLat) / 2,
        longitude: (restaurantLng + userLng) / 2,
        latitudeDelta: Math.abs(restaurantLat - userLat) * 1.6 + 0.015,
        longitudeDelta: Math.abs(restaurantLng - userLng) * 1.6 + 0.015,
      }}
    >
      <Marker coordinate={{ latitude: restaurantLat, longitude: restaurantLng }}>
        <View style={styles.restMarker}>
          <Text style={{ fontSize: 16 }}>🍽️</Text>
        </View>
      </Marker>
      <Marker coordinate={{ latitude: userLat, longitude: userLng }}>
        <View style={styles.userMarker}>
          {isActive && <Animated.View style={[styles.pulsingUserMarker, animatedPulseStyle]} />}
          <View style={styles.userDotMarker}>
            <Text style={{ fontSize: 16 }}>🏠</Text>
          </View>
        </View>
      </Marker>
      {routeCoords.length > 0 && (
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
