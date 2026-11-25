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

import CustomerFormModal from "@/components/CustomerFormModal";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { listCustomers } from "@/lib/customers";
import type { Customer } from "@/types/customer";

export default function CustomersScreen() {
  const { hasModule } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const canCreate = hasModule("customer.create");

  const load = useCallback(async () => {
    setError(null);
    try {
      setCustomers(await listCustomers());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load customers.",
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

  function openEdit(customer: Customer) {
    setEditing(customer);
    setFormOpen(true);
  }

  function handleSaved(saved: Customer) {
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.cus_refno === saved.cus_refno);
      if (idx === -1) return [saved, ...prev];
      const next = prev.slice();
      next[idx] = saved;
      return next;
    });
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
        data={customers}
        keyExtractor={(c) => String(c.cus_refno)}
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
            <Ionicons name="people-outline" size={40} color="#94a3b8" />
            <Text className="mt-2 text-sm text-slate-500">
              No customers yet.
            </Text>
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
                  {item.cus_name}
                </Text>
                <Text className="text-xs text-slate-500">
                  {item.cus_code} · #{item.cus_refno}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="rounded-full bg-brand-100 px-2 py-0.5">
                  <Text className="text-[10px] font-semibold uppercase text-brand-700">
                    {item.cus_type}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </View>
            </View>
            {item.cus_address ? (
              <Text className="mt-2 text-xs text-slate-600">
                {item.cus_address}
              </Text>
            ) : null}
            {item.cus_contactno ? (
              <Text className="mt-1 text-xs text-slate-500">
                {item.cus_contactno}
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

      <CustomerFormModal
        visible={formOpen}
        customer={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </View>
  );
}
