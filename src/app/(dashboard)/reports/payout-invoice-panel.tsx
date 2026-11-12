"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  topupNote?: string;
  /** Called when the invoice expired and the server reset the payout to "unpaid". */
  onExpired?: () => void;
}

function formatRemaining(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
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
  topupNote,
  onExpired,
}: PayoutInvoicePanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedQr, setGeneratedQr] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const expiryCheckedRef = useRef(false);

  useEffect(() => {
    if (qrBase64 || !paymentRequest) return;
    QRCode.toDataURL(`lightning:${paymentRequest}`, {
      width: 400,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then((url) => setGeneratedQr(url));
  }, [paymentRequest, qrBase64]);

  // Tick the countdown every second while awaiting payment
  useEffect(() => {
    if (status !== "invoiced" || expiresAt === null) return;
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, [status, expiresAt]);

  // When the countdown hits zero, check immediately so the server resets the expired invoice
  useEffect(() => {
    if (status !== "invoiced" || expiresAt === null || now < expiresAt || expiryCheckedRef.current) return;
    expiryCheckedRef.current = true;
    checkStatus();
  }, [now, expiresAt, status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialStatus === "paid") return;
    checkStatus();
    pollRef.current = setInterval(checkStatus, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkStatus() {
    setChecking(true);
    const res = await fetch(checkUrl ?? `/api/reports/${reportId}/check-payout`);
    const data = await res.json();
    setChecking(false);
    if (data.payout_status === "paid") {
      setStatus("paid");
      if (pollRef.current) clearInterval(pollRef.current);
      router.refresh();
    } else if (data.payout_status === "unpaid" && data.expired) {
      setStatus("expired");
      if (pollRef.current) clearInterval(pollRef.current);
      onExpired?.();
      router.refresh();
    } else {
      setStatus(data.payout_status);
      if (typeof data.expires_at === "number") {
        setExpiresAt(data.expires_at);
        setNow(Math.floor(Date.now() / 1000));
        // Allow another zero-check if the server still reports the invoice as open
        if (data.expires_at > Math.floor(Date.now() / 1000)) expiryCheckedRef.current = false;
      }
    }
  }

  function copyInvoice() {
    navigator.clipboard.writeText(paymentRequest);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "expired") {
    return (
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-700">
          ⌛ The payout invoice expired before it was paid and has been cleared. Click <strong>⚡ Pay Rewards</strong> to check reserves again and get a new invoice.
        </p>
      </div>
    );
  }

  const remaining = expiresAt !== null ? Math.max(0, expiresAt - now) : null;

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
              <strong className="text-orange-600 text-xl">{totalSats.toLocaleString()} sats</strong> to pay via invoice
            </span>
            {eligibleCount !== undefined && (
              <span>{eligibleCount} participant{eligibleCount !== 1 ? "s" : ""} will be credited</span>
            )}
            {ineligibleCount !== undefined && ineligibleCount > 0 && (
              <span className="text-amber-600">{ineligibleCount} participant{ineligibleCount !== 1 ? "s" : ""} without bolt account (excluded)</span>
            )}
          </div>
          {remaining !== null && (
            <div
              className={`mb-4 flex items-center gap-3 rounded-md border px-4 py-3 ${
                remaining <= 600
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-amber-300 bg-amber-50 text-amber-800"
              } ${remaining > 0 && remaining <= 120 ? "animate-pulse" : ""}`}
            >
              <span className="text-2xl font-bold tabular-nums">⏱ {formatRemaining(remaining)}</span>
              <span className="text-sm">
                {remaining === 0
                  ? "Invoice expired — clearing…"
                  : remaining <= 600
                    ? "Pay now — this invoice expires soon. If it expires, a new one will be needed."
                    : "until this invoice expires"}
              </span>
            </div>
          )}
          {topupNote && (
            <p className="mb-4 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
              🏦 {topupNote}
            </p>
          )}

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
