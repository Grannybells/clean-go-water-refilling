import RequireModule from "@/components/RequireModule";
import UsersScreen from "@/screens/UsersScreen";

export default function UsersRoute() {
  return (
    <RequireModule module="users.view">
      <UsersScreen />
    </RequireModule>
  );
}
