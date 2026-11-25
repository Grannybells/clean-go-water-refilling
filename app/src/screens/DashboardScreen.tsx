import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type ModuleTile = {
  label: string;
  path: string;
  icon: IconName;
  module: string;
  description: string;
};

const MODULES: ModuleTile[] = [
  {
    label: "Pickups",
    path: "/pickup",
    icon: "cube-outline",
    module: "pickup.view",
    description: "Manage customer pickups",
  },
  {
    label: "Deliveries",
    path: "/delivery",
    icon: "car-outline",
    module: "delivery.view",
    description: "Schedule and track deliveries",
  },
  {
    label: "Customers",
    path: "/customer",
    icon: "people-outline",
    module: "customer.view",
    description: "View and edit customers",
  },
  {
    label: "Sales",
    path: "/sales",
    icon: "cash-outline",
    module: "water.sales.view",
    description: "Review sales records",
  },
  {
    label: "POS",
    path: "/pos",
    icon: "calculator-outline",
    module: "water.pos.view",
    description: "Open point of sale",
  },
  {
    label: "Inventory",
    path: "/inventory",
    icon: "cube-outline",
    module: "inventory.view",
    description: "Track stock levels",
  },
  {
    label: "Users",
    path: "/users",
    icon: "person-circle-outline",
    module: "settings.users.view",
    description: "Manage user accounts",
  },
  {
    label: "Device",
    path: "/settings/device",
    icon: "phone-portrait-outline",
    module: "settings.device.view",
    description: "Device preferences",
  },
  {
    label: "Branches",
    path: "/settings/branches",
    icon: "business-outline",
    module: "settings.branches.view",
    description: "Manage branches",
  },
  {
    label: "Groups",
    path: "/settings/groups",
    icon: "people-circle-outline",
    module: "settings.groups.view",
    description: "User groups and roles",
  },
  {
    label: "Modules",
    path: "/settings/modules",
    icon: "grid-outline",
    module: "settings.modules.view",
    description: "Configure module access",
  },
];

const TILE_MIN_WIDTH = 180;

export default function DashboardScreen() {
  const { user, hasModule } = useAuth();
  const { width } = useWindowDimensions();

  const accessible = useMemo(
    () => MODULES.filter((m) => hasModule(m.module)),
    [hasModule],
  );

  const columns = useMemo(() => {
    const horizontalPadding = 48;
    const available = Math.max(0, width - horizontalPadding);
    return Math.max(2, Math.floor(available / TILE_MIN_WIDTH));
  }, [width]);

  const widthClass = `${(100 / columns).toFixed(4)}%` as const;

  return (
    <View className="flex-1 bg-brand-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingVertical: 24,
        }}
      >
        <View className="items-center">
          <Image
            source={require("../../assets/banner.png")}
            style={{ width: 280, height: 160 }}
            resizeMode="contain"
          />
        </View>

        <View className="mt-4 items-center">
          <Text className="text-sm font-medium uppercase tracking-wide text-brand-600">
            Welcome back
          </Text>
          <Text className="mt-1 text-2xl font-bold text-slate-900">
            {user?.first_name ?? "Guest"} {user?.last_name ?? ""}
          </Text>
          {user ? (
            <Text className="mt-0.5 text-xs text-slate-500">
              {user.email}
              {user.role ? ` · ${user.role}` : ""}
            </Text>
          ) : null}
        </View>

        <View className="mt-8 flex-row items-center justify-between">
          <Text className="text-base font-semibold text-slate-900">
            Your modules
          </Text>
          <Text className="text-xs text-slate-500">
            {accessible.length} available
          </Text>
        </View>

        {accessible.length === 0 ? (
          <View className="mt-4 flex-1 items-center justify-center rounded-2xl bg-white p-8 shadow">
            <Ionicons name="lock-closed-outline" size={32} color="#94a3b8" />
            <Text className="mt-3 text-sm font-semibold text-slate-700">
              No modules assigned
            </Text>
            <Text className="mt-1 text-center text-xs text-slate-500">
              Ask an administrator to grant you module access.
            </Text>
          </View>
        ) : (
          <View
            className="mt-3 flex-row flex-wrap"
            style={{ marginHorizontal: -6 }}
          >
            {accessible.map((m) => (
              <View
                key={m.path}
                style={{
                  width: widthClass,
                  paddingHorizontal: 6,
                  paddingVertical: 6,
                }}
              >
                <Pressable
                  onPress={() => router.push(m.path as never)}
                  className="items-center rounded-2xl bg-white p-4 shadow active:bg-brand-50"
                >
                  <Ionicons name={m.icon} size={30} color="#1858b8" />
                  <Text className="mt-3 text-center text-base font-semibold text-slate-900">
                    {m.label}
                  </Text>
                  <Text
                    className="mt-0.5 text-center text-[11px] text-slate-500"
                    numberOfLines={2}
                  >
                    {m.description}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
