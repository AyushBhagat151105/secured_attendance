import { createFileRoute } from "@tanstack/react-router";
import { useSubjects } from "@/hooks/use-admin-academic";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useCreateSubject, useUpdateSubject, useDeleteSubject, usePrograms } from "@/hooks/use-admin-academic";
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

export const Route = createFileRoute("/admin/academic/subjects")({
  component: SubjectsRoute,
});

function SubjectRowActions({ subject }: { subject: any }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const { data: programs } = usePrograms();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();

  const onEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      shortName: formData.get("shortName") as string || undefined,
      programId: formData.get("programId") as string,
    };
    await updateSubject.mutateAsync({ id: subject.id, body });
    setShowEdit(false);
  };

  const onDeleteConfirm = async () => {
    await deleteSubject.mutateAsync(subject.id);
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
              <DialogTitle>Edit Subject</DialogTitle>
              <DialogDescription>Update the details of {subject.name}.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor={`name-${subject.id}`}>Subject Name</Label>
                <Input id={`name-${subject.id}`} name="name" required defaultValue={subject.name} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`code-${subject.id}`}>Code</Label>
                <Input id={`code-${subject.id}`} name="code" required defaultValue={subject.code} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`shortName-${subject.id}`}>Short Name</Label>
                <Input id={`shortName-${subject.id}`} name="shortName" defaultValue={subject.shortName || ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`programId-${subject.id}`}>Program</Label>
                <Select name="programId" required defaultValue={subject.programId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateSubject.isPending}>
                {updateSubject.isPending ? "Saving..." : "Save Changes"}
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
              This will permanently delete the <strong>{subject.name}</strong> subject.
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
              disabled={deleteSubject.isPending}
            >
              {deleteSubject.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SubjectsRoute() {
  const { data: subjects, isLoading: isLoadingSubjects } = useSubjects();
  const { data: programs } = usePrograms();
  const createSubject = useCreateSubject();
  const [isOpen, setIsOpen] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      shortName: formData.get("shortName") as string || undefined,
      programId: formData.get("programId") as string,
    };
    await createSubject.mutateAsync(body);
    setIsOpen(false);
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Subjects</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={onSubmit}>
                <DialogHeader>
                  <DialogTitle>Add New Subject</DialogTitle>
                  <DialogDescription>Create a subject and map it to a program.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Subject Name</Label>
                    <Input id="name" name="name" required placeholder="Data Structures" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="code">Code</Label>
                    <Input id="code" name="code" required placeholder="CS201" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="shortName">Short Name (Optional)</Label>
                    <Input id="shortName" name="shortName" placeholder="DS" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="programId">Program</Label>
                    <Select name="programId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createSubject.isPending}>
                    {createSubject.isPending ? "Saving..." : "Save Subject"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Subjects List</CardTitle>
          <CardDescription>Manage subjects across programs.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSubjects ? (
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
                  <TableHead>Program</TableHead>
                  <TableHead className="w-12.5"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects?.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.code}</TableCell>
                    <TableCell>{subject.name}</TableCell>
                    <TableCell>{subject.shortName || "-"}</TableCell>
                    <TableCell>{subject.program?.code || "-"}</TableCell>
                    <TableCell>
                      <SubjectRowActions subject={subject} />
                    </TableCell>
                  </TableRow>
                ))}
                {(!subjects || subjects.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No subjects found.
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
