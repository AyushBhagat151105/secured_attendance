import { createFileRoute } from "@tanstack/react-router";
import { usePrograms } from "@/hooks/use-admin-academic";
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
import { Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useCreateProgram, useUpdateProgram, useDeleteProgram } from "@/hooks/use-admin-academic";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export const Route = createFileRoute("/admin/academic/programs")({
  component: ProgramsRoute,
});

function ProgramRowActions({ program }: { program: any }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const updateProgram = useUpdateProgram();
  const deleteProgram = useDeleteProgram();

  const onEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      shortName: formData.get("shortName") as string || undefined,
    };
    await updateProgram.mutateAsync({ id: program.id, body });
    setShowEdit(false);
  };

  const onDeleteConfirm = async () => {
    await deleteProgram.mutateAsync(program.id);
    setShowDelete(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowEdit(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowDelete(true)} className="text-destructive focus:text-destructive">
            <Trash className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <form onSubmit={onEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Program</DialogTitle>
              <DialogDescription>Update the details of {program.name}.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor={`name-${program.id}`}>Program Name</Label>
                <Input id={`name-${program.id}`} name="name" required defaultValue={program.name} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`code-${program.id}`}>Code</Label>
                <Input id={`code-${program.id}`} name="code" required defaultValue={program.code} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`shortName-${program.id}`}>Short Name</Label>
                <Input id={`shortName-${program.id}`} name="shortName" defaultValue={program.shortName || ""} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateProgram.isPending}>
                {updateProgram.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the <strong>{program.name}</strong> program.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onDeleteConfirm();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteProgram.isPending}
            >
              {deleteProgram.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ProgramsRoute() {
  const { data: programs, isLoading } = usePrograms();
  const createProgram = useCreateProgram();
  const [isOpen, setIsOpen] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      shortName: formData.get("shortName") as string || "",
    };
    await createProgram.mutateAsync(body);
    setIsOpen(false);
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Academic Programs</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Program
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={onSubmit}>
                <DialogHeader>
                  <DialogTitle>Add New Program</DialogTitle>
                  <DialogDescription>Create an academic program (e.g. B.Tech, M.Tech).</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Program Name</Label>
                    <Input id="name" name="name" required placeholder="Bachelor of Technology" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="code">Code</Label>
                    <Input id="code" name="code" required placeholder="B.Tech" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="shortName">Short Name (Optional)</Label>
                    <Input id="shortName" name="shortName" placeholder="BT" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createProgram.isPending}>
                    {createProgram.isPending ? "Saving..." : "Save Program"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Programs List</CardTitle>
          <CardDescription>Manage degrees and programs.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Short Name</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="w-12.5"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs?.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell className="font-medium">{program.code}</TableCell>
                    <TableCell>{program.name}</TableCell>
                    <TableCell>{program.shortName}</TableCell>
                    <TableCell>{new Date(program.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <ProgramRowActions program={program} />
                    </TableCell>
                  </TableRow>
                ))}
                {(!programs || programs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No programs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
