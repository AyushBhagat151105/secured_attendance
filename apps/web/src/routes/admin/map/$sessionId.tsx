import { createFileRoute } from "@tanstack/react-router";
import { useAdminMapData } from "@/hooks/api/use-reports";
import { Map, MapTileLayer, MapCircle, MapMarker, MapPopup } from "@/components/ui/map";
import { Card, CardContent } from "@/components/ui/card";
import { IconMapPin, IconMapPinOff } from "@tabler/icons-react";

export const Route = createFileRoute("/admin/map/$sessionId")({
  component: AdminMapRoute,
});

function AdminMapRoute() {
  const { sessionId } = Route.useParams();
  const { data, isLoading, error } = useAdminMapData(sessionId);

  if (isLoading) return <div className="p-8">Loading map data...</div>;
  if (error) return <div className="p-8 text-red-500">Failed to load map data.</div>;
  if (!data) return null;

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

  // Calculate dynamic bounds to fit both the geofence and all student check-ins
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
      // Add padding to bounds
      const latPadding = Math.max((maxLat - minLat) * 0.1, 0.001);
      const lngPadding = Math.max((maxLng - minLng) * 0.1, 0.001);

      bounds = [
        [minLat - latPadding, minLng - lngPadding],
        [maxLat + latPadding, maxLng + lngPadding],
      ];
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-8 max-w-7xl mx-auto w-full h-[calc(100vh-4rem)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">GPS Visualization</h1>
        <p className="text-muted-foreground text-lg">
          {data.sessionInfo.subject} • {data.sessionInfo.room} •{" "}
          {new Date(data.sessionInfo.date).toLocaleString()}
        </p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 relative z-0">
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
                pathOptions={{ color: "indigo", fillColor: "indigo", fillOpacity: 0.1 }}
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
                      <IconMapPinOff className="text-red-500 fill-red-500/20" size={32} />
                    )
                  }
                >
                  <MapPopup>
                    <strong>{point.studentName}</strong>
                    <br />
                    Valid: {point.isWithinGeofence ? "Yes" : "No (Outside geofence)"}
                    <br />
                    Mocked GPS: {point.isMocked ? "Yes (Spoofing)" : "No"}
                  </MapPopup>
                </MapMarker>
              ))}
          </Map>
        </CardContent>
      </Card>
    </div>
  );
}
