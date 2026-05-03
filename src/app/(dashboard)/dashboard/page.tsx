import { prisma } from "@/lib/db";
import PendingMovesTable from "./pending-moves-table";
import DivisionBreakdownTable from "./division-breakdown-table";
import CollapsibleSection from "./collapsible-section";
import AbsenceReport from "./absence-report";

export default async function DashboardPage() {
  const flagCount = await prisma.absenceFlag.count();
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
      <CollapsibleSection
        title={flagCount > 0 ? `Absence Alerts (${flagCount})` : "Absence Alerts"}
        defaultOpen={flagCount > 0}
      >
        <AbsenceReport />
      </CollapsibleSection>
      <CollapsibleSection title="Pending Level Changes">
        <PendingMovesTable />
      </CollapsibleSection>
      <CollapsibleSection title="Participant Divisions">
        <DivisionBreakdownTable />
      </CollapsibleSection>
    </div>
  );
}
