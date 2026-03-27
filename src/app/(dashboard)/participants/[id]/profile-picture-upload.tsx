"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { updateParticipantPhoto } from "@/app/actions/participants";

interface Props {
  participantId: string;
  profilePicture: string | null;
  initial: string;
}

export default function ProfilePictureUpload({ participantId, profilePicture, initial }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.path) {
      await updateParticipantPhoto(participantId, data.path);
      router.refresh();
    }
    setUploading(false);
  }

  const src = preview || profilePicture;

  return (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={uploading}
      className="group relative h-28 w-20 shrink-0 overflow-hidden rounded-xl focus:outline-none"
    >
      {src ? (
        <Image src={src} alt="Profile" width={80} height={112} className="h-28 w-20 object-cover" />
      ) : (
        <div className="flex h-28 w-20 items-center justify-center rounded-xl bg-orange-100 text-2xl font-bold text-orange-600">
          {initial}
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="text-xs font-medium text-white">{uploading ? "…" : "Change"}</span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </button>
  );
}
