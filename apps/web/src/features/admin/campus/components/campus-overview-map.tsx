import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Map,
  MapMarker,
  MapPopup,
  MapTileLayer,
  MapZoomControl,
  MapCircle,
} from "@/components/ui/map";

interface CampusOverviewMapProps {
  buildings: any[] | undefined;
  isLoading: boolean;
  onEditBuilding: (building: any) => void;
}

export function CampusOverviewMap({
  buildings,
  isLoading,
  onEditBuilding,
}: CampusOverviewMapProps) {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Buildings Map</CardTitle>
        <CardDescription>GPS locations of all campus buildings.</CardDescription>
      </CardHeader>
      <CardContent className="h-100 p-0 overflow-hidden rounded-b-xl relative z-0">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : buildings && buildings.length > 0 ? (
          <Map center={[buildings[0].gpsLat, buildings[0].gpsLng]} className="w-full h-full">
            <MapTileLayer />
            <MapZoomControl />
            {buildings.map((building) => (
              <React.Fragment key={building.id}>
                <MapCircle
                  center={[building.gpsLat, building.gpsLng]}
                  radius={building.radiusMeters}
                  className="fill-yellow-600 stroke-yellow-600 stroke-1"
                />
                <MapMarker position={[building.gpsLat, building.gpsLng]}>
                  <MapPopup>
                    <div className="font-semibold">{building.name}</div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {building.code} • Radius: {building.radiusMeters}m
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={() => onEditBuilding(building)}
                    >
                      Edit Location
                    </Button>
                  </MapPopup>
                </MapMarker>
              </React.Fragment>
            ))}
          </Map>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No buildings found or map data unavailable.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
