import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdminMapData } from "@/hooks/api/use-reports";
import { Map, MapTileLayer, MapCircle, MapMarker, MapPopup } from "@/components/ui/map";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IconArrowLeft,
  IconMapPin,
  IconMapPinOff,
  IconWorld,
} from "@tabler/icons-react";
import { AdminPageHeader } from "@/components/admin";

export const Route = createFileRoute("/admin/map/$sessionId")({
  component: AdminMapRoute,
});

function AdminMapRoute() {
  const { sessionId } = Route.useParams();
  const { data, isLoading, error } = useAdminMapData(sessionId);

  // Calculate dynamic bounds to fit both the geofence and all student check-ins
  const defaultCenter: [number, number] = [22.5995, 72.8205];
  const hasGeofence =
    typeof data?.geofence?.centerLat === "number" &&
    !isNaN(data.geofence.centerLat) &&
    typeof data?.geofence?.centerLng === "number" &&
    !isNaN(data.geofence.centerLng);

  const center: [number, number] = hasGeofence
    ? [data.geofence.centerLat, data.geofence.centerLng]
    : defaultCenter;

  let bounds: [[number, number], [number, number]] | undefined = undefined;

  if (data) {
    let minLat = hasGeofence ? data.geofence.centerLat : undefined;
    let maxLat = hasGeofence ? data.geofence.centerLat : undefined;
    let minLng = hasGeofence ? data.geofence.centerLng : undefined;
    let maxLng = hasGeofence ? data.geofence.centerLng : undefined;

    data.points.forEach((point: any) => {
      if (typeof point.lat === "number" && !isNaN(point.lat) && typeof point.lng === "number" && !isNaN(point.lng)) {
        if (minLat === undefined || point.lat < minLat) minLat = point.lat;
        if (maxLat === undefined || point.lat > maxLat) maxLat = point.lat;
        if (minLng === undefined || point.lng < minLng) minLng = point.lng;
        if (maxLng === undefined || point.lng > maxLng) maxLng = point.lng;
      }
    });

    if (minLat !== undefined && maxLat !== undefined && minLng !== undefined && maxLng !== undefined) {
      const latPadding = Math.max((maxLat - minLat) * 0.1, 0.001);
      const lngPadding = Math.max((maxLng - minLng) * 0.1, 0.001);

      bounds = [
        [minLat - latPadding, minLng - lngPadding],
        [maxLat + latPadding, maxLng + lngPadding],
      ];
    }
  }

  const validCheckins = data?.points.filter((p: any) => p.isWithinGeofence && !p.isMocked).length ?? 0;
  const invalidCheckins = (data?.points.length ?? 0) - validCheckins;

  return (
    <div className="space-y-4 min-w-0 w-full h-[calc(100dvh-5.5rem)] flex flex-col pb-4">
      <AdminPageHeader
        title="Session GPS Telemetry"
        subtitle={
          data
            ? `${data.sessionInfo.subject} • ${data.sessionInfo.room} • ${new Date(data.sessionInfo.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
            : "Live geographical check-in distribution and geofence boundary verification."
        }
        icon={<IconWorld className="size-6 text-primary" />}
        badge={
          data ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {validCheckins} Verified
              </span>
              {invalidCheckins > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  {invalidCheckins} Flagged
                </span>
              )}
            </div>
          ) : undefined
        }
        actions={
          <Link to="/admin/analytics">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9 shadow-xs">
              <IconArrowLeft className="size-4" /> Back to Analytics
            </Button>
          </Link>
        }
      />

      {error ? (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          Failed to load session GPS telemetry data.
        </div>
      ) : (
        <Card className="flex-1 flex flex-col rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden">
          <CardContent className="p-0 flex-1 relative z-0">
            {isLoading ? (
              <div className="h-full w-full bg-muted/20 flex flex-col items-center justify-center space-y-3 p-6 animate-pulse">
                <IconWorld className="size-10 text-muted-foreground/30 animate-spin" />
                <p className="text-xs text-muted-foreground">Loading geographical coordinates & satellite tiles...</p>
              </div>
            ) : data ? (
              <Map
                center={center}
                zoom={18}
                bounds={bounds}
                className="h-full w-full"
              >
                <MapTileLayer />

                {/* Geofence Boundary */}
                {hasGeofence && (
                  <MapCircle
                    center={center}
                    radius={data.geofence.radiusMeters || 50}
                    pathOptions={{ color: "#4f46e5", fillColor: "#4f46e5", fillOpacity: 0.12 }}
                  >
                    <MapPopup>Classroom Geofence ({data.geofence.radiusMeters || 50}m radius)</MapPopup>
                  </MapCircle>
                )}

                {/* Student Check-ins */}
                {data.points
                  .filter((point: any) => typeof point.lat === "number" && !isNaN(point.lat) && typeof point.lng === "number" && !isNaN(point.lng))
                  .map((point: any, idx: number) => (
                    <MapMarker
                      key={idx}
                      position={[point.lat, point.lng] as [number, number]}
                      icon={
                        point.isWithinGeofence && !point.isMocked ? (
                          <IconMapPin className="text-emerald-500 fill-emerald-500/20" size={32} />
                        ) : (
                          <IconMapPinOff className="text-rose-500 fill-rose-500/20" size={32} />
                        )
                      }
                    >
                      <MapPopup>
                        <div className="font-semibold text-xs text-foreground">{point.studentName}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Status:{" "}
                          <span className={point.isWithinGeofence ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                            {point.isWithinGeofence ? "Within Perimeter" : "Outside Geofence"}
                          </span>
                        </div>
                        {point.isMocked && (
                          <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
                            ⚠️ Spoofed Location Detected
                          </div>
                        )}
                      </MapPopup>
                    </MapMarker>
                  ))}
              </Map>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
