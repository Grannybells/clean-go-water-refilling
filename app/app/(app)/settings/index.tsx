import { Redirect } from "expo-router";

import { useAuth } from "@/context/AuthContext";

export default function SettingsIndex() {
  const { hasModule, status } = useAuth();
  if (status === "loading") return null;
  if (status === "unauthenticated") return <Redirect href="/(auth)/login" />;

  if (hasModule("settings.device.view")) return <Redirect href="/settings/device" />;
  if (hasModule("settings.stations.view")) return <Redirect href="/settings/stations" />;
  if (hasModule("settings.groups.view")) return <Redirect href="/settings/groups" />;
  if (hasModule("settings.modules.view")) return <Redirect href="/settings/modules" />;
  return <Redirect href="/" />;
}
