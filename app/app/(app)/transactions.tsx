import RequireModule from "@/components/RequireModule";
import TransactionsScreen from "@/screens/TransactionsScreen";

export default function Transactions() {
  return (
    <RequireModule module="transactions.view">
      <TransactionsScreen />
    </RequireModule>
  );
}
