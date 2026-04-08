"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getExpectedGrade } from "@/lib/sa-id";
import { fmtDate } from "@/lib/format-date";
import CertificationsSection from "./certifications-section";
import TskLevelHistorySection from "./tsk-level-history-section";
import { TSK_LEVELS, TSK_LEVEL_MAP, POD_LEVEL } from "@/lib/tsk-levels";
import type { Participant, Certification, PerformanceEvent, TskLevelHistory, ParticipantStatus } from "@prisma/client";

const RETIRED_REASONS = [
  "At age 18",
  "Relocated",
  "Poor attendance",
  "Lack of interest",
  "Negative attitude or behavior",
  "Other",
] as const;

function parseSaIdClient(id: string): { dob: string; gender: string } | null {
  if (!/^\d{13}$/.test(id)) return null;
  const yy = parseInt(id.substring(0, 2));
  const mm = parseInt(id.substring(2, 4));
  const dd = parseInt(id.substring(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const currentYY = new Date().getFullYear() % 100;
  const year = yy <= currentYY ? 2000 + yy : 1900 + yy;
  const genderDigits = parseInt(id.substring(6, 10));
  return {
    dob: `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`,
    gender: genderDigits >= 5000 ? "Male" : "Female",
  };
}

export default function EditParticipantForm({ participant }: { participant: Participant & { certifications: Certification[]; performanceEvents: PerformanceEvent[]; tskLevelHistory: TskLevelHistory[] } }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty) return;

    // Block browser close / refresh
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);

    // Block in-app link navigation (sidebar, back buttons, etc.)
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor || !anchor.href) return;
      // Only intercept same-origin or relative navigation, not external links
      if (anchor.target === '_blank') return;
      const confirmed = window.confirm('You have unsaved changes. Leave without saving?');
      if (!confirmed) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', handleClick, true);
    };
  }, [isDirty]);
  const [participantStatus, setParticipantStatus] = useState<ParticipantStatus>(participant.status);
  const [retiredReason, setRetiredReason] = useState<string>((participant as any).retiredReason || "");
  const [retiredReasonOther, setRetiredReasonOther] = useState<string>((participant as any).retiredReasonOther || "");
  const [tskStatus, setTskStatus] = useState<string>((participant as any).tskStatus || "");
  const [isJuniorCoach, setIsJuniorCoach] = useState<boolean>(participant.isJuniorCoach);
  const [juniorCoachLevel, setJuniorCoachLevel] = useState<string>((participant as any).juniorCoachLevel?.toString() || "");
  const [profileLinkUrl, setProfileLinkUrl] = useState<string>(participant.profilePicture || "");
  const [paymentMethod, setPaymentMethod] = useState<string>((participant as any).paymentMethod || "BOLT_CARD");
  const [lightningAddress, setLightningAddress] = useState<string>((participant as any).lightningAddress || "");
  const [selectedGrade, setSelectedGrade] = useState<string>(participant.grade || "");
  const [idError, setIdError] = useState("");
  const [idDerived, setIdDerived] = useState<{ dob: string; gender: string } | null>(() =>
    parseSaIdClient(participant.idNumber)
  );
  const [idDocumentUrl, setIdDocumentUrl] = useState<string>(participant.idDocumentUrl || "");
  const [idDocUploadedAt, setIdDocUploadedAt] = useState<string>(participant.idDocumentUploadedAt ? participant.idDocumentUploadedAt.toISOString() : "");
  const [idDocUploading, setIdDocUploading] = useState(false);
  const idDocInputRef = useRef<HTMLInputElement>(null);
  const [indemnityFormUrl, setIndemnityFormUrl] = useState<string>(participant.indemnityFormUrl || "");
  const [indemnityUploadedAt, setIndemnityUploadedAt] = useState<string>(participant.indemnityUploadedAt ? participant.indemnityUploadedAt.toISOString() : "");
  const [indemnityUploading, setIndemnityUploading] = useState(false);
  const indemnityInputRef = useRef<HTMLInputElement>(null);

  function handleIdBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim();
    const result = parseSaIdClient(val);
    if (result) { setIdDerived(result); setIdError(""); }
    else { setIdDerived(null); setIdError("Enter a valid 13-digit SA ID number"); }
  }

  async function handleIndemnityChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIndemnityUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.path) {
      setIndemnityFormUrl(data.path);
      setIndemnityUploadedAt(new Date().toISOString());
      setSaved(false);
      setIsDirty(true);
    } else {
      setError(data.error || "Upload failed");
    }
    setIndemnityUploading(false);
  }

  async function handleIdDocChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdDocUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.path) {
      setIdDocumentUrl(data.path);
      setIdDocUploadedAt(new Date().toISOString());
      setSaved(false);
      setIsDirty(true);
    } else {
      setError(data.error || "Upload failed");
    }
    setIdDocUploading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const res = await fetch(`/api/participants/${participant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    const result = await res.json();
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setIsDirty(false);
      router.refresh();
    }
    setLoading(false);
  }

  const inputCls =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none";
  const readonlyCls =
    "mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600";

  return (
    <div className="space-y-6">
      {isDirty && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You have unsaved changes — save before leaving this page.
        </div>
      )}
      <form onSubmit={handleSubmit} onChange={() => { setSaved(false); setIsDirty(true); }} className="space-y-6">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">{error}</div>
        )}

        {/* ── Personal Details card ── */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Personal Details</h3>
          <div className="mt-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Surname *</label>
            <input name="surname" required defaultValue={participant.surname} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Names *</label>
            <input name="fullNames" required defaultValue={participant.fullNames} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Known As</label>
            <input name="knownAs" defaultValue={participant.knownAs || ""} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">SA ID Number *</label>
            <input
              name="idNumber"
              required
              maxLength={13}
              defaultValue={participant.idNumber}
              onBlur={handleIdBlur}
              className={`${inputCls} ${idError ? "border-red-400" : ""}`}
            />
            {idError && <p className="mt-1 text-xs text-red-500">{idError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">ID / Birth Certificate</label>
            <div className="mt-1 flex items-center gap-3">
              {idDocumentUrl && (
                <a href={idDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline">
                  View document
                </a>
              )}
              <button
                type="button"
                onClick={() => idDocInputRef.current?.click()}
                disabled={idDocUploading}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {idDocUploading ? "Uploading..." : idDocumentUrl ? "Replace" : "Upload"}
              </button>
              {idDocumentUrl && (
                <button
                  type="button"
                  onClick={() => { setIdDocumentUrl(""); setIdDocUploadedAt(""); }}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                  aria-label="Remove document"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            {idDocUploadedAt && (
              <p className="mt-1 text-xs text-gray-400">Uploaded {fmtDate(new Date(idDocUploadedAt))}</p>
            )}
            <input ref={idDocInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleIdDocChange} className="hidden" />
            <input type="hidden" name="idDocumentUrl" value={idDocumentUrl} />
            <input type="hidden" name="idDocumentUploadedAt" value={idDocUploadedAt} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <div className={readonlyCls}>{idDerived?.dob || participant.dateOfBirth.toISOString().split("T")[0]}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <div className={readonlyCls}>{idDerived?.gender || (participant.gender === "MALE" ? "Male" : "Female")}</div>
          </div>
        </div>
        <p className="text-xs text-gray-400">Date of birth and gender are automatically derived from the SA ID number.</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Registration Date</label>
            <input
              name="registrationDate"
              type="date"
              defaultValue={participant.registrationDate.toISOString().split("T")[0]}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Indemnity Form</label>
            <div className="mt-1 flex items-center gap-3">
              {indemnityFormUrl && (
                <a href={indemnityFormUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline">
                  View form
                </a>
              )}
              <button
                type="button"
                onClick={() => indemnityInputRef.current?.click()}
                disabled={indemnityUploading}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {indemnityUploading ? "Uploading..." : indemnityFormUrl ? "Replace" : "Upload"}
              </button>
              {indemnityFormUrl && (
                <button
                  type="button"
                  onClick={() => { setIndemnityFormUrl(""); setIndemnityUploadedAt(""); }}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                  aria-label="Remove indemnity form"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            {indemnityUploadedAt && (
              <p className="mt-1 text-xs text-gray-400">Uploaded {fmtDate(new Date(indemnityUploadedAt))}</p>
            )}
            <input ref={indemnityInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleIndemnityChange} className="hidden" />
            <input type="hidden" name="indemnityFormUrl" value={indemnityFormUrl} />
            <input type="hidden" name="indemnityUploadedAt" value={indemnityUploadedAt} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ethnicity</label>
            <select name="ethnicity" defaultValue={participant.ethnicity || ""} className={inputCls}>
              <option value="">— select —</option>
              <option>Black</option>
              <option>Coloured</option>
              <option>White</option>
              <option>Indian</option>
              <option>Asian</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Language</label>
            <select name="language" defaultValue={participant.language || ""} className={inputCls}>
              <option value="">— select —</option>
              <option>Xhosa</option>
              <option>Zulu</option>
              <option>English</option>
              <option>Afrikaans</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">School</label>
            <select name="school" defaultValue={participant.school || ""} className={inputCls}>
              <option value="">— select —</option>
              <option value="N/A">N/A</option>
              <option>Alternative</option>
              <option>Indwe Secondary</option>
              <option>TM Ndanda</option>
              <option>Hillcrest</option>
              <option>Sao Bras</option>
              <option>Milkwood</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Grade</label>
            <select name="grade" defaultValue={participant.grade || ""} onChange={(e) => setSelectedGrade(e.target.value)} className={inputCls}>
              <option value="">— select —</option>
              <option value="N/A">N/A</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1}>Grade {i + 1}</option>
              ))}
            </select>
            {(() => {
              const expected = getExpectedGrade(participant.dateOfBirth);
              const expectedNum = expected.startsWith("Grade ") ? parseInt(expected.replace("Grade ", "")) : null;
              const actualNum = selectedGrade.startsWith("Grade ") ? parseInt(selectedGrade.replace("Grade ", "")) : null;
              const diff = expectedNum !== null && actualNum !== null ? actualNum - expectedNum : null;
              const diffLabel = diff === null ? "" : diff === 0 ? " · on track" : diff > 0 ? ` · ${diff} ${diff === 1 ? "grade" : "grades"} ahead` : ` · ${Math.abs(diff)} ${Math.abs(diff) === 1 ? "grade" : "grades"} behind`;
              const diffColor = diff === null || diff === 0 ? "text-gray-600" : diff > 0 ? "text-blue-600" : "text-amber-600";
              return (
                <p className="mt-1 text-xs text-gray-400">
                  Expected: <span className={`font-medium ${selectedGrade && selectedGrade !== expected ? "text-amber-600" : "text-gray-600"}`}>{expected}</span>
                  {diffLabel && <span className={`font-medium ${diffColor}`}>{diffLabel}</span>}
                </p>
              );
            })()}
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Guardian</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Guardian</label>
                <input name="guardian" defaultValue={participant.guardian || ""} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Guardian ID</label>
                <input name="guardianId" defaultValue={participant.guardianId || ""} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Relationship</label>
              <select name="guardianRelationship" defaultValue={participant.guardianRelationship || ""} className={inputCls}>
                <option value="">— select —</option>
                <option>Mother</option>
                <option>Father</option>
                <option>Grandmother</option>
                <option>Grandfather</option>
                <option>Aunt</option>
                <option>Uncle</option>
                <option>Legal Guardian</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Guardian Contact Details</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">1st Contact</label>
                <input name="contact1" defaultValue={participant.contact1 || ""} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">2nd Contact</label>
                <input name="contact2" defaultValue={participant.contact2 || ""} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Housing Type</label>
              <select name="housingType" defaultValue={participant.housingType || ""} className={inputCls}>
                <option value="">— select —</option>
                <option>House</option>
                <option>Shack</option>
                <option>Street</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <input name="address" defaultValue={participant.address || ""} className={inputCls} />
            </div>
          </div>
        </div>

          </div>{/* end Personal Details fields */}
        </div>{/* end Personal Details card */}

        {/* ── Participation and Performance card ── */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Participation and Performance</h3>
          <div className="mt-4 space-y-4">

        <div className="border-t pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Body Measurements</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                <input name="weightKg" type="number" step="0.1" min="0" defaultValue={participant.weightKg ?? ""} className={`${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} placeholder="e.g. 65.5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Height (cm)</label>
                <input name="heightCm" type="number" step="0.1" min="0" defaultValue={participant.heightCm ?? ""} className={`${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} placeholder="e.g. 170" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">T-Shirt Size</label>
                <select name="tshirtSize" defaultValue={participant.tshirtSize || ""} className={inputCls}>
                  <option value="">— select —</option>
                  <option>XS</option>
                  <option>S</option>
                  <option>M</option>
                  <option>L</option>
                  <option>XL</option>
                  <option>XXL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Shoe Size (UK)</label>
                <input name="shoeSize" defaultValue={participant.shoeSize || ""} className={inputCls} placeholder="e.g. 8" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Wetsuit Size</label>
                <select name="wetsuiteSize" defaultValue={participant.wetsuiteSize || ""} className={inputCls}>
                  <option value="">— select —</option>
                  <option>XS</option>
                  <option>S</option>
                  <option>M</option>
                  <option>L</option>
                  <option>XL</option>
                  <option>XXL</option>
                </select>
              </div>
            </div>
            {(participant as any).measurementsUpdatedAt && (
              <p className="text-xs text-gray-400">Last updated: {fmtDate(new Date((participant as any).measurementsUpdatedAt))}</p>
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Participation</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    name="status"
                    value={participantStatus}
                    onChange={(e) => { setParticipantStatus(e.target.value as ParticipantStatus); setSaved(false); setIsDirty(true); }}
                    className={inputCls}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                  {participantStatus === "ACTIVE" && (
                    <p className="mt-1 text-xs text-gray-500">Active from {fmtDate(participant.registrationDate)}</p>
                  )}
                  {participantStatus === "RETIRED" && participant.retiredAt && (
                    <p className="mt-1 text-xs text-red-500">Retired on {fmtDate(participant.retiredAt)}</p>
                  )}
                </div>
                {participantStatus === "RETIRED" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reason for retirement</label>
                    <select
                      name="retiredReason"
                      value={retiredReason}
                      onChange={(e) => { setRetiredReason(e.target.value); setSaved(false); setIsDirty(true); }}
                      className={inputCls}
                    >
                      <option value="">— select reason —</option>
                      {RETIRED_REASONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    {retiredReason === "Other" && (
                      <input
                        name="retiredReasonOther"
                        value={retiredReasonOther}
                        onChange={(e) => { setRetiredReasonOther(e.target.value); setSaved(false); setIsDirty(true); }}
                        placeholder="Please describe…"
                        className={`${inputCls} mt-2`}
                      />
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 pb-2">
                {tskStatus === POD_LEVEL ? (
                  <p className="text-xs text-gray-400 italic">Junior Coach not applicable at Shark Elite level</p>
                ) : (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isJuniorCoach}
                        onChange={(e) => {
                          setIsJuniorCoach(e.target.checked);
                          if (e.target.checked) {
                            if (!juniorCoachLevel) setJuniorCoachLevel("1");
                          } else {
                            setJuniorCoachLevel("");
                          }
                          setSaved(false); setIsDirty(true);
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Junior Coach</span>
                      {isJuniorCoach && (
                        <select
                          value={juniorCoachLevel}
                          onChange={(e) => { setJuniorCoachLevel(e.target.value); setSaved(false); setIsDirty(true); }}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        >
                          <option value="1">Level 1 (×5)</option>
                          <option value="2">Level 2 (×7.5)</option>
                          <option value="3">Level 3 (×10)</option>
                        </select>
                      )}
                    </label>
                  </>
                )}
                <input type="hidden" name="isJuniorCoach" value={isJuniorCoach && tskStatus !== POD_LEVEL ? "on" : ""} />
                <input type="hidden" name="juniorCoachLevel" value={juniorCoachLevel} />
              </div>
            </div>
            <input type="hidden" name="paymentMethod" value={paymentMethod} />
            <input type="hidden" name="lightningAddress" value={lightningAddress} />
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Performance</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">TSK Level</label>
              <select
                value={tskStatus}
                onChange={(e) => { setTskStatus(e.target.value); setSaved(false); setIsDirty(true); }}
                className={inputCls}
              >
                <option value="">— select —</option>
                {TSK_LEVELS.map((l, i) => {
                  const currentIdx = TSK_LEVELS.findIndex((x) => x.value === tskStatus);
                  const disabled = currentIdx >= 0 && i < currentIdx;
                  return (
                    <option key={l.value} value={l.value} disabled={disabled}>
                      {l.value}{disabled ? " ↑ already passed" : ""}
                    </option>
                  );
                })}
              </select>
              <input type="hidden" name="tskStatus" value={tskStatus} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Profile Link</label>
              <input
                type="url"
                value={profileLinkUrl}
                onChange={(e) => { setProfileLinkUrl(e.target.value); setSaved(false); }}
                placeholder="https://..."
                className={inputCls}
              />
            </div>
          </div>
          <div className="mt-4">
            <TskLevelHistorySection
              participantId={participant.id}
              history={participant.tskLevelHistory.map((h) => ({ ...h, changedAt: h.changedAt.toISOString() }))}
            />
          </div>
        </div>

        <input type="hidden" name="profilePicture" value={profileLinkUrl} />
        <input type="hidden" name="notes" value={participant.notes || ""} />

            <div className="border-t pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Certifications</p>
              <CertificationsSection
                participantId={participant.id}
                certifications={participant.certifications}
                inline
              />
            </div>

          </div>{/* end Participation and Performance fields */}
        </div>{/* end Participation and Performance card */}

        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className={`rounded-full px-6 py-3 text-sm font-medium text-white shadow-lg disabled:opacity-50 transition-colors ${
              saved ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            {loading ? "Saving…" : saved ? "Changes Saved" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => document.getElementById("scroll-container")?.scrollTo({ top: 0, behavior: "smooth" })}
            className="rounded-full bg-gray-700 p-3 text-white shadow-lg hover:bg-gray-800"
            aria-label="Scroll to top"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
