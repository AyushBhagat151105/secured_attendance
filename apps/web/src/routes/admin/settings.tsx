import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconSettings, IconInfoCircle, IconShieldCheck } from "@tabler/icons-react";
import { AdminPageHeader } from "@/components/admin";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

interface ConfigRow {
  label: string;
  value: string;
  unit?: string;
  description: string;
}

const SYSTEM_DEFAULTS: ConfigRow[] = [
  {
    label: "Geofence Radius",
    value: "100",
    unit: "m",
    description: "Default radius around a campus building within which GPS check-ins are accepted.",
  },
  {
    label: "QR Token TTL",
    value: "45",
    unit: "s",
    description:
      "Lifetime of each rotating QR code nonce. Tokens are single-use and expire after this duration.",
  },
  {
    label: "Attendance Rate Limit",
    value: "5",
    unit: "scans / min",
    description:
      "Maximum QR scan attempts accepted per student per minute to prevent replay abuse.",
  },
];

function ConfigItem({ row }: { row: ConfigRow }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border/60 last:border-0">
      <div className="space-y-1 flex-1">
        <p className="text-sm font-semibold text-foreground">{row.label}</p>
        <p className="text-xs text-muted-foreground">{row.description}</p>
      </div>
      <Badge variant="secondary" className="font-mono text-xs shrink-0 px-3 py-1 h-auto font-semibold">
        {row.value}
        {row.unit && (
          <span className="ml-1 text-muted-foreground font-normal text-xs">{row.unit}</span>
        )}
      </Badge>
    </div>
  );
}

function AdminSettingsPage() {
  return (
    <div className="max-w-4xl space-y-6 min-w-0 pb-10">
      <AdminPageHeader
        title="System Parameters"
        subtitle="Global platform configuration, geofence tolerances, and cryptographic token expiration defaults."
        icon={<IconSettings className="size-6 text-primary" />}
        badge={
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <IconShieldCheck className="size-3.5" /> Enforced
          </span>
        }
      />

      <Card className="rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
          <CardTitle className="text-base font-semibold">Runtime Defaults</CardTitle>
          <CardDescription className="text-xs">
            Current security boundaries and threshold parameters active across all institutional campuses.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2">
          {SYSTEM_DEFAULTS.map((row) => (
            <ConfigItem key={row.label} row={row} />
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-xl border-dashed border-border bg-muted/20 shadow-none">
        <CardContent className="flex items-start gap-3 p-4 sm:p-5">
          <IconInfoCircle className="size-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Dynamic Runtime Overrides
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              In-dashboard runtime modification will be available in the next release. Currently, these
              thresholds are configured via institutional environment variables (
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px] border border-border/60">
                .env
              </code>
              ) on the API host.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
