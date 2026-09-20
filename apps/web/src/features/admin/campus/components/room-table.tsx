import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconDots, IconPencil, IconTrash, IconDoor } from "@tabler/icons-react";
import { TableSkeletonRows } from "@/components/admin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RoomTableProps {
  rooms: any[] | undefined;
  isLoading: boolean;
  onEditRoom: (room: any) => void;
  onDeleteRoom: (room: any) => void;
}

export function RoomTable({
  rooms,
  isLoading,
  onEditRoom,
  onDeleteRoom,
}: RoomTableProps) {
  return (
    <Card className="col-span-full lg:col-span-3 rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden">
      <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <IconDoor className="size-4 text-primary" /> Rooms Directory
            </CardTitle>
            <CardDescription className="text-xs">
              Configured lecture halls and classrooms.
            </CardDescription>
          </div>
          {rooms && (
            <Badge variant="secondary" className="font-mono text-xs">
              {rooms.length} Rooms
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Room</TableHead>
                <TableHead className="text-xs font-semibold">Building</TableHead>
                <TableHead className="text-xs font-semibold">Type</TableHead>
                <TableHead className="w-12 text-right text-xs font-semibold"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows rows={6} columns={4} hasAvatar={false} hasActions={true} />
              ) : (
                <>
                  {rooms?.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium text-sm text-foreground">
                        {room.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {room.building?.code || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="capitalize text-xs font-normal"
                        >
                          {room.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <IconDots className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onEditRoom(room)}>
                              <IconPencil className="mr-2 size-4" /> Edit Room
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onDeleteRoom(room)}
                            >
                              <IconTrash className="mr-2 size-4" /> Delete Room
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!rooms || rooms.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-28 text-center text-muted-foreground text-sm">
                        No rooms configured in this campus.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
