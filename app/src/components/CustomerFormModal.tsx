import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import CustomerTypePickerModal from "@/components/CustomerTypePickerModal";
import DatePickerModal from "@/components/DatePickerModal";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import {
  createCustomer,
  listCustomerTypes,
  updateCustomer,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from "@/lib/customers";
import { formatDate, toISODate } from "@/lib/dates";
import { getCachedSettings } from "@/lib/settings";
import type { Customer, CustomerType } from "@/types/customer";
import type { Settings } from "@/types/settings";

type Props = {
  visible: boolean;
  customer: Customer | null;
  initialName?: string;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
};

type FormState = {
  cus_name: string;
  cus_address: string;
  cus_contactno: string;
  cus_email: string;
  cus_birthdate: string;
  cus_joindate: string;
  cus_type: string;
};

function initial(customer: Customer | null): FormState {
  return {
    cus_name: customer?.cus_name ?? "",
    cus_address: customer?.cus_address ?? "",
    cus_contactno: customer?.cus_contactno ?? "",
    cus_email: customer?.cus_email ?? "",
    cus_birthdate: toISODate(customer?.cus_birthdate) ?? "",
    cus_joindate: toISODate(customer?.cus_joindate) ?? "",
    cus_type: customer?.cus_type ?? "",
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CustomerFormModal({
  visible,
  customer,
  initialName,
  onClose,
  onSaved,
}: Props) {
  const { hasModule } = useAuth();
  const isEdit = customer !== null;
  const [form, setForm] = useState<FormState>(initial(null));
  const [types, setTypes] = useState<CustomerType[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [birthPickerOpen, setBirthPickerOpen] = useState(false);
  const [joinPickerOpen, setJoinPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceSettings, setDeviceSettings] = useState<Settings | null>(null);

  const canEdit = hasModule(isEdit ? "customer.edit" : "customer.create");

  useEffect(() => {
    if (!visible) return;
    const seed = initial(customer);
    if (!customer && initialName) seed.cus_name = initialName;
    setForm(seed);
    setError(null);
    void getCachedSettings().then(setDeviceSettings);
  }, [visible, customer, initialName]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setTypesLoading(true);
    listCustomerTypes()
      .then((rows) => {
        if (!cancelled) setTypes(rows);
      })
      .catch(() => {
        if (!cancelled) setTypes([]);
      })
      .finally(() => {
        if (!cancelled) setTypesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const emailError =
    form.cus_email && !EMAIL_RE.test(form.cus_email.trim())
      ? "Invalid email address."
      : null;

  const disabled =
    saving ||
    !canEdit ||
    form.cus_name.trim() === "" ||
    form.cus_type.trim() === "" ||
    emailError !== null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function handlePickType(type: CustomerType) {
    set("cus_type", type.customer_refno);
  }

  const selectedType = types.find((t) => t.customer_refno === form.cus_type);

  async function handleSave() {
    if (disabled) return;
    setSaving(true);
    setError(null);
    try {
      let saved: Customer;
      if (isEdit) {
        const patch: UpdateCustomerInput = {};
        const nameTrim = form.cus_name.trim();
        if (nameTrim !== customer!.cus_name) patch.cus_name = nameTrim;

        const addrTrim = form.cus_address.trim();
        const addrVal = addrTrim === "" ? null : addrTrim;
        if (addrVal !== (customer!.cus_address ?? null))
          patch.cus_address = addrVal;

        const contactTrim = form.cus_contactno.trim();
        const contactVal = contactTrim === "" ? null : contactTrim;
        if (contactVal !== (customer!.cus_contactno ?? null))
          patch.cus_contactno = contactVal;

        const emailTrim = form.cus_email.trim();
        const emailVal = emailTrim === "" ? null : emailTrim;
        if (emailVal !== (customer!.cus_email ?? null))
          patch.cus_email = emailVal;

        const birthVal = form.cus_birthdate === "" ? null : form.cus_birthdate;
        if (birthVal !== (toISODate(customer!.cus_birthdate) ?? null))
          patch.cus_birthdate = birthVal;

        const joinVal = form.cus_joindate === "" ? null : form.cus_joindate;
        if (joinVal !== (toISODate(customer!.cus_joindate) ?? null))
          patch.cus_joindate = joinVal;

        if (form.cus_type !== customer!.cus_type) patch.cus_type = form.cus_type;

        if (Object.keys(patch).length === 0) {
          onClose();
          return;
        }
        saved = await updateCustomer(customer!.cus_refno, patch);
      } else {
        const payload: CreateCustomerInput = {
          cus_name: form.cus_name.trim(),
          cus_address: form.cus_address.trim() || null,
          cus_contactno: form.cus_contactno.trim() || null,
          cus_email: form.cus_email.trim() || null,
          cus_birthdate: form.cus_birthdate || null,
          cus_type: form.cus_type,
          cus_branch: deviceSettings?.branch_id || null,
        };
        saved = await createCustomer(payload);
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save customer.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 bg-black/40"
      >
        <View className="mt-auto max-h-[92%] rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
            <View>
              <Text className="text-lg font-bold text-slate-900">
                {isEdit ? "Edit customer" : "New customer"}
              </Text>
              <Text className="text-xs text-slate-500">
                {isEdit
                  ? `#${customer?.cus_refno} · ${customer?.cus_code}`
                  : "Ref # and code auto-generated on save"}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={saving}
              hitSlop={10}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
            >
              <Ionicons name="close" size={22} color="#475569" />
            </Pressable>
          </View>

          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingVertical: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text className="mb-1 text-sm font-medium text-slate-700">
              Name
            </Text>
            <TextInput
              value={form.cus_name}
              onChangeText={(v) => set("cus_name", v)}
              editable={canEdit && !saving}
              placeholder="Juan Dela Cruz"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Type
            </Text>
            <Pressable
              onPress={() => setTypePickerOpen(true)}
              disabled={saving || typesLoading || !canEdit}
              className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 active:bg-slate-100"
            >
              <View className="flex-1 pr-3">
                {form.cus_type ? (
                  <>
                    <Text className="text-base text-slate-900">
                      {selectedType?.type ?? form.cus_type}
                    </Text>
                    <Text className="text-xs text-slate-500">
                      Code: {form.cus_type}
                    </Text>
                  </>
                ) : (
                  <Text className="text-base text-slate-400">
                    {typesLoading ? "Loading types..." : "Choose a type"}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={18} color="#64748b" />
            </Pressable>

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Branch{" "}
              <Text className="text-slate-400">
                (auto from this device)
              </Text>
            </Text>
            {isEdit ? (
              <View className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3">
                <Text className="text-base text-slate-900">
                  {customer?.cus_branch ?? "—"}
                </Text>
              </View>
            ) : deviceSettings?.branch_id ? (
              <View className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3">
                <Text className="text-base text-slate-900">
                  {deviceSettings.branch_name ?? deviceSettings.branch_id}
                </Text>
                <Text className="text-xs text-slate-500">
                  ID: {deviceSettings.branch_id}
                </Text>
              </View>
            ) : (
              <View className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <Text className="text-base text-amber-800">
                  No branch set on this device
                </Text>
                <Text className="text-xs text-amber-700">
                  Customer will be saved without a branch tag.
                </Text>
              </View>
            )}

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Address <Text className="text-slate-400">(optional)</Text>
            </Text>
            <TextInput
              value={form.cus_address}
              onChangeText={(v) => set("cus_address", v)}
              editable={canEdit && !saving}
              multiline
              placeholder="123 Rizal St, Manila"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Contact number <Text className="text-slate-400">(optional)</Text>
            </Text>
            <TextInput
              value={form.cus_contactno}
              onChangeText={(v) => set("cus_contactno", v)}
              keyboardType="phone-pad"
              editable={canEdit && !saving}
              placeholder="+63 912 345 6789"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Email <Text className="text-slate-400">(optional)</Text>
            </Text>
            <TextInput
              value={form.cus_email}
              onChangeText={(v) => set("cus_email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={canEdit && !saving}
              placeholder="name@example.com"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />
            {emailError ? (
              <Text className="mt-1 text-xs text-red-600">{emailError}</Text>
            ) : null}

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Birthdate <Text className="text-slate-400">(optional)</Text>
            </Text>
            <Pressable
              onPress={() => setBirthPickerOpen(true)}
              disabled={saving || !canEdit}
              className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 active:bg-slate-100"
            >
              {form.cus_birthdate ? (
                <Text className="text-base text-slate-900">
                  {formatDate(form.cus_birthdate)}
                </Text>
              ) : (
                <Text className="text-base text-slate-400">Pick a date</Text>
              )}
              <Ionicons name="calendar-outline" size={18} color="#64748b" />
            </Pressable>

            {isEdit ? (
              <>
                <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
                  Join date
                </Text>
                <Pressable
                  onPress={() => setJoinPickerOpen(true)}
                  disabled={saving || !canEdit}
                  className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 active:bg-slate-100"
                >
                  {form.cus_joindate ? (
                    <Text className="text-base text-slate-900">
                      {formatDate(form.cus_joindate)}
                    </Text>
                  ) : (
                    <Text className="text-base text-slate-400">Pick a date</Text>
                  )}
                  <Ionicons name="calendar-outline" size={18} color="#64748b" />
                </Pressable>
              </>
            ) : null}

            {error ? (
              <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                <Text className="text-sm text-red-700">{error}</Text>
              </View>
            ) : null}

            <View className="mt-6 flex-row gap-3">
              <Pressable
                onPress={onClose}
                disabled={saving}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
              >
                <Text className="text-center text-base font-semibold text-slate-700">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={disabled}
                className={`flex-1 rounded-xl px-4 py-3 ${
                  disabled ? "bg-brand-500/50" : "bg-brand-600 active:bg-brand-700"
                }`}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-center text-base font-semibold text-white">
                    {isEdit ? "Save changes" : "Create customer"}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <CustomerTypePickerModal
        visible={typePickerOpen}
        types={types}
        selectedRefno={form.cus_type || null}
        onClose={() => setTypePickerOpen(false)}
        onSelect={handlePickType}
      />

      <DatePickerModal
        visible={birthPickerOpen}
        value={form.cus_birthdate || null}
        title="Birthdate"
        allowClear
        onClose={() => setBirthPickerOpen(false)}
        onSelect={(iso) => set("cus_birthdate", iso)}
        onClear={() => set("cus_birthdate", "")}
      />

      <DatePickerModal
        visible={joinPickerOpen}
        value={form.cus_joindate || null}
        title="Join date"
        allowClear
        onClose={() => setJoinPickerOpen(false)}
        onSelect={(iso) => set("cus_joindate", iso)}
        onClear={() => set("cus_joindate", "")}
      />
    </Modal>
  );
}
