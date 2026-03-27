"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateParticipant } from "@/app/actions/participants";
import type { Participant } from "@prisma/client";

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
  const [profileLinkUrl, setProfileLinkUrl] = useState<string>(participant.profilePicture || "");
  const [idError, setIdError] = useState("");
  const [idDerived, setIdDerived] = useState<{ dob: string; gender: string } | null>(() =>
    parseSaIdClient(participant.idNumber)
  );

  function handleIdBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim();
    const result = parseSaIdClient(val);
    if (result) { setIdDerived(result); setIdError(""); }
    else { setIdDerived(null); setIdError("Enter a valid 13-digit SA ID number"); }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const formData = new FormData(e.currentTarget);
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
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Registration Date</label>
          <input
            name="registrationDate"
            type="date"
            defaultValue={participant.registrationDate.toISOString().split("T")[0]}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ethnicity</label>
            <input name="ethnicity" defaultValue={participant.ethnicity || ""} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Language</label>
            <input name="language" defaultValue={participant.language || ""} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">School</label>
            <input name="school" defaultValue={participant.school || ""} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Grade</label>
            <input name="grade" defaultValue={participant.grade || ""} className={inputCls} />
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
              <input name="guardianRelationship" defaultValue={participant.guardianRelationship || ""} className={inputCls} />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Contact</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <input name="address" defaultValue={participant.address || ""} className={inputCls} />
            </div>
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
              <input name="housingType" defaultValue={participant.housingType || ""} className={inputCls} />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Membership</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Card Number</label>
              <input name="cardNumber" defaultValue={participant.cardNumber || ""} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Bolt Card Payment URL</label>
              <input name="boltCardUrl" type="url" defaultValue={participant.boltCardUrl || ""} className={inputCls} />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Profile Link</label>
          <input
            type="url"
            value={profileLinkUrl}
            onChange={(e) => { setProfileLinkUrl(e.target.value); }}
            placeholder="https://..."
            className={inputCls}
          />
        </div>

        <input type="hidden" name="profilePicture" value={profileLinkUrl} />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
