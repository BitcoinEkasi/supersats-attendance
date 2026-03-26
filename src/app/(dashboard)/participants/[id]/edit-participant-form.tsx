"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateParticipant } from "@/app/actions/participants";
import type { Participant } from "@prisma/client";
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

export default function EditParticipantForm({ participant }: { participant: Participant }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [idError, setIdError] = useState("");
  const [idDerived, setIdDerived] = useState<{ dob: string; gender: string } | null>(() =>
    parseSaIdClient(participant.idNumber)
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleIdBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim();
    const result = parseSaIdClient(val);
    if (result) { setIdDerived(result); setIdError(""); }
    else { setIdDerived(null); setIdError("Enter a valid 13-digit SA ID number"); }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPhotoPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.path) setUploadedPath(data.path);
    else setError(data.error || "Photo upload failed");
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const formData = new FormData(e.currentTarget);
    if (uploadedPath) formData.set("profilePicture", uploadedPath);
    const result = await updateParticipant(participant.id, formData);
    if (result.error) {
      setError(result.error);
    } else {
      setMessage("Participant updated successfully");
      router.refresh();
    }
    setLoading(false);
  }

  const inputCls =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none";
  const readonlyCls =
    "mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600";
  const currentPhoto = photoPreview || participant.profilePicture;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Edit Participant</h3>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">{error}</div>
        )}
        {message && (
          <div className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-600">{message}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">TSK ID</label>
          <div className={readonlyCls}>{participant.tskId}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Surname *</label>
            <input name="surname" required defaultValue={participant.surname} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Names *</label>
            <input name="fullNames" required defaultValue={participant.fullNames} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Known As</label>
          <input name="knownAs" defaultValue={participant.knownAs || ""} className={inputCls} />
        </div>

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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <div className={readonlyCls}>{idDerived?.dob || participant.dateOfBirth.toISOString().split("T")[0]}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <div className={readonlyCls}>{idDerived?.gender || participant.gender}</div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select name="status" defaultValue={participant.status} className={inputCls}>
            <option value="ACTIVE">Active</option>
            <option value="RETIRED">Retired</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Bolt Card Payment URL</label>
          <input name="boltCardUrl" type="url" defaultValue={participant.boltCardUrl || ""} className={inputCls} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
          <div className="mt-1 flex items-center gap-3">
            {currentPhoto ? (
              <Image
                src={currentPhoto}
                alt="Profile"
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-sm font-medium text-orange-600">
                {(participant.knownAs || participant.surname).charAt(0).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              {uploading ? "Uploading..." : "Change photo"}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <input type="hidden" name="profilePicture" value={uploadedPath || participant.profilePicture || ""} />
        </div>

        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
