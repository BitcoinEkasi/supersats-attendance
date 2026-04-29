import PendingMovesTable from "./pending-moves-table";
import DivisionBreakdownTable from "./division-breakdown-table";

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
      <PendingMovesTable />
      <DivisionBreakdownTable />
    </div>
  );
}
