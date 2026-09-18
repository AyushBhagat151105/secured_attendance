import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  IconShieldCheck,
  IconCpu,
  IconMapPin,
  IconLock,
  IconBrandGithub,
  IconBrandInstagram,
  IconBrandLinkedin,
} from "@tabler/icons-react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const [showSignIn, setShowSignIn] = useState(true);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Left Panel: Institutional Branding & Linings */}
      <div className="hidden lg:flex w-1/2 bg-zinc-950 relative flex-col justify-between border-r border-border/80 p-12 overflow-hidden select-none">
        {/* Subtle decorative grid lines and gradient */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
        <div className="absolute inset-0 bg-linear-to-tr from-blue-950/20 via-zinc-950 to-emerald-950/20" />

        {/* Top: Dual Institutional Logos */}
        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex items-center gap-4 bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-3.5 backdrop-blur-md shadow-lg shadow-black/40 w-fit">
            <div className="bg-white px-3 py-1.5 rounded-lg border border-zinc-200 flex items-center justify-center">
              <img
                src="/assets/charusat-logo.png"
                alt="CHARUSAT Logo"
                className="h-7 w-auto object-contain"
              />
            </div>
            <div className="h-7 w-px bg-zinc-700/60" />
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/cmpica-logo.webp"
                alt="CMPICA Department Logo"
                className="h-8 w-auto object-contain rounded-md"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold tracking-wide text-white uppercase">CMPICA</span>
                <span className="text-[10px] text-zinc-400 font-medium">Department of Computer Applications</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle: System Overview & Anti-Proxy Capabilities */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Official Campus Production Platform
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
              Secured Attendance
              <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 via-teal-300 to-emerald-400">
                Management Portal
              </span>
            </h1>
            <p className="text-sm text-zinc-400 max-w-lg leading-relaxed">
              Institutional anti-proxy verification engine built with rotating cryptographic QR tokens,
              campus GPS geofencing, and single-device hardware binding.
            </p>
          </div>

          {/* Feature Badge Grid */}
          <div className="grid grid-cols-2 gap-3 max-w-lg pt-2">
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300">
              <IconLock className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Rotating HMAC Nonces</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300">
              <IconMapPin className="h-4 w-4 text-teal-400 shrink-0" />
              <span>CMPICA Geofence (60m)</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300">
              <IconCpu className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>1-Device HW Binding</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300">
              <IconShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Zero Live-DB Risk</span>
            </div>
          </div>
        </div>

        {/* Bottom: Institutional Copyright & Solo Developer Credits */}
        <div className="relative z-10 pt-8 border-t border-zinc-800/80 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>&copy; {new Date().getFullYear()} CHARUSAT • CMPICA Department</span>
            <div className="flex items-center gap-2 text-zinc-300 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">
              <span className="text-[11px] text-zinc-400">Lead Developer:</span>
              <span className="font-semibold text-white">Ayush Bhagat</span>
              <div className="h-3 w-px bg-zinc-700 mx-0.5" />
              <div className="flex items-center gap-1.5">
                <a
                  href="https://github.com/ayushbhagat151105"
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors"
                  title="GitHub Portfolio"
                >
                  <IconBrandGithub className="size-3.5" />
                </a>
                <a
                  href="https://www.instagram.com/bhagat_ayush__/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400 hover:text-pink-400 transition-colors"
                  title="Instagram Profile"
                >
                  <IconBrandInstagram className="size-3.5" />
                </a>
                <a
                  href="https://www.linkedin.com/in/ayush-bhagat-99b7b82b3/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400 hover:text-blue-400 transition-colors"
                  title="LinkedIn Profile"
                >
                  <IconBrandLinkedin className="size-3.5" />
                </a>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500">
            Charotar University of Science & Technology, Changa, Gujarat 388421
          </p>
        </div>
      </div>

      {/* Right Panel: Auth Forms */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 lg:p-12 relative overflow-y-auto">
        <div className="w-full max-w-100 flex flex-col justify-between min-h-[500px]">
          {/* Mobile Header: Visible only on small viewports */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8 text-center">
            <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800">
              <img
                src="/assets/charusat-logo.png"
                alt="CHARUSAT Logo"
                className="h-6 w-auto object-contain bg-white px-2 py-0.5 rounded"
              />
              <div className="h-6 w-px bg-zinc-700" />
              <img
                src="/assets/cmpica-logo.webp"
                alt="CMPICA Logo"
                className="h-6 w-auto object-contain rounded"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Secured Attendance Portal
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                CMPICA • CHARUSAT University
              </p>
            </div>
          </div>

          <div className="my-auto">
            {showSignIn ? (
              <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
            ) : (
              <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
            )}
          </div>

          {/* Mobile Developer Credit Footer */}
          <div className="lg:hidden text-center pt-8 border-t border-border/60 text-xs text-muted-foreground">
            <p>Designed & Engineered by <span className="font-semibold text-foreground">Ayush Bhagat</span></p>
            <p className="text-[10px] text-muted-foreground/80 mt-0.5">CMPICA Department • CHARUSAT</p>
          </div>
        </div>
      </div>
    </div>
  );
}
