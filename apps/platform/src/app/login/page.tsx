"use client";

import LoginForm from "./components/LoginForm";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-primary-50 via-white to-secondary-50 px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.12),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(14,116,144,0.10),transparent_45%)] motion-safe:animate-[glassShift_14s_ease-in-out_infinite] [background-size:200%_200%]"
      />
      <div className="relative w-full max-w-md motion-safe:animate-[slide-in-down_0.5s_ease-out_forwards]">
        <LoginForm />
      </div>
    </div>
  );
}
