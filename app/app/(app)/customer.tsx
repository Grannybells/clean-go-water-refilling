import RequireModule from "@/components/RequireModule";
import PlaceholderScreen from "@/screens/PlaceholderScreen";

export default function Customer() {
  return (
    <RequireModule module="customer.view">
      <PlaceholderScreen
        title="Customers"
        description="Browse, add and update customer records. Coming soon."
        icon="people-outline"
      />
    </RequireModule>
  );
}
