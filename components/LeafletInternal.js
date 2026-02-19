// components/LeafletInternal.js
import L from 'leaflet';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { StyleSheet, Text, View } from 'react-native';

// 🟢 REMOVED the local CSS import that was causing the crash
// import 'leaflet/dist/leaflet.css'; 

// Fix for missing icons (Leaflet default icons often fail in React)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapEvents({ onRegionChange }) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onRegionChange({
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    },
  });
  return null;
}

export default function LeafletInternal({ centerPosition, onRegionChangeComplete }) {
  return (
    <View style={styles.container}>
       {/* 🟢 NEW: Load CSS from CDN to avoid bundler errors */}
       <style type="text/css">{`
            @import url("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
            
            .leaflet-container {
                width: 100%;
                height: 100%;
                z-index: 1;
            }
        `}</style>

      <MapContainer 
        center={centerPosition} 
        zoom={13} 
        scrollWheelZoom={true} 
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onRegionChange={onRegionChangeComplete} />
      </MapContainer>

      <View style={styles.centerMarkerContainer} pointerEvents="none">
         <Text style={{fontSize: 40, marginTop: -40}}>📍</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  centerMarkerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, 
  }
});