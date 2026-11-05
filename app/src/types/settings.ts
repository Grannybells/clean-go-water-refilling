export interface Settings {
  id: number;
  station_id: string | null;
  station_name: string | null;
  user_id: number | null;
  user_name: string | null;
  device_id: string | null;
  device_name: string | null;
  device_model: string | null;
  os_name: string | null;
  os_version: string | null;
  app_version: string | null;
  push_token: string | null;
  last_seen_at: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export type SettingsInput = Partial<
  Omit<Settings, "id" | "created_by" | "created_at" | "updated_at">
>;
