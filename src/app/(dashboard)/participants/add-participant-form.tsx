"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createParticipant } from "@/app/actions/participants";
import Image from "next/image";

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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const result = await createParticipant(formData);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
      (e.target as HTMLFormElement).reset();
      setIdDerived(null);
      setPhotoPreview(null);
      setUploadedPath("");
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Surname *</label>
            <input name="surname" required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Names *</label>
            <input name="fullNames" required className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Known As</label>
          <input name="knownAs" className={inputCls} placeholder="Nickname or preferred name" />
        </div>

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

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select name="status" defaultValue="ACTIVE" className={inputCls}>
            <option value="ACTIVE">Active</option>
            <option value="RETIRED">Retired</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Bolt Card Payment URL
          </label>
          <input name="boltCardUrl" type="url" className={inputCls} placeholder="https://..." />
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
