import RequireModule from "@/components/RequireModule";
import SalesScreen from "@/screens/SalesScreen";

export default function Sales() {
  return (
    <RequireModule module="water.sales.view">
      <SalesScreen />
    </RequireModule>
  );
}
