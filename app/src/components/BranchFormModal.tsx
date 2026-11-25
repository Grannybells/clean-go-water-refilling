import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import {
  createBranch,
  deleteBranch,
  updateBranch,
  type BranchInput,
} from "@/lib/branches";
import type { Branch } from "@/types/branch";

type Props = {
  visible: boolean;
  branch: Branch | null;
  onClose: () => void;
  onSaved: (branch: Branch) => void;
  onDeleted: (branchId: string) => void;
};

const BRANCH_ID_RE = /^[A-Za-z0-9_-]{1,20}$/;

type FormState = {
  branch_id: string;
  branch_name: string;
  branch_address: string;
  branch_lat: string;
  branch_lng: string;
  contact_number: string;
  description: string;
  is_active: boolean;
};

function initial(branch: Branch | null): FormState {
  return {
    branch_id: branch?.branch_id ?? "",
    branch_name: branch?.branch_name ?? "",
    branch_address: branch?.branch_address ?? "",
    branch_lat: branch?.branch_lat ?? "",
    branch_lng: branch?.branch_lng ?? "",
    contact_number: branch?.contact_number ?? "",
    description: branch?.description ?? "",
    is_active:
      branch === null
        ? true
        : branch.is_active === true || branch.is_active === 1,
  };
}

export default function BranchFormModal({
  visible,
  branch,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const { hasModule } = useAuth();
  const isEdit = branch !== null;
  const [form, setForm] = useState<FormState>(initial(null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setForm(initial(branch));
    setError(null);
  }, [visible, branch]);

  const canEdit = hasModule(isEdit ? "settings.branches.edit" : "settings.branches.create");
  const canDelete = isEdit && hasModule("settings.branches.delete");

  const idError =
    !isEdit && form.branch_id && !BRANCH_ID_RE.test(form.branch_id.trim())
      ? "Only letters, digits, underscore, hyphen (max 20)."
      : null;
  const latError =
    form.branch_lat && Number.isNaN(Number(form.branch_lat))
      ? "Must be a number."
      : null;
  const lngError =
    form.branch_lng && Number.isNaN(Number(form.branch_lng))
      ? "Must be a number."
      : null;

  const disabled =
    saving ||
    !canEdit ||
    form.branch_name.trim() === "" ||
    form.branch_address.trim() === "" ||
    (!isEdit && form.branch_id.trim() === "") ||
    idError !== null ||
    latError !== null ||
    lngError !== null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSave() {
    if (disabled) return;
    setSaving(true);
    setError(null);
    try {
      const base: BranchInput = {
        branch_name: form.branch_name.trim(),
        branch_address: form.branch_address.trim(),
        branch_lat: form.branch_lat ? Number(form.branch_lat) : null,
        branch_lng: form.branch_lng ? Number(form.branch_lng) : null,
        contact_number: form.contact_number.trim() || null,
        description: form.description.trim() || null,
        is_active: form.is_active,
      };
      const saved = isEdit
        ? await updateBranch(branch!.branch_id, base)
        : await createBranch({ ...base, branch_id: form.branch_id.trim() });
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save branch.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!branch) return;
    try {
      await deleteBranch(branch.branch_id);
      onDeleted(branch.branch_id);
      setConfirmDelete(false);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not delete branch.",
      );
      setConfirmDelete(false);
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
                {isEdit ? "Edit branch" : "New branch"}
              </Text>
              <Text className="text-xs text-slate-500">
                {isEdit
                  ? `ID: ${branch?.branch_id}`
                  : "Letters/digits/underscore/hyphen, max 20"}
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
            {!isEdit ? (
              <>
                <Text className="mb-1 text-sm font-medium text-slate-700">
                  Branch ID
                </Text>
                <TextInput
                  value={form.branch_id}
                  onChangeText={(v) => set("branch_id", v)}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={canEdit && !saving}
                  placeholder="e.g. BR-001"
                  maxLength={20}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
                />
                {idError ? (
                  <Text className="mt-1 text-xs text-red-600">{idError}</Text>
                ) : null}
              </>
            ) : null}

            <Text className={`mb-1 ${isEdit ? "" : "mt-4"} text-sm font-medium text-slate-700`}>
              Branch name
            </Text>
            <TextInput
              value={form.branch_name}
              onChangeText={(v) => set("branch_name", v)}
              editable={canEdit && !saving}
              placeholder="e.g. Downtown"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Address
            </Text>
            <TextInput
              value={form.branch_address}
              onChangeText={(v) => set("branch_address", v)}
              editable={canEdit && !saving}
              placeholder="123 Rizal St, Manila"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-sm font-medium text-slate-700">
                  Latitude
                </Text>
                <TextInput
                  value={form.branch_lat}
                  onChangeText={(v) => set("branch_lat", v)}
                  keyboardType="numbers-and-punctuation"
                  editable={canEdit && !saving}
                  placeholder="14.59951"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
                />
                {latError ? (
                  <Text className="mt-1 text-xs text-red-600">{latError}</Text>
                ) : null}
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-sm font-medium text-slate-700">
                  Longitude
                </Text>
                <TextInput
                  value={form.branch_lng}
                  onChangeText={(v) => set("branch_lng", v)}
                  keyboardType="numbers-and-punctuation"
                  editable={canEdit && !saving}
                  placeholder="120.98421"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
                />
                {lngError ? (
                  <Text className="mt-1 text-xs text-red-600">{lngError}</Text>
                ) : null}
              </View>
            </View>

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Contact number <Text className="text-slate-400">(optional)</Text>
            </Text>
            <TextInput
              value={form.contact_number}
              onChangeText={(v) => set("contact_number", v)}
              keyboardType="phone-pad"
              editable={canEdit && !saving}
              placeholder="+63 912 345 6789"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Description <Text className="text-slate-400">(optional)</Text>
            </Text>
            <TextInput
              value={form.description}
              onChangeText={(v) => set("description", v)}
              editable={canEdit && !saving}
              multiline
              placeholder="Downtown branch, open 24/7, etc."
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />

            <View className="mt-4 flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <View>
                <Text className="text-sm font-medium text-slate-700">
                  Active
                </Text>
                <Text className="text-xs text-slate-500">
                  Inactive branches stay listed but are marked unavailable.
                </Text>
              </View>
              <Switch
                value={form.is_active}
                onValueChange={(v) => set("is_active", v)}
                disabled={!canEdit || saving}
              />
            </View>

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
                    {isEdit ? "Save changes" : "Create branch"}
                  </Text>
                )}
              </Pressable>
            </View>

            {canDelete ? (
              <Pressable
                onPress={() => setConfirmDelete(true)}
                disabled={saving}
                className="mt-3 rounded-xl border border-red-200 bg-white px-4 py-3 active:bg-red-50"
              >
                <Text className="text-center text-base font-semibold text-red-700">
                  Delete branch
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete branch?"
        message={`This hard-deletes "${branch?.branch_name ?? ""}". Any contracts pointing at it will become orphans.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </Modal>
  );
}
