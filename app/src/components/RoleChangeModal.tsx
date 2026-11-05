import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";

import { ApiError } from "@/lib/api";
import { updateUserRole } from "@/lib/users";
import type { User, UserRole } from "@/types/user";

const ROLES: UserRole[] = ["staff", "operator", "admin", "owner"];

type Props = {
  visible: boolean;
  user: User;
  onClose: () => void;
  onSaved: (user: User) => void;
};

export default function RoleChangeModal({
  visible,
  user,
  onClose,
  onSaved,
}: Props) {
  const [selected, setSelected] = useState<UserRole>(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSelected(user.role);
    setError(null);
  }, [visible, user]);

  const disabled = saving || selected === user.role;

  async function handleSave() {
    if (disabled) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await updateUserRole(user.id, selected);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not change role.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-md rounded-2xl bg-white p-5 shadow">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-lg font-bold text-slate-900">
                Change role
              </Text>
              <Text className="mt-0.5 text-xs text-slate-500">
                {user.first_name} {user.last_name} · currently {user.role}
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

          <View className="mt-4 flex-row flex-wrap gap-2">
            {ROLES.map((r) => {
              const active = selected === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setSelected(r)}
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
                    {r}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mt-3 text-[11px] text-slate-500">
            The user's effective modules refresh at their next login — not
            immediately.
          </Text>

          {error ? (
            <View className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          <View className="mt-5 flex-row gap-3">
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
                  Change
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
