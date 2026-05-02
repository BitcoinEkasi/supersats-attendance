"use client";

import { useState } from "react";
import PayoutInvoicePanel from "./payout-invoice-panel";

interface DirectResult {
  direct: true;
  total_sats: number;
  eligible_count: number;
  ineligible_count: number;
}

interface InvoiceData {
  payment_request: string;
  qr_base64: string;
  total_sats: number;
  eligible_count: number;
  ineligible_count: number;
  // top-up fields (present when reserves covered part of the payout)
  topup_sats?: number;
  reserve_sats?: number;
  full_total_sats?: number;
}

export default function CreatePayoutButton({ reportId, createPayoutUrl, checkUrl }: { reportId: string; createPayoutUrl?: string; checkUrl?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [direct, setDirect] = useState<DirectResult | null>(null);

  async function handleCreate() {
    setLoading(true);
    setError("");
    const res = await fetch(createPayoutUrl ?? `/api/reports/${reportId}/create-payout`, { method: "POST" });
    const result = await res.json();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.direct) {
      setDirect(result as DirectResult);
    } else if (result.invoice) {
      setInvoice(result.invoice);
    }
  }

  if (direct) {
    return (
      <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">⚡ Rewards Paid</h3>
          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            Paid — cards topped up
          </span>
        </div>
        <p className="text-sm text-green-800">
          Paid directly from bolt reserves — {direct.total_sats.toLocaleString()} sats distributed to {direct.eligible_count} participant{direct.eligible_count !== 1 ? "s" : ""}.
          {direct.ineligible_count > 0 && (
            <span className="ml-1 text-amber-700">{direct.ineligible_count} participant{direct.ineligible_count !== 1 ? "s" : ""} without bolt account excluded.</span>
          )}
        </p>
      </div>
    );
  }

  if (invoice) {
    const topupNote = invoice.topup_sats
      ? `${invoice.reserve_sats?.toLocaleString()} sats drawn from bolt reserves · ${invoice.topup_sats.toLocaleString()} sats top-up invoice`
      : undefined;
    return (
      <PayoutInvoicePanel
        reportId={reportId}
        paymentRequest={invoice.payment_request}
        qrBase64={invoice.qr_base64}
        totalSats={invoice.total_sats}
        eligibleCount={invoice.eligible_count}
        ineligibleCount={invoice.ineligible_count}
        initialStatus="invoiced"
        checkUrl={checkUrl}
        paidMessage={
          invoice.full_total_sats
            ? `Payment received. ${invoice.eligible_count ?? ""} participant cards have been topped up (${invoice.full_total_sats.toLocaleString()} sats total: ${invoice.reserve_sats?.toLocaleString()} from reserves + ${invoice.topup_sats?.toLocaleString()} via invoice).`
            : undefined
        }
        topupNote={topupNote}
      />
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-amber-800 mb-3">
        This report is approved but no payout has been created yet. Bolt reserves will be checked — if sufficient, rewards are paid instantly with no invoice required.
      </p>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={handleCreate}
        disabled={loading}
        className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-40"
      >
        {loading ? "Processing…" : "⚡ Pay Rewards"}
      </button>
    </div>
  );
}
