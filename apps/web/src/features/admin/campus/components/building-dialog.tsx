import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createBuildingSchema,
  updateBuildingSchema,
  type CreateBuildingSchema,
  type UpdateBuildingSchema,
} from "@secured_attendance/validators";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  Map,
  MapCircle,
  MapDrawCircle,
  MapDrawControl,
  MapDrawDelete,
  MapDrawEdit,
  MapSearchControl,
  MapTileLayer,
  MapZoomControl,
} from "@/components/ui/map";
import { MapSearchControlWrapper, MapEditInitializer } from "./campus-map-editor";

interface BuildingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  building?: any;
  onSubmit: (data: any) => Promise<void>;
}

export function BuildingDialog({ open, onOpenChange, building, onSubmit }: BuildingDialogProps) {
  const isEditing = !!building;

  const form = useForm<any>({
    resolver: zodResolver(isEditing ? updateBuildingSchema : createBuildingSchema),
    defaultValues: {
      name: "",
      code: "",
      gpsLat: 0,
      gpsLng: 0,
      radiusMeters: 50,
    },
  });

  useEffect(() => {
    if (building) {
      form.reset({
        name: building.name,
        code: building.code,
        gpsLat: building.gpsLat,
        gpsLng: building.gpsLng,
        radiusMeters: building.radiusMeters,
      });
    } else {
      form.reset({
        name: "",
        code: "",
        gpsLat: 0,
        gpsLng: 0,
        radiusMeters: 50,
      });
    }
  }, [building, form]);

  const gpsLat = form.watch("gpsLat");
  const gpsLng = form.watch("gpsLng");
  const radiusMeters = form.watch("radiusMeters");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Building" : "Add New Building"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update building details and geofence coordinates."
                : "Create a new building with GPS geofence coordinates."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Controller
              control={form.control}
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
              control={form.control}
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
                <Map
                  center={
                    building
                      ? [building.gpsLat, building.gpsLng]
                      : [20.5937, 78.9629]
                  }
                  zoom={isEditing ? 16 : 4}
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
                          form.setValue("gpsLat", layer.getLatLng().lat);
                          form.setValue("gpsLng", layer.getLatLng().lng);
                          form.setValue("radiusMeters", Math.round(layer.getRadius()));
                          found = true;
                        }
                      });
                    }}
                  >
                    <MapDrawCircle />
                    <MapDrawEdit />
                    <MapDrawDelete />
                  </MapDrawControl>
                  {isEditing && building && (
                    <MapEditInitializer
                      building={building}
                      lat={gpsLat}
                      lng={gpsLng}
                      radius={radiusMeters}
                    />
                  )}
                  {!isEditing && gpsLat !== 0 && gpsLng !== 0 && radiusMeters > 0 && (
                    <MapCircle
                      center={[gpsLat, gpsLng]}
                      radius={radiusMeters}
                      className="fill-yellow-600 stroke-yellow-600 stroke-1"
                    />
                  )}
                </Map>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Controller
                control={form.control}
                name="gpsLat"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Latitude</FieldLabel>
                    <Input
                      {...field}
                      type="number"
                      step="any"
                      placeholder="22.6018"
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="gpsLng"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Longitude</FieldLabel>
                    <Input
                      {...field}
                      type="number"
                      step="any"
                      placeholder="72.8194"
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="radiusMeters"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Radius (m)</FieldLabel>
                    <Input
                      {...field}
                      type="number"
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner className="mr-2" />}
              {isEditing ? "Save Changes" : "Save Building"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
