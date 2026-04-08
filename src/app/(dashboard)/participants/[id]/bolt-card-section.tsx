import { getBoltUser, getZarPerSat, satsToZar, type BoltUser } from "@/lib/bolt";
import IssueCardButton from "./issue-card-button";
import TransactionsList from "./transactions-list";
import PaymentMethodSettings from "./payment-method-settings";

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
  prefetchedBoltUser,
  paymentMethod,
  lightningAddress,
}: {
  participantId: string;
  boltUserId: string | null;
  isAdmin: boolean;
  prefetchedBoltUser?: BoltUser | null;
  paymentMethod?: string;
  lightningAddress?: string | null;
}) {
  const isLnAddress = paymentMethod === "LIGHTNING_ADDRESS";

  let boltUser: BoltUser | null = prefetchedBoltUser ?? null;
  if (boltUserId && boltUser === null) {
    boltUser = await getBoltUser(boltUserId);
  }
  const zarPerSat = boltUser && !isLnAddress ? await getZarPerSat() : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Rewards</h3>
        {/* Only show Issue Card button for Bolt Card payment method */}
        {isAdmin && !isLnAddress && (!boltUserId || (boltUser && !boltUser.card)) && (
          <IssueCardButton participantId={participantId} />
        )}
      </div>

      {/* Payment method selector — admin only */}
      {isAdmin && (
        <PaymentMethodSettings
          participantId={participantId}
          paymentMethod={paymentMethod ?? "BOLT_CARD"}
          lightningAddress={lightningAddress ?? null}
        />
      )}

      {/* Lightning Address UI */}
      {isLnAddress && (
        <div className="mt-4 space-y-4">
          {boltUser && (
            <div>
              <div className="flex items-center justify-between">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Transaction History</p>
                <a
                  href={`${process.env.NEXT_PUBLIC_BOLT_URL}/admin/users/${boltUser.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100"
                >
                  View on Bolt ↗
                </a>
              </div>
              <TransactionsList transactions={boltUser.transactions} />
            </div>
          )}
          {!boltUserId && (
            <p className="text-sm text-gray-500">Bolt account will be created automatically at first payout.</p>
          )}
          {boltUserId && !boltUser && (
            <p className="text-sm text-red-500">Could not reach bolt service.</p>
          )}
        </div>
      )}

      {/* Bolt Card UI */}
      {!isLnAddress && (
        <>
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
                    ⚡ {boltUser.balance_sats.toLocaleString()} <span className="text-2xl">sats</span>
                    {zarPerSat && (
                      <span className="ml-2 text-lg font-normal text-gray-500">
                        ({satsToZar(boltUser.balance_sats, zarPerSat)})
                      </span>
                    )}
                  </p>
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
                    View on Bolt ↗
                  </a>
                </div>
              </div>

              {/* Transaction history */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Recent Transactions</p>
                <TransactionsList transactions={boltUser.transactions} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
