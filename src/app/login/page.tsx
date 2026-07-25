import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-green-light/60 to-gray-50 px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
