import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminAcademicApi } from "@/api/admin-academic";

// ─── Academic Years ───────────────────────────────────────────────────────────
export const academicYearKeys = {
  all: ["academicYears"] as const,
  detail: (id: string) => [...academicYearKeys.all, id] as const,
};

export const useAcademicYears = () =>
  useQuery({
    queryKey: academicYearKeys.all,
    queryFn: adminAcademicApi.getYears,
  });

export const useCreateAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminAcademicApi.createYear,
    onSuccess: () => {
      toast.success("Academic year created");
      queryClient.invalidateQueries({ queryKey: academicYearKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useUpdateAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => adminAcademicApi.updateYear(id, body),
    onSuccess: (_, { id }) => {
      toast.success("Academic year updated");
      queryClient.invalidateQueries({ queryKey: academicYearKeys.all });
      queryClient.invalidateQueries({ queryKey: academicYearKeys.detail(id) });
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Programs ─────────────────────────────────────────────────────────────────
export const programKeys = {
  all: ["programs"] as const,
  detail: (id: string) => [...programKeys.all, id] as const,
};

export const usePrograms = () =>
  useQuery({
    queryKey: programKeys.all,
    queryFn: adminAcademicApi.getPrograms,
  });

export const useCreateProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminAcademicApi.createProgram,
    onSuccess: () => {
      toast.success("Program created");
      queryClient.invalidateQueries({ queryKey: programKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useUpdateProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => adminAcademicApi.updateProgram(id, body),
    onSuccess: (_, { id }) => {
      toast.success("Program updated");
      queryClient.invalidateQueries({ queryKey: programKeys.all });
      queryClient.invalidateQueries({ queryKey: programKeys.detail(id) });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useDeleteProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminAcademicApi.deleteProgram,
    onSuccess: () => {
      toast.success("Program deleted");
      queryClient.invalidateQueries({ queryKey: programKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Program Semesters ────────────────────────────────────────────────────────
export const semesterKeys = {
  all: ["semesters"] as const,
  detail: (id: string) => [...semesterKeys.all, id] as const,
};

export const useProgramSemesters = () =>
  useQuery({
    queryKey: semesterKeys.all,
    queryFn: adminAcademicApi.getSemesters,
  });

export const useCreateProgramSemester = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminAcademicApi.createSemester,
    onSuccess: () => {
      toast.success("Semester created");
      queryClient.invalidateQueries({ queryKey: semesterKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Divisions ────────────────────────────────────────────────────────────────
export const divisionKeys = {
  all: ["divisions"] as const,
  detail: (id: string) => [...divisionKeys.all, id] as const,
};

export const useDivisions = () =>
  useQuery({
    queryKey: divisionKeys.all,
    queryFn: adminAcademicApi.getDivisions,
  });

export const useCreateDivision = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminAcademicApi.createDivision,
    onSuccess: () => {
      toast.success("Division created");
      queryClient.invalidateQueries({ queryKey: divisionKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Subjects ─────────────────────────────────────────────────────────────────
export const subjectKeys = {
  all: ["subjects"] as const,
  detail: (id: string) => [...subjectKeys.all, id] as const,
};

export const useSubjects = () =>
  useQuery({
    queryKey: subjectKeys.all,
    queryFn: adminAcademicApi.getSubjects,
  });

export const useCreateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminAcademicApi.createSubject,
    onSuccess: () => {
      toast.success("Subject created");
      queryClient.invalidateQueries({ queryKey: subjectKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useUpdateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => adminAcademicApi.updateSubject(id, body),
    onSuccess: (_, { id }) => {
      toast.success("Subject updated");
      queryClient.invalidateQueries({ queryKey: subjectKeys.all });
      queryClient.invalidateQueries({ queryKey: subjectKeys.detail(id) });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useDeleteSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminAcademicApi.deleteSubject,
    onSuccess: () => {
      toast.success("Subject deleted");
      queryClient.invalidateQueries({ queryKey: subjectKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};
