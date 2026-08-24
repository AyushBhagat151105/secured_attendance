import { createFileRoute } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createBuildingSchema,
  updateBuildingSchema,
  createRoomSchema,
  type CreateBuildingSchema,
  type UpdateBuildingSchema,
  type CreateRoomSchema,
} from "@secured_attendance/validators";

import {
  useBuildings,
  useRooms,
  useCreateBuilding,
  useUpdateBuilding,
  useCreateRoom,
} from "@/hooks/api/use-admin-campus";
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
import {
  Map,
  MapMarker,
  MapPopup,
  MapTileLayer,
  MapZoomControl,
  MapDrawControl,
  MapDrawCircle,
  MapDrawEdit,
  MapDrawDelete,
  MapSearchControl,
  MapCircle,
  useLeaflet,
  useMapDrawContext,
} from "@/components/ui/map";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import React, { useState } from "react";

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

function MapEditInitializer({
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
        weight: 1,
      });
      map.fire(L.Draw.Event.CREATED, { layer: circle, layerType: "circle" });
    } else {
      // Update it dynamically when inputs change!
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

function CampusRoute() {
  const { data: buildings, isLoading: isLoadingBuildings } = useBuildings();
  const { data: rooms, isLoading: isLoadingRooms } = useRooms();

  const createBuilding = useCreateBuilding();
  const updateBuilding = useUpdateBuilding();
  const createRoomMutation = useCreateRoom();

  const [isBuildingOpen, setIsBuildingOpen] = useState(false);
  const [isRoomOpen, setIsRoomOpen] = useState(false);

  const [editingBuilding, setEditingBuilding] = useState<any>(null);

  const buildingForm = useForm<CreateBuildingSchema>({
    resolver: zodResolver(createBuildingSchema),
    defaultValues: {
      name: "",
      code: "",
      gpsLat: 0,
      gpsLng: 0,
      radiusMeters: 50,
    },
  });

  const editBuildingForm = useForm<UpdateBuildingSchema>({
    resolver: zodResolver(updateBuildingSchema),
    defaultValues: {
      name: "",
      code: "",
      gpsLat: 0,
      gpsLng: 0,
      radiusMeters: 50,
    },
  });

  const roomForm = useForm<CreateRoomSchema>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      name: "",
      type: "classroom",
      buildingId: "",
    },
  });

  const onAddBuilding = async (value: CreateBuildingSchema) => {
    if (value.gpsLat === 0 && value.gpsLng === 0) {
      toast.error("Please draw a geofence circle on the map");
      return;
    }
    await createBuilding.mutateAsync(value);
    buildingForm.reset();
    setIsBuildingOpen(false);
  };

  const onEditBuilding = async (value: UpdateBuildingSchema) => {
    await updateBuilding.mutateAsync({ id: editingBuilding.id, body: value });
    setEditingBuilding(null);
  };

  const onAddRoom = async (value: CreateRoomSchema) => {
    await createRoomMutation.mutateAsync(value);
    roomForm.reset();
    setIsRoomOpen(false);
  };

  const newGpsLat = buildingForm.watch("gpsLat");
  const newGpsLng = buildingForm.watch("gpsLng");
  const newRadiusMeters = buildingForm.watch("radiusMeters");

  const editGpsLat = editBuildingForm.watch("gpsLat");
  const editGpsLng = editBuildingForm.watch("gpsLng");
  const editRadiusMeters = editBuildingForm.watch("radiusMeters");

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Campus Management</h2>
        <div className="flex items-center space-x-2">
          <Dialog
            open={isBuildingOpen}
            onOpenChange={(open) => {
              if (!open) buildingForm.reset();
              setIsBuildingOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Building
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={buildingForm.handleSubmit(onAddBuilding)}>
                  <DialogHeader>
                    <DialogTitle>Add New Building</DialogTitle>
                    <DialogDescription>
                      Create a new building with GPS coordinates.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Controller
                      control={buildingForm.control}
                      name="name"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Building Name</FieldLabel>
                            <Input {...field} placeholder="Main Building" />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      control={buildingForm.control}
                      name="code"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Code</FieldLabel>
                            <Input {...field} placeholder="MB" />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <div className="grid gap-2">
                      <FieldLabel>Geofence Area</FieldLabel>
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
                                  buildingForm.setValue("gpsLat", layer.getLatLng().lat);
                                  buildingForm.setValue("gpsLng", layer.getLatLng().lng);
                                  buildingForm.setValue(
                                    "radiusMeters",
                                    Math.round(layer.getRadius()),
                                  );
                                  found = true;
                                }
                              });
                            }}
                          >
                            <MapDrawCircle />
                            <MapDrawEdit />
                            <MapDrawDelete />
                          </MapDrawControl>
                          {newGpsLat !== 0 && newGpsLng !== 0 && newRadiusMeters > 0 && (
                            <MapCircle
                              center={[newGpsLat, newGpsLng]}
                              radius={newRadiusMeters}
                              className="fill-yellow-600 stroke-yellow-600 stroke-1"
                            />
                          )}
                        </Map>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <Controller
                        control={buildingForm.control}
                        name="gpsLat"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Latitude</FieldLabel>
                              <Input {...field} type="number" step="any" placeholder="22.6018" onChange={e => field.onChange(e.target.valueAsNumber)} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                      <Controller
                        control={buildingForm.control}
                        name="gpsLng"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Longitude</FieldLabel>
                              <Input {...field} type="number" step="any" placeholder="72.8194" onChange={e => field.onChange(e.target.valueAsNumber)} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                      <Controller
                        control={buildingForm.control}
                        name="radiusMeters"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Radius (m)</FieldLabel>
                              <Input {...field} type="number" onChange={e => field.onChange(e.target.valueAsNumber)} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={buildingForm.formState.isSubmitting}>
                      {buildingForm.formState.isSubmitting ? "Saving..." : "Save Building"}
                    </Button>
                  </DialogFooter>
                </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!editingBuilding}
            onOpenChange={(open) => !open && setEditingBuilding(null)}
          >
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={editBuildingForm.handleSubmit(onEditBuilding)}>
                  <DialogHeader>
                    <DialogTitle>Edit Building</DialogTitle>
                    <DialogDescription>
                      Update the building details or geofence coordinates.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Controller
                      control={editBuildingForm.control}
                      name="name"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Building Name</FieldLabel>
                            <Input {...field} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      control={editBuildingForm.control}
                      name="code"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Code</FieldLabel>
                            <Input {...field} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <div className="grid gap-2">
                      <FieldLabel>Geofence Area</FieldLabel>
                      <div className="h-100 w-full rounded-md border overflow-hidden relative z-0">
                        <Map
                          center={
                            editingBuilding
                              ? [editingBuilding.gpsLat, editingBuilding.gpsLng]
                              : [20.5937, 78.9629]
                          }
                          zoom={16}
                          className="h-full w-full"
                        >
                          <MapTileLayer />
                          <MapZoomControl />
                          <MapSearchControlWrapper />
                          <MapDrawControl
                            onLayersChange={(layers) => {
                              let found = false;
                              layers.eachLayer((layer: any) => {
                                if (layer.getRadius && layer.getLatLng && !found) {
                                  editBuildingForm.setValue("gpsLat", layer.getLatLng().lat);
                                  editBuildingForm.setValue("gpsLng", layer.getLatLng().lng);
                                  editBuildingForm.setValue(
                                    "radiusMeters",
                                    Math.round(layer.getRadius()),
                                  );
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
                            <MapEditInitializer
                              building={editingBuilding}
                              lat={editGpsLat}
                              lng={editGpsLng}
                              radius={editRadiusMeters}
                            />
                          )}
                        </Map>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <Controller
                        control={editBuildingForm.control}
                        name="gpsLat"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Latitude</FieldLabel>
                              <Input {...field} type="number" step="any" onChange={e => field.onChange(e.target.valueAsNumber)} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                      <Controller
                        control={editBuildingForm.control}
                        name="gpsLng"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Longitude</FieldLabel>
                              <Input {...field} type="number" step="any" onChange={e => field.onChange(e.target.valueAsNumber)} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                      <Controller
                        control={editBuildingForm.control}
                        name="radiusMeters"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Radius (m)</FieldLabel>
                              <Input {...field} type="number" onChange={e => field.onChange(e.target.valueAsNumber)} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={editBuildingForm.formState.isSubmitting}>
                      {editBuildingForm.formState.isSubmitting ? (
                        <Spinner className="mr-2" />
                      ) : null}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isRoomOpen}
            onOpenChange={(open) => {
              if (!open) roomForm.reset();
              setIsRoomOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Add Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={roomForm.handleSubmit(onAddRoom)}>
                  <DialogHeader>
                    <DialogTitle>Add New Room</DialogTitle>
                    <DialogDescription>
                      Create a room and assign it to a building.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Controller
                      control={roomForm.control}
                      name="name"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Room Name / No</FieldLabel>
                            <Input {...field} placeholder="101" />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      control={roomForm.control}
                      name="type"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Type</FieldLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      control={roomForm.control}
                      name="buildingId"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Building</FieldLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select building" />
                              </SelectTrigger>
                            <SelectContent>
                              {buildings?.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={roomForm.formState.isSubmitting}>
                      {roomForm.formState.isSubmitting ? "Saving..." : "Save Room"}
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
                        <div className="text-xs text-muted-foreground mb-3">
                          {building.code} • Radius: {building.radiusMeters}m
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full"
                          onClick={() => {
                            setEditingBuilding(building);
                            editBuildingForm.reset({
                              name: building.name,
                              code: building.code,
                              gpsLat: building.gpsLat,
                              gpsLng: building.gpsLng,
                              radiusMeters: building.radiusMeters,
                            });
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
