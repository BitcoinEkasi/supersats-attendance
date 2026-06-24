import LoginForm from "./login-form";

export default function LoginPage() {
  return <LoginForm isDemo={!!process.env.DEMO_MODE} />;
}
