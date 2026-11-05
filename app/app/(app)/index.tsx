import RequireModule from "@/components/RequireModule";
import HomeScreen from "@/screens/HomeScreen";

export default function HomeRoute() {
  return (
    <RequireModule module="home.view">
      <HomeScreen />
    </RequireModule>
  );
}
