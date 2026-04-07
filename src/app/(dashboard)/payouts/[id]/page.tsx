import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { fmtDate } from "@/lib/format-date";
import ApproveButton from "../../reports/approve-button";
import CreatePayoutButton from "../../reports/create-payout-button";
import PayoutInvoicePanel from "../../reports/payout-invoice-panel";

export default async function SpecialPayoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, payout] = await Promise.all([
    auth(),
    prisma.specialPayout.findUnique({
      where: { id },
      include: {
        entries: {
          include: {
            participant: {
              select: { tskId: true, surname: true, fullNames: true, knownAs: true, paymentMethod: true, lightningAddress: true },
            },
          },
          orderBy: { amountSats: "desc" },
        },
      },
    }),
  ]);

  if (!payout) notFound();

  const role = session?.user?.role;
  const totalSats = payout.entries.reduce((s, e) => s + e.amountSats, 0);

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{payout.title}</h2>
          <p className="mt-1 text-sm text-gray-500">
            Created {fmtDate(payout.createdAt)} · {payout.entries.length} recipient{payout.entries.length !== 1 ? "s" : ""}
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
              approveUrl={`/api/payouts/${id}/approve`}
              checkUrl={`/api/payouts/${id}/check-payout`}
              label="Approve & Pay"
              confirmMessage={`Approve "${payout.title}"? This will generate a Lightning invoice for the total amount.`}
            />
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Recipients</p>
          <p className="mt-1 text-2xl font-bold">{payout.entries.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Sats</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">🗲 {totalSats.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Payout Status</p>
          <p className="mt-1 text-lg font-bold capitalize">{payout.payoutStatus}</p>
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
          checkUrl={`/api/payouts/${id}/check-payout`}
          paidMessage={`Payment received. All recipients in "${payout.title}" have been paid.`}
        />
      )}

      {/* Create payout button */}
      {payout.status === "APPROVED" && payout.payoutStatus === "unpaid" && role === "ADMINISTRATOR" && (
        <CreatePayoutButton
          reportId={id}
          createPayoutUrl={`/api/payouts/${id}/create-payout`}
          checkUrl={`/api/payouts/${id}/check-payout`}
        />
      )}

      {/* Entries table */}
      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">TSK ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Participant</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Payment Method</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Amount (sats)</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Note</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {payout.entries.map((entry) => {
              const p = entry.participant;
              return (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.tskId}</td>
                  <td className="px-4 py-3 font-medium">
                    {p.surname}, {p.fullNames}{p.knownAs ? ` (${p.knownAs})` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {p.paymentMethod === "LIGHTNING_ADDRESS" ? (
                      <div>
                        <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">⚡ Lightning</span>
                        {p.lightningAddress && (
                          <div className="mt-0.5 text-xs text-gray-500">{p.lightningAddress}</div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">💳 Bolt Card</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-orange-600">
                    🗲 {entry.amountSats.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{entry.note ?? "—"}</td>
                  <td className="px-4 py-3">
                    {entry.payoutStatus === "paid" ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Paid</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Pending</span>
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
