import RequireModule from "@/components/RequireModule";
import ModuleGroupsScreen from "@/screens/ModuleGroupsScreen";

export default function GroupsRoute() {
  return (
    <RequireModule module="settings.groups.view">
      <ModuleGroupsScreen />
    </RequireModule>
  );
}
