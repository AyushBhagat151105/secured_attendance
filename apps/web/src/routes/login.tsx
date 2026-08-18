import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { IconShieldCheck } from "@tabler/icons-react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const [showSignIn, setShowSignIn] = useState(true);

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Left Panel: Branding */}
      <div className="hidden lg:flex w-1/2 bg-zinc-950 relative flex-col justify-between border-r border-border p-12 overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute inset-0 bg-linear-to-tr from-indigo-900/20 to-emerald-900/20" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
            <IconShieldCheck className="text-primary-foreground h-6 w-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">CHARUSAT</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-6">
            Secured Attendance System
          </h1>
          <p className="text-lg text-zinc-400 max-w-md">
            A high-assurance, geofenced, and cryptographically secured attendance 
            platform for students and faculty.
          </p>
        </div>

        <div className="relative z-10 text-sm text-zinc-500 font-medium">
          &copy; {new Date().getFullYear()} Charotar University of Science & Technology
        </div>
      </div>

      {/* Right Panel: Auth Forms */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 lg:p-12 relative">
        <div className="w-full max-w-100">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
              <IconShieldCheck className="text-primary-foreground h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">CHARUSAT</span>
          </div>

          {showSignIn ? (
            <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
          ) : (
            <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
          )}
        </div>
      </div>
    </div>
  );
}
