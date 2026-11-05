import { Redirect } from "expo-router";
import { ReactNode } from "react";
import { Text, View } from "react-native";

import { useAuth } from "@/context/AuthContext";

type Props = {
  module: string;
  children: ReactNode;
};

export default function RequireModule({ module, children }: Props) {
  const { status, hasModule } = useAuth();

  if (status === "loading") return null;
  if (status === "unauthenticated") return <Redirect href="/(auth)/login" />;

  if (!hasModule(module)) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-50 px-8">
        <Text className="text-lg font-semibold text-slate-900">
          No access
        </Text>
        <Text className="mt-2 text-center text-sm text-slate-600">
          You don't have permission to view this page. Ask an admin for the
          "{module}" module.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}
