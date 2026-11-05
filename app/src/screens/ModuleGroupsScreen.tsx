import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";

import GroupManageModal from "@/components/GroupManageModal";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import {
  listModuleGroups,
  type ModuleGroupDetail,
  type ModuleGroupSummary,
} from "@/lib/moduleGroups";

export default function ModuleGroupsScreen() {
  const { hasModule } = useAuth();
  const [groups, setGroups] = useState<ModuleGroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ModuleGroupSummary | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const canCreate = hasModule("settings.groups.create");

  const load = useCallback(async () => {
    setError(null);
    try {
      setGroups(await listModuleGroups());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load groups.");
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

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(group: ModuleGroupSummary) {
    setEditing(group);
    setModalOpen(true);
  }

  function handleSaved(detail: ModuleGroupDetail) {
    const summary: ModuleGroupSummary = {
      group_name: detail.group_name,
      modules: detail.modules,
      user_count: detail.user_count,
      is_reserved: detail.is_reserved,
    };
    setGroups((prev) => {
      // Match by original name if we have it (handles rename)
      const originalName = editing?.group_name;
      const idx = prev.findIndex(
        (g) => g.group_name === (originalName ?? detail.group_name),
      );
      if (idx === -1) return [summary, ...prev];
      const next = prev.slice();
      next[idx] = summary;
      return next;
    });
    setEditing(summary);
  }

  function handleDeleted(name: string) {
    setGroups((prev) => prev.filter((g) => g.group_name !== name));
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
      <FlatList
        data={groups}
        keyExtractor={(g) => g.group_name}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          error ? (
            <View className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : undefined
        }
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          <View className="mt-16 items-center">
            <Ionicons name="people-circle-outline" size={40} color="#94a3b8" />
            <Text className="mt-2 text-sm text-slate-500">No groups.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openEdit(item)}
            className="rounded-2xl bg-white p-4 shadow-sm active:bg-brand-50"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-900">
                  {item.group_name}
                </Text>
                <Text className="text-xs text-slate-500">
                  {item.user_count} user{item.user_count === 1 ? "" : "s"} ·{" "}
                  {item.modules.length} module
                  {item.modules.length === 1 ? "" : "s"}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                {item.is_reserved ? (
                  <View className="rounded-full bg-amber-100 px-2 py-0.5">
                    <Text className="text-[10px] font-semibold uppercase text-amber-700">
                      reserved
                    </Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </View>
            </View>
            <View className="mt-3 flex-row flex-wrap gap-1.5">
              {item.modules.slice(0, 8).map((m) => (
                <View
                  key={m}
                  className="rounded-full bg-slate-100 px-2.5 py-1"
                >
                  <Text className="text-[11px] font-medium text-slate-700">
                    {m}
                  </Text>
                </View>
              ))}
              {item.modules.length > 8 ? (
                <View className="rounded-full bg-slate-200 px-2.5 py-1">
                  <Text className="text-[11px] font-medium text-slate-600">
                    +{item.modules.length - 8} more
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        )}
      />

      {canCreate ? (
        <Pressable
          onPress={openCreate}
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-brand-600 shadow-lg active:bg-brand-700"
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </Pressable>
      ) : null}

      <GroupManageModal
        visible={modalOpen}
        group={editing}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </View>
  );
}
