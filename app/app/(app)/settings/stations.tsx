import RequireModule from "@/components/RequireModule";
import StationsScreen from "@/screens/StationsScreen";

export default function StationsRoute() {
  return (
    <RequireModule module="settings.stations.view">
      <StationsScreen />
    </RequireModule>
  );
}
