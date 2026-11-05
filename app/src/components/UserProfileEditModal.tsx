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

import { ApiError } from "@/lib/api";
import {
  updateOwnProfile,
  updateUserProfile,
  type UpdateProfileInput,
} from "@/lib/users";
import type { User } from "@/types/user";

type Props = {
  visible: boolean;
  user: User;
  isSelf: boolean;
  onClose: () => void;
  onSaved: (user: User) => void;
};

const GENDERS = ["male", "female", "other"] as const;
type Gender = (typeof GENDERS)[number];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidBirthDate(raw: string): boolean {
  if (raw === "") return true;
  if (!DATE_RE.test(raw)) return false;
  const d = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d <= now && d.getUTCFullYear() >= 1900;
}

function isValidUrl(raw: string): boolean {
  if (raw === "") return true;
  return /^https?:\/\/.+/i.test(raw);
}

type FormState = {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  birth_date: string;
  gender: Gender | "";
  avatar_url: string;
};

function initial(u: User): FormState {
  return {
    first_name: u.first_name ?? "",
    last_name: u.last_name ?? "",
    phone: u.phone ?? "",
    address: u.address ?? "",
    birth_date: u.birth_date ?? "",
    gender: (u.gender as Gender | null) ?? "",
    avatar_url: u.avatar_url ?? "",
  };
}

export default function UserProfileEditModal({
  visible,
  user,
  isSelf,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>(initial(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setForm(initial(user));
    setError(null);
  }, [visible, user]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  const birthOk = isValidBirthDate(form.birth_date);
  const urlOk = isValidUrl(form.avatar_url);
  const nameOk =
    form.first_name.trim() !== "" && form.last_name.trim() !== "";

  function diffPatch(): UpdateProfileInput {
    const patch: UpdateProfileInput = {};
    const ft = form.first_name.trim();
    const lt = form.last_name.trim();
    if (ft !== (user.first_name ?? "")) patch.first_name = ft;
    if (lt !== (user.last_name ?? "")) patch.last_name = lt;

    const diffNullable = (
      key: "phone" | "address" | "birth_date" | "gender" | "avatar_url",
      raw: string,
    ) => {
      const trimmed = raw.trim();
      const next = trimmed === "" ? null : trimmed;
      const prev = (user as unknown as Record<string, string | null>)[key];
      if ((prev ?? null) !== next) patch[key] = next;
    };

    diffNullable("phone", form.phone);
    diffNullable("address", form.address);
    diffNullable("birth_date", form.birth_date);
    diffNullable("gender", form.gender);
    diffNullable("avatar_url", form.avatar_url);
    return patch;
  }

  const patch = diffPatch();
  const hasChanges = Object.keys(patch).length > 0;
  const disabled = saving || !hasChanges || !nameOk || !birthOk || !urlOk;

  async function handleSave() {
    if (disabled) return;
    setSaving(true);
    setError(null);
    try {
      const saved = isSelf
        ? await updateOwnProfile(patch)
        : await updateUserProfile(user.id, patch);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save changes.",
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
                Edit profile
              </Text>
              <Text className="text-xs text-slate-500">
                {user.email} · email, role, password are not editable here
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
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-sm font-medium text-slate-700">
                  First name
                </Text>
                <TextInput
                  value={form.first_name}
                  onChangeText={(v) => set("first_name", v)}
                  editable={!saving}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-sm font-medium text-slate-700">
                  Last name
                </Text>
                <TextInput
                  value={form.last_name}
                  onChangeText={(v) => set("last_name", v)}
                  editable={!saving}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
                />
              </View>
            </View>
            {!nameOk ? (
              <Text className="mt-1 text-xs text-red-600">
                First and last name must be non-empty.
              </Text>
            ) : null}

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Phone <Text className="text-slate-400">(optional)</Text>
            </Text>
            <TextInput
              value={form.phone}
              onChangeText={(v) => set("phone", v)}
              keyboardType="phone-pad"
              editable={!saving}
              placeholder="+63 912 345 6789"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Address <Text className="text-slate-400">(optional)</Text>
            </Text>
            <TextInput
              value={form.address}
              onChangeText={(v) => set("address", v)}
              editable={!saving}
              placeholder="123 Rizal St, Manila"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Birth date <Text className="text-slate-400">(optional)</Text>
            </Text>
            <TextInput
              value={form.birth_date}
              onChangeText={(v) => set("birth_date", v)}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              editable={!saving}
              placeholder="YYYY-MM-DD"
              maxLength={10}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />
            {!birthOk ? (
              <Text className="mt-1 text-xs text-red-600">
                Use YYYY-MM-DD and a plausible date.
              </Text>
            ) : null}

            <Text className="mb-2 mt-4 text-sm font-medium text-slate-700">
              Gender <Text className="text-slate-400">(optional)</Text>
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {GENDERS.map((g) => {
                const active = form.gender === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => set("gender", active ? "" : g)}
                    disabled={saving}
                    className={`rounded-full px-4 py-2 ${
                      active
                        ? "bg-brand-600"
                        : "border border-slate-200 bg-white active:bg-slate-50"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium capitalize ${
                        active ? "text-white" : "text-slate-700"
                      }`}
                    >
                      {g}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Avatar URL <Text className="text-slate-400">(optional)</Text>
            </Text>
            <TextInput
              value={form.avatar_url}
              onChangeText={(v) => set("avatar_url", v)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!saving}
              placeholder="https://..."
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />
            {!urlOk ? (
              <Text className="mt-1 text-xs text-red-600">
                Must start with http:// or https://
              </Text>
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
                    Save changes
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
