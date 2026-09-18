import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import {
  IconBrandAndroid,
  IconDownload,
  IconShieldCheck,
  IconMapPin,
  IconCpu,
  IconLock,
  IconCheck,
  IconAlertTriangle,
  IconDeviceMobile,
  IconRefresh,
  IconBrandGithub,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconArrowRight,
  IconInfoCircle,
} from "@tabler/icons-react";

import { env } from "@secured_attendance/env/web";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";

interface VersionPayload {
  version: string;
  minRequiredVersion: string;
  apkUrl: string;
  releaseNotes?: string;
}

export function DownloadPage() {
  const [versionData, setVersionData] = useState<VersionPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const directApkUrl = `${env.VITE_SERVER_URL}/download/secured-attendance.apk`;
  const currentApkUrl = versionData?.apkUrl || directApkUrl;

  useEffect(() => {
    let isMounted = true;
    fetch(`${env.VITE_SERVER_URL}/api/app/version`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setVersionData(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8 max-w-6xl">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2 bg-card p-1.5 rounded-xl border border-border shadow-xs">
              <div className="bg-white px-2 py-0.5 rounded border border-border">
                <img
                  src="/assets/charusat-logo.png"
                  alt="CHARUSAT Logo"
                  className="h-6 w-auto object-contain"
                />
              </div>
              <div className="h-5 w-px bg-border" />
              <img
                src="/assets/cmpica-logo.webp"
                alt="CMPICA Logo"
                className="h-6 w-auto object-contain rounded"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground leading-none">
                CHARUSAT • CMPICA
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase mt-0.5">
                Secured Attendance System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-xs font-semibold">
                Admin / Teacher Portal
              </Button>
            </Link>
            <ModeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-8 py-10 max-w-6xl flex-1 flex flex-col gap-12">
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 pt-4">
          <div className="flex-1 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Official Android Release Build • v{versionData?.version || "1.0.1"}
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              CHARUSAT Secured Attendance{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 via-teal-500 to-emerald-500 dark:from-blue-400 dark:via-teal-300 dark:to-emerald-400">
                Mobile App
              </span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Scan attendance QR codes with dynamic cryptographic token verification, classroom GPS
              geofencing, and single-device hardware protection. No Google Play Store required.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <a href={currentApkUrl} download="secured-attendance.apk">
                <Button size="lg" className="h-12 px-6 gap-2.5 font-bold shadow-md hover:shadow-lg transition-all">
                  <IconBrandAndroid className="h-5 w-5" />
                  <span>Download APK (v{versionData?.version || "1.0.1"})</span>
                  <IconDownload className="h-4 w-4 opacity-80" />
                </Button>
              </a>

              <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1">
                <Badge variant="outline" className="font-mono text-[11px]">
                  ~32 MB
                </Badge>
                <span>•</span>
                <span>Android 9.0+</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Production APK</span>
              </div>
            </div>

            {versionData?.releaseNotes && (
              <div className="p-3.5 rounded-xl bg-card border border-border max-w-xl text-left text-xs text-muted-foreground flex items-start gap-2.5">
                <IconInfoCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Latest Release Notes: </span>
                  {versionData.releaseNotes}
                </div>
              </div>
            )}
          </div>

          {/* QR Code Card for Instant Desktop-to-Mobile Transfer */}
          <div className="w-full sm:w-auto flex justify-center">
            <Card className="p-6 bg-card/90 border-2 border-border shadow-xl rounded-2xl flex flex-col items-center text-center space-y-4 max-w-xs">
              <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-inner">
                <QRCodeSVG
                  value={currentApkUrl}
                  size={190}
                  level="H"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#09090b"
                />
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 font-bold text-sm text-foreground">
                  <IconDeviceMobile className="h-4 w-4 text-primary" />
                  <span>Scan to Download on Phone</span>
                </div>
                <p className="text-[11px] text-muted-foreground max-w-56 leading-relaxed">
                  Open your smartphone camera and point at this QR code to download the APK directly.
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* 4-Step Installation Guide */}
        <div className="space-y-6 pt-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              How to Install on Your Android Device
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Follow these simple steps to install or update the app on any Android smartphone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5 border border-border bg-card/50 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20">
                  1
                </div>
                <h3 className="font-semibold text-sm text-foreground">Download APK</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tap the download button above or scan the QR code to start downloading the file.
                </p>
              </div>
              <Badge variant="secondary" className="w-fit text-[10px]">
                secured-attendance.apk
              </Badge>
            </Card>

            <Card className="p-5 border border-border bg-card/50 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20">
                  2
                </div>
                <h3 className="font-semibold text-sm text-foreground">Allow Unknown Apps</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If Chrome or your browser prompts "File might be harmful", tap <strong>Download Anyway</strong>, then enable "Allow from this source".
                </p>
              </div>
              <Badge variant="outline" className="w-fit text-[10px] text-amber-500 border-amber-500/30">
                Security Prompt
              </Badge>
            </Card>

            <Card className="p-5 border border-border bg-card/50 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20">
                  3
                </div>
                <h3 className="font-semibold text-sm text-foreground">Install & Open</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tap the downloaded file from your notifications and press <strong>Install</strong> (or <strong>Update</strong>). Your login will remain saved.
                </p>
              </div>
              <Badge variant="secondary" className="w-fit text-[10px]">
                In-Place Upgrade
              </Badge>
            </Card>

            <Card className="p-5 border border-border bg-card/50 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20">
                  4
                </div>
                <h3 className="font-semibold text-sm text-foreground">Sign In & Bind Device</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Log in with your CHARUSAT Student ID. The app locks your hardware fingerprint to prevent proxy attendance.
                </p>
              </div>
              <Badge variant="outline" className="w-fit text-[10px] text-emerald-500 border-emerald-500/30">
                Ready to Scan
              </Badge>
            </Card>
          </div>
        </div>

        {/* Security & Anti-Proxy Capabilities */}
        <div className="space-y-6 pt-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Institutional Security & Anti-Proxy Architecture
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Engineered specifically for CHARUSAT University to guarantee attendance integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 border border-border bg-card/40 space-y-2.5">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                <IconLock className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">Rotating Cryptographic QR</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dynamic QR tokens rotate every 10 seconds via HMAC-SHA256 nonces. Photos or video recordings cannot be shared or re-scanned.
              </p>
            </Card>

            <Card className="p-5 border border-border bg-card/40 space-y-2.5">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-500 flex items-center justify-center">
                <IconMapPin className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">Campus Geofencing</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Requires physical presence inside the designated 60m classroom polygon. Mock location tools and GPS spoofing are automatically blocked.
              </p>
            </Card>

            <Card className="p-5 border border-border bg-card/40 space-y-2.5">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center">
                <IconCpu className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">1-Device Hardware Binding</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hardware SHA-256 fingerprint permanently binds your student ID to your physical phone. No student can mark attendance for a classmate.
              </p>
            </Card>

            <Card className="p-5 border border-border bg-card/40 space-y-2.5">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                <IconShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">Anti-Clone Sandbox Detection</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Detects and locks down virtual containers like Parallel Space, Dual Space, VirtualXposed, and secondary work profiles.
              </p>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer & Developer Credits */}
      <footer className="border-t border-border/80 bg-card/30 mt-12 py-8">
        <div className="container mx-auto px-4 sm:px-8 max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <p className="font-medium text-foreground">
              &copy; {new Date().getFullYear()} CHARUSAT • CMPICA Department
            </p>
            <p className="text-[11px] text-muted-foreground">
              Charotar University of Science & Technology, Changa, Gujarat 388421
            </p>
          </div>

          <div className="flex items-center gap-3 bg-background px-3 py-1.5 rounded-lg border border-border shadow-xs">
            <span className="text-[11px]">Engineered by</span>
            <span className="font-semibold text-foreground">Ayush Bhagat</span>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/ayushbhagat151105"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="GitHub"
              >
                <IconBrandGithub className="h-4 w-4" />
              </a>
              <a
                href="https://www.instagram.com/bhagat_ayush__/"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-pink-500 transition-colors"
                title="Instagram"
              >
                <IconBrandInstagram className="h-4 w-4" />
              </a>
              <a
                href="https://www.linkedin.com/in/ayush-bhagat-99b7b82b3/"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-blue-500 transition-colors"
                title="LinkedIn"
              >
                <IconBrandLinkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
