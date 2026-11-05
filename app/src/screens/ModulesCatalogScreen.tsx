import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import ModuleDescriptionModal from "@/components/ModuleDescriptionModal";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { listModules, type ModuleEntry } from "@/lib/modulesCatalog";

function groupByPage(entries: ModuleEntry[]): Record<string, ModuleEntry[]> {
  const out: Record<string, ModuleEntry[]> = {};
  for (const e of entries) {
    const key = e.page;
    if (!out[key]) out[key] = [];
    out[key].push(e);
  }
  return out;
}

function actionColor(action: string): { bg: string; fg: string } {
  switch (action) {
    case "view":
      return { bg: "bg-slate-100", fg: "text-slate-700" };
    case "create":
      return { bg: "bg-emerald-100", fg: "text-emerald-700" };
    case "edit":
      return { bg: "bg-brand-100", fg: "text-brand-700" };
    case "delete":
      return { bg: "bg-red-100", fg: "text-red-700" };
    default:
      return { bg: "bg-slate-200", fg: "text-slate-700" };
  }
}

export default function ModulesCatalogScreen() {
  const { hasModule } = useAuth();
  const canEdit = hasModule("settings.modules.edit");

  const [entries, setEntries] = useState<ModuleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ModuleEntry | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const grouped = useMemo(() => groupByPage(entries), [entries]);
  const pages = useMemo(() => Object.keys(grouped), [grouped]);

  const load = useCallback(async () => {
    setError(null);
    try {
      setEntries(await listModules());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load modules.",
      );
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function openEdit(entry: ModuleEntry) {
    if (!canEdit) return;
    setEditing(entry);
    setModalOpen(true);
  }

  function handleSaved(updated: ModuleEntry) {
    setEntries((prev) =>
      prev.map((e) => (e.module_name === updated.module_name ? updated : e)),
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-50">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-50">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {error ? (
          <View className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
          <Text className="text-xs text-slate-600">
            The catalog is code-managed in{" "}
            <Text className="font-mono">src/config/modules.ts</Text>. Only
            descriptions can be edited here{canEdit ? "" : " (needs settings.modules.edit)"}.
          </Text>
        </View>

        {pages.length === 0 ? (
          <View className="mt-16 items-center">
            <Ionicons name="grid-outline" size={40} color="#94a3b8" />
            <Text className="mt-2 text-sm text-slate-500">
              No modules in the catalog.
            </Text>
          </View>
        ) : (
          pages.map((page) => (
            <View key={page} className="mb-3 rounded-2xl bg-white p-4 shadow-sm">
              <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {page}
              </Text>
              <View className="mt-2 gap-2">
                {grouped[page].map((m) => {
                  const c = actionColor(m.action);
                  return (
                    <Pressable
                      key={m.module_name}
                      onPress={() => openEdit(m)}
                      disabled={!canEdit}
                      className={`flex-row items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 ${
                        canEdit ? "active:bg-brand-50" : ""
                      }`}
                    >
                      <View className="flex-1 pr-3">
                        <Text className="text-sm font-semibold text-slate-800">
                          {m.module_name}
                        </Text>
                        {m.description ? (
                          <Text className="text-[11px] text-slate-500">
                            {m.description}
                          </Text>
                        ) : (
                          <Text className="text-[11px] italic text-slate-400">
                            No description
                          </Text>
                        )}
                      </View>
                      <View className={`rounded-full px-2 py-0.5 ${c.bg}`}>
                        <Text
                          className={`text-[10px] font-semibold uppercase ${c.fg}`}
                        >
                          {m.action}
                        </Text>
                      </View>
                      {canEdit ? (
                        <Ionicons
                          name="pencil"
                          size={14}
                          color="#94a3b8"
                          style={{ marginLeft: 8 }}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <ModuleDescriptionModal
        visible={modalOpen}
        module={editing}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </View>
  );
}
