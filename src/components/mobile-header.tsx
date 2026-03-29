import { auth, signOut } from "@/lib/auth";

export default async function MobileHeader() {
  const session = await auth();

  return (
    <header className="shrink-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <h1 className="text-base font-bold text-orange-600">TSK Rewards</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{session?.user?.name}</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
