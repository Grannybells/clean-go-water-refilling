import { api } from "./api";
import { STORAGE_KEYS } from "./constants";
import { storage } from "./storage";
import type { Settings, SettingsInput } from "@/types/settings";

const BASE = "/api/settings/device";

export async function listSettings(): Promise<Settings[]> {
  const { settings } = await api.get<{ settings: Settings[] }>(BASE);
  return settings;
}

export async function findSettingsByDeviceId(
  deviceId: string,
): Promise<Settings | null> {
  const all = await listSettings();
  return all.find((s) => s.device_id === deviceId) ?? null;
}

export async function createSettings(body: SettingsInput): Promise<Settings> {
  const { settings } = await api.post<{ settings: Settings }>(BASE, body);
  return settings;
}

export async function updateSettings(
  id: number,
  body: SettingsInput,
): Promise<Settings> {
  const { settings } = await api.patch<{ settings: Settings }>(
    `${BASE}/${id}`,
    body,
  );
  return settings;
}

export async function getCachedSettings(): Promise<Settings | null> {
  return storage.get<Settings>(STORAGE_KEYS.settings);
}

export async function cacheSettings(settings: Settings | null): Promise<void> {
  if (settings === null) {
    await storage.remove(STORAGE_KEYS.settings);
    return;
  }
  await storage.set(STORAGE_KEYS.settings, settings);
}
