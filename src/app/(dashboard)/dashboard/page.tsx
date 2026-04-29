import PendingMovesTable from "./pending-moves-table";
import DivisionBreakdownTable from "./division-breakdown-table";
import CollapsibleSection from "./collapsible-section";

export default async function DashboardPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
      <CollapsibleSection title="Pending Level Changes">
        <PendingMovesTable />
      </CollapsibleSection>
      <CollapsibleSection title="Participant Divisions">
        <DivisionBreakdownTable />
      </CollapsibleSection>
    </div>
  );
}
