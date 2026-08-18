import { createFileRoute } from "@tanstack/react-router";
import { useSubjects } from "@/features/admin/academic/queries/academic.queries";
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
import { useCreateSubject, usePrograms } from "@/features/admin/academic/queries/academic.queries";

export const Route = createFileRoute("/admin/academic/subjects")({
  component: SubjectsRoute,
});

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects?.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.code}</TableCell>
                    <TableCell>{subject.name}</TableCell>
                    <TableCell>{subject.shortName || "-"}</TableCell>
                    <TableCell>{subject.program?.code || "-"}</TableCell>
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
