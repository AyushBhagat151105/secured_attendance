import { createFileRoute } from "@tanstack/react-router";
import { useBuildings, useRooms } from "@/features/admin/campus/queries/campus.queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MapPinIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useMap } from "react-leaflet";
import { Map, MapMarker, MapPopup, MapTileLayer, MapZoomControl, MapDrawControl, MapDrawCircle, MapDrawEdit, MapDrawDelete, MapSearchControl, MapCircle, useLeaflet, useMapDrawContext } from "@/components/ui/map";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useState } from "react";
import { useCreateBuilding, useUpdateBuilding, useCreateRoom } from "@/features/admin/campus/queries/campus.queries";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/campus/")({
  component: CampusRoute,
});

function MapSearchControlWrapper() {
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

function MapEditInitializer({ building, lat, lng, radius }: { building: any, lat: any, lng: any, radius: any }) {
  const map = useMap();
  const { L } = useLeaflet();
  const drawContext = useMapDrawContext();

  React.useEffect(() => {
    if (!L || !map || !building || !drawContext?.featureGroup) return;
    
    const group = drawContext.featureGroup;
    let existingCircle: any = null;
    
    group.eachLayer((layer: any) => {
      if (layer instanceof L.Circle) {
        existingCircle = layer;
      }
    });

    if (!existingCircle) {
      // Create the circle layer initially
      const circle = new L.Circle([building.gpsLat, building.gpsLng], {
        radius: building.radiusMeters,
        color: "#ca8a04",
        fillColor: "#ca8a04",
        weight: 1
      });
      map.fire(L.Draw.Event.CREATED, { layer: circle, layerType: 'circle' });
    } else {
      // Update it dynamically when inputs change!
      if (lat !== "" && lng !== "") {
        existingCircle.setLatLng([lat, lng]);
      }
      if (radius > 0) {
        existingCircle.setRadius(radius);
      }
    }
  }, [L, map, building, drawContext, lat, lng, radius]);

  return null;
}

function CampusRoute() {
  const { data: buildings, isLoading: isLoadingBuildings } = useBuildings();
  const { data: rooms, isLoading: isLoadingRooms } = useRooms();

  const createBuilding = useCreateBuilding();
  const updateBuilding = useUpdateBuilding();
  const createRoom = useCreateRoom();

  const [isBuildingOpen, setIsBuildingOpen] = useState(false);
  const [isRoomOpen, setIsRoomOpen] = useState(false);

  const [gpsLat, setGpsLat] = useState<number | "">("");
  const [gpsLng, setGpsLng] = useState<number | "">("");
  const [radiusMeters, setRadiusMeters] = useState<number>(50);

  const [editingBuilding, setEditingBuilding] = useState<any>(null);
  const [editGpsLat, setEditGpsLat] = useState<number | "">("");
  const [editGpsLng, setEditGpsLng] = useState<number | "">("");
  const [editRadiusMeters, setEditRadiusMeters] = useState<number>(50);

  const onAddBuilding = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (gpsLat === "" || gpsLng === "") {
      toast.error("Please draw a geofence circle on the map");
      return;
    }
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      gpsLat: Number(gpsLat),
      gpsLng: Number(gpsLng),
      radiusMeters: Number(radiusMeters),
    };
    await createBuilding.mutateAsync(body);
    setIsBuildingOpen(false);
    setGpsLat("");
    setGpsLng("");
    setRadiusMeters(50);
  };

  const onEditBuilding = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editGpsLat === "" || editGpsLng === "") {
      toast.error("Please specify a valid location");
      return;
    }
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      gpsLat: Number(editGpsLat),
      gpsLng: Number(editGpsLng),
      radiusMeters: Number(editRadiusMeters),
    };
    await updateBuilding.mutateAsync({ id: editingBuilding.id, body });
    setEditingBuilding(null);
  };

  const onAddRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      buildingId: formData.get("buildingId") as string,
    };
    await createRoom.mutateAsync(body);
    setIsRoomOpen(false);
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Campus Management</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isBuildingOpen} onOpenChange={setIsBuildingOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Building
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={onAddBuilding}>
                <DialogHeader>
                  <DialogTitle>Add New Building</DialogTitle>
                  <DialogDescription>Create a new building with GPS coordinates.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Building Name</Label>
                    <Input id="name" name="name" required placeholder="Main Building" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="code">Code</Label>
                    <Input id="code" name="code" required placeholder="MB" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Geofence Area</Label>
                    <div className="h-100 w-full rounded-md border overflow-hidden relative z-0">
                      <Map center={[20.5937, 78.9629]} zoom={4} className="h-full w-full">
                        <MapTileLayer />
                        <MapZoomControl />
                        <MapSearchControlWrapper />
                        <MapDrawControl
                          onLayersChange={(layers) => {
                            let found = false;
                            layers.eachLayer((layer: any) => {
                              if (layer.getRadius && layer.getLatLng && !found) {
                                setGpsLat(layer.getLatLng().lat);
                                setGpsLng(layer.getLatLng().lng);
                                setRadiusMeters(Math.round(layer.getRadius()));
                                found = true;
                              }
                            });
                            if (!found) {
                              setGpsLat("");
                              setGpsLng("");
                            }
                          }}
                        >
                          <MapDrawCircle />
                          <MapDrawEdit />
                          <MapDrawDelete />
                        </MapDrawControl>
                        {gpsLat !== "" && gpsLng !== "" && radiusMeters > 0 && (
                          <MapCircle 
                            center={[Number(gpsLat), Number(gpsLng)]} 
                            radius={radiusMeters} 
                            className="fill-yellow-600 stroke-yellow-600 stroke-1"
                          />
                        )}
                      </Map>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="gpsLat">Latitude</Label>
                      <Input id="gpsLat" type="number" step="any" value={gpsLat} onChange={(e) => setGpsLat(e.target.value ? Number(e.target.value) : "")} required placeholder="22.6018" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="gpsLng">Longitude</Label>
                      <Input id="gpsLng" type="number" step="any" value={gpsLng} onChange={(e) => setGpsLng(e.target.value ? Number(e.target.value) : "")} required placeholder="72.8194" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="radiusMeters">Radius (m)</Label>
                      <Input id="radiusMeters" type="number" value={radiusMeters} onChange={(e) => setRadiusMeters(Number(e.target.value))} required />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createBuilding.isPending}>
                    {createBuilding.isPending ? "Saving..." : "Save Building"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={!!editingBuilding} onOpenChange={(open) => !open && setEditingBuilding(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={onEditBuilding}>
                <DialogHeader>
                  <DialogTitle>Edit Building</DialogTitle>
                  <DialogDescription>Update the building details or geofence coordinates.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Building Name</Label>
                    <Input id="edit-name" name="name" required defaultValue={editingBuilding?.name} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-code">Code</Label>
                    <Input id="edit-code" name="code" required defaultValue={editingBuilding?.code} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Geofence Area</Label>
                    <div className="h-100 w-full rounded-md border overflow-hidden relative z-0">
                      <Map center={editingBuilding ? [editingBuilding.gpsLat, editingBuilding.gpsLng] : [20.5937, 78.9629]} zoom={16} className="h-full w-full">
                        <MapTileLayer />
                        <MapZoomControl />
                        <MapSearchControlWrapper />
                        <MapDrawControl
                          onLayersChange={(layers) => {
                            let found = false;
                            layers.eachLayer((layer: any) => {
                              if (layer.getRadius && layer.getLatLng && !found) {
                                setEditGpsLat(layer.getLatLng().lat);
                                setEditGpsLng(layer.getLatLng().lng);
                                setEditRadiusMeters(Math.round(layer.getRadius()));
                                found = true;
                              }
                            });
                          }}
                        >
                          <MapDrawCircle />
                          <MapDrawEdit />
                          <MapDrawDelete />
                        </MapDrawControl>
                        {editingBuilding && (
                          <MapEditInitializer building={editingBuilding} lat={editGpsLat} lng={editGpsLng} radius={editRadiusMeters} />
                        )}
                      </Map>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-gpsLat">Latitude</Label>
                      <Input id="edit-gpsLat" type="number" step="any" value={editGpsLat} onChange={(e) => setEditGpsLat(e.target.value ? Number(e.target.value) : "")} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-gpsLng">Longitude</Label>
                      <Input id="edit-gpsLng" type="number" step="any" value={editGpsLng} onChange={(e) => setEditGpsLng(e.target.value ? Number(e.target.value) : "")} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-radiusMeters">Radius (m)</Label>
                      <Input id="edit-radiusMeters" type="number" value={editRadiusMeters} onChange={(e) => setEditRadiusMeters(Number(e.target.value))} required />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={updateBuilding?.isPending}>
                    {updateBuilding?.isPending ? <Spinner className="mr-2" /> : null}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isRoomOpen} onOpenChange={setIsRoomOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Add Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={onAddRoom}>
                <DialogHeader>
                  <DialogTitle>Add New Room</DialogTitle>
                  <DialogDescription>Create a room and assign it to a building.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="room-name">Room Name / No</Label>
                    <Input id="room-name" name="name" required placeholder="101" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Type</Label>
                    <Select name="type" required defaultValue="classroom">
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classroom">Classroom</SelectItem>
                        <SelectItem value="lab">Laboratory</SelectItem>
                        <SelectItem value="hall">Seminar Hall</SelectItem>
                        <SelectItem value="office">Office</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="buildingId">Building</Label>
                    <Select name="buildingId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select building" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings?.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createRoom.isPending}>
                    {createRoom.isPending ? "Saving..." : "Save Room"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Buildings Map</CardTitle>
            <CardDescription>GPS locations of all campus buildings.</CardDescription>
          </CardHeader>
          <CardContent className="h-100 p-0 overflow-hidden rounded-b-xl relative z-0">
            {isLoadingBuildings ? (
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
                        <div className="text-xs text-muted-foreground mb-3">{building.code} • Radius: {building.radiusMeters}m</div>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="w-full"
                          onClick={() => {
                            setEditingBuilding(building);
                            setEditGpsLat(building.gpsLat);
                            setEditGpsLng(building.gpsLng);
                            setEditRadiusMeters(building.radiusMeters);
                          }}
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

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Rooms</CardTitle>
            <CardDescription>All assigned rooms in campus.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRooms ? (
              <div className="flex justify-center p-8">
                <Spinner />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms?.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.name}</TableCell>
                      <TableCell>{room.building?.code || "-"}</TableCell>
                      <TableCell className="capitalize">{room.type}</TableCell>
                    </TableRow>
                  ))}
                  {(!rooms || rooms.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        No rooms found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
