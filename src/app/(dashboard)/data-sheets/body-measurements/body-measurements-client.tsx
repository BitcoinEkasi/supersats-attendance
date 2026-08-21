"use client";

import { useMemo, useState } from "react";
import BodyMeasurementsTable, { type Participant } from "./body-measurements-table";
import ShoeSizeRollup from "./shoe-size-rollup";
import { computeShoeRollup, filterRollupByGroup } from "@/lib/shoe-rollup";
import type { TskGroupKey } from "@/lib/tsk-groups";

export default function BodyMeasurementsClient({ participants }: { participants: Participant[] }) {
  const [groupFilter, setGroupFilter] = useState<"all" | TskGroupKey>("all");

  const rollup = useMemo(() => {
    const full = computeShoeRollup(participants);
    return filterRollupByGroup(full, groupFilter);
  }, [participants, groupFilter]);

  return (
    <>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Body Measurements</h3>
        <div className="mt-3">
          <BodyMeasurementsTable participants={participants} groupFilter={groupFilter} onGroupFilterChange={setGroupFilter} />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Shoe Size Roll-up</h3>
        <div className="mt-3">
          <ShoeSizeRollup rollup={rollup} groupFilter={groupFilter} />
        </div>
      </div>
    </>
  );
}
