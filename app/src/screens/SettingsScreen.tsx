import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import StationPickerModal from "@/components/StationPickerModal";
import UserPickerModal from "@/components/UserPickerModal";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { getDeviceInfo, type DeviceInfo } from "@/lib/device";
import {
  cacheSettings,
  createSettings,
  findSettingsByDeviceId,
  getCachedSettings,
  updateSettings,
} from "@/lib/settings";
import { listStations } from "@/lib/stations";
import type { Settings } from "@/types/settings";
import type { Station } from "@/types/station";
import type { User } from "@/types/user";

type Status = "loading" | "ready";

type FormState = {
  station_id: string;
  station_name: string;
  user_id: number | null;
  user_name: string;
};

function initialForm(settings: Settings | null): FormState {
  return {
    station_id: settings?.station_id ?? "",
    station_name: settings?.station_name ?? "",
    user_id: settings?.user_id ?? null,
    user_name: settings?.user_name ?? "",
  };
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text
        className="ml-4 flex-1 text-right text-xs font-medium text-slate-700"
        numberOfLines={1}
      >
        {value ?? "—"}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { hasModule } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [form, setForm] = useState<FormState>(initialForm(null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [stationPickerOpen, setStationPickerOpen] = useState(false);
  const [userPickerOpen, setUserPickerOpen] = useState(false);

  const canEdit =
    settings === null
      ? hasModule("settings.device.create")
      : hasModule("settings.device.edit");

  const sync = useCallback(async (info: DeviceInfo) => {
    try {
      const remote = await findSettingsByDeviceId(info.device_id);
      await cacheSettings(remote);
      return remote;
    } catch {
      return null;
    }
  }, []);

  const loadStations = useCallback(async () => {
    setStationsError(null);
    try {
      setStations(await listStations());
    } catch (err) {
      setStations([]);
      setStationsError(
        err instanceof ApiError
          ? err.status === 403
            ? "You don't have access to the station list."
            : err.message
          : "Could not load stations.",
      );
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const [cached, info] = await Promise.all([
        getCachedSettings(),
        getDeviceInfo(),
      ]);
      setDevice(info);
      if (cached) {
        setSettings(cached);
        setForm(initialForm(cached));
      }
      setStatus("ready");

      await Promise.all([
        (async () => {
          const remote = await sync(info);
          if (remote) {
            setSettings(remote);
            setForm(initialForm(remote));
          } else if (!cached) {
            setSettings(null);
            setForm(initialForm(null));
          }
        })(),
        loadStations(),
      ]);
    })();
  }, [sync, loadStations]);

  async function handleRefresh() {
    if (!device) return;
    setRefreshing(true);
    const [remote] = await Promise.all([sync(device), loadStations()]);
    if (remote) {
      setSettings(remote);
      setForm(initialForm(remote));
    }
    setRefreshing(false);
  }

  function pickUser(u: User) {
    const full = `${u.first_name} ${u.last_name}`.trim() || u.email;
    setForm((p) => ({ ...p, user_id: u.id, user_name: full }));
  }

  function clearUser() {
    setForm((p) => ({ ...p, user_id: null, user_name: "" }));
  }

  async function handleSave() {
    if (!device || saving || !canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        station_id: form.station_id.trim() || null,
        station_name: form.station_name.trim() || null,
        user_id: form.user_id,
        user_name: form.user_name.trim() || null,
        device_id: device.device_id,
        device_name: device.device_name,
        device_model: device.device_model,
        os_name: device.os_name,
        os_version: device.os_version,
        app_version: device.app_version,
        last_seen_at: new Date().toISOString(),
      };

      const saved = settings
        ? await updateSettings(settings.id, payload)
        : await createSettings(payload);

      setSettings(saved);
      setForm(initialForm(saved));
      await cacheSettings(saved);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-brand-50">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-brand-50"
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="rounded-2xl bg-white p-5 shadow-sm">
          <View className="flex-row items-center gap-2">
            <Ionicons name="business-outline" size={18} color="#1858b8" />
            <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Station
            </Text>
          </View>

          <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
            Assigned station
          </Text>
          <Pressable
            onPress={() => setStationPickerOpen(true)}
            disabled={!canEdit || saving || stations.length === 0}
            className={`flex-row items-center justify-between rounded-xl border px-4 py-3 ${
              !canEdit || stations.length === 0
                ? "border-slate-200 bg-slate-100"
                : "border-slate-200 bg-slate-50 active:bg-brand-50"
            }`}
          >
            <View className="flex-1 pr-3">
              {form.station_id ? (
                <>
                  <Text className="text-base font-semibold text-slate-900">
                    {form.station_name || form.station_id}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    ID: {form.station_id}
                  </Text>
                </>
              ) : (
                <Text className="text-base text-slate-400">
                  {stations.length === 0
                    ? "No stations available"
                    : "Choose a station"}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={18} color="#94a3b8" />
          </Pressable>

          {stationsError ? (
            <Text className="mt-2 text-xs text-red-600">{stationsError}</Text>
          ) : null}
        </View>

        <View className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <View className="flex-row items-center gap-2">
            <Ionicons name="person-outline" size={18} color="#1858b8" />
            <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Assigned user
            </Text>
          </View>

          <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
            Operator on this device
          </Text>
          <Pressable
            onPress={() => setUserPickerOpen(true)}
            disabled={!canEdit || saving}
            className={`flex-row items-center justify-between rounded-xl border px-4 py-3 ${
              !canEdit
                ? "border-slate-200 bg-slate-100"
                : "border-slate-200 bg-slate-50 active:bg-brand-50"
            }`}
          >
            <View className="flex-1 pr-3">
              {form.user_id !== null ? (
                <>
                  <Text className="text-base font-semibold text-slate-900">
                    {form.user_name || `User #${form.user_id}`}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    ID: {form.user_id}
                  </Text>
                </>
              ) : (
                <Text className="text-base text-slate-400">Choose a user</Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={18} color="#94a3b8" />
          </Pressable>
        </View>

        <View className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <View className="flex-row items-center gap-2">
            <Ionicons name="phone-portrait-outline" size={18} color="#1858b8" />
            <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Device
            </Text>
          </View>
          <Text className="mt-0.5 text-[11px] text-slate-500">
            Collected automatically from this device.
          </Text>
          <View className="mt-3">
            <InfoRow label="Device name" value={device?.device_name ?? null} />
            <InfoRow label="Model" value={device?.device_model ?? null} />
            <InfoRow
              label="OS"
              value={
                device
                  ? `${device.os_name ?? "—"} ${device.os_version ?? ""}`
                  : null
              }
            />
            <InfoRow label="App version" value={device?.app_version ?? null} />
            <InfoRow label="Device ID" value={device?.device_id ?? null} />
          </View>
        </View>

        <View className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Sync status
          </Text>
          <View className="mt-2">
            <InfoRow
              label="Record"
              value={settings ? `#${settings.id}` : "Not created yet"}
            />
            <InfoRow
              label="Last updated"
              value={
                settings?.updated_at
                  ? new Date(settings.updated_at).toLocaleString()
                  : null
              }
            />
            {savedAt ? <InfoRow label="Just saved" value={savedAt} /> : null}
          </View>
        </View>

        {error ? (
          <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleSave}
          disabled={!canEdit || saving}
          className={`mt-6 rounded-xl px-4 py-3 ${
            !canEdit || saving
              ? "bg-brand-500/50"
              : "bg-brand-600 active:bg-brand-700"
          }`}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-center text-base font-semibold text-white">
              {settings ? "Update settings" : "Create settings"}
            </Text>
          )}
        </Pressable>

        {!canEdit ? (
          <Text className="mt-2 text-center text-xs text-slate-500">
            You don't have the module to {settings ? "edit" : "create"} settings.
          </Text>
        ) : null}
      </ScrollView>

      <StationPickerModal
        visible={stationPickerOpen}
        stations={stations}
        selectedId={form.station_id || null}
        onClose={() => setStationPickerOpen(false)}
        onSelect={(s) =>
          setForm((p) => ({
            ...p,
            station_id: s.station_id,
            station_name: s.station_name,
          }))
        }
        onClear={() =>
          setForm((p) => ({ ...p, station_id: "", station_name: "" }))
        }
      />

      <UserPickerModal
        visible={userPickerOpen}
        selectedId={form.user_id}
        onClose={() => setUserPickerOpen(false)}
        onSelect={pickUser}
        onClear={clearUser}
      />
    </KeyboardAvoidingView>
  );
}
