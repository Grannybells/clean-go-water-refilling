import { ScrollView, Text, View } from "react-native";

import { useAuth } from "@/context/AuthContext";

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <ScrollView className="flex-1 bg-brand-50" contentContainerClassName="px-6 py-8">
      <Text className="text-sm font-medium uppercase tracking-wide text-brand-600">
        Welcome back
      </Text>
      <Text className="mt-1 text-3xl font-bold text-slate-900">
        {user?.first_name ?? "Guest"} {user?.last_name ?? ""}
      </Text>
      <Text className="mt-1 text-sm text-slate-500">
        {user?.email}
        {user?.role ? ` · ${user.role}` : ""}
      </Text>

      <View className="mt-8 rounded-2xl bg-white p-5 shadow">
        <Text className="text-base font-semibold text-slate-900">
          Session is active
        </Text>
        <Text className="mt-2 text-sm text-slate-600">
          Your JWT is kept in platform-secure storage (Keychain on iOS,
          Keystore on Android). It is attached automatically to every API
          call.
        </Text>
      </View>

      <View className="mt-4 rounded-2xl bg-white p-5 shadow">
        <Text className="text-base font-semibold text-slate-900">
          Open the menu
        </Text>
        <Text className="mt-2 text-sm text-slate-600">
          Tap the menu icon in the top-left or swipe from the left edge to open
          the sidebar.
        </Text>
      </View>
    </ScrollView>
  );
}
