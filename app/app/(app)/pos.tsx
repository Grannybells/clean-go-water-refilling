import RequireModule from "@/components/RequireModule";
import HomeScreen from "@/screens/HomeScreen";

export default function PosRoute() {
  return (
    <RequireModule module="water.pos.view">
      <HomeScreen />
    </RequireModule>
  );
}
