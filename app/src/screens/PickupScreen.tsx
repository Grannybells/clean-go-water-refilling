import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
  closePickup,
  getTransaction,
  listPendingPickups,
  type TxnDetail,
  type TxnHeader,
} from "@/lib/transactions";

type LineRow = TxnDetail & { pickupInput: string };

export default function PickupScreen() {
  const [rows, setRows] = useState<TxnHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedHeader, setSelectedHeader] = useState<TxnHeader | null>(null);
  const [selectedLines, setSelectedLines] = useState<LineRow[]>([]);
  const [activeSeqno, setActiveSeqno] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await listPendingPickups());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load pickups.",
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

  async function openDetail(header: TxnHeader) {
    setSelectedHeader(header);
    setSelectedLines([]);
    setActiveSeqno(null);
    setDetailLoading(true);
    setDetailError(null);
    setSubmitError(null);
    try {
      const txn = await getTransaction(header.wth_docno);
      const lines = txn.details.map((d) => ({ ...d, pickupInput: "" }));
      setSelectedLines(lines);
      if (lines.length > 0) setActiveSeqno(lines[0].wtd_seqno);
    } catch (err) {
      setDetailError(
        err instanceof ApiError ? err.message : "Could not load details.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDialog() {
    setSelectedHeader(null);
    setSelectedLines([]);
    setActiveSeqno(null);
    setDetailError(null);
    setSubmitError(null);
  }

  function pressNumpad(key: string) {
    if (activeSeqno === null) return;
    setSelectedLines((prev) =>
      prev.map((l) => {
        if (l.wtd_seqno !== activeSeqno) return l;
        let next = l.pickupInput;
        if (key === "⌫") next = next.slice(0, -1);
        else if (key === "00")
          next = next === "" || next === "0" ? "0" : next + "00";
        else if (next === "0") next = key;
        else next = next + key;
        return { ...l, pickupInput: next };
      }),
    );
  }

  async function handleConfirm() {
    if (!selectedHeader) return;
    setSubmitting(true);
    setSubmitError(null);
    const payload = selectedLines.map((l) => ({
      seqno: l.wtd_seqno,
      qtypickup: l.pickupInput === "" ? null : Number(l.pickupInput),
    }));
    try {
      await closePickup(selectedHeader.wth_docno, payload);
      closeDialog();
      await load();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Could not close pickup.",
      );
    } finally {
      setSubmitting(false);
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
        <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {rows.length} pending pickup{rows.length === 1 ? "" : "s"}
        </Text>
      </View>

      <FlatList
        data={rows}
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
            <Ionicons name="cube-outline" size={40} color="#94a3b8" />
            <Text className="mt-2 text-sm text-slate-500">
              No pending pickups.
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-2" />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openDetail(item)}
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
                {item.wth_cuscode ? (
                  <Text className="text-[11px] text-slate-500" numberOfLines={1}>
                    {item.wth_cuscode}
                  </Text>
                ) : null}
              </View>
              <Text className="text-base font-bold text-slate-900">
                {formatPeso(Number(item.wth_totalamt) || 0)}
              </Text>
            </View>
          </Pressable>
        )}
      />

      <Modal
        visible={selectedHeader !== null}
        transparent
        animationType="none"
        onRequestClose={closeDialog}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-xl rounded-2xl bg-white p-5 shadow">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-bold text-slate-900">
                  Close pickup
                </Text>
                {selectedHeader ? (
                  <Text className="text-[11px] text-slate-500">
                    #{selectedHeader.wth_docno} · {formatPeso(Number(selectedHeader.wth_totalamt) || 0)}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={closeDialog}
                disabled={submitting}
                hitSlop={10}
                className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
              >
                <Ionicons name="close" size={20} color="#475569" />
              </Pressable>
            </View>

            {detailLoading ? (
              <View className="py-6">
                <ActivityIndicator />
              </View>
            ) : detailError ? (
              <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                <Text className="text-sm text-red-700">{detailError}</Text>
              </View>
            ) : (
              <View className="mt-4 flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1 text-sm font-medium text-slate-700">
                    Items · bottles returned
                  </Text>
                  <ScrollView style={{ maxHeight: 280 }}>
                    {selectedLines.map((l) => {
                      const active = l.wtd_seqno === activeSeqno;
                      return (
                        <Pressable
                          key={`${l.wtd_docno}-${l.wtd_seqno}`}
                          onPress={() => setActiveSeqno(l.wtd_seqno)}
                          className={`mb-2 flex-row items-center rounded-lg border px-3 py-2 ${
                            active
                              ? "border-brand-500 bg-brand-50"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <View className="flex-1 pr-2">
                            <Text
                              className="text-sm text-slate-900"
                              numberOfLines={1}
                            >
                              {l.wtd_itemcode}
                            </Text>
                            <Text className="text-[11px] text-slate-500">
                              Ordered {l.wtd_qty}
                            </Text>
                          </View>
                          <Text
                            className={`min-w-[40px] text-right text-base font-semibold ${
                              l.pickupInput === ""
                                ? "text-slate-400"
                                : "text-slate-900"
                            }`}
                          >
                            {l.pickupInput === "" ? "0" : l.pickupInput}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <View className="w-44">
                  <Text className="mb-1 text-sm font-medium text-slate-700">
                    Numpad
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {[
                      "1",
                      "2",
                      "3",
                      "4",
                      "5",
                      "6",
                      "7",
                      "8",
                      "9",
                      "00",
                      "0",
                      "⌫",
                    ].map((k) => (
                      <Pressable
                        key={k}
                        onPress={() => pressNumpad(k)}
                        disabled={activeSeqno === null}
                        className={`h-12 w-[31%] items-center justify-center rounded-lg border border-slate-200 ${
                          activeSeqno === null
                            ? "bg-slate-50 opacity-40"
                            : k === "⌫"
                              ? "bg-slate-100 active:bg-slate-200"
                              : "bg-white active:bg-slate-50"
                        }`}
                      >
                        <Text className="text-lg font-semibold text-slate-900">
                          {k}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {submitError ? (
              <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                <Text className="text-sm text-red-700">{submitError}</Text>
              </View>
            ) : null}

            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={closeDialog}
                disabled={submitting}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
              >
                <Text className="text-center text-sm font-semibold text-slate-700">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                disabled={submitting || detailLoading}
                className={`flex-1 rounded-xl px-4 py-3 ${
                  submitting || detailLoading
                    ? "bg-brand-500/50"
                    : "bg-brand-600 active:bg-brand-700"
                }`}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-center text-sm font-semibold text-white">
                    Confirm pickup
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
