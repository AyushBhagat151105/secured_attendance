import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

const api = apiClient.api;

// ─── Academic Years ───────────────────────────────────────────────────────────
export const academicYearKeys = {
  all: ["academicYears"] as const,
  detail: (id: string) => [...academicYearKeys.all, id] as const,
};

export const useAcademicYears = () =>
  useQuery({
    queryKey: academicYearKeys.all,
    queryFn: async () => {
      const { data, error } = await api.admin.academic.years.get();
      if (error) throw new Error((error.value as any)?.message || "Failed to fetch academic years");
      return data;
    },
  });

export const useCreateAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof api.admin.academic.years.post>[0]) => {
      const { data, error } = await api.admin.academic.years.post(body);
      if (error) throw new Error((error.value as any)?.message || "Failed to create academic year");
      return data;
    },
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
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      const { data, error } = await api.admin.academic.years({ id }).patch(body);
      if (error) throw new Error((error.value as any)?.message || "Failed to update academic year");
      return data;
    },
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
    queryFn: async () => {
      const { data, error } = await api.admin.academic.programs.get();
      if (error) throw new Error((error.value as any)?.message || "Failed to fetch programs");
      return data;
    },
  });

export const useCreateProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof api.admin.academic.programs.post>[0]) => {
      const { data, error } = await api.admin.academic.programs.post(body);
      if (error) throw new Error((error.value as any)?.message || "Failed to create program");
      return data;
    },
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
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      const { data, error } = await api.admin.academic.programs({ id }).patch(body);
      if (error) throw new Error((error.value as any)?.message || "Failed to update program");
      return data;
    },
    onSuccess: (_, { id }) => {
      toast.success("Program updated");
      queryClient.invalidateQueries({ queryKey: programKeys.all });
      queryClient.invalidateQueries({ queryKey: programKeys.detail(id) });
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
    queryFn: async () => {
      const { data, error } = await api.admin.academic.semesters.get();
      if (error) throw new Error((error.value as any)?.message || "Failed to fetch semesters");
      return data;
    },
  });

export const useCreateProgramSemester = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof api.admin.academic.semesters.post>[0]) => {
      const { data, error } = await api.admin.academic.semesters.post(body);
      if (error) throw new Error((error.value as any)?.message || "Failed to create semester");
      return data;
    },
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
    queryFn: async () => {
      const { data, error } = await api.admin.academic.divisions.get();
      if (error) throw new Error((error.value as any)?.message || "Failed to fetch divisions");
      return data;
    },
  });

export const useCreateDivision = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof api.admin.academic.divisions.post>[0]) => {
      const { data, error } = await api.admin.academic.divisions.post(body);
      if (error) throw new Error(error.value?.message || "Failed to create division");
      return data;
    },
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
    queryFn: async () => {
      const { data, error } = await api.admin.academic.subjects.get();
      if (error) throw new Error((error.value as any)?.message || "Failed to fetch subjects");
      return data;
    },
  });

export const useCreateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof api.admin.academic.subjects.post>[0]) => {
      const { data, error } = await api.admin.academic.subjects.post(body);
      if (error) throw new Error((error.value as any)?.message || "Failed to create subject");
      return data;
    },
    onSuccess: () => {
      toast.success("Subject created");
      queryClient.invalidateQueries({ queryKey: subjectKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};
