export default function DemoCardPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-md">
        <div className="mb-4 text-5xl">⚡</div>
        <h1 className="text-xl font-bold text-gray-900">Demo Card Registered</h1>
        <p className="mt-2 text-sm text-gray-500">
          In a live deployment, this page is the Bolt card admin where a physical
          NFC card is programmed. For the demo, the card is already linked.
        </p>
        <p className="mt-4 text-sm font-medium text-orange-700">
          Return to the SuperSats admin tab to continue.
        </p>
      </div>
    </div>
  );
}
