"use client";

import LoginForm from "./components/LoginForm";
import LoginHero from "./components/LoginHero";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-primary-50 via-white to-secondary-50">
      <div className="w-full max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] lg:gap-12">
          <div className="flex justify-center lg:justify-start">
            <LoginForm />
          </div>

          <div className="hidden md:flex justify-center lg:justify-end">
            <LoginHero />
          </div>
        </div>
      </div>
    </div>
  );
}
