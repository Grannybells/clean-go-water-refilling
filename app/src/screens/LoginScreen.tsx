import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { getCachedSettings } from "@/lib/settings";
import type { Settings } from "@/types/settings";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void (async () => {
      setSettings(await getCachedSettings());
    })();
  }, []);

  const disabled = submitting || email.trim() === "" || password === "";

  async function handleSubmit() {
    if (disabled) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to sign in. Check your connection and try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const hasDeviceInfo = settings !== null;
  const stationLabel = settings?.station_name
    ? settings.station_id
      ? `${settings.station_name} · ${settings.station_id}`
      : settings.station_name
    : settings?.station_id ?? null;
  const userLabel = settings?.user_name ?? null;

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          <View className="mb-8">
            <Text className="text-3xl font-bold text-brand-700">
              Water Refilling
            </Text>
            <Text className="mt-2 text-base text-slate-600">
              Sign in to continue.
            </Text>
          </View>

          {hasDeviceInfo ? (
            <View className="mb-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
              <Text className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                This device
              </Text>
              <View className="mt-2 flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-100">
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color="#1858b8"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] text-slate-500">Station</Text>
                  <Text
                    className="text-sm font-semibold text-slate-900"
                    numberOfLines={1}
                  >
                    {stationLabel ?? "Not assigned"}
                  </Text>
                </View>
              </View>
              <View className="mt-3 flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-100">
                  <Ionicons name="person-outline" size={16} color="#1858b8" />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] text-slate-500">
                    Assigned user
                  </Text>
                  <Text
                    className="text-sm font-semibold text-slate-900"
                    numberOfLines={1}
                  >
                    {userLabel ?? "Not assigned"}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          <View className="rounded-2xl bg-white p-5 shadow">
            <Text className="mb-1 text-sm font-medium text-slate-700">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              editable={!submitting}
              className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />

            <Text className="mb-1 text-sm font-medium text-slate-700">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
              editable={!submitting}
              className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />

            {error ? (
              <Text className="mb-3 text-sm text-red-600">{error}</Text>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={disabled}
              className={`rounded-xl px-4 py-3 ${
                disabled ? "bg-brand-500/50" : "bg-brand-600 active:bg-brand-700"
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-center text-base font-semibold text-white">
                  Sign In
                </Text>
              )}
            </Pressable>
          </View>

          <Text className="mt-6 text-center text-xs text-slate-500">
            Accounts are provisioned by an owner or admin.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
