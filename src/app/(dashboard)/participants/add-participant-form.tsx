"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createParticipant } from "@/app/actions/participants";
import Image from "next/image";

function expectedGradeFromDob(dob: string): string {
  const birthYear = parseInt(dob.substring(0, 4));
  const grade = new Date().getFullYear() - birthYear - 6;
  if (grade < 1) return "Not yet school-going";
  if (grade > 12) return "Completed Grade 12";
  return `Grade ${grade}`;
}

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

export default function AddParticipantForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [idDerived, setIdDerived] = useState<{ dob: string; gender: string } | null>(null);
  const [idError, setIdError] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [idDocumentUrl, setIdDocumentUrl] = useState<string>("");
  const [idDocUploading, setIdDocUploading] = useState(false);
  const idDocInputRef = useRef<HTMLInputElement>(null);
  const [indemnityFormUrl, setIndemnityFormUrl] = useState<string>("");
  const [indemnityUploadedAt, setIndemnityUploadedAt] = useState<string>("");
  const [indemnityUploading, setIndemnityUploading] = useState(false);
  const indemnityInputRef = useRef<HTMLInputElement>(null);
  const [idDocUploadedAt, setIdDocUploadedAt] = useState<string>("");

  function handleIdBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim();
    if (!val) { setIdDerived(null); setIdError(""); return; }
    const result = parseSaIdClient(val);
    if (result) {
      setIdDerived(result);
      setIdError("");
    } else {
      setIdDerived(null);
      setIdError("Enter a valid 13-digit SA ID number");
    }
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
    } else {
      setError(data.error || "Upload failed");
    }
    setIdDocUploading(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.path) {
      setUploadedPath(data.path);
    } else {
      setError(data.error || "Photo upload failed");
    }
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    if (uploadedPath) formData.set("profilePicture", uploadedPath);
    if (idDocumentUrl) formData.set("idDocumentUrl", idDocumentUrl);
    if (idDocUploadedAt) formData.set("idDocumentUploadedAt", idDocUploadedAt);
    if (indemnityFormUrl) formData.set("indemnityFormUrl", indemnityFormUrl);
    if (indemnityUploadedAt) formData.set("indemnityUploadedAt", indemnityUploadedAt);
    const result = await createParticipant(formData);
    if (result.error) {
      setError(result.error);
    } else {
      router.push("/participants");
    }
    setLoading(false);
  }

  const inputCls =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none";
  const readonlyCls =
    "mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Add Participant</h3>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Surname *</label>
            <input name="surname" required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Names *</label>
            <input name="fullNames" required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Known As</label>
            <input name="knownAs" className={inputCls} placeholder="Nickname or preferred name" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">SA ID Number *</label>
            <input
              name="idNumber"
              required
              maxLength={13}
              onBlur={handleIdBlur}
              className={`${inputCls} ${idError ? "border-red-400" : ""}`}
              placeholder="13-digit ID number"
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
              <p className="mt-1 text-xs text-gray-400">Uploaded {new Date(idDocUploadedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
            )}
            <input ref={idDocInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleIdDocChange} className="hidden" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <div className={readonlyCls}>{idDerived?.dob || "— auto from ID"}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <div className={readonlyCls}>{idDerived?.gender || "— auto from ID"}</div>
          </div>
        </div>
        <p className="text-xs text-gray-400">Date of birth and gender are automatically derived from the SA ID number.</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Registration Date</label>
            <input
              name="registrationDate"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
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
              <p className="mt-1 text-xs text-gray-400">Uploaded {new Date(indemnityUploadedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
            )}
            <input ref={indemnityInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleIndemnityChange} className="hidden" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ethnicity</label>
            <select name="ethnicity" className={inputCls}>
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
            <select name="language" className={inputCls}>
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
            <select name="school" className={inputCls}>
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
            <select name="grade" onChange={(e) => setSelectedGrade(e.target.value)} className={inputCls}>
              <option value="">— select —</option>
              <option value="N/A">N/A</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1}>Grade {i + 1}</option>
              ))}
            </select>
            {idDerived && (() => {
              const expected = expectedGradeFromDob(idDerived.dob);
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
                <input name="guardian" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Guardian ID</label>
                <input name="guardianId" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Relationship</label>
              <select name="guardianRelationship" className={inputCls}>
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
                <input name="contact1" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">2nd Contact</label>
                <input name="contact2" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Housing Type</label>
              <select name="housingType" className={inputCls}>
                <option value="">— select —</option>
                <option>House</option>
                <option>Shack</option>
                <option>Street</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <input name="address" className={inputCls} />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Participation</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select name="status" defaultValue="ACTIVE" className={inputCls}>
                  <option value="ACTIVE">Active</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isJuniorCoach"
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Junior Coach</span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Card Number</label>
                <input name="cardNumber" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Card Balance (sats)</label>
                <input name="cardBalance" type="number" step="1" className={`${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} placeholder="e.g. 5000" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Bolt Card Payment URL</label>
              <input name="boltCardUrl" type="url" className={inputCls} placeholder="https://..." />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Performance</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Level</label>
              <select name="tskStatus" className={inputCls}>
                <option value="">— select —</option>
                <option value="Turtle">Turtle (Grom)</option>
                <option value="Seal">Seal (Intermediate)</option>
                <option value="Dolphin">Dolphin (Advanced)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Body Measurements</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                <input name="weightKg" type="number" step="0.1" min="0" className={`${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} placeholder="e.g. 65.5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Height (cm)</label>
                <input name="heightCm" type="number" step="0.1" min="0" className={`${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} placeholder="e.g. 170" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">T-Shirt Size</label>
                <select name="tshirtSize" className={inputCls}>
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
                <input name="shoeSize" className={inputCls} placeholder="e.g. 8" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Wetsuit Size</label>
                <select name="wetsuiteSize" className={inputCls}>
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
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
          <div className="mt-1 flex items-center gap-3">
            {photoPreview && (
              <Image
                src={photoPreview}
                alt="Preview"
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              {uploading ? "Uploading..." : "Choose photo"}
            </button>
            {uploadedPath && (
              <button
                type="button"
                onClick={() => { setUploadedPath(""); setPhotoPreview(null); }}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                aria-label="Remove photo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <input type="hidden" name="profilePicture" value={uploadedPath} />
        </div>

        <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500">
          TSK ID will be assigned automatically (TSK00001, TSK00002, ...)
        </div>

        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Participant"}
        </button>
      </form>
    </div>
  );
}
