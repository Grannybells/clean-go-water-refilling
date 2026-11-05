import RequireModule from "@/components/RequireModule";
import PlaceholderScreen from "@/screens/PlaceholderScreen";

export default function Transactions() {
  return (
    <RequireModule module="transactions.view">
      <PlaceholderScreen
        title="Transactions"
        description="Browse the full transaction ledger. Coming soon."
        icon="swap-horizontal-outline"
      />
    </RequireModule>
  );
}
