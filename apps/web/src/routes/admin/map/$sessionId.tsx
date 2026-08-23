import { createFileRoute } from "@tanstack/react-router";
import { useAdminMapData } from "@/hooks/use-reports";
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

  return (
    <div className="space-y-6 p-4 sm:p-8 max-w-7xl mx-auto w-full h-[calc(100vh-4rem)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">GPS Visualization</h1>
        <p className="text-muted-foreground text-lg">
          {data.sessionInfo.subject} • {data.sessionInfo.room} • {new Date(data.sessionInfo.date).toLocaleString()}
        </p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 relative z-0">
          <Map 
            center={[data.geofence.centerLat, data.geofence.centerLng] as [number, number]} 
            zoom={18} 
            className="h-full w-full"
          >
            <MapTileLayer />
            
            {/* Geofence Boundary */}
            <MapCircle 
              center={[data.geofence.centerLat, data.geofence.centerLng] as [number, number]} 
              radius={data.geofence.radiusMeters} 
              pathOptions={{ color: 'indigo', fillColor: 'indigo', fillOpacity: 0.1 }}
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
                  <strong>{point.studentName}</strong><br/>
                  Valid: {point.isWithinGeofence ? 'Yes' : 'No (Outside geofence)'}<br/>
                  Mocked GPS: {point.isMocked ? 'Yes (Spoofing)' : 'No'}
                </MapPopup>
              </MapMarker>
            ))}
          </Map>
        </CardContent>
      </Card>
    </div>
  );
}
