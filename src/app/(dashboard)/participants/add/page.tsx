import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AddParticipantForm from "../add-participant-form";

export default async function AddParticipantPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMINISTRATOR") redirect("/participants");

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Add Participant</h2>
      <AddParticipantForm />
    </div>
  );
}
