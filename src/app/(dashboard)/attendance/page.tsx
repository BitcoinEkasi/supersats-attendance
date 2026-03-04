import { prisma } from "@/lib/db";
import Link from "next/link";
import CSVUpload from "./csv-upload";

export default async function AttendancePage() {
  const batches = await prisma.importBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { admin: { select: { name: true } } },
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Attendance</h2>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CSVUpload />

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Import History
          </h3>
          {batches.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No imports yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Month</th>
                    <th className="pb-2 pr-4">File</th>
                    <th className="pb-2 pr-4">Matched</th>
                    <th className="pb-2 pr-4">Records</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{batch.month}</td>
                      <td className="py-2 pr-4 text-gray-600 max-w-32 truncate">
                        {batch.filename}
                      </td>
                      <td className="py-2 pr-4">
                        {batch.matchedCount}
                        {batch.unmatchedNames.length > 0 && (
                          <span className="ml-1 text-red-500">
                            ({batch.unmatchedNames.length} unmatched)
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4">{batch.recordCount}</td>
                      <td className="py-2 text-gray-500">
                        {batch.createdAt.toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
