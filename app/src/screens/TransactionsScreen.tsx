import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatPeso } from "@/lib/products";
import {
  getTransaction,
  listTransactions,
  type TxnHeader,
  type TxnWithDetails,
} from "@/lib/transactions";

const TYPE_LABEL: Record<string, string> = {
  WI: "Walk-in",
  PU: "Pickup",
  DL: "Delivery",
};

const STATUS_LABEL: Record<string, string> = {
  C: "Closed",
  P: "Pending",
  D: "Delivered",
};

const PAY_LABEL: Record<string, string> = {
  CS: "Cash",
  QR: "QR.PH",
  GC: "GCash",
  CR: "Credit",
};

function statusClasses(status: string): string {
  switch (status) {
    case "C":
      return "bg-emerald-100 text-emerald-700";
    case "P":
      return "bg-amber-100 text-amber-700";
    case "D":
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function typeClasses(type: string): string {
  switch (type) {
    case "WI":
      return "bg-slate-100 text-slate-700";
    case "PU":
      return "bg-brand-100 text-brand-700";
    case "DL":
      return "bg-indigo-100 text-indigo-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function TransactionsScreen() {
  const [rows, setRows] = useState<TxnHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "WI" | "PU" | "DL">("ALL");
  const [selected, setSelected] = useState<TxnWithDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await listTransactions());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load transactions.",
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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const totals = useMemo(() => {
    let count = 0;
    let amount = 0;
    for (const r of rows) {
      if (filter !== "ALL" && r.wth_type !== filter) continue;
      count += 1;
      amount += Number(r.wth_totalamt) || 0;
    }
    return { count, amount };
  }, [rows, filter]);

  const visible = useMemo(
    () => (filter === "ALL" ? rows : rows.filter((r) => r.wth_type === filter)),
    [rows, filter],
  );

  async function openDetail(docno: string) {
    setDetailError(null);
    setDetailLoading(true);
    setSelected({
      header: rows.find((r) => r.wth_docno === docno) as TxnHeader,
      details: [],
    });
    try {
      const txn = await getTransaction(docno);
      setSelected(txn);
    } catch (err) {
      setDetailError(
        err instanceof ApiError ? err.message : "Could not load details.",
      );
    } finally {
      setDetailLoading(false);
    }
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
      <View className="border-b border-slate-200 bg-white px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {totals.count} txn{totals.count === 1 ? "" : "s"}
          </Text>
          <Text className="text-sm font-bold text-slate-900">
            {formatPeso(totals.amount)}
          </Text>
        </View>
        <View className="mt-2 flex-row gap-2">
          {(["ALL", "WI", "PU", "DL"] as const).map((k) => {
            const active = filter === k;
            return (
              <Pressable
                key={k}
                onPress={() => setFilter(k)}
                className={`rounded-full px-3 py-1.5 ${
                  active
                    ? "bg-brand-600"
                    : "border border-slate-200 bg-white active:bg-slate-100"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? "text-white" : "text-slate-700"
                  }`}
                >
                  {k === "ALL" ? "All" : TYPE_LABEL[k]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(r) => r.wth_docno}
        contentContainerStyle={{ padding: 12 }}
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
        ListEmptyComponent={
          <View className="mt-16 items-center">
            <Ionicons name="receipt-outline" size={40} color="#94a3b8" />
            <Text className="mt-2 text-sm text-slate-500">
              No transactions yet.
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-2" />}
        renderItem={({ item }) => {
          const typeCls = typeClasses(item.wth_type);
          const statusCls = statusClasses(item.wth_status);
          return (
            <Pressable
              onPress={() => openDetail(item.wth_docno)}
              className="rounded-2xl bg-white p-4 shadow-sm active:bg-brand-50"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-xs text-slate-500">
                    {formatDateTime(item.wth_datecreated)}
                  </Text>
                  <Text
                    className="mt-0.5 text-sm font-semibold text-slate-900"
                    numberOfLines={1}
                  >
                    #{item.wth_docno}
                  </Text>
                </View>
                <Text className="text-base font-bold text-slate-900">
                  {formatPeso(Number(item.wth_totalamt) || 0)}
                </Text>
              </View>
              <View className="mt-2 flex-row items-center gap-2">
                <View className={`rounded-full px-2 py-0.5 ${typeCls.split(" ")[0]}`}>
                  <Text className={`text-[10px] font-semibold ${typeCls.split(" ")[1]}`}>
                    {TYPE_LABEL[item.wth_type] ?? item.wth_type}
                  </Text>
                </View>
                <View className={`rounded-full px-2 py-0.5 ${statusCls.split(" ")[0]}`}>
                  <Text className={`text-[10px] font-semibold ${statusCls.split(" ")[1]}`}>
                    {STATUS_LABEL[item.wth_status] ?? item.wth_status}
                  </Text>
                </View>
                {item.wth_payoption ? (
                  <View className="rounded-full bg-slate-100 px-2 py-0.5">
                    <Text className="text-[10px] font-semibold text-slate-700">
                      {PAY_LABEL[item.wth_payoption] ?? item.wth_payoption}
                    </Text>
                  </View>
                ) : null}
                <Text className="ml-auto text-[11px] text-slate-500">
                  {item.wth_stncode ?? "—"}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />

      <Modal
        visible={selected !== null}
        transparent
        animationType="none"
        onRequestClose={() => setSelected(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-md rounded-2xl bg-white p-5 shadow">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-900">
                Transaction
              </Text>
              <Pressable
                onPress={() => setSelected(null)}
                hitSlop={10}
                className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
              >
                <Ionicons name="close" size={20} color="#475569" />
              </Pressable>
            </View>

            {selected ? (
              <View className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <View className="items-center">
                  <Text className="text-base font-bold uppercase tracking-wide text-slate-900">
                    #{selected.header.wth_docno}
                  </Text>
                  <Text className="text-[11px] text-slate-500">
                    {formatDateTime(selected.header.wth_datecreated)}
                  </Text>
                  {selected.header.wth_cuscode ? (
                    <Text className="text-[11px] text-slate-500">
                      {selected.header.wth_cuscode}
                    </Text>
                  ) : null}
                </View>

                <View className="my-3 border-t border-dashed border-slate-300" />

                <View className="flex-row justify-between">
                  <Text className="text-[11px] text-slate-500">Type</Text>
                  <Text className="text-[11px] font-semibold text-slate-800">
                    {TYPE_LABEL[selected.header.wth_type] ??
                      selected.header.wth_type}
                  </Text>
                </View>
                <View className="mt-0.5 flex-row justify-between">
                  <Text className="text-[11px] text-slate-500">Status</Text>
                  <Text className="text-[11px] font-semibold text-slate-800">
                    {STATUS_LABEL[selected.header.wth_status] ??
                      selected.header.wth_status}
                  </Text>
                </View>
                <View className="mt-0.5 flex-row justify-between">
                  <Text className="text-[11px] text-slate-500">Payment</Text>
                  <Text className="text-[11px] font-semibold text-slate-800">
                    {selected.header.wth_payoption
                      ? (PAY_LABEL[selected.header.wth_payoption] ??
                        selected.header.wth_payoption)
                      : "—"}
                  </Text>
                </View>
                <View className="mt-0.5 flex-row justify-between">
                  <Text className="text-[11px] text-slate-500">Branch</Text>
                  <Text className="text-[11px] font-semibold text-slate-800">
                    {selected.header.wth_stncode ?? "—"}
                  </Text>
                </View>

                <View className="my-3 border-t border-dashed border-slate-300" />

                <Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Items
                </Text>
                {detailLoading && selected.details.length === 0 ? (
                  <View className="py-3">
                    <ActivityIndicator />
                  </View>
                ) : detailError ? (
                  <Text className="mt-1 text-xs text-red-600">
                    {detailError}
                  </Text>
                ) : (
                  <ScrollView style={{ maxHeight: 200 }} className="mt-1">
                    {selected.details.map((d) => (
                      <View
                        key={`${d.wtd_docno}-${d.wtd_seqno}`}
                        className="flex-row py-1"
                      >
                        <View className="flex-1 pr-2">
                          <Text
                            className="text-sm text-slate-900"
                            numberOfLines={1}
                          >
                            {d.wtd_itemcode}
                          </Text>
                          <Text className="text-[11px] text-slate-500">
                            {d.wtd_qty} × {formatPeso(Number(d.wtd_uprice) || 0)}
                          </Text>
                        </View>
                        <Text className="text-sm font-semibold text-slate-900">
                          {formatPeso(Number(d.wtd_amount) || 0)}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                )}

                <View className="my-3 border-t border-dashed border-slate-300" />

                <View className="flex-row justify-between">
                  <Text className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Total
                  </Text>
                  <Text className="text-xl font-bold text-slate-900">
                    {formatPeso(Number(selected.header.wth_totalamt) || 0)}
                  </Text>
                </View>
              </View>
            ) : null}

            <Pressable
              onPress={() => setSelected(null)}
              className="mt-4 rounded-xl bg-brand-600 px-4 py-3 active:bg-brand-700"
            >
              <Text className="text-center text-sm font-semibold text-white">
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
