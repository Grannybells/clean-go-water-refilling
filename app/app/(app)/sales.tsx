import RequireModule from "@/components/RequireModule";
import PlaceholderScreen from "@/screens/PlaceholderScreen";

export default function Sales() {
  return (
    <RequireModule module="sales.view">
      <PlaceholderScreen
        title="Sales"
        description="Record new sales and review daily totals. Coming soon."
        icon="cash-outline"
      />
    </RequireModule>
  );
}
