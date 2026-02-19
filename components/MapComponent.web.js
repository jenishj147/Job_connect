import React, { Suspense } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

// 🟢 Lazy load the internal component
// This ensures 'leaflet' is only imported on the client-side browser
const LeafletMap = React.lazy(() => import('./LeafletInternal'));

export default function MapComponent({ initialRegion, onRegionChangeComplete }) {
  // Guard clause: If we are on the server (no window), render nothing or a loading spinner
  if (typeof window === 'undefined') {
    return <ActivityIndicator size="large" />;
  }

  const centerPosition = [initialRegion.latitude, initialRegion.longitude];

  return (
    <Suspense fallback={
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text>Loading Map...</Text>
        </View>
    }>
        <LeafletMap 
            centerPosition={centerPosition} 
            onRegionChangeComplete={onRegionChangeComplete} 
        />
    </Suspense>
  );
}