import { useState } from "react";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

interface ImpossibleTravelDetails {
  distanceKm?: number;
  speedKmh?: number;
  previousLocation?: { lat: number; lng: number };
  currentLocation?: { lat: number; lng: number };
  [key: string]: unknown;
}

interface GpsGeofenceDetails {
  distanceMeters?: number;
  allowedRadius?: number;
  buildingName?: string;
  [key: string]: unknown;
}

type AnomalyDetails = ImpossibleTravelDetails | GpsGeofenceDetails | Record<string, unknown>;

interface AnomalyDetailCellProps {
  type: string;
  details: AnomalyDetails | null;
}

function ImpossibleTravelView({ details }: { details: ImpossibleTravelDetails }) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
      {details.distanceKm !== undefined && (
        <>
          <dt className="text-muted-foreground">Distance</dt>
          <dd className="font-medium">{details.distanceKm.toFixed(1)} km</dd>
        </>
      )}
      {details.speedKmh !== undefined && (
        <>
          <dt className="text-muted-foreground">Speed</dt>
          <dd className="font-medium">{details.speedKmh.toFixed(1)} km/h</dd>
        </>
      )}
      {details.previousLocation && (
        <>
          <dt className="text-muted-foreground">Prev loc</dt>
          <dd className="font-mono">
            {details.previousLocation.lat.toFixed(4)}, {details.previousLocation.lng.toFixed(4)}
          </dd>
        </>
      )}
      {details.currentLocation && (
        <>
          <dt className="text-muted-foreground">Curr loc</dt>
          <dd className="font-mono">
            {details.currentLocation.lat.toFixed(4)}, {details.currentLocation.lng.toFixed(4)}
          </dd>
        </>
      )}
    </dl>
  );
}

function GpsGeofenceView({ details }: { details: GpsGeofenceDetails }) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
      {details.buildingName && (
        <>
          <dt className="text-muted-foreground">Building</dt>
          <dd className="font-medium">{details.buildingName}</dd>
        </>
      )}
      {details.distanceMeters !== undefined && (
        <>
          <dt className="text-muted-foreground">Distance</dt>
          <dd className="font-medium">{details.distanceMeters} m</dd>
        </>
      )}
      {details.allowedRadius !== undefined && (
        <>
          <dt className="text-muted-foreground">Allowed radius</dt>
          <dd className="font-medium">{details.allowedRadius} m</dd>
        </>
      )}
    </dl>
  );
}

export function AnomalyDetailCell({ type, details }: AnomalyDetailCellProps) {
  const [open, setOpen] = useState(false);

  if (!details) return <span className="text-muted-foreground text-xs">—</span>;

  const hasKnownType =
    type === "IMPOSSIBLE_TRAVEL" || type === "gps_outside_geofence" || type === "DEVICE_MISMATCH";

  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-1 gap-0.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <IconChevronDown className="h-3 w-3" /> : <IconChevronRight className="h-3 w-3" />}
        {open ? "Hide" : "Details"}
      </Button>

      {open && (
        <div className="rounded border bg-muted/40 p-2">
          {type === "IMPOSSIBLE_TRAVEL" && hasKnownType ? (
            <ImpossibleTravelView details={details as ImpossibleTravelDetails} />
          ) : type === "gps_outside_geofence" ? (
            <GpsGeofenceView details={details as GpsGeofenceDetails} />
          ) : (
            <pre className="text-[10px] whitespace-pre-wrap break-all">
              {JSON.stringify(details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
