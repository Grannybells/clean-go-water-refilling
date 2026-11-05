import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError } from "@/lib/api";
import { listUsers } from "@/lib/users";
import type { User } from "@/types/user";

type Props = {
  visible: boolean;
  selectedId: number | null;
  onClose: () => void;
  onSelect: (user: User) => void;
  onClear?: () => void;
};

function roleColor(role: string): { bg: string; fg: string } {
  switch (role) {
    case "owner":
      return { bg: "bg-amber-100", fg: "text-amber-800" };
    case "admin":
      return { bg: "bg-brand-100", fg: "text-brand-700" };
    case "operator":
      return { bg: "bg-emerald-100", fg: "text-emerald-800" };
    default:
      return { bg: "bg-slate-200", fg: "text-slate-700" };
  }
}

export default function UserPickerModal({
  visible,
  selectedId,
  onClose,
  onSelect,
  onClear,
}: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setQuery("");
    setLoading(true);
    void (async () => {
      try {
        setUsers(await listUsers());
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.status === 403
              ? "You don't have access to the user list."
              : err.message
            : "Could not load users.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, query]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40">
        <View className="mt-auto max-h-[85%] rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
            <Text className="text-lg font-bold text-slate-900">
              Assign user
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
            >
              <Ionicons name="close" size={22} color="#475569" />
            </Pressable>
          </View>

          <View className="px-5 pb-2 pt-3">
            <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
              <Ionicons name="search" size={16} color="#94a3b8" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search name, email, role"
                autoCapitalize="none"
                className="ml-2 flex-1 py-2.5 text-base text-slate-900"
              />
              {query ? (
                <Pressable onPress={() => setQuery("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </Pressable>
              ) : null}
            </View>
          </View>

          {loading ? (
            <View className="py-16">
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(u) => String(u.id)}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              ItemSeparatorComponent={() => <View className="h-2" />}
              ListHeaderComponent={
                error ? (
                  <View className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
                    <Text className="text-sm text-red-700">{error}</Text>
                  </View>
                ) : undefined
              }
              ListEmptyComponent={
                <View className="items-center py-10">
                  <Ionicons name="people-outline" size={32} color="#94a3b8" />
                  <Text className="mt-2 text-sm text-slate-500">
                    {users.length === 0 ? "No users available." : "No matches."}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const selected = item.id === selectedId;
                const color = roleColor(item.role);
                return (
                  <Pressable
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className={`rounded-xl border p-3 ${
                      selected
                        ? "border-brand-500 bg-brand-50"
                        : "border-slate-100 bg-white active:bg-slate-50"
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 pr-3">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-sm font-semibold text-slate-900">
                            {item.first_name} {item.last_name}
                          </Text>
                          <View className={`rounded-full px-2 py-0.5 ${color.bg}`}>
                            <Text
                              className={`text-[10px] font-semibold uppercase ${color.fg}`}
                            >
                              {item.role}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-xs text-slate-500" numberOfLines={1}>
                          {item.email}
                        </Text>
                      </View>
                      {selected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#1858b8"
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}

          {onClear && selectedId !== null ? (
            <View className="border-t border-slate-100 px-5 py-3">
              <Pressable
                onPress={() => {
                  onClear();
                  onClose();
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
              >
                <Text className="text-center text-sm font-semibold text-slate-700">
                  Clear assignment
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
