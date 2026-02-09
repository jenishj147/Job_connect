import { Redirect } from 'expo-router';

export default function Index() {
  // Immediately redirect to the 'My Jobs' tab
  return <Redirect href="/(tabs)" />;
}