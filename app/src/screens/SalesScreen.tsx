import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatPeso } from "@/lib/products";
import {
  closeDelivery,
  closePickup,
  collectSalePayment,
  getTransaction,
  listTransactions,
  type TxnDetail,
  type TxnHeader,
  type TxnWithDetails,
} from "@/lib/sales";

type CloseLineRow = TxnDetail & { pickupInput: string };

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

const BALANCE_LABEL: Record<string, string> = {
  PD: "Paid",
  UP: "Unpaid",
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

function balanceClasses(bs: string): string {
  return bs === "UP"
    ? "bg-rose-100 text-rose-700"
    : "bg-slate-100 text-slate-500";
}

const COLS = {
  date: 1.9,
  doc: 1.9,
  type: 0.9,
  status: 1.2,
  paid: 1.1,
  pay: 0.9,
  balance: 1.3,
  amount: 1.3,
};

export default function SalesScreen() {
  const { hasModule } = useAuth();
  const canEdit = hasModule("water.sales.edit");
  const [rows, setRows] = useState<TxnHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "WI" | "PU" | "DL">("ALL");
  const [selected, setSelected] = useState<TxnWithDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [collectOpen, setCollectOpen] = useState(false);
  const [collectInput, setCollectInput] = useState("");
  const [collectError, setCollectError] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeMode, setCloseMode] = useState<"pickup" | "delivery">("pickup");
  const [closeLines, setCloseLines] = useState<CloseLineRow[]>([]);
  const [closeActiveSeqno, setCloseActiveSeqno] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  function openCloseModal(mode: "pickup" | "delivery") {
    if (!selected) return;
    setCloseMode(mode);
    const lines: CloseLineRow[] = selected.details.map((d) => ({
      ...d,
      pickupInput: "",
    }));
    setCloseLines(lines);
    setCloseActiveSeqno(lines.length > 0 ? lines[0].wtd_seqno : null);
    setCloseError(null);
    setCloseOpen(true);
  }

  function pressCloseNumpad(key: string) {
    if (closeActiveSeqno === null) return;
    setCloseLines((prev) =>
      prev.map((l) => {
        if (l.wtd_seqno !== closeActiveSeqno) return l;
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

  async function submitClose() {
    if (!selected) return;
    const payload = closeLines.map((l) => ({
      seqno: l.wtd_seqno,
      qtypickup: l.pickupInput === "" ? null : Number(l.pickupInput),
    }));
    setClosing(true);
    setCloseError(null);
    try {
      const updater =
        closeMode === "pickup" ? closePickup : closeDelivery;
      const updatedHeader = await updater(selected.header.wth_docno, payload);
      const refreshed = {
        ...selected.header,
        ...updatedHeader,
      };
      setSelected({ header: refreshed, details: selected.details });
      setRows((prev) =>
        prev.map((r) => (r.wth_docno === refreshed.wth_docno ? refreshed : r)),
      );
      setCloseOpen(false);
    } catch (err) {
      setCloseError(
        err instanceof ApiError
          ? err.message
          : `Could not ${closeMode === "pickup" ? "close pickup" : "mark as delivered"}.`,
      );
    } finally {
      setClosing(false);
    }
  }

  function openCollect() {
    if (!selected) return;
    setCollectInput(String(Number(selected.header.wth_balanceamt) || 0));
    setCollectError(null);
    setCollectOpen(true);
  }

  async function submitCollect() {
    if (!selected) return;
    const amount = Number(collectInput);
    const balance = Number(selected.header.wth_balanceamt) || 0;
    if (!Number.isFinite(amount) || amount <= 0) {
      setCollectError("Enter a positive amount.");
      return;
    }
    if (amount > balance) {
      setCollectError(`Amount exceeds outstanding balance (${balance}).`);
      return;
    }
    setCollecting(true);
    setCollectError(null);
    try {
      const updated = await collectSalePayment(
        selected.header.wth_docno,
        Number(amount.toFixed(2)),
      );
      setSelected({ header: updated, details: selected.details });
      setRows((prev) =>
        prev.map((r) => (r.wth_docno === updated.wth_docno ? updated : r)),
      );
      setCollectOpen(false);
    } catch (err) {
      setCollectError(
        err instanceof ApiError ? err.message : "Could not record payment.",
      );
    } finally {
      setCollecting(false);
    }
  }

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await listTransactions());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load sales.");
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
    let balance = 0;
    for (const r of rows) {
      if (filter !== "ALL" && r.wth_type !== filter) continue;
      count += 1;
      amount += Number(r.wth_totalamt) || 0;
      balance += Number(r.wth_balanceamt) || 0;
    }
    return { count, amount, balance };
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
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1 flex-row gap-2">
            {(["ALL", "WI", "PU", "DL"] as const).map((k) => {
              const active = filter === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => setFilter(k)}
                  className={`rounded-full px-3.5 py-2 ${
                    active
                      ? "bg-brand-600"
                      : "border border-slate-200 bg-white active:bg-slate-100"
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      active ? "text-white" : "text-slate-700"
                    }`}
                  >
                    {k === "ALL" ? "All" : TYPE_LABEL[k]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => router.push("/pos")}
            className="flex-row items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 active:bg-brand-100"
          >
            <Ionicons name="add" size={15} color="#1858b8" />
            <Text className="text-sm font-semibold text-brand-700">
              New Order
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="flex-row border-b border-slate-200 bg-slate-100 px-3 py-2">
        <Text
          style={{ flex: COLS.doc }}
          className="pr-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Doc #
        </Text>
        <Text
          style={{ flex: COLS.date }}
          className="pr-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Date
        </Text>
        <Text
          style={{ flex: COLS.type }}
          className="pr-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Type
        </Text>
        <Text
          style={{ flex: COLS.status }}
          className="pr-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Status
        </Text>
        <Text
          style={{ flex: COLS.paid }}
          className="pr-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Paid
        </Text>
        <Text
          style={{ flex: COLS.pay }}
          className="pr-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Pay
        </Text>
        <Text
          style={{ flex: COLS.balance }}
          className="pr-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Balance
        </Text>
        <Text
          style={{ flex: COLS.amount }}
          className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Amount
        </Text>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(r) => r.wth_docno}
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
            <Ionicons name="receipt-outline" size={40} color="#94a3b8" />
            <Text className="mt-2 text-sm text-slate-500">No sales yet.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const statusCls = statusClasses(item.wth_status);
          const zebra = index % 2 === 0 ? "bg-white" : "bg-slate-50";
          return (
            <Pressable
              onPress={() => openDetail(item.wth_docno)}
              className={`flex-row items-center border-b border-slate-100 px-3 py-2.5 active:bg-brand-50 ${zebra}`}
            >
              <Text
                style={{ flex: COLS.doc }}
                className="pr-2 text-sm font-semibold text-slate-900"
                numberOfLines={1}
              >
                #{item.wth_docno}
              </Text>
              <Text
                style={{ flex: COLS.date }}
                className="pr-2 text-sm text-slate-700"
                numberOfLines={1}
              >
                {formatDateTime(item.wth_datecreated)}
              </Text>
              <Text
                style={{ flex: COLS.type }}
                className="pr-2 text-sm text-slate-700"
                numberOfLines={1}
              >
                {TYPE_LABEL[item.wth_type] ?? item.wth_type}
              </Text>
              <View style={{ flex: COLS.status }} className="pr-2">
                <View
                  className={`self-start rounded-full px-2.5 py-1 ${statusCls.split(" ")[0]}`}
                >
                  <Text
                    className={`text-sm font-semibold ${statusCls.split(" ")[1]}`}
                  >
                    {STATUS_LABEL[item.wth_status] ?? item.wth_status}
                  </Text>
                </View>
              </View>
              <View style={{ flex: COLS.paid }} className="pr-2">
                <View
                  className={`self-start rounded-full px-2.5 py-1 ${
                    item.wth_balancestatus === "UP"
                      ? "bg-rose-100"
                      : "bg-emerald-100"
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      item.wth_balancestatus === "UP"
                        ? "text-rose-700"
                        : "text-emerald-700"
                    }`}
                  >
                    {BALANCE_LABEL[item.wth_balancestatus] ??
                      item.wth_balancestatus}
                  </Text>
                </View>
              </View>
              <Text
                style={{ flex: COLS.pay }}
                className="pr-2 text-sm text-slate-700"
                numberOfLines={1}
              >
                {item.wth_payoption
                  ? (PAY_LABEL[item.wth_payoption] ?? item.wth_payoption)
                  : "—"}
              </Text>
              <Text
                style={{ flex: COLS.balance }}
                className="pr-2 text-right text-sm font-semibold text-rose-600"
                numberOfLines={1}
              >
                {item.wth_balancestatus === "UP"
                  ? formatPeso(Number(item.wth_balanceamt) || 0)
                  : ""}
              </Text>
              <Text
                style={{ flex: COLS.amount }}
                className="text-right text-sm font-semibold text-slate-900"
                numberOfLines={1}
              >
                {formatPeso(Number(item.wth_totalamt) || 0)}
              </Text>
            </Pressable>
          );
        }}
      />

      <View className="border-t border-slate-200 bg-white px-4 py-3">
        <View className="flex-row items-baseline justify-between">
          <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Total sales ({totals.count})
          </Text>
          <Text className="text-lg font-bold text-slate-900">
            {formatPeso(totals.amount)}
          </Text>
        </View>
        <View className="mt-1 flex-row items-baseline justify-between">
          <Text
            className={`text-sm font-semibold uppercase tracking-wide ${
              totals.balance > 0 ? "text-rose-600" : "text-slate-500"
            }`}
          >
            Total balance
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

      <Modal
        visible={selected !== null}
        transparent
        animationType="none"
        onRequestClose={() => setSelected(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-md rounded-2xl bg-white p-5 shadow">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-900">Sale</Text>
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
                <View className="mt-0.5 flex-row justify-between">
                  <Text className="text-[11px] text-slate-500">
                    Balance status
                  </Text>
                  <Text
                    className={`text-[11px] font-semibold ${
                      selected.header.wth_balancestatus === "UP"
                        ? "text-rose-700"
                        : "text-emerald-700"
                    }`}
                  >
                    {BALANCE_LABEL[selected.header.wth_balancestatus] ??
                      selected.header.wth_balancestatus}
                  </Text>
                </View>
                {selected.header.wth_balancestatus === "UP" ? (
                  <View className="mt-0.5 flex-row justify-between">
                    <Text className="text-[11px] text-slate-500">
                      Balance due
                    </Text>
                    <Text className="text-[11px] font-semibold text-rose-700">
                      {formatPeso(Number(selected.header.wth_balanceamt))}
                    </Text>
                  </View>
                ) : null}

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
                            {d.wtd_qty} ×{" "}
                            {formatPeso(Number(d.wtd_uprice) || 0)}
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

            {canEdit && selected ? (
              <View className="mt-4 gap-2">
                {selected.header.wth_type === "PU" &&
                selected.header.wth_status === "P" ? (
                  <Pressable
                    disabled={detailLoading}
                    onPress={() => openCloseModal("pickup")}
                    className="flex-row items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 active:bg-emerald-700"
                  >
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                    <Text className="text-sm font-semibold text-white">
                      Mark as Closed
                    </Text>
                  </Pressable>
                ) : null}
                {selected.header.wth_type === "DL" &&
                selected.header.wth_status === "P" ? (
                  <Pressable
                    disabled={detailLoading}
                    onPress={() => openCloseModal("delivery")}
                    className="flex-row items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 active:bg-sky-700"
                  >
                    <Ionicons name="car" size={16} color="#ffffff" />
                    <Text className="text-sm font-semibold text-white">
                      Mark as Delivered
                    </Text>
                  </Pressable>
                ) : null}
                {selected.header.wth_balancestatus === "UP" ? (
                  <Pressable
                    onPress={() => openCollect()}
                    className="flex-row items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 active:bg-amber-700"
                  >
                    <Ionicons name="cash" size={16} color="#ffffff" />
                    <Text className="text-sm font-semibold text-white">
                      Collect Payment
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <Pressable
              onPress={() => setSelected(null)}
              className="mt-3 rounded-xl bg-brand-600 px-4 py-3 active:bg-brand-700"
            >
              <Text className="text-center text-sm font-semibold text-white">
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={collectOpen}
        transparent
        animationType="fade"
        onRequestClose={() => (collecting ? undefined : setCollectOpen(false))}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-white p-5 shadow">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-900">
                Collect Payment
              </Text>
              <Pressable
                onPress={() => !collecting && setCollectOpen(false)}
                hitSlop={10}
                className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
              >
                <Ionicons name="close" size={20} color="#475569" />
              </Pressable>
            </View>

            {selected ? (
              <View className="mt-3 rounded-xl bg-rose-50 px-3 py-2">
                <Text className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">
                  Outstanding balance
                </Text>
                <Text className="text-2xl font-bold text-rose-700">
                  {formatPeso(Number(selected.header.wth_balanceamt) || 0)}
                </Text>
              </View>
            ) : null}

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Amount to collect
            </Text>
            <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
              <Text className="mr-2 text-base text-slate-500">₱</Text>
              <TextInput
                value={collectInput}
                onChangeText={(t) => setCollectInput(t.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                keyboardType="decimal-pad"
                editable={!collecting}
                className="flex-1 py-2.5 text-base text-slate-900"
              />
              {collectInput ? (
                <Pressable
                  onPress={() => setCollectInput("")}
                  hitSlop={8}
                  disabled={collecting}
                >
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </Pressable>
              ) : null}
            </View>

            {selected ? (
              <Pressable
                onPress={() =>
                  setCollectInput(
                    String(Number(selected.header.wth_balanceamt) || 0),
                  )
                }
                disabled={collecting}
                className="mt-2 rounded-lg border border-slate-200 bg-white py-2 active:bg-slate-50"
              >
                <Text className="text-center text-xs font-semibold text-slate-700">
                  Full ({formatPeso(Number(selected.header.wth_balanceamt) || 0)})
                </Text>
              </Pressable>
            ) : null}

            {collectError ? (
              <View className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                <Text className="text-xs text-red-700">{collectError}</Text>
              </View>
            ) : null}

            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={() => setCollectOpen(false)}
                disabled={collecting}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
              >
                <Text className="text-center text-sm font-semibold text-slate-700">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void submitCollect()}
                disabled={collecting}
                className={`flex-1 rounded-xl px-4 py-3 ${
                  collecting
                    ? "bg-amber-500/60"
                    : "bg-amber-600 active:bg-amber-700"
                }`}
              >
                {collecting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-center text-sm font-semibold text-white">
                    Collect
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={closeOpen}
        transparent
        animationType="none"
        onRequestClose={() => (closing ? undefined : setCloseOpen(false))}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-md rounded-2xl bg-white p-5 shadow">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-lg font-bold text-slate-900">
                  {closeMode === "pickup"
                    ? "Mark pickup closed"
                    : "Mark delivered"}
                </Text>
                {selected ? (
                  <Text
                    className="text-[11px] text-slate-500"
                    numberOfLines={1}
                  >
                    #{selected.header.wth_docno}
                    {selected.header.wth_cuscode
                      ? ` · ${selected.header.wth_cuscode}`
                      : ""}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => !closing && setCloseOpen(false)}
                hitSlop={10}
                className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
              >
                <Ionicons name="close" size={20} color="#475569" />
              </Pressable>
            </View>

            <View className="mt-4">
              <Text className="mb-1 text-sm font-medium text-slate-700">
                Items · bottles returned
              </Text>
              <ScrollView style={{ maxHeight: 220 }}>
                {closeLines.map((l) => {
                  const active = l.wtd_seqno === closeActiveSeqno;
                  return (
                    <Pressable
                      key={`${l.wtd_docno}-${l.wtd_seqno}`}
                      onPress={() => setCloseActiveSeqno(l.wtd_seqno)}
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

              <Text className="mb-1 mt-3 text-sm font-medium text-slate-700">
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
                    onPress={() => pressCloseNumpad(k)}
                    disabled={closeActiveSeqno === null || closing}
                    className={`h-14 w-[32%] items-center justify-center rounded-lg border border-slate-200 ${
                      closeActiveSeqno === null
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

            {closeError ? (
              <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                <Text className="text-sm text-red-700">{closeError}</Text>
              </View>
            ) : null}

            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={() => setCloseOpen(false)}
                disabled={closing}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
              >
                <Text className="text-center text-sm font-semibold text-slate-700">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void submitClose()}
                disabled={closing}
                className={`flex-1 rounded-xl px-4 py-3 ${
                  closing
                    ? "bg-brand-500/50"
                    : closeMode === "pickup"
                      ? "bg-emerald-600 active:bg-emerald-700"
                      : "bg-sky-600 active:bg-sky-700"
                }`}
              >
                {closing ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-center text-sm font-semibold text-white">
                    {closeMode === "pickup"
                      ? "Confirm pickup"
                      : "Confirm delivery"}
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
