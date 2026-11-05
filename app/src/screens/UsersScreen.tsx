import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";

import UserRegistrationModal from "@/components/UserRegistrationModal";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { listUsers } from "@/lib/users";
import type { User } from "@/types/user";

function roleColor(role: string): string {
  switch (role) {
    case "owner":
      return "bg-amber-100 text-amber-800";
    case "admin":
      return "bg-brand-100 text-brand-700";
    case "operator":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-slate-200 text-slate-700";
  }
}

function initials(user: User): string {
  const a = user.first_name?.[0] ?? "";
  const b = user.last_name?.[0] ?? "";
  return (a + b || user.email[0]).toUpperCase();
}

export default function UsersScreen() {
  const { hasModule } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const canCreate = hasModule("users.create");

  const load = useCallback(async () => {
    setError(null);
    try {
      setUsers(await listUsers());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load users.",
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

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function handleCreated(created: User) {
    setUsers((prev) => [created, ...prev]);
  }

  return (
    <View className="flex-1 bg-brand-50">
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => String(u.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            error ? (
              <View className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
                <Text className="text-sm text-red-700">{error}</Text>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <View className="mt-16 items-center">
              <Ionicons name="people-outline" size={40} color="#94a3b8" />
              <Text className="mt-2 text-sm text-slate-500">
                No users yet.
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/users/${item.id}`)}
              className="flex-row items-center rounded-2xl bg-white p-4 shadow-sm active:bg-brand-50"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-100">
                <Text className="text-base font-bold text-brand-700">
                  {initials(item)}
                </Text>
              </View>
              <View className="ml-3 flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-semibold text-slate-900">
                    {item.first_name} {item.last_name}
                  </Text>
                  <View
                    className={`rounded-full px-2 py-0.5 ${roleColor(item.role).split(" ")[0]}`}
                  >
                    <Text
                      className={`text-[10px] font-semibold uppercase ${roleColor(item.role).split(" ")[1]}`}
                    >
                      {item.role}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-slate-500" numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </Pressable>
          )}
        />
      )}

      {canCreate ? (
        <Pressable
          onPress={() => setShowCreate(true)}
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-brand-600 shadow-lg active:bg-brand-700"
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </Pressable>
      ) : null}

      <UserRegistrationModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </View>
  );
}
