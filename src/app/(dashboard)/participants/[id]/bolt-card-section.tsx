import { getBoltUser, type BoltUser } from "@/lib/bolt";
import IssueCardButton from "./issue-card-button";

function CardStatusBadge({ card }: { card: BoltUser["card"] }) {
  if (!card) return null;
  if (!card.programmed) {
    return <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">Awaiting programming</span>;
  }
  if (!card.enabled) {
    return <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">Disabled</span>;
  }
  return <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">Active</span>;
}

export default async function BoltCardSection({
  participantId,
  boltUserId,
  isAdmin,
}: {
  participantId: string;
  boltUserId: string | null;
  isAdmin: boolean;
}) {
  let boltUser: BoltUser | null = null;
  if (boltUserId) {
    boltUser = await getBoltUser(boltUserId);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Bolt Card</h3>
        {isAdmin && !boltUserId && <IssueCardButton participantId={participantId} />}
      </div>

      {!boltUserId && (
        <p className="mt-3 text-sm text-gray-500">No card issued yet.</p>
      )}

      {boltUserId && !boltUser && (
        <p className="mt-3 text-sm text-red-500">Could not reach bolt service.</p>
      )}

      {boltUser && (
        <div className="mt-4 space-y-4">
          {/* Balance + card status + deeplink */}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                ⚡ {boltUser.balance_sats.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">sats</p>
            </div>
            <div className="ml-auto flex flex-col items-end gap-1">
              <CardStatusBadge card={boltUser.card} />
              {boltUser.card?.card_id && (
                <span className="font-mono text-xs text-gray-400">{boltUser.card.card_id}</span>
              )}
              <a
                href={`${process.env.NEXT_PUBLIC_BOLT_URL}/admin/users/${boltUser.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 rounded-md bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100"
              >
                Program Card ↗
              </a>
            </div>
          </div>

          {/* Transaction history */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Recent Transactions</p>
            {boltUser.transactions.length === 0 ? (
              <p className="text-sm text-gray-500">No transactions yet.</p>
            ) : (
              <div className="max-h-52 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-1.5">Date</th>
                      <th className="pb-1.5">Description</th>
                      <th className="pb-1.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boltUser.transactions.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0">
                        <td className="py-1.5 text-gray-500 whitespace-nowrap">
                          {new Date(tx.created_at * 1000).toLocaleDateString("en-GB", {
                            day: "2-digit", month: "short", year: "2-digit",
                          })}
                        </td>
                        <td className="py-1.5 text-gray-600 max-w-[150px] truncate">
                          {tx.description ?? tx.type}
                        </td>
                        <td className={`py-1.5 text-right font-medium ${tx.type === "refill" ? "text-green-600" : "text-red-600"}`}>
                          {tx.type === "refill" ? "+" : "-"}{tx.amount_sats.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
