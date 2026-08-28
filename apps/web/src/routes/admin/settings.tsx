import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconSettings, IconInfoCircle } from "@tabler/icons-react";

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
      "Lifetime of each QR code nonce. Tokens are single-use and expire after this duration.",
  },
  {
    label: "Attendance Rate Limit",
    value: "5",
    unit: "scans / min",
    description: "Maximum QR scan attempts accepted per student per minute to prevent replay abuse.",
  },
];

function ConfigItem({ row }: { row: ConfigRow }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b last:border-0">
      <div className="space-y-0.5 flex-1">
        <p className="text-sm font-medium">{row.label}</p>
        <p className="text-xs text-muted-foreground">{row.description}</p>
      </div>
      <Badge variant="secondary" className="font-mono text-sm shrink-0 px-3 py-1 h-auto">
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
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <IconSettings className="h-6 w-6 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          System-wide configuration and runtime defaults.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Configuration</CardTitle>
          <CardDescription>
            Current default values enforced across all sessions and campuses.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {SYSTEM_DEFAULTS.map((row) => (
            <ConfigItem key={row.label} row={row} />
          ))}
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-start gap-3 pt-5 pb-5">
          <IconInfoCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Runtime configuration coming soon
            </p>
            <p className="text-xs text-muted-foreground">
              Dynamic overrides via the dashboard are in development. For now, adjust these defaults
              by editing your{" "}
              <code className="bg-muted rounded px-1 py-0.5 font-mono text-[11px]">.env</code>{" "}
              file on the server and restarting the API.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
