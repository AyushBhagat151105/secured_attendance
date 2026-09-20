import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  useBuildings,
  useRooms,
  useCreateBuilding,
  useUpdateBuilding,
  useCreateRoom,
  useUpdateRoom,
  useDeleteRoom,
} from "@/hooks/api/use-admin-campus";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { BuildingDialog } from "@/features/admin/campus/components/building-dialog";
import { RoomDialog } from "@/features/admin/campus/components/room-dialog";
import { CampusOverviewMap } from "@/features/admin/campus/components/campus-overview-map";
import { RoomTable } from "@/features/admin/campus/components/room-table";

export const Route = createFileRoute("/admin/campus/")({
  component: CampusRoute,
});

function CampusRoute() {
  const { data: buildings, isLoading: isLoadingBuildings } = useBuildings();
  const { data: rooms, isLoading: isLoadingRooms } = useRooms();

  const createBuilding = useCreateBuilding();
  const updateBuilding = useUpdateBuilding();
  const createRoomMutation = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const deleteRoom = useDeleteRoom();

  const [isBuildingOpen, setIsBuildingOpen] = useState(false);
  const [isRoomOpen, setIsRoomOpen] = useState(false);

  const [editingBuilding, setEditingBuilding] = useState<any>(null);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [deletingRoom, setDeletingRoom] = useState<any>(null);

  const onAddBuilding = async (value: any) => {
    if (value.gpsLat === 0 && value.gpsLng === 0) {
      toast.error("Please draw a geofence circle on the map");
      return;
    }
    await createBuilding.mutateAsync(value);
    setIsBuildingOpen(false);
  };

  const onEditBuilding = async (value: any) => {
    await updateBuilding.mutateAsync({ id: editingBuilding.id, body: value });
    setEditingBuilding(null);
  };

  const onAddRoom = async (value: any) => {
    await createRoomMutation.mutateAsync(value);
    setIsRoomOpen(false);
  };

  const onEditRoom = async (value: any) => {
    await updateRoom.mutateAsync({ id: editingRoom.id, body: value });
    setEditingRoom(null);
  };

  const onDeleteRoom = async () => {
    if (!deletingRoom) return;
    await deleteRoom.mutateAsync(deletingRoom.id);
    setDeletingRoom(null);
  };

  return (
    <div className="flex-1 space-y-4 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl sm:text-3xl font-bold tracking-tight">Campus Management</h2>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsBuildingOpen(true)} className="flex-1 sm:flex-initial">
            <Plus className="mr-1.5 h-4 w-4" /> Add Building
          </Button>
          <Button variant="outline" onClick={() => setIsRoomOpen(true)} className="flex-1 sm:flex-initial">
            <Plus className="mr-1.5 h-4 w-4" /> Add Room
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <CampusOverviewMap
          buildings={buildings}
          isLoading={isLoadingBuildings}
          onEditBuilding={(building) => setEditingBuilding(building)}
        />
        <RoomTable
          rooms={rooms}
          isLoading={isLoadingRooms}
          onEditRoom={(room) => setEditingRoom(room)}
          onDeleteRoom={(room) => setDeletingRoom(room)}
        />
      </div>

      <BuildingDialog
        open={isBuildingOpen}
        onOpenChange={setIsBuildingOpen}
        onSubmit={onAddBuilding}
      />

      <BuildingDialog
        open={!!editingBuilding}
        onOpenChange={(open) => !open && setEditingBuilding(null)}
        building={editingBuilding}
        onSubmit={onEditBuilding}
      />

      <RoomDialog
        open={isRoomOpen}
        onOpenChange={setIsRoomOpen}
        buildings={buildings}
        onSubmit={onAddRoom}
      />

      <RoomDialog
        open={!!editingRoom}
        onOpenChange={(open) => !open && setEditingRoom(null)}
        room={editingRoom}
        buildings={buildings}
        onSubmit={onEditRoom}
      />

      <AlertDialog open={!!deletingRoom} onOpenChange={(open) => !open && setDeletingRoom(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the room{" "}
              <span className="font-semibold">{deletingRoom?.name}</span>. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDeleteRoom}
              disabled={deleteRoom.isPending}
            >
              {deleteRoom.isPending && <Spinner className="mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
