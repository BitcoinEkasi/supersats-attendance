"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PayoutInvoicePanel from "./payout-invoice-panel";

interface InvoiceData {
  payment_request: string;
  qr_base64: string;
  total_sats: number;
  eligible_count: number;
  ineligible_count: number;
}

export default function ApproveButton({ reportId, disabled = false }: { reportId: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  async function handleApprove() {
    if (!confirm("Approve this report? This confirms that the month's results have been reviewed and are correct.")) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/reports/${reportId}/approve`, { method: "POST" });
    const result = await res.json();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.invoice) {
      setInvoice(result.invoice);
    }
    if (result.invoice_error) {
      setError(`Approved, but failed to create payout invoice: ${result.invoice_error}`);
    }
    router.refresh();
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={handleApprove}
        disabled={loading || disabled}
        title={disabled ? "Month is not yet complete" : undefined}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Approving..." : "Approve Report"}
      </button>
      {invoice && (
        <PayoutInvoicePanel
          reportId={reportId}
          paymentRequest={invoice.payment_request}
          qrBase64={invoice.qr_base64}
          totalSats={invoice.total_sats}
          eligibleCount={invoice.eligible_count}
          ineligibleCount={invoice.ineligible_count}
          initialStatus="invoiced"
        />
      )}
    </div>
  );
}
