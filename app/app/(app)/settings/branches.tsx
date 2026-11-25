import RequireModule from "@/components/RequireModule";
import BranchesScreen from "@/screens/BranchesScreen";

export default function BranchesRoute() {
  return (
    <RequireModule module="settings.branches.view">
      <BranchesScreen />
    </RequireModule>
  );
}
