"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { fmtDate } from "@/lib/format-date";

type TskReview = {
  id: string;
  reviewDate: Date;
  documentUrl: string | null;
  notes: string | null;
};

export default function TskReviewsSection({
  participantId,
  reviews,
}: {
  participantId: string;
  reviews: TskReview[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [reviewDate, setReviewDate] = useState("");
  const [notes, setNotes] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputCls =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.path) {
      setDocumentUrl(data.path);
    } else {
      setError(data.error || "Upload failed");
    }
    setUploading(false);
  }

  async function handleAdd() {
    if (!reviewDate) { setError("Review date is required."); return; }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/participants/${participantId}/tsk-reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewDate, documentUrl: documentUrl || null, notes: notes || null }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setReviewDate(""); setNotes(""); setDocumentUrl("");
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/participants/${participantId}/tsk-reviews/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">TSK Reviews</h3>

      <div className="mt-4 space-y-3">
        {reviews.length === 0 && !adding && (
          <p className="text-sm text-gray-400">No reviews recorded yet.</p>
        )}

        {reviews.map((rev) => (
          <div key={rev.id} className="flex items-start justify-between rounded-md border border-gray-200 px-3 py-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-gray-700">{fmtDate(new Date(rev.reviewDate))}</p>
              {rev.notes && <p className="text-xs text-gray-500">{rev.notes}</p>}
              {rev.documentUrl && (
                <a href={rev.documentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 hover:underline">
                  View document
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleDelete(rev.id)}
              className="ml-4 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
              aria-label="Delete review"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}

        {adding && (
          <div className="space-y-3 rounded-md border border-orange-200 bg-orange-50 p-3">
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div>
              <label className="block text-xs font-medium text-gray-600">Review Date *</label>
              <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Notes</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Document</label>
              <div className="mt-1 flex items-center gap-3">
                {documentUrl && (
                  <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 hover:underline">
                    View uploaded
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : documentUrl ? "Replace" : "Upload"}
                </button>
                {documentUrl && (
                  <button
                    type="button"
                    onClick={() => setDocumentUrl("")}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                    aria-label="Remove document"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFileChange} className="hidden" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleAdd} disabled={saving} className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save Review"}
              </button>
              <button type="button" onClick={() => { setAdding(false); setError(""); }} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-orange-400 hover:text-orange-600">
            + Add Review
          </button>
        )}
      </div>
    </div>
  );
}
