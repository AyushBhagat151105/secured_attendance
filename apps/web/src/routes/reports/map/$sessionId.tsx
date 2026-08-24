import { createFileRoute, Link } from "@tanstack/react-router";
import { useTeacherMapData } from "@/hooks/api/use-reports";
import { Map, MapTileLayer, MapCircle, MapMarker, MapPopup } from "@/components/ui/map";
import { Card, CardContent } from "@/components/ui/card";
import { IconMapPin, IconMapPinOff, IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reports/map/$sessionId")({
  component: TeacherMapRoute,
});

function TeacherMapRoute() {
  const { sessionId } = Route.useParams();
  const { data, isLoading, error } = useTeacherMapData(sessionId);

  if (isLoading) return <div className="p-8">Loading map data...</div>;
  if (error) return <div className="p-8 text-red-500">Failed to load map data.</div>;
  if (!data) return null;

  // Calculate dynamic bounds to fit both the geofence and all student check-ins
  let bounds: [[number, number], [number, number]] | undefined = undefined;

  if (data) {
    let minLat = data.geofence.centerLat;
    let maxLat = data.geofence.centerLat;
    let minLng = data.geofence.centerLng;
    let maxLng = data.geofence.centerLng;

    data.points.forEach((point: any) => {
      if (point.lat < minLat) minLat = point.lat;
      if (point.lat > maxLat) maxLat = point.lat;
      if (point.lng < minLng) minLng = point.lng;
      if (point.lng > maxLng) maxLng = point.lng;
    });

    // Add padding to bounds
    const latPadding = Math.max((maxLat - minLat) * 0.1, 0.001);
    const lngPadding = Math.max((maxLng - minLng) * 0.1, 0.001);

    bounds = [
      [minLat - latPadding, minLng - lngPadding],
      [maxLat + latPadding, maxLng + lngPadding],
    ];
  }

  return (
    <div className="space-y-6 p-4 sm:p-8 max-w-7xl mx-auto w-full h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">GPS Visualization</h1>
          <p className="text-muted-foreground text-lg">
            {data.sessionInfo.subject} • {data.sessionInfo.room} •{" "}
            {new Date(data.sessionInfo.date).toLocaleString()}
          </p>
        </div>
        <Link to="/reports/session/$sessionId" params={{ sessionId }}>
          <Button variant="outline">
            <IconArrowLeft className="mr-2 h-4 w-4" />
            Back to Report
          </Button>
        </Link>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 relative z-0">
          <Map bounds={bounds} className="h-full w-full">
            <MapTileLayer />

            {/* Geofence Boundary */}
            <MapCircle
              center={[data.geofence.centerLat, data.geofence.centerLng] as [number, number]}
              radius={data.geofence.radiusMeters}
              pathOptions={{ color: "indigo", fillColor: "indigo", fillOpacity: 0.1 }}
            >
              <MapPopup>Classroom Geofence ({data.geofence.radiusMeters}m radius)</MapPopup>
            </MapCircle>

            {/* Student Check-ins */}
            {data.points.map((point: any, idx: number) => (
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
