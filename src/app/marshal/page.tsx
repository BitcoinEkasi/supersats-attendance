import MarshalLogin from "./marshal-login";

export default function MarshalLoginPage() {
  return <MarshalLogin isDemo={!!process.env.DEMO_MODE} />;
}
