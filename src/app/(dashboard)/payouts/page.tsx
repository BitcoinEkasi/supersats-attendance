import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fmtDate } from "@/lib/format-date";

export default async function SpecialPayoutsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMINISTRATOR") redirect("/dashboard");

  const payouts = await prisma.specialPayout.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { entries: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Special Payouts</h2>
          <p className="mt-1 text-sm text-gray-500">
            Ad-hoc one-off payments to individual participants.
          </p>
        </div>
        <Link
          href="/payouts/new"
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          + Create New Payout
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {payouts.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">
            No special payouts yet.{" "}
            <Link href="/payouts/new" className="text-orange-600 hover:underline">Create one →</Link>
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Recipients</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Total Sats</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Payout</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3">{p._count.entries}</td>
                  <td className="px-4 py-3 font-medium text-orange-600">
                    {p.totalPayoutSats > 0 ? `🗲 ${p.totalPayoutSats.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === "APPROVED" ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Approved</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.payoutStatus === "paid" ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Paid</span>
                    ) : p.payoutStatus === "invoiced" ? (
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Invoiced</span>
                    ) : (
                      <span className="text-xs text-gray-400">Unpaid</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/payouts/${p.id}`} className="text-xs text-orange-600 hover:underline">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
