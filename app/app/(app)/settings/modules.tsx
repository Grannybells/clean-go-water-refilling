import RequireModule from "@/components/RequireModule";
import ModulesCatalogScreen from "@/screens/ModulesCatalogScreen";

export default function ModulesRoute() {
  return (
    <RequireModule module="settings.modules.view">
      <ModulesCatalogScreen />
    </RequireModule>
  );
}
