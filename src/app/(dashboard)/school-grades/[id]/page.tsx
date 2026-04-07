import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import ApproveButton from "../../reports/approve-button";
import CreatePayoutButton from "../../reports/create-payout-button";
import PayoutInvoicePanel from "../../reports/payout-invoice-panel";
import { REWARD_TIERS } from "@/lib/rewards";

export default async function SchoolGradesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, payout] = await Promise.all([
    auth(),
    prisma.academicPayout.findUnique({
      where: { id },
      include: {
        entries: {
          include: {
            participant: { select: { tskId: true, surname: true, fullNames: true, knownAs: true } },
          },
          orderBy: { gradePercent: "desc" },
        },
      },
    }),
  ]);

  if (!payout) notFound();

  const role = session?.user?.role;
  const totalParticipants = payout.entries.length;
  const qualifying = payout.entries.filter((e) => e.rewardSats > 0);
  const totalSats = payout.entries.reduce((s, e) => s + e.rewardSats, 0);
  const avgGrade = totalParticipants > 0
    ? payout.entries.reduce((s, e) => s + e.gradePercent, 0) / totalParticipants
    : 0;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            School Grades — {payout.year} Term {payout.term}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Academic performance rewards report
          </p>
        </div>
        <div className="flex items-center gap-3">
          {payout.status === "APPROVED" ? (
            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">Approved</span>
          ) : (
            <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">Pending Approval</span>
          )}
          {role === "ADMINISTRATOR" && payout.status === "PENDING" && (
            <ApproveButton
              reportId={id}
              approveUrl={`/api/academic-payouts/${id}/approve`}
              checkUrl={`/api/academic-payouts/${id}/check-payout`}
              label="Approve & Pay"
              confirmMessage="Approve this school grades payout? Ensure all grades have been verified."
            />
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Participants</p>
          <p className="mt-1 text-2xl font-bold">{totalParticipants}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Qualifying (≥70%)</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{qualifying.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Avg Grade</p>
          <p className="mt-1 text-2xl font-bold">{avgGrade.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Rewards</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">
            🗲 {totalSats.toLocaleString()} sats
          </p>
        </div>
      </div>

      {/* Reward tier breakdown */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Reward Tier Breakdown</h3>
        <div className="mt-4 grid grid-cols-4 gap-3 lg:grid-cols-8">
          {REWARD_TIERS.map((tier) => {
            const count = payout.entries.filter((e) => {
              const pct = e.gradePercent;
              if (tier.sats === 10000) return pct >= 100;
              return pct >= tier.min && pct <= tier.max;
            }).length;
            return (
              <div key={tier.label} className="text-center">
                <p className={`text-lg font-bold ${tier.color}`}>{count}</p>
                <p className="text-xs text-gray-500">{tier.label}</p>
                <p className="text-xs font-medium text-gray-700">
                  {tier.sats > 0 ? `🗲 ${tier.sats} sats` : "No reward"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payout invoice panel */}
      {payout.status === "APPROVED" && payout.payoutStatus !== "unpaid" && payout.paymentRequest && (
        <PayoutInvoicePanel
          reportId={id}
          paymentRequest={payout.paymentRequest}
          qrBase64=""
          totalSats={payout.totalPayoutSats}
          initialStatus={payout.payoutStatus}
          checkUrl={`/api/academic-payouts/${id}/check-payout`}
          paidMessage={`Payment received. School grade rewards for ${payout.year} T${payout.term} have been distributed.`}
        />
      )}

      {/* Create payout button */}
      {payout.status === "APPROVED" && payout.payoutStatus === "unpaid" && role === "ADMINISTRATOR" && (
        <CreatePayoutButton
          reportId={id}
          createPayoutUrl={`/api/academic-payouts/${id}/create-payout`}
          checkUrl={`/api/academic-payouts/${id}/check-payout`}
        />
      )}

      {/* Entries table */}
      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">TSK ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Participant</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Grade %</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Reward (sats)</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {payout.entries.map((entry) => {
              const p = entry.participant;
              const tier = REWARD_TIERS.find((t) => {
                const pct = entry.gradePercent;
                if (t.sats === 10000) return pct >= 100;
                return pct >= t.min && pct <= t.max;
              });
              return (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.tskId}</td>
                  <td className="px-4 py-3 font-medium">
                    {p.surname}, {p.fullNames}{p.knownAs ? ` (${p.knownAs})` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className={tier?.color || ""}>{entry.gradePercent.toFixed(1)}%</span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {entry.rewardSats > 0 ? <>🗲 {entry.rewardSats.toLocaleString()}</> : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">DNQ</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {entry.rewardSats > 0 && (
                      entry.payoutStatus === "paid" ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Paid</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Pending</span>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
