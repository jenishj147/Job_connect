import MapView from 'react-native-maps'; // Standard import

// Make sure 'export default' is here!
export default function MapComponent({ style, initialRegion, onRegionChangeComplete, showsUserLocation }) {
  return (
    <MapView
      style={style}
      initialRegion={initialRegion}
      onRegionChangeComplete={onRegionChangeComplete}
      showsUserLocation={showsUserLocation}
    />
  );
}