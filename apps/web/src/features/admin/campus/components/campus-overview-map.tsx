import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { IconBuildingSkyscraper, IconMapPin } from "@tabler/icons-react";
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
    <Card className="col-span-full lg:col-span-4 rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden">
      <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <IconMapPin className="size-4 text-primary" /> Geofence Overview
            </CardTitle>
            <CardDescription className="text-xs">
              GPS boundaries and physical perimeters of campus structures.
            </CardDescription>
          </div>
          {buildings && (
            <Badge variant="secondary" className="font-mono text-xs">
              {buildings.length} Buildings
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="h-[380px] sm:h-[420px] p-0 overflow-hidden relative z-0">
        {isLoading ? (
          <div className="h-full w-full bg-muted/30 flex flex-col items-center justify-center space-y-3 p-6 animate-pulse">
            <IconBuildingSkyscraper className="size-10 text-muted-foreground/40 animate-bounce" />
            <div className="space-y-2 text-center">
              <Skeleton className="h-4 w-40 mx-auto rounded" />
              <Skeleton className="h-3 w-56 mx-auto rounded" />
            </div>
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
                    <div className="font-semibold text-sm">{building.name}</div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {building.code} • Radius: {building.radiusMeters}m
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full text-xs h-8"
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
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground text-sm p-6 text-center">
            <IconBuildingSkyscraper className="size-8 opacity-40" />
            <p>No buildings configured yet or GPS coordinates unavailable.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
