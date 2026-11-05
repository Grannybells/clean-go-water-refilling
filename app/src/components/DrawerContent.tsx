import { Ionicons } from "@expo/vector-icons";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useAuth } from "@/context/AuthContext";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type Leaf = {
  kind: "leaf";
  label: string;
  path: string;
  icon: IconName;
  module: string | null;
};

type Branch = {
  kind: "branch";
  label: string;
  key: string;
  icon: IconName;
  children: Leaf[];
};

type MenuNode = Leaf | Branch;

const MENU: MenuNode[] = [
  { kind: "leaf", label: "Home", path: "/", icon: "home-outline", module: "home.view" },
  {
    kind: "leaf",
    label: "Customers",
    path: "/customer",
    icon: "people-outline",
    module: "customer.view",
  },
  { kind: "leaf", label: "Sales", path: "/sales", icon: "cash-outline", module: "sales.view" },
  {
    kind: "leaf",
    label: "Transactions",
    path: "/transactions",
    icon: "swap-horizontal-outline",
    module: "transactions.view",
  },
  {
    kind: "leaf",
    label: "Inventory",
    path: "/inventory",
    icon: "cube-outline",
    module: "inventory.view",
  },
  {
    kind: "leaf",
    label: "Users",
    path: "/users",
    icon: "person-circle-outline",
    module: "users.view",
  },
  {
    kind: "branch",
    label: "Settings",
    key: "settings",
    icon: "settings-outline",
    children: [
      {
        kind: "leaf",
        label: "Device",
        path: "/settings/device",
        icon: "phone-portrait-outline",
        module: "settings.device.view",
      },
      {
        kind: "leaf",
        label: "Stations",
        path: "/settings/stations",
        icon: "business-outline",
        module: "settings.stations.view",
      },
      {
        kind: "leaf",
        label: "Groups",
        path: "/settings/groups",
        icon: "people-circle-outline",
        module: "settings.groups.view",
      },
      {
        kind: "leaf",
        label: "Modules",
        path: "/settings/modules",
        icon: "grid-outline",
        module: "settings.modules.view",
      },
    ],
  },
];

function activeRouteFromState(
  state: DrawerContentComponentProps["state"],
): string {
  // Drawer top-level routes: "index", "customer", "settings", "users", ...
  return state.routeNames[state.index];
}

export default function DrawerContent(props: DrawerContentComponentProps) {
  const { user, signOut, hasModule } = useAuth();
  const activeTop = activeRouteFromState(props.state);

  const visibleMenu = useMemo(() => {
    return MENU.reduce<MenuNode[]>((acc, node) => {
      if (node.kind === "leaf") {
        if (node.module === null || hasModule(node.module)) acc.push(node);
      } else {
        const visibleChildren = node.children.filter(
          (c) => c.module === null || hasModule(c.module),
        );
        if (visibleChildren.length > 0) {
          acc.push({ ...node, children: visibleChildren });
        }
      }
      return acc;
    }, []);
  }, [hasModule]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const node of MENU) {
      if (node.kind === "branch") init[node.key] = node.key === activeTop;
    }
    return init;
  });

  function navigate(path: string) {
    router.push(path as never);
    props.navigation.closeDrawer();
  }

  function isLeafActive(leaf: Leaf): boolean {
    if (leaf.path === "/") return activeTop === "index";
    const top = leaf.path.replace(/^\//, "").split("/")[0];
    return activeTop === top;
  }

  function isBranchActive(branch: Branch): boolean {
    return branch.children.some((c) => isLeafActive(c));
  }

  return (
    <View className="flex-1 bg-white">
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 0 }}
      >
        <View className="border-b border-slate-100 bg-brand-50 px-5 pb-5 pt-10">
          <Text className="text-xs uppercase tracking-wide text-brand-600">
            Signed in
          </Text>
          <Text className="mt-1 text-lg font-semibold text-slate-900">
            {user ? `${user.first_name} ${user.last_name}` : "Guest"}
          </Text>
          {user ? (
            <Text className="text-xs text-slate-500">
              {user.email} · {user.role}
            </Text>
          ) : null}
        </View>

        <View className="px-2 py-3">
          {visibleMenu.map((node) => {
            if (node.kind === "leaf") {
              const active = isLeafActive(node);
              return (
                <Pressable
                  key={node.path}
                  onPress={() => navigate(node.path)}
                  className={`mb-1 flex-row items-center gap-3 rounded-xl px-3 py-3 ${
                    active ? "bg-brand-100" : "active:bg-slate-100"
                  }`}
                >
                  <Ionicons
                    name={node.icon}
                    size={20}
                    color={active ? "#1858b8" : "#475569"}
                  />
                  <Text
                    className={`text-base ${
                      active
                        ? "font-semibold text-brand-700"
                        : "font-medium text-slate-700"
                    }`}
                  >
                    {node.label}
                  </Text>
                </Pressable>
              );
            }

            const branchActive = isBranchActive(node);
            const open = expanded[node.key] || branchActive;
            return (
              <View key={node.key} className="mb-1">
                <Pressable
                  onPress={() =>
                    setExpanded((p) => ({ ...p, [node.key]: !open }))
                  }
                  className={`flex-row items-center gap-3 rounded-xl px-3 py-3 ${
                    branchActive ? "bg-brand-100" : "active:bg-slate-100"
                  }`}
                >
                  <Ionicons
                    name={node.icon}
                    size={20}
                    color={branchActive ? "#1858b8" : "#475569"}
                  />
                  <Text
                    className={`flex-1 text-base ${
                      branchActive
                        ? "font-semibold text-brand-700"
                        : "font-medium text-slate-700"
                    }`}
                  >
                    {node.label}
                  </Text>
                  <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={branchActive ? "#1858b8" : "#94a3b8"}
                  />
                </Pressable>

                {open ? (
                  <View className="ml-4 mt-1 border-l border-slate-100 pl-2">
                    {node.children.map((child) => {
                      const active = isLeafActive(child);
                      return (
                        <Pressable
                          key={child.path}
                          onPress={() => navigate(child.path)}
                          className={`mb-1 flex-row items-center gap-3 rounded-xl px-3 py-2.5 ${
                            active ? "bg-brand-50" : "active:bg-slate-100"
                          }`}
                        >
                          <Ionicons
                            name={child.icon}
                            size={16}
                            color={active ? "#1858b8" : "#64748b"}
                          />
                          <Text
                            className={`text-sm ${
                              active
                                ? "font-semibold text-brand-700"
                                : "font-medium text-slate-600"
                            }`}
                          >
                            {child.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </DrawerContentScrollView>

      <View className="border-t border-slate-100 bg-white px-4 py-4">
        <Pressable
          onPress={() => {
            void signOut();
          }}
          className="flex-row items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 active:bg-red-700"
        >
          <Ionicons name="log-out-outline" size={20} color="#ffffff" />
          <Text className="text-base font-semibold text-white">Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}
