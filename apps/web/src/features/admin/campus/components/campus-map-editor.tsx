import React, { useState, useEffect } from "react";
import { useMap } from "react-leaflet";
import { MapPinIcon } from "lucide-react";
import {
  Map,
  MapMarker,
  MapTileLayer,
  MapZoomControl,
  MapDrawControl,
  MapDrawCircle,
  MapDrawEdit,
  MapDrawDelete,
  MapSearchControl,
  useLeaflet,
  useMapDrawContext,
} from "@/components/ui/map";

export function MapSearchControlWrapper() {
  const map = useMap();
  const [selectedPosition, setSelectedPosition] = useState<any>(null);

  return (
    <>
      <MapSearchControl
        position="top-1 left-10"
        onPlaceSelect={(feature) => {
          const coords = feature.geometry.coordinates;
          const pos: [number, number] = [coords[1], coords[0]];
          setSelectedPosition(pos);
          map.setView(pos, 16);
        }}
      />
      {selectedPosition && (
        <MapMarker position={selectedPosition} icon={<MapPinIcon className="size-6" />} />
      )}
    </>
  );
}

export function MapEditInitializer({
  building,
  lat,
  lng,
  radius,
}: {
  building: any;
  lat: any;
  lng: any;
  radius: any;
}) {
  const map = useMap();
  const { L } = useLeaflet();
  const drawContext = useMapDrawContext();

  useEffect(() => {
    if (!L || !map || !building || !drawContext?.featureGroup) return;

    const group = drawContext.featureGroup;
    let existingCircle: any = null;

    group.eachLayer((layer: any) => {
      if (layer instanceof L.Circle) {
        existingCircle = layer;
      }
    });

    if (!existingCircle) {
      const circle = new L.Circle([building.gpsLat, building.gpsLng], {
        radius: building.radiusMeters,
        color: "#ca8a04",
        fillColor: "#ca8a04",
        weight: 1,
      });
      map.fire(L.Draw.Event.CREATED, { layer: circle, layerType: "circle" });
    } else {
      if (lat !== undefined && lng !== undefined) {
        existingCircle.setLatLng([lat, lng]);
      }
      if (radius > 0) {
        existingCircle.setRadius(radius);
      }
    }
  }, [L, map, building, drawContext, lat, lng, radius]);

  return null;
}

interface CampusMapEditorProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  building?: any;
  lat?: number;
  lng?: number;
  radius?: number;
  onCircleCreated?: (lat: number, lng: number, radius: number) => void;
  onCircleEdited?: (lat: number, lng: number, radius: number) => void;
  onCircleDeleted?: () => void;
}

export function CampusMapEditor({
  initialCenter = [22.5996, 72.8205],
  initialZoom = 15,
  building,
  lat,
  lng,
  radius,
  onCircleCreated,
  onCircleEdited,
  onCircleDeleted,
}: CampusMapEditorProps) {
  return (
    <div className="h-[300px] w-full rounded-md border overflow-hidden relative">
      <Map center={initialCenter} zoom={initialZoom}>
        <MapTileLayer />
        <MapZoomControl position="bottomright" />
        <MapSearchControlWrapper />
        {building && (
          <MapEditInitializer
            building={building}
            lat={lat}
            lng={lng}
            radius={radius}
          />
        )}
        <MapDrawControl
          position="topright"
          onLayersChange={(layers) => {
            let found = false;
            layers.eachLayer((layer: any) => {
              if (layer.getRadius && layer.getLatLng && !found) {
                const { lat: circleLat, lng: circleLng } = layer.getLatLng();
                const circleRadius = Math.round(layer.getRadius());
                onCircleCreated?.(circleLat, circleLng, circleRadius);
                onCircleEdited?.(circleLat, circleLng, circleRadius);
                found = true;
              }
            });
            if (!found) {
              onCircleDeleted?.();
            }
          }}
        >
          <MapDrawCircle />
          <MapDrawEdit />
          <MapDrawDelete />
        </MapDrawControl>
      </Map>
    </div>
  );
}
