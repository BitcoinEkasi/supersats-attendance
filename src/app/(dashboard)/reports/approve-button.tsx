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
  topup_sats?: number;
  reserve_sats?: number;
  full_total_sats?: number;
}

interface DirectResult {
  total_sats: number;
  eligible_count: number;
  ineligible_count: number;
}

export default function ApproveButton({ reportId, disabled = false, approveUrl, checkUrl, confirmMessage, label, missingCards }: { reportId: string; disabled?: boolean; approveUrl?: string; checkUrl?: string; confirmMessage?: string; label?: string; missingCards?: { tskId: string; name: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [direct, setDirect] = useState<DirectResult | null>(null);

  async function handleApprove() {
    if (!confirm(confirmMessage ?? "Approve this report? This confirms that the results have been reviewed and are correct.")) return;
    setLoading(true);
    setError("");
    setNotice("");
    const res = await fetch(approveUrl ?? `/api/reports/${reportId}/approve`, { method: "POST" });
    const result = await res.json();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.direct) {
      setDirect({ total_sats: result.total_sats, eligible_count: result.eligible_count, ineligible_count: result.ineligible_count });
    } else if (result.invoice) {
      setInvoice(result.invoice);
    } else if (result.invoice_error) {
      setError(`Approved, but failed to create payout invoice: ${result.invoice_error}`);
    } else {
      // No eligible participants (none have bolt accounts linked yet)
      const ineligible = result.ineligible_count ?? 0;
      setNotice(
        ineligible > 0
          ? `Report approved. ${ineligible} qualifying participant${ineligible !== 1 ? "s" : ""} have no bolt account linked — issue bolt cards first, then re-generate and re-approve the report.`
          : "Report approved. No qualifying participants this month."
      );
    }
    router.refresh();
  }

  const hasCardWarning = (missingCards?.length ?? 0) > 0;

  return (
    <div>
      {hasCardWarning && (
        <div className="mb-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-semibold">⚠ Cannot approve — {missingCards!.length} participant{missingCards!.length !== 1 ? "s have" : " has"} earned rewards but no bolt card issued:</p>
          <p className="mt-1">{missingCards!.map((c) => `[${c.tskId}] ${c.name}`).join(", ")}</p>
          <p className="mt-1 text-xs">Issue their cards first, then refresh and approve.</p>
        </div>
      )}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="mb-2 text-sm text-amber-700">{notice}</p>}
      <button
        onClick={handleApprove}
        disabled={loading || disabled || hasCardWarning}
        title={disabled ? "Month is not yet complete" : hasCardWarning ? "Issue bolt cards first" : undefined}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Approving..." : (label ?? "Approve Report")}
      </button>
      {direct && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-semibold text-green-800">⚡ Rewards Paid</p>
          <p className="mt-1 text-sm text-green-700">
            Paid directly from bolt reserves — {direct.total_sats.toLocaleString()} sats distributed to {direct.eligible_count} participant{direct.eligible_count !== 1 ? "s" : ""}.
            {direct.ineligible_count > 0 && (
              <span className="ml-1 text-amber-700">{direct.ineligible_count} participant{direct.ineligible_count !== 1 ? "s" : ""} without bolt account excluded.</span>
            )}
          </p>
        </div>
      )}
      {invoice && (
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
              ? `Payment received. ${invoice.eligible_count} participant cards have been topped up (${invoice.full_total_sats.toLocaleString()} sats total: ${invoice.reserve_sats?.toLocaleString()} from reserves + ${invoice.topup_sats?.toLocaleString()} via invoice).`
              : undefined
          }
          topupNote={
            invoice.topup_sats
              ? `${invoice.reserve_sats?.toLocaleString()} sats drawn from bolt reserves · ${invoice.topup_sats.toLocaleString()} sats top-up invoice`
              : undefined
          }
        />
      )}
    </div>
  );
}
