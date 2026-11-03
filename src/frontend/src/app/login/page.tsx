"use client";

import LoginForm from "./components/LoginForm";

export default function LoginPage() {
  return (
    <div className="login-page flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
