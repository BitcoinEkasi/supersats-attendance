"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";

interface PayoutInvoicePanelProps {
  reportId: string;
  paymentRequest: string;
  qrBase64: string;
  totalSats: number;
  eligibleCount?: number;
  ineligibleCount?: number;
  initialStatus: string; // "invoiced" | "paid"
  checkUrl?: string;
  paidMessage?: string;
}

export default function PayoutInvoicePanel({
  reportId,
  paymentRequest,
  qrBase64,
  totalSats,
  eligibleCount,
  ineligibleCount,
  initialStatus,
  checkUrl,
  paidMessage,
}: PayoutInvoicePanelProps) {
  const [status, setStatus] = useState(initialStatus);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedQr, setGeneratedQr] = useState<string>("");

  useEffect(() => {
    if (qrBase64 || !paymentRequest) return;
    QRCode.toDataURL(`lightning:${paymentRequest}`, {
      width: 400,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then((url) => setGeneratedQr(url));
  }, [paymentRequest, qrBase64]);

  // Auto-check status on mount so a page refresh reflects payment automatically
  useEffect(() => {
    if (initialStatus === "paid") return;
    checkStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkStatus() {
    setChecking(true);
    const res = await fetch(checkUrl ?? `/api/reports/${reportId}/check-payout`);
    const data = await res.json();
    setStatus(data.payout_status);
    setChecking(false);
  }

  function copyInvoice() {
    navigator.clipboard.writeText(paymentRequest);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">⚡ Reward Payout Invoice</h3>
        {status === "paid" ? (
          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            Paid — cards topped up
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
            Awaiting payment
          </span>
        )}
      </div>

      {status !== "paid" && (
        <>
          <div className="mb-4 flex flex-wrap gap-4 text-sm text-gray-600">
            <span>
              <strong className="text-orange-600 text-xl">{totalSats.toLocaleString()} sats</strong> total to pay
            </span>
            {eligibleCount !== undefined && (
              <span>{eligibleCount} participant{eligibleCount !== 1 ? "s" : ""} will be credited</span>
            )}
            {ineligibleCount !== undefined && ineligibleCount > 0 && (
              <span className="text-amber-600">{ineligibleCount} participant{ineligibleCount !== 1 ? "s" : ""} without bolt account (excluded)</span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {(qrBase64 || generatedQr) && (
              <img
                src={qrBase64 ? `data:image/png;base64,${qrBase64}` : generatedQr}
                alt="Lightning invoice QR"
                className="w-48 h-48 rounded-lg border border-gray-200 shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Lightning Invoice (BOLT11)</p>
              <textarea
                readOnly
                value={paymentRequest}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-700 resize-none"
                rows={4}
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={copyInvoice}
                  className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
                >
                  {copied ? "Copied!" : "Copy Invoice"}
                </button>
                <button
                  onClick={checkStatus}
                  disabled={checking}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {checking ? "Checking…" : "Check Payment Status"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {status === "paid" && (
        <p className="text-sm text-green-700">
          {paidMessage ?? `Payment received. ${eligibleCount ?? ""} participant cards have been topped up.`}
        </p>
      )}
    </div>
  );
}
