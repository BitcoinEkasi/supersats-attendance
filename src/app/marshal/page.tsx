import MarshalLogin from "./marshal-login";

export const dynamic = "force-dynamic";

export default function MarshalLoginPage() {
  return <MarshalLogin isDemo={!!process.env.DEMO_MODE} />;
}
