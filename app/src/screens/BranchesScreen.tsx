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

import BranchFormModal from "@/components/BranchFormModal";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { listBranches } from "@/lib/branches";
import type { Branch } from "@/types/branch";

function isActive(branch: Branch): boolean {
  return branch.is_active === true || branch.is_active === 1;
}

export default function BranchesScreen() {
  const { hasModule } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const canCreate = hasModule("settings.branches.create");

  const load = useCallback(async () => {
    setError(null);
    try {
      setBranches(await listBranches());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load branches.",
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

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setFormOpen(true);
  }

  function handleSaved(saved: Branch) {
    setBranches((prev) => {
      const idx = prev.findIndex((b) => b.branch_id === saved.branch_id);
      if (idx === -1) return [saved, ...prev];
      const next = prev.slice();
      next[idx] = saved;
      return next;
    });
  }

  function handleDeleted(id: string) {
    setBranches((prev) => prev.filter((b) => b.branch_id !== id));
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
        data={branches}
        keyExtractor={(b) => b.branch_id}
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
            <Ionicons name="business-outline" size={40} color="#94a3b8" />
            <Text className="mt-2 text-sm text-slate-500">No branches yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openEdit(item)}
            className="rounded-2xl bg-white p-4 shadow-sm active:bg-brand-50"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-base font-semibold text-slate-900">
                  {item.branch_name}
                </Text>
                <Text className="text-xs text-slate-500">
                  ID: {item.branch_id}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View
                  className={`rounded-full px-2 py-0.5 ${
                    isActive(item) ? "bg-emerald-100" : "bg-slate-200"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-semibold uppercase ${
                      isActive(item) ? "text-emerald-700" : "text-slate-600"
                    }`}
                  >
                    {isActive(item) ? "active" : "inactive"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </View>
            </View>
            {item.branch_address ? (
              <Text className="mt-2 text-xs text-slate-600">
                {item.branch_address}
              </Text>
            ) : null}
            {item.contact_number ? (
              <Text className="mt-1 text-xs text-slate-500">
                {item.contact_number}
              </Text>
            ) : null}
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

      <BranchFormModal
        visible={formOpen}
        branch={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </View>
  );
}
