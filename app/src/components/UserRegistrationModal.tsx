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

import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { createUser } from "@/lib/users";
import type { User, UserRole } from "@/types/user";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: (user: User) => void;
};

const ROLES: UserRole[] = ["staff", "operator", "admin", "owner"];
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

const emptyForm = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  phone: "",
  address: "",
  birth_date: "",
  gender: "" as Gender | "",
  avatar_url: "",
  role: "staff" as UserRole,
};

export default function UserRegistrationModal({
  visible,
  onClose,
  onCreated,
}: Props) {
  const { user: me } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setForm(emptyForm);
    setError(null);
    setShowPassword(false);
  }, [visible]);

  const canPickOwner = me?.role === "owner";
  const visibleRoles = ROLES.filter((r) => r !== "owner" || canPickOwner);

  const birthDateOk = isValidBirthDate(form.birth_date);
  const avatarUrlOk = isValidUrl(form.avatar_url);

  const disabled =
    submitting ||
    form.email.trim() === "" ||
    form.password.length < 6 ||
    form.first_name.trim() === "" ||
    form.last_name.trim() === "" ||
    !birthDateOk ||
    !avatarUrlOk;

  function setField<K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (disabled) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createUser({
        email: form.email.trim(),
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        role: form.role,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        birth_date: form.birth_date.trim() || undefined,
        gender: form.gender || undefined,
        avatar_url: form.avatar_url.trim() || undefined,
      });
      onCreated(created);
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not create user. Try again.";
      setError(message);
    } finally {
      setSubmitting(false);
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
                New user
              </Text>
              <Text className="text-xs text-slate-500">
                They'll log in with the email and password you set.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={submitting}
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
                  onChangeText={(v) => setField("first_name", v)}
                  editable={!submitting}
                  placeholder="Juan"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-sm font-medium text-slate-700">
                  Last name
                </Text>
                <TextInput
                  value={form.last_name}
                  onChangeText={(v) => setField("last_name", v)}
                  editable={!submitting}
                  placeholder="Dela Cruz"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
                />
              </View>
            </View>

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Email
            </Text>
            <TextInput
              value={form.email}
              onChangeText={(v) => setField("email", v)}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!submitting}
              placeholder="juan@example.com"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Password
            </Text>
            <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 pr-2">
              <TextInput
                value={form.password}
                onChangeText={(v) => setField("password", v)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password-new"
                editable={!submitting}
                placeholder="At least 6 characters"
                className="flex-1 px-4 py-3 text-base text-slate-900"
              />
              <Pressable
                onPress={() => setShowPassword((s) => !s)}
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-200"
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#475569"
                />
              </Pressable>
            </View>
            {form.password.length > 0 && form.password.length < 6 ? (
              <Text className="mt-1 text-xs text-red-600">
                Password must be at least 6 characters.
              </Text>
            ) : null}

            <Text className="mb-2 mt-4 text-sm font-medium text-slate-700">
              Role
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {visibleRoles.map((r) => {
                const active = form.role === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setField("role", r)}
                    disabled={submitting}
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
                      {r}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {!canPickOwner ? (
              <Text className="mt-1 text-xs text-slate-500">
                Only an owner can create another owner.
              </Text>
            ) : null}

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Phone <Text className="text-slate-400">(optional)</Text>
            </Text>
            <TextInput
              value={form.phone}
              onChangeText={(v) => setField("phone", v)}
              keyboardType="phone-pad"
              editable={!submitting}
              placeholder="+63 912 345 6789"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Address <Text className="text-slate-400">(optional)</Text>
            </Text>
            <TextInput
              value={form.address}
              onChangeText={(v) => setField("address", v)}
              editable={!submitting}
              placeholder="123 Rizal St, Manila"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />

            <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
              Birth date <Text className="text-slate-400">(optional)</Text>
            </Text>
            <TextInput
              value={form.birth_date}
              onChangeText={(v) => setField("birth_date", v)}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              editable={!submitting}
              placeholder="YYYY-MM-DD"
              maxLength={10}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />
            {!birthDateOk ? (
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
                    onPress={() => setField("gender", active ? "" : g)}
                    disabled={submitting}
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
              onChangeText={(v) => setField("avatar_url", v)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!submitting}
              placeholder="https://..."
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />
            {!avatarUrlOk ? (
              <Text className="mt-1 text-xs text-red-600">
                Must start with http:// or https://
              </Text>
            ) : null}

            {error ? (
              <Text className="mt-4 text-sm text-red-600">{error}</Text>
            ) : null}

            <View className="mt-6 flex-row gap-3">
              <Pressable
                onPress={onClose}
                disabled={submitting}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
              >
                <Text className="text-center text-base font-semibold text-slate-700">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={disabled}
                className={`flex-1 rounded-xl px-4 py-3 ${
                  disabled ? "bg-brand-500/50" : "bg-brand-600 active:bg-brand-700"
                }`}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-center text-base font-semibold text-white">
                    Create user
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
