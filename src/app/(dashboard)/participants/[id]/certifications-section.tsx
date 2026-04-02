"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Certification, CertificationType } from "@prisma/client";

const CERT_TYPES: { type: CertificationType; label: string }[] = [
  { type: "SAFEGUARDING", label: "Safeguarding" },
  { type: "LIFESAVING",   label: "Lifesaving" },
  { type: "SURFCOACHING", label: "Surf Coaching" },
];

interface Props {
  participantId: string;
  certifications: Certification[];
  inline?: boolean;
}

export default function CertificationsSection({ participantId, certifications, inline }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState<CertificationType | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingType = useRef<CertificationType | null>(null);

  function triggerUpload(type: CertificationType) {
    pendingType.current = type;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const type = pendingType.current;
    if (!file || !type) return;
    e.target.value = "";

    setUploading(type);
    setError("");

    const fd = new FormData();
    fd.append("file", file);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
    const uploadData = await uploadRes.json();

    if (uploadData.path) {
      const res = await fetch(`/api/participants/${participantId}/certifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, fileUrl: uploadData.path }),
      });
      const result = await res.json();
      if (result.error) setError(result.error);
      else router.refresh();
    } else {
      setError(uploadData.error || "Upload failed");
    }
    setUploading(null);
  }

  async function handleDelete(certId: string) {
    await fetch(`/api/participants/${participantId}/certifications/${certId}`, { method: "DELETE" });
    router.refresh();
  }

  const certMap = new Map(certifications.map((c) => [c.type, c]));

  const content = (
    <>
      {error && <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-3 gap-3">
        {CERT_TYPES.map(({ type, label }) => {
          const cert = certMap.get(type);
          const isUploading = uploading === type;
          const isPdf = cert?.fileUrl.endsWith(".pdf");

          return (
            <div key={type} className="flex flex-col gap-2 rounded-md border border-gray-200 px-3 py-3">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 flex-shrink-0 rounded-full ${cert ? "bg-green-500" : "bg-gray-300"}`} />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </div>
              {cert && (
                <span className="text-xs text-gray-400">
                  {new Date(cert.uploadedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/(\d+)$/, "'$1")}
                </span>
              )}
              <div className="flex items-center gap-2">
                {cert && (
                  <>
                    <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 hover:underline">
                      {isPdf ? "View PDF" : "View"}
                    </a>
                    <button onClick={() => handleDelete(cert.id)} className="text-xs text-red-400 hover:text-red-600">
                      Remove
                    </button>
                  </>
                )}
                <button
                  onClick={() => triggerUpload(type)}
                  disabled={isUploading}
                  className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {isUploading ? "Uploading…" : cert ? "Replace" : "Upload"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFileChange} className="hidden" />
    </>
  );

  if (inline) return content;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Certifications</h3>
      <div className="mt-4">{content}</div>
    </div>
  );
}
