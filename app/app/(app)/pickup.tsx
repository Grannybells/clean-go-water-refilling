import RequireModule from "@/components/RequireModule";
import PickupScreen from "@/screens/PickupScreen";

export default function Pickup() {
  return (
    <RequireModule module="pickup.view">
      <PickupScreen />
    </RequireModule>
  );
}
