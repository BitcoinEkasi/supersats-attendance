"use client";

import { useState } from "react";
import { fmtDate } from "@/lib/format-date";

type Transaction = {
  id: number;
  created_at: number;
  description: string | null;
  type: string;
  amount_sats: number;
  status?: string;
};

export default function TransactionsList({ transactions }: { transactions: Transaction[] }) {
  const [expanded, setExpanded] = useState(false);

  if (transactions.length === 0) {
    return <p className="text-sm text-gray-500">No transactions yet.</p>;
  }

  const first = transactions[0];
  const rest = transactions.slice(1);

  function TxRow({ tx }: { tx: Transaction }) {
    return (
      <tr className="border-b last:border-0">
        <td className="py-1.5 text-gray-500 whitespace-nowrap">
          {fmtDate(new Date(tx.created_at * 1000))}
        </td>
        <td className="py-1.5 text-gray-600 max-w-[150px] truncate">
          {tx.description ?? tx.type}
        </td>
        <td className="py-1.5 text-right font-medium">
          {tx.type === "ln_payout" ? (
            tx.status === "paid" ? (
              <span className="text-green-600">→ {tx.amount_sats.toLocaleString()}</span>
            ) : tx.status === "failed" ? (
              <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Failed</span>
            ) : (
              <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{tx.status ?? "pending"}</span>
            )
          ) : (
            <span className={tx.type === "refill" ? "text-green-600" : "text-red-600"}>
              {tx.type === "refill" ? "+" : "-"}{tx.amount_sats.toLocaleString()}
            </span>
          )}
        </td>
      </tr>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-gray-500">
          <th className="pb-1.5">Date</th>
          <th className="pb-1.5">Description</th>
          <th className="pb-1.5 text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <TxRow tx={first} />
        {expanded && rest.map((tx) => <TxRow key={tx.id} tx={tx} />)}
      </tbody>
      {rest.length > 0 && (
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-2">
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-orange-600 hover:underline"
              >
                {expanded ? `Hide ${rest.length} earlier transactions ▲` : `Show ${rest.length} more transactions ▼`}
              </button>
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
