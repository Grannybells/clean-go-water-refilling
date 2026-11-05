import RequireModule from "@/components/RequireModule";
import SettingsScreen from "@/screens/SettingsScreen";

export default function DeviceSettings() {
  return (
    <RequireModule module="settings.device.view">
      <SettingsScreen />
    </RequireModule>
  );
}
