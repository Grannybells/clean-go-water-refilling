import RequireModule from "@/components/RequireModule";
import DashboardScreen from "@/screens/DashboardScreen";

export default function HomeRoute() {
  return (
    <RequireModule module="home.view">
      <DashboardScreen />
    </RequireModule>
  );
}
