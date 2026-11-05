import RequireModule from "@/components/RequireModule";
import PlaceholderScreen from "@/screens/PlaceholderScreen";

export default function Inventory() {
  return (
    <RequireModule module="inventory.view">
      <PlaceholderScreen
        title="Inventory"
        description="Track containers and stock levels. Coming soon."
        icon="cube-outline"
      />
    </RequireModule>
  );
}
