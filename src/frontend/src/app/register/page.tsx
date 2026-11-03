"use client";

import RegisterForm from "./components/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="login-page flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <RegisterForm />
      </div>
    </div>
  );
}
