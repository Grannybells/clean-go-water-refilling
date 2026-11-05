import RequireModule from "@/components/RequireModule";
import UserDetailScreen from "@/screens/UserDetailScreen";

export default function UserDetailRoute() {
  return (
    <RequireModule module="users.view">
      <UserDetailScreen />
    </RequireModule>
  );
}
