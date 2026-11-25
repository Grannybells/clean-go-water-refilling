import { Drawer } from "expo-router/drawer";

import DrawerContent from "@/components/DrawerContent";
import HeaderClock from "@/components/HeaderClock";

export default function AppLayout() {
  return (
    <Drawer
      drawerContent={(props) => {
        const Content = DrawerContent as unknown as React.ComponentType<any>;
        return <Content {...props} />;
      }}
      screenOptions={{
        headerTintColor: "#0f172a",
        headerStyle: { backgroundColor: "#eef7ff" },
        headerTitleStyle: { fontWeight: "600" },
        headerRight: () => <HeaderClock />,
        drawerType: "front",
        drawerStyle: { width: 280, backgroundColor: "#ffffff" },
      }}
    >
      <Drawer.Screen name="index" options={{ title: "Home" }} />
      <Drawer.Screen name="pos" options={{ title: "POS" }} />
      <Drawer.Screen name="pickup" options={{ title: "Pickups" }} />
      <Drawer.Screen name="delivery" options={{ title: "Deliveries" }} />
      <Drawer.Screen name="customer" options={{ title: "Customers" }} />
      <Drawer.Screen name="sales" options={{ title: "Sales" }} />
      <Drawer.Screen name="inventory" options={{ title: "Inventory" }} />
      <Drawer.Screen name="users" options={{ title: "Users" }} />
      <Drawer.Screen name="settings" options={{ title: "Settings" }} />
    </Drawer>
  );
}
