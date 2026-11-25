import RequireModule from "@/components/RequireModule";
import CustomersScreen from "@/screens/CustomersScreen";

export default function Customer() {
  return (
    <RequireModule module="customer.view">
      <CustomersScreen />
    </RequireModule>
  );
}
