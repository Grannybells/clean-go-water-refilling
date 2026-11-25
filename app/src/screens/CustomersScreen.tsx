import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";

import CustomerFormModal from "@/components/CustomerFormModal";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { listCustomers } from "@/lib/customers";
import { formatPeso } from "@/lib/products";
import type { Customer } from "@/types/customer";

const COLS = {
  name: 2.4,
  type: 0.9,
  contact: 1.6,
  address: 2.4,
  balance: 1.3,
};

export default function CustomersScreen() {
  const { hasModule } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");

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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      return (
        c.cus_name.toLowerCase().includes(q) ||
        (c.cus_contactno ?? "").toLowerCase().includes(q) ||
        (c.cus_address ?? "").toLowerCase().includes(q) ||
        (c.cus_type_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, query]);

  const totals = useMemo(() => {
    let balance = 0;
    for (const c of visible) balance += Number(c.balance_due) || 0;
    return { count: visible.length, balance };
  }, [visible]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-50">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-50">
      <View className="border-b border-slate-200 bg-white px-4 py-3">
        <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, type, contact, or address"
            autoCapitalize="none"
            autoCorrect={false}
            className="ml-2 flex-1 py-2 text-sm text-slate-900"
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View className="flex-row border-b border-slate-200 bg-slate-100 px-3 py-2">
        <Text
          style={{ flex: COLS.name }}
          className="pr-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Name
        </Text>
        <Text
          style={{ flex: COLS.type }}
          className="pr-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Type
        </Text>
        <Text
          style={{ flex: COLS.contact }}
          className="pr-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Contact
        </Text>
        <Text
          style={{ flex: COLS.address }}
          className="pr-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Address
        </Text>
        <Text
          style={{ flex: COLS.balance }}
          className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Balance
        </Text>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(c) => String(c.cus_refno)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          error ? (
            <View className="m-3 rounded-xl border border-red-200 bg-red-50 p-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <View className="mt-16 items-center">
            <Ionicons name="people-outline" size={40} color="#94a3b8" />
            <Text className="mt-2 text-sm text-slate-500">
              {query.trim() ? "No matches." : "No customers yet."}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const zebra = index % 2 === 0 ? "bg-white" : "bg-slate-50";
          const owes = Number(item.balance_due) > 0;
          return (
            <Pressable
              onPress={() => openEdit(item)}
              className={`flex-row items-center border-b border-slate-100 px-3 py-2.5 active:bg-brand-50 ${zebra}`}
            >
              <Text
                style={{ flex: COLS.name }}
                className="pr-2 text-sm font-semibold text-slate-900"
                numberOfLines={1}
              >
                {item.cus_name}
              </Text>
              <View style={{ flex: COLS.type }} className="pr-2">
                <View className="self-start rounded-full bg-brand-100 px-2 py-0.5">
                  <Text className="text-xs font-semibold uppercase text-brand-700">
                    {item.cus_type_name ?? item.cus_type}
                  </Text>
                </View>
              </View>
              <Text
                style={{ flex: COLS.contact }}
                className="pr-2 text-sm text-slate-700"
                numberOfLines={1}
              >
                {item.cus_contactno ?? "—"}
              </Text>
              <Text
                style={{ flex: COLS.address }}
                className="pr-2 text-sm text-slate-700"
                numberOfLines={1}
              >
                {item.cus_address ?? "—"}
              </Text>
              <Text
                style={{ flex: COLS.balance }}
                className={`text-right text-sm font-semibold ${
                  owes ? "text-rose-600" : "text-slate-400"
                }`}
                numberOfLines={1}
              >
                {owes ? formatPeso(Number(item.balance_due)) : ""}
              </Text>
            </Pressable>
          );
        }}
      />

      <View className="border-t border-slate-200 bg-white px-4 py-3">
        <View className="flex-row items-baseline justify-between">
          <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Customers ({totals.count})
          </Text>
          <Text
            className={`text-lg font-bold ${
              totals.balance > 0 ? "text-rose-600" : "text-slate-400"
            }`}
          >
            {formatPeso(totals.balance)}
          </Text>
        </View>
      </View>

      {canCreate ? (
        <Pressable
          onPress={openCreate}
          className="absolute bottom-20 right-6 h-14 w-14 items-center justify-center rounded-full bg-brand-600 shadow-lg active:bg-brand-700"
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
