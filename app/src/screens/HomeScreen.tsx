import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  View,
} from "react-native";

import CustomerFormModal from "@/components/CustomerFormModal";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { listCustomers } from "@/lib/customers";
import { formatPeso, listWaterProducts, unitPriceFor } from "@/lib/products";
import { getCachedSettings } from "@/lib/settings";
import { createTransaction } from "@/lib/sales";
import type { Customer } from "@/types/customer";
import type { CartLine, Fulfillment, WaterProduct } from "@/types/product";
import type { Settings } from "@/types/settings";

const CONTTYPE_LABELS: Record<string, string> = {
  G: "Gallon",
  B: "Bottle",
  L: "Pet Bottle",
};
const CONTTYPE_ORDER = ["G", "B", "L"];

function conttypeLabel(code: string | null): string {
  if (!code) return "Other";
  return CONTTYPE_LABELS[code] ?? code;
}

export default function HomeScreen() {
  const { hasModule } = useAuth();
  const [products, setProducts] = useState<WaterProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Fulfillment>("walkin");
  const [filter, setFilter] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [custQuery, setCustQuery] = useState("");
  const [custFormOpen, setCustFormOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [payment, setPayment] = useState<"cash" | "qr" | "gcash" | "credit" | null>(
    null,
  );
  const [payLater, setPayLater] = useState(false);
  const [tendered, setTendered] = useState("");
  const [qtyProduct, setQtyProduct] = useState<WaterProduct | null>(null);
  const [qtyInput, setQtyInput] = useState("");

  type TxnSnapshot = {
    ref: string;
    at: Date;
    customer: Customer | null;
    mode: Fulfillment;
    payment: "cash" | "qr" | "gcash" | "credit" | null;
    payLater: boolean;
    tendered: number;
    change: number;
    lines: Array<{ product: WaterProduct; qty: number; unit: number }>;
    subtotal: number;
    itemCount: number;
  };
  const [completedTxn, setCompletedTxn] = useState<TxnSnapshot | null>(null);
  const [deviceSettings, setDeviceSettings] = useState<Settings | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canCreateCustomer = hasModule("customer.create");

  const cartKey = (p: WaterProduct): string => `${p.wr_refno}-${p.wr_code}`;

  const load = useCallback(async () => {
    setError(null);
    try {
      setProducts(await listWaterProducts());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load products.",
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

  useEffect(() => {
    if (mode !== "delivery") return;
    setCart((prev) => {
      const next: typeof prev = {};
      for (const [k, line] of Object.entries(prev)) {
        if (line.product.wr_del_uprice !== null) next[k] = line;
      }
      return next;
    });
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    listCustomers()
      .then((rows) => {
        if (!cancelled) setCustomers(rows);
      })
      .catch(() => {
        if (!cancelled) setCustomers([]);
      });
    void getCachedSettings().then((s) => {
      if (!cancelled) setDeviceSettings(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function openCheckout() {
    setPayment(null);
    setPayLater(false);
    setTendered("");
    setSubmitError(null);
    setCheckoutOpen(true);
  }

  const TYPE_MAP: Record<Fulfillment, "WI" | "PU" | "DL"> = {
    walkin: "WI",
    pickup: "PU",
    delivery: "DL",
  };
  const PAY_MAP: Record<"cash" | "qr" | "gcash" | "credit", "CS" | "QR" | "GC" | "CR"> = {
    cash: "CS",
    qr: "QR",
    gcash: "GC",
    credit: "CR",
  };

  async function submitTransaction() {
    if (!canConfirm) return;
    if (!payLater && !payment) return;
    setSubmitting(true);
    setSubmitError(null);
    const snapshotLines = lines.map((l) => ({
      product: l.product,
      qty: l.qty,
      unit: unitPriceFor(l.product, mode, l.qty),
    }));
    try {
      const created = await createTransaction({
        stncode: deviceSettings?.branch_id ?? null,
        cuscode: customer?.cus_code ?? null,
        type: TYPE_MAP[mode],
        payoption: payLater ? "CR" : payment ? PAY_MAP[payment] : null,
        paylater: payLater,
        lines: snapshotLines.map((l) => ({
          wr_code: l.product.wr_code,
          qty: l.qty,
          uprice: l.unit,
        })),
      });
      setCompletedTxn({
        ref: created.wth_docno,
        at: new Date(),
        customer,
        mode,
        payment: payLater ? "credit" : payment,
        payLater,
        tendered: payLater ? 0 : payment === "cash" ? tenderedNum : totals.subtotal,
        change: !payLater && payment === "cash" ? Math.max(0, change) : 0,
        lines: snapshotLines,
        subtotal: totals.subtotal,
        itemCount: totals.itemCount,
      });
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Could not save transaction.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openQtyDialog(product: WaterProduct) {
    const existing = cart[cartKey(product)]?.qty;
    setQtyInput(existing ? String(existing) : "");
    setQtyProduct(product);
  }

  function pressQtyNumpad(key: string) {
    setQtyInput((prev) => {
      if (key === "⌫") return prev.slice(0, -1);
      if (key === "00") return prev === "" || prev === "0" ? "0" : prev + "00";
      if (prev === "0") return key;
      return prev + key;
    });
  }

  function confirmQty() {
    if (!qtyProduct) return;
    const qty = Math.max(0, Math.floor(Number(qtyInput) || 0));
    const key = cartKey(qtyProduct);
    setCart((prev) => {
      if (qty === 0) {
        const { [key]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: { product: qtyProduct, qty } };
    });
    setQtyProduct(null);
    setQtyInput("");
  }

  function pressNumpad(key: string) {
    setTendered((prev) => {
      if (key === "⌫") return prev.slice(0, -1);
      if (key === ".") {
        if (prev.includes(".")) return prev;
        return prev === "" ? "0." : prev + ".";
      }
      // guard: no leading zeros like 005
      if (prev === "0" && key !== ".") return key;
      // guard: max two decimals
      const dot = prev.indexOf(".");
      if (dot !== -1 && prev.length - dot > 2) return prev;
      return prev + key;
    });
  }

  const custSuggestions = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((c) => {
        return (
          c.cus_name.toLowerCase().includes(q) ||
          c.cus_code.toLowerCase().includes(q) ||
          (c.cus_contactno ?? "").toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  }, [customers, custQuery]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function clearCart() {
    setCart({});
  }

  const lines = useMemo(() => Object.values(cart), [cart]);

  const sections = useMemo(() => {
    const groups = new Map<string, WaterProduct[]>();
    for (const p of products) {
      const k = p.wr_conttype ?? "";
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(p);
    }
    const ordered: Array<{ title: string; data: WaterProduct[] }> = [];
    for (const k of CONTTYPE_ORDER) {
      const g = groups.get(k);
      if (g && g.length > 0) {
        ordered.push({ title: conttypeLabel(k), data: g });
        groups.delete(k);
      }
    }
    for (const [k, g] of groups) {
      if (g.length > 0)
        ordered.push({ title: conttypeLabel(k || null), data: g });
    }
    return ordered;
  }, [products]);

  const visibleSections = useMemo(
    () =>
      filter === null ? sections : sections.filter((s) => s.title === filter),
    [sections, filter],
  );

  const totals = useMemo(() => {
    let subtotal = 0;
    let itemCount = 0;
    for (const line of lines) {
      subtotal += unitPriceFor(line.product, mode, line.qty) * line.qty;
      itemCount += line.qty;
    }
    return { subtotal, itemCount };
  }, [lines, mode]);

  const tenderedNum = Number(tendered.replace(/,/g, "")) || 0;
  const change = tenderedNum - totals.subtotal;
  const needsCustomer = mode !== "walkin" || payLater;
  const canConfirm =
    lines.length > 0 &&
    (!needsCustomer || customer !== null) &&
    (payLater
      ? true
      : payment !== null &&
        (payment !== "cash" || tenderedNum >= totals.subtotal));

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-50">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 flex-row bg-brand-50">
      {/* Left: items table */}
      <View className="flex-1 border-r border-slate-200 bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            gap: 8,
            alignItems: "center",
          }}
          className="border-b border-slate-200 bg-white"
          style={{ flexGrow: 0 }}
        >
          <Pressable
            onPress={() => setFilter(null)}
            className={`rounded-full px-3 py-1.5 ${
              filter === null
                ? "bg-brand-600"
                : "border border-slate-200 bg-white active:bg-slate-100"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                filter === null ? "text-white" : "text-slate-700"
              }`}
            >
              All · {products.length}
            </Text>
          </Pressable>
          {sections.map((s) => {
            const active = filter === s.title;
            return (
              <Pressable
                key={s.title}
                onPress={() => setFilter(active ? null : s.title)}
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
                  {s.title} · {s.data.length}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <SectionList
          sections={visibleSections}
          keyExtractor={(p, i) => `${p.wr_refno}-${p.wr_code ?? i}`}
          stickySectionHeadersEnabled
          style={{ flex: 1 }}
          renderSectionHeader={({ section }) => (
            <View className="border-b border-slate-200 bg-slate-100 px-3 py-1.5">
              <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                {section.title}
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            <>
              {error ? (
                <View className="m-3 rounded-xl border border-red-200 bg-red-50 p-3">
                  <Text className="text-sm text-red-700">{error}</Text>
                </View>
              ) : null}
              <View className="flex-row border-b border-slate-200 bg-slate-50 px-3 py-2">
                <Text className="flex-1 text-[10px] font-semibold uppercase text-slate-500">
                  Item
                </Text>
                <Text className="w-20 text-right text-[10px] font-semibold uppercase text-slate-500">
                  Price
                </Text>
                <Text className="w-12 text-right text-[10px] font-semibold uppercase text-slate-500">
                  Qty
                </Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <View className="mt-16 items-center">
              <Ionicons name="water-outline" size={40} color="#94a3b8" />
              <Text className="mt-2 text-sm text-slate-500">
                No products available.
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View className="h-px bg-slate-100" />}
          renderItem={({ item }) => {
            const unavailable =
              mode === "delivery" && item.wr_del_uprice === null;
            const unit = Number(unitPriceFor(item, mode, 1));
            const volUnit =
              mode === "walkin"
                ? item.wr_vol_pup_uprice
                : item.wr_vol_del_uprice;
            const inCart = cart[cartKey(item)]?.qty ?? 0;
            return (
              <Pressable
                onPress={() => !unavailable && openQtyDialog(item)}
                disabled={unavailable}
                className={`flex-row items-center px-3 py-3 ${
                  unavailable
                    ? "opacity-50"
                    : inCart > 0
                      ? "bg-brand-50"
                      : "active:bg-slate-50"
                }`}
              >
                <View className="flex-1 pr-2">
                  <Text
                    className="text-sm font-semibold text-slate-900"
                    numberOfLines={1}
                  >
                    {item.wr_desc}
                  </Text>
                  <Text
                    className="text-[10px] text-slate-500"
                    numberOfLines={1}
                  >
                    {item.wr_code}
                    {unavailable
                      ? " · not for delivery"
                      : item.wr_vol_minqty && volUnit !== null
                        ? ` · ${formatPeso(Number(volUnit))} ea at ${item.wr_vol_minqty}+`
                        : ""}
                  </Text>
                </View>
                <Text className="w-20 text-right text-sm font-bold text-brand-700">
                  {unavailable ? "—" : formatPeso(unit)}
                </Text>
                <View className="w-12 items-end">
                  {inCart > 0 ? (
                    <View className="rounded-full bg-brand-600 px-2 py-0.5">
                      <Text className="text-[10px] font-semibold text-white">
                        × {inCart}
                      </Text>
                    </View>
                  ) : (
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color="#94a3b8"
                    />
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Right: orders panel */}
      <View className="w-80 bg-white">
        <View className="border-b border-slate-200 px-4 py-3">
          <Text className="text-xs font-semibold uppercase text-slate-500">
            Customer
          </Text>

          {customer ? (
            <View className="mt-2 rounded-xl border border-brand-200 bg-brand-50 p-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <Text
                    className="text-sm font-semibold text-slate-900"
                    numberOfLines={1}
                  >
                    {customer.cus_name}
                  </Text>
                  <Text
                    className="text-[11px] text-slate-500"
                    numberOfLines={1}
                  >
                    {customer.cus_code}
                    {customer.cus_contactno
                      ? ` · ${customer.cus_contactno}`
                      : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setCustomer(null);
                    setCustQuery("");
                  }}
                  hitSlop={8}
                >
                  <Text className="text-[11px] font-semibold text-brand-700">
                    Change
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View className="mt-2 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
                <Ionicons name="search" size={16} color="#94a3b8" />
                <TextInput
                  value={custQuery}
                  onChangeText={setCustQuery}
                  placeholder="Search by name, code, or contact"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="ml-2 flex-1 py-2 text-sm text-slate-900"
                />
                {custQuery ? (
                  <Pressable onPress={() => setCustQuery("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                  </Pressable>
                ) : null}
              </View>

              {custQuery.trim() !== "" ? (
                <View className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {custSuggestions.length === 0 ? (
                    <View className="px-3 py-3">
                      <Text className="text-xs text-slate-500">
                        No matches.
                      </Text>
                      {canCreateCustomer ? (
                        <Pressable
                          onPress={() => setCustFormOpen(true)}
                          className="mt-2 flex-row items-center justify-center rounded-lg bg-brand-600 px-3 py-2 active:bg-brand-700"
                        >
                          <Ionicons
                            name="person-add"
                            size={14}
                            color="#ffffff"
                          />
                          <Text className="ml-2 text-xs font-semibold text-white">
                            Add "{custQuery.trim()}"
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : (
                    custSuggestions.map((c, i) => (
                      <Pressable
                        key={c.cus_refno}
                        onPress={() => {
                          setCustomer(c);
                          setCustQuery("");
                        }}
                        className={`px-3 py-2 active:bg-brand-50 ${
                          i > 0 ? "border-t border-slate-100" : ""
                        }`}
                      >
                        <Text
                          className="text-sm font-medium text-slate-900"
                          numberOfLines={1}
                        >
                          {c.cus_name}
                        </Text>
                        <Text
                          className="text-[11px] text-slate-500"
                          numberOfLines={1}
                        >
                          {c.cus_code}
                          {c.cus_contactno ? ` · ${c.cus_contactno}` : ""}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              ) : null}
            </>
          )}
        </View>

        <View className="border-b border-slate-200 px-4 py-3">
          <Text className="text-xs font-semibold uppercase text-slate-500">
            Order
          </Text>
          <View className="mt-2 flex-row rounded-xl bg-slate-100 p-1">
            {(
              [
                { key: "walkin", label: "Walk-in" },
                { key: "pickup", label: "Pickup" },
                { key: "delivery", label: "Delivery" },
              ] as const
            ).map((opt) => {
              const active = mode === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setMode(opt.key)}
                  className={`flex-1 items-center rounded-lg py-2 ${
                    active ? "bg-white shadow-sm" : ""
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      active ? "text-brand-700" : "text-slate-600"
                    }`}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {lines.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="cart-outline" size={40} color="#cbd5e1" />
            <Text className="mt-2 text-sm text-slate-500">Cart is empty</Text>
            <Text className="mt-0.5 text-center text-[10px] text-slate-400">
              Tap an item on the left to add it here.
            </Text>
          </View>
        ) : (
          <>
            <View className="flex-row items-center justify-between px-4 pt-3">
              <Text className="text-xs font-medium text-slate-600">
                {totals.itemCount} item{totals.itemCount === 1 ? "" : "s"}
              </Text>
              <Pressable onPress={clearCart} hitSlop={8}>
                <Text className="text-[10px] font-semibold text-red-600">
                  Clear
                </Text>
              </Pressable>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 12 }}
              keyboardShouldPersistTaps="handled"
            >
              {lines.map((line) => {
                const key = cartKey(line.product);
                const unit = unitPriceFor(line.product, mode, line.qty);
                const lineTotal = unit * line.qty;
                const volActive =
                  line.product.wr_vol_minqty !== null &&
                  line.qty >= line.product.wr_vol_minqty;
                return (
                  <View
                    key={key}
                    className="mb-2 flex-row items-stretch rounded-xl border border-slate-100 bg-slate-50"
                  >
                    <Pressable
                      onPress={() => openQtyDialog(line.product)}
                      className="flex-1 p-3 active:bg-brand-50"
                    >
                      <Text
                        className="text-sm font-semibold text-slate-900"
                        numberOfLines={2}
                      >
                        {line.product.wr_desc}
                      </Text>
                      <Text className="mt-0.5 text-[10px] text-slate-500">
                        {formatPeso(unit)} ea{volActive ? " · vol" : ""}
                      </Text>
                      <View className="mt-2 flex-row items-center justify-between">
                        <View className="rounded-full bg-brand-600 px-2.5 py-0.5">
                          <Text className="text-xs font-semibold text-white">
                            × {line.qty}
                          </Text>
                        </View>
                        <Text className="text-sm font-bold text-slate-900">
                          {formatPeso(lineTotal)}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setCart((prev) => {
                          const { [key]: _removed, ...rest } = prev;
                          return rest;
                        })
                      }
                      hitSlop={4}
                      className="w-9 items-center justify-center rounded-r-xl border-l border-slate-100 active:bg-red-50"
                    >
                      <Ionicons name="close" size={14} color="#475569" />
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>

            <View className="border-t border-slate-200 px-4 pb-4 pt-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-slate-600">
                  Total
                </Text>
                <Text className="text-xl font-bold text-slate-900">
                  {formatPeso(totals.subtotal)}
                </Text>
              </View>

              <Pressable
                onPress={openCheckout}
                className="mt-3 rounded-xl bg-brand-600 px-4 py-3 active:bg-brand-700"
              >
                <Text className="text-center text-base font-semibold text-white">
                  Checkout
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      <CustomerFormModal
        visible={custFormOpen}
        customer={null}
        initialName={custQuery.trim()}
        onClose={() => setCustFormOpen(false)}
        onSaved={(saved) => {
          setCustomers((prev) => [saved, ...prev]);
          setCustomer(saved);
          setCustQuery("");
          setCustFormOpen(false);
        }}
      />

      <Modal
        visible={checkoutOpen}
        transparent
        animationType="none"
        onRequestClose={() => setCheckoutOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-xl rounded-2xl bg-white p-5 shadow">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-900">
                {completedTxn ? "Order complete" : "Checkout"}
              </Text>
              <Pressable
                onPress={() => {
                  if (completedTxn) {
                    setCompletedTxn(null);
                    clearCart();
                    setCustomer(null);
                  }
                  setCheckoutOpen(false);
                }}
                hitSlop={10}
                className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
              >
                <Ionicons name="close" size={20} color="#475569" />
              </Pressable>
            </View>

            {completedTxn ? null : (
            <>
            <View className="mt-4 items-center">
              <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Amount due
              </Text>
              <Text className="mt-0.5 text-3xl font-extrabold text-slate-900">
                {formatPeso(totals.subtotal)}
              </Text>
              <Text className="text-[11px] text-slate-500">
                {totals.itemCount} item{totals.itemCount === 1 ? "" : "s"} ·{" "}
                {mode === "walkin"
                  ? "Walk-in"
                  : mode === "pickup"
                    ? "Pickup"
                    : "Delivery"}
                {customer ? ` · ${customer.cus_name}` : ""}
              </Text>
            </View>

            {needsCustomer && !customer ? (
              <View className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <Text className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Customer required
                </Text>
                <Text className="mt-0.5 text-[11px] text-amber-800">
                  {payLater
                    ? "Select a customer to charge this order to."
                    : mode === "pickup"
                      ? "Select a customer before confirming a pickup."
                      : "Select a customer before confirming a delivery."}
                </Text>
              </View>
            ) : null}

            <Pressable
                onPress={() => {
                  setPayLater((v) => {
                    const next = !v;
                    if (next) setPayment(null);
                    return next;
                  });
                }}
                className={`mt-4 flex-row items-center justify-between rounded-xl border px-3 py-2.5 ${
                  payLater
                    ? "border-amber-300 bg-amber-50"
                    : "border-slate-200 bg-white active:bg-slate-50"
                }`}
              >
                <View className="flex-1 pr-3">
                  <Text
                    className={`text-sm font-semibold ${
                      payLater ? "text-amber-800" : "text-slate-800"
                    }`}
                  >
                    Pay Later
                  </Text>
                  <Text
                    className={`text-[11px] ${
                      payLater ? "text-amber-700" : "text-slate-500"
                    }`}
                  >
                    Charge the full amount to the customer's account.
                  </Text>
                </View>
                <View
                  className={`h-6 w-11 justify-center rounded-full px-0.5 ${
                    payLater ? "bg-amber-500" : "bg-slate-300"
                  }`}
                >
                  <View
                    className={`h-5 w-5 rounded-full bg-white ${
                      payLater ? "self-end" : "self-start"
                    }`}
                  />
                </View>
              </Pressable>

            {!payLater ? (
              <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
                Payment method
              </Text>
            ) : null}
            {!payLater ? (
            <View className="flex-row rounded-xl bg-slate-100 p-1">
              <Pressable
                onPress={() => setPayment("cash")}
                className={`flex-1 items-center rounded-lg py-2 ${
                  payment === "cash" ? "bg-white" : ""
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    payment === "cash" ? "text-brand-700" : "text-slate-600"
                  }`}
                >
                  Cash
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPayment("qr")}
                className={`flex-1 items-center rounded-lg py-2 ${
                  payment === "qr" ? "bg-white" : ""
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    payment === "qr" ? "text-brand-700" : "text-slate-600"
                  }`}
                >
                  QR.PH
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPayment("gcash")}
                className={`flex-1 items-center rounded-lg py-2 ${
                  payment === "gcash" ? "bg-white" : ""
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    payment === "gcash" ? "text-brand-700" : "text-slate-600"
                  }`}
                >
                  GCash
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPayment("credit")}
                className={`flex-1 items-center rounded-lg py-2 ${
                  payment === "credit" ? "bg-white" : ""
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    payment === "credit" ? "text-brand-700" : "text-slate-600"
                  }`}
                >
                  Credit
                </Text>
              </Pressable>
            </View>
            ) : null}

            {!payLater && payment === "cash" ? (
              <View className="mt-4 flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1 text-sm font-medium text-slate-700">
                    Amount tendered
                  </Text>
                  <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
                    <Text className="mr-2 text-base text-slate-500">₱</Text>
                    <TextInput
                      value={tendered}
                      editable={false}
                      showSoftInputOnFocus={false}
                      placeholder="0.00"
                      className="flex-1 py-2.5 text-base text-slate-900"
                    />
                    {tendered ? (
                      <Pressable onPress={() => setTendered("")} hitSlop={8}>
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color="#94a3b8"
                        />
                      </Pressable>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={() => setTendered(String(totals.subtotal))}
                    className="mt-2 rounded-lg border border-slate-200 bg-white py-2 active:bg-slate-50"
                  >
                    <Text className="text-center text-xs font-semibold text-slate-700">
                      Exact ({formatPeso(totals.subtotal)})
                    </Text>
                  </Pressable>

                  <View className="mt-3 rounded-xl bg-brand-50 px-3 py-2">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                      Change
                    </Text>
                    <Text
                      className={`text-2xl font-bold ${
                        change < 0 ? "text-red-600" : "text-slate-900"
                      }`}
                    >
                      {formatPeso(Math.max(0, change))}
                    </Text>
                    {change < 0 && tendered !== "" ? (
                      <Text className="text-[11px] text-red-600">
                        Short by {formatPeso(Math.abs(change))}.
                      </Text>
                    ) : null}
                  </View>
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
                      ".",
                      "0",
                      "⌫",
                    ].map((k) => (
                      <Pressable
                        key={k}
                        onPress={() => pressNumpad(k)}
                        className={`h-12 w-[31%] items-center justify-center rounded-lg border border-slate-200 ${
                          k === "⌫"
                            ? "bg-slate-100 active:bg-slate-200"
                            : "bg-white active:bg-slate-50"
                        }`}
                      >
                        <Text
                          className={`text-lg font-semibold ${
                            k === "⌫" ? "text-slate-600" : "text-slate-900"
                          }`}
                        >
                          {k}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            {submitError ? (
              <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                <Text className="text-sm text-red-700">{submitError}</Text>
              </View>
            ) : null}

            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={() => setCheckoutOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
              >
                <Text className="text-center text-sm font-semibold text-slate-700">
                  Back
                </Text>
              </Pressable>
              <Pressable
                disabled={!canConfirm || submitting}
                onPress={() => {
                  void submitTransaction();
                }}
                className={`flex-1 rounded-xl px-4 py-3 ${
                  canConfirm && !submitting
                    ? "bg-brand-600 active:bg-brand-700"
                    : "bg-brand-500/50"
                }`}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-center text-sm font-semibold text-white">
                    Confirm
                  </Text>
                )}
              </Pressable>
            </View>
            </>
            )}

            {completedTxn ? (
              <>
                <View className="mt-3 items-center">
                  <View
                    className={`h-14 w-14 items-center justify-center rounded-full ${
                      completedTxn.payLater ? "bg-amber-100" : "bg-emerald-100"
                    }`}
                  >
                    <Ionicons
                      name={completedTxn.payLater ? "time-outline" : "checkmark"}
                      size={32}
                      color={completedTxn.payLater ? "#b45309" : "#059669"}
                    />
                  </View>
                  <Text
                    className={`mt-2 text-sm font-semibold ${
                      completedTxn.payLater ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    {completedTxn.payLater
                      ? "Charged to account"
                      : "Payment received"}
                  </Text>
                  <Text className="text-[11px] text-slate-500">
                    {completedTxn.ref}
                  </Text>
                </View>

                <View className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <View className="items-center">
                    <Text className="text-base font-bold uppercase tracking-wide text-slate-900">
                      Clean & Go
                    </Text>
                    <Text className="text-[10px] uppercase tracking-wider text-slate-500">
                      Water Refilling Station
                    </Text>
                    <Text className="mt-1 text-[11px] text-slate-500">
                      {completedTxn.at.toLocaleString()}
                    </Text>
                  </View>

                  <View className="my-3 border-t border-dashed border-slate-300" />

                  <Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Customer
                  </Text>
                  {completedTxn.customer ? (
                    <>
                      <Text className="mt-0.5 text-sm font-semibold text-slate-900" numberOfLines={1}>
                        {completedTxn.customer.cus_name}
                      </Text>
                      <Text className="text-[11px] text-slate-500" numberOfLines={1}>
                        {completedTxn.customer.cus_code}
                        {completedTxn.customer.cus_contactno
                          ? ` · ${completedTxn.customer.cus_contactno}`
                          : ""}
                      </Text>
                    </>
                  ) : (
                    <Text className="mt-0.5 text-sm italic text-slate-400">
                      No customer selected
                    </Text>
                  )}
                  <View className="mt-1.5 flex-row justify-between">
                    <Text className="text-[11px] text-slate-500">Mode</Text>
                    <Text className="text-[11px] font-semibold text-slate-800">
                      {completedTxn.mode === "walkin"
                        ? "Walk-in"
                        : completedTxn.mode === "pickup"
                          ? "Pickup"
                          : "Delivery"}
                    </Text>
                  </View>

                  <View className="my-3 border-t border-dashed border-slate-300" />

                  <ScrollView
                    style={{ maxHeight: 180 }}
                    keyboardShouldPersistTaps="handled"
                  >
                    {completedTxn.lines.map((l) => (
                      <View
                        key={`${l.product.wr_refno}-${l.product.wr_code}`}
                        className="flex-row py-1"
                      >
                        <View className="flex-1 pr-2">
                          <Text className="text-sm text-slate-900" numberOfLines={1}>
                            {l.product.wr_desc}
                          </Text>
                          <Text className="text-[11px] text-slate-500">
                            {l.qty} × {formatPeso(l.unit)}
                          </Text>
                        </View>
                        <Text className="text-sm font-semibold text-slate-900">
                          {formatPeso(l.unit * l.qty)}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>

                  <View className="my-3 border-t border-dashed border-slate-300" />

                  <View className="flex-row justify-between">
                    <Text className="text-xs font-medium uppercase tracking-wide text-slate-600">
                      Total
                    </Text>
                    <Text className="text-xl font-bold text-slate-900">
                      {formatPeso(completedTxn.subtotal)}
                    </Text>
                  </View>
                  <View className="mt-1 flex-row justify-between">
                    <Text className="text-[11px] text-slate-500">Payment</Text>
                    <Text className="text-[11px] font-semibold text-slate-800">
                      {completedTxn.payLater
                        ? "Pay Later (credit)"
                        : completedTxn.payment === "cash"
                          ? "Cash"
                          : completedTxn.payment === "qr"
                            ? "QR.PH"
                            : completedTxn.payment === "gcash"
                              ? "GCash"
                              : completedTxn.payment === "credit"
                                ? "Credit"
                                : "Unpaid — pending"}
                    </Text>
                  </View>
                  {completedTxn.payLater ? (
                    <View className="mt-0.5 flex-row justify-between">
                      <Text className="text-[11px] text-slate-500">
                        Balance due
                      </Text>
                      <Text className="text-[11px] font-semibold text-amber-700">
                        {formatPeso(completedTxn.subtotal)}
                      </Text>
                    </View>
                  ) : null}
                  {!completedTxn.payLater && completedTxn.payment === "cash" ? (
                    <>
                      <View className="mt-0.5 flex-row justify-between">
                        <Text className="text-[11px] text-slate-500">
                          Tendered
                        </Text>
                        <Text className="text-[11px] font-semibold text-slate-800">
                          {formatPeso(completedTxn.tendered)}
                        </Text>
                      </View>
                      <View className="mt-0.5 flex-row justify-between">
                        <Text className="text-[11px] text-slate-500">
                          Change
                        </Text>
                        <Text className="text-[11px] font-semibold text-slate-800">
                          {formatPeso(completedTxn.change)}
                        </Text>
                      </View>
                    </>
                  ) : null}
                </View>

                <Pressable
                  onPress={() => {
                    setCompletedTxn(null);
                    clearCart();
                    setCustomer(null);
                    setCheckoutOpen(false);
                  }}
                  className="mt-4 rounded-xl bg-brand-600 px-4 py-3 active:bg-brand-700"
                >
                  <Text className="text-center text-sm font-semibold text-white">
                    New order
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={qtyProduct !== null}
        transparent
        animationType="none"
        onRequestClose={() => setQtyProduct(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-white p-5 shadow">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Text
                  className="text-base font-bold text-slate-900"
                  numberOfLines={2}
                >
                  {qtyProduct?.wr_desc}
                </Text>
                <Text className="text-[11px] text-slate-500">
                  {qtyProduct?.wr_code}
                  {qtyProduct?.wr_conttype
                    ? ` · ${conttypeLabel(qtyProduct.wr_conttype)}`
                    : ""}
                </Text>
              </View>
              <Pressable
                onPress={() => setQtyProduct(null)}
                hitSlop={10}
                className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
              >
                <Ionicons name="close" size={20} color="#475569" />
              </Pressable>
            </View>

            {qtyProduct
              ? (() => {
                  const parsed = Math.max(0, Math.floor(Number(qtyInput) || 0));
                  const unit = unitPriceFor(qtyProduct, mode, parsed || 1);
                  const lineTotal = unit * parsed;
                  const volActive =
                    qtyProduct.wr_vol_minqty !== null &&
                    parsed >= qtyProduct.wr_vol_minqty;
                  return (
                    <View className="mt-3 rounded-xl bg-slate-50 p-3">
                      <View className="flex-row items-end justify-between">
                        <View>
                          <Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Qty
                          </Text>
                          <Text className="text-3xl font-extrabold text-slate-900">
                            {qtyInput === "" ? "0" : qtyInput}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-[11px] text-slate-500">
                            {formatPeso(Number(unit))} ea
                            {volActive ? " · vol" : ""}
                          </Text>
                          <Text className="text-xl font-bold text-brand-700">
                            {formatPeso(lineTotal)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })()
              : null}

            <View className="mt-3 flex-row flex-wrap gap-1.5">
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
                  onPress={() => pressQtyNumpad(k)}
                  className={`h-14 w-[32%] items-center justify-center rounded-lg border border-slate-200 ${
                    k === "⌫"
                      ? "bg-slate-100 active:bg-slate-200"
                      : "bg-white active:bg-slate-50"
                  }`}
                >
                  <Text
                    className={`text-xl font-semibold ${
                      k === "⌫" ? "text-slate-600" : "text-slate-900"
                    }`}
                  >
                    {k}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={() => setQtyProduct(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
              >
                <Text className="text-center text-sm font-semibold text-slate-700">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmQty}
                className="flex-1 rounded-xl bg-brand-600 px-4 py-3 active:bg-brand-700"
              >
                <Text className="text-center text-sm font-semibold text-white">
                  Set
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
