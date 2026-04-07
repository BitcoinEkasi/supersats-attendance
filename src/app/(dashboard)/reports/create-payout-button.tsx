"use client";

import { useState } from "react";
import PayoutInvoicePanel from "./payout-invoice-panel";

interface InvoiceData {
  payment_request: string;
  qr_base64: string;
  total_sats: number;
  eligible_count: number;
  ineligible_count: number;
}

export default function CreatePayoutButton({ reportId, createPayoutUrl, checkUrl }: { reportId: string; createPayoutUrl?: string; checkUrl?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

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
    if (result.invoice) {
      setInvoice(result.invoice);
    }
  }

  if (invoice) {
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
      />
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-amber-800 mb-3">
        This report is approved but no payout invoice has been created yet. Ensure all qualifying participants have bolt cards issued, then create the payout invoice.
      </p>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={handleCreate}
        disabled={loading}
        className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-40"
      >
        {loading ? "Creating…" : "⚡ Create Payout Invoice"}
      </button>
    </div>
  );
}
