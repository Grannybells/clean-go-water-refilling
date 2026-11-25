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
  View,
} from "react-native";

import DatePickerModal from "@/components/DatePickerModal";
import BranchPickerModal from "@/components/BranchPickerModal";
import { ApiError } from "@/lib/api";
import { formatDate, toISODate } from "@/lib/dates";
import {
  createContract,
  updateContract,
  type CreateContractInput,
  type UpdateContractInput,
} from "@/lib/contracts";
import { listBranches } from "@/lib/branches";
import type { Contract } from "@/types/contract";
import type { Branch } from "@/types/branch";

type Props = {
  visible: boolean;
  userId: number;
  contract: Contract | null;
  onClose: () => void;
  onSaved: (contract: Contract) => void;
};

type FormState = {
  branch_id: string;
  branch_name: string | null;
  start_date: string;
  end_date: string;
};

function initial(contract: Contract | null): FormState {
  return {
    branch_id: contract?.branch_id ?? "",
    branch_name: contract?.branch_name ?? null,
    start_date: toISODate(contract?.start_date) ?? "",
    end_date: toISODate(contract?.end_date) ?? "",
  };
}

export default function ContractFormModal({
  visible,
  userId,
  contract,
  onClose,
  onSaved,
}: Props) {
  const isEdit = contract !== null;
  const [form, setForm] = useState<FormState>(initial(null));
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setForm(initial(contract));
    setError(null);
  }, [visible, contract]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setBranchesLoading(true);
    listBranches()
      .then((rows) => {
        if (!cancelled) setBranches(rows);
      })
      .catch(() => {
        if (!cancelled) setBranches([]);
      })
      .finally(() => {
        if (!cancelled) setBranchesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const endDateError =
    form.end_date && form.start_date && form.end_date < form.start_date
      ? "Must be on or after start date."
      : null;

  const disabled =
    saving ||
    !form.branch_id ||
    !form.start_date ||
    endDateError !== null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function handlePickBranch(branch: Branch) {
    setForm((p) => ({
      ...p,
      branch_id: branch.branch_id,
      branch_name: branch.branch_name,
    }));
  }

  async function handleSave() {
    if (disabled) return;
    setSaving(true);
    setError(null);
    try {
      let saved: Contract;
      if (isEdit) {
        const patch: UpdateContractInput = {};
        if (form.branch_id !== contract!.branch_id) {
          patch.branch_id = form.branch_id;
        }
        if (form.start_date !== toISODate(contract!.start_date)) {
          patch.start_date = form.start_date;
        }
        const normalizedEnd = form.end_date.trim() === "" ? null : form.end_date;
        if (normalizedEnd !== toISODate(contract!.end_date)) {
          patch.end_date = normalizedEnd;
        }
        if (Object.keys(patch).length === 0) {
          onClose();
          return;
        }
        saved = await updateContract(contract!.id, patch);
      } else {
        const payload: CreateContractInput = {
          user_id: userId,
          branch_id: form.branch_id,
          start_date: form.start_date,
          end_date: form.end_date.trim() === "" ? null : form.end_date,
        };
        saved = await createContract(payload);
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save contract.",
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
                {isEdit ? "Edit contract" : "New contract"}
              </Text>
              <Text className="text-xs text-slate-500">
                Assigns the user to a branch for a period.
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
              Branch
            </Text>
            <Pressable
              onPress={() => setBranchPickerOpen(true)}
              disabled={saving || branchesLoading}
              className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 active:bg-slate-100"
            >
              <View className="flex-1 pr-3">
                {form.branch_id ? (
                  <>
                    <Text className="text-base text-slate-900">
                      {form.branch_name ?? form.branch_id}
                    </Text>
                    <Text className="text-xs text-slate-500">
                      ID: {form.branch_id}
                    </Text>
                  </>
                ) : (
                  <Text className="text-base text-slate-400">
                    {branchesLoading ? "Loading branches..." : "Choose a branch"}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={18} color="#64748b" />
            </Pressable>

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Start date
            </Text>
            <Pressable
              onPress={() => setStartPickerOpen(true)}
              disabled={saving}
              className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 active:bg-slate-100"
            >
              {form.start_date ? (
                <Text className="text-base text-slate-900">
                  {formatDate(form.start_date)}
                </Text>
              ) : (
                <Text className="text-base text-slate-400">Pick a date</Text>
              )}
              <Ionicons name="calendar-outline" size={18} color="#64748b" />
            </Pressable>

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              End date <Text className="text-slate-400">(optional)</Text>
            </Text>
            <Pressable
              onPress={() => setEndPickerOpen(true)}
              disabled={saving}
              className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 active:bg-slate-100"
            >
              {form.end_date ? (
                <Text className="text-base text-slate-900">
                  {formatDate(form.end_date)}
                </Text>
              ) : (
                <Text className="text-base text-slate-400">
                  Open-ended (tap to pick)
                </Text>
              )}
              <Ionicons name="calendar-outline" size={18} color="#64748b" />
            </Pressable>
            {endDateError ? (
              <Text className="mt-1 text-xs text-red-600">{endDateError}</Text>
            ) : null}

            <Text className="mt-3 text-[11px] text-slate-500">
              A contract is active when today falls between start and end dates.
              Operator/staff must have an active contract for their branch to
              log in.
            </Text>

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
                    {isEdit ? "Save changes" : "Create contract"}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <BranchPickerModal
        visible={branchPickerOpen}
        branches={branches}
        selectedId={form.branch_id || null}
        onClose={() => setBranchPickerOpen(false)}
        onSelect={handlePickBranch}
      />

      <DatePickerModal
        visible={startPickerOpen}
        value={form.start_date || null}
        title="Start date"
        onClose={() => setStartPickerOpen(false)}
        onSelect={(iso) => set("start_date", iso)}
      />

      <DatePickerModal
        visible={endPickerOpen}
        value={form.end_date || null}
        title="End date"
        minDate={form.start_date || null}
        allowClear
        onClose={() => setEndPickerOpen(false)}
        onSelect={(iso) => set("end_date", iso)}
        onClear={() => set("end_date", "")}
      />
    </Modal>
  );
}
