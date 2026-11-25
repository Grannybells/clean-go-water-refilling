import RequireModule from "@/components/RequireModule";
import DeliveryScreen from "@/screens/DeliveryScreen";

export default function Delivery() {
  return (
    <RequireModule module="delivery.view">
      <DeliveryScreen />
    </RequireModule>
  );
}
