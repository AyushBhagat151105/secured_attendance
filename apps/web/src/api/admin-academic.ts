import { apiClient } from "@/lib/api-client";

const api = apiClient.api;

export const adminAcademicApi = {
  // Academic Years
  getYears: async () => {
    const { data, error } = await api.admin.academic.years.get();
    if (error) throw new Error((error.value as any)?.message || "Failed to fetch academic years");
    return data;
  },
  createYear: async (body: Parameters<typeof api.admin.academic.years.post>[0]) => {
    const { data, error } = await api.admin.academic.years.post(body);
    if (error) throw new Error((error.value as any)?.message || "Failed to create academic year");
    return data;
  },
  updateYear: async (id: string, body: any) => {
    const { data, error } = await api.admin.academic.years({ id }).patch(body);
    if (error) throw new Error((error.value as any)?.message || "Failed to update academic year");
    return data;
  },

  // Programs
  getPrograms: async () => {
    const { data, error } = await api.admin.academic.programs.get();
    if (error) throw new Error((error.value as any)?.message || "Failed to fetch programs");
    return data;
  },
  createProgram: async (body: Parameters<typeof api.admin.academic.programs.post>[0]) => {
    const { data, error } = await api.admin.academic.programs.post(body);
    if (error) throw new Error((error.value as any)?.message || "Failed to create program");
    return data;
  },
  updateProgram: async (id: string, body: any) => {
    const { data, error } = await api.admin.academic.programs({ id }).patch(body);
    if (error) throw new Error((error.value as any)?.message || "Failed to update program");
    return data;
  },
  deleteProgram: async (id: string) => {
    const { data, error } = await api.admin.academic.programs({ id }).delete();
    if (error) throw new Error((error.value as any)?.message || "Failed to delete program");
    return data;
  },

  // Semesters
  getSemesters: async () => {
    const { data, error } = await api.admin.academic.semesters.get();
    if (error) throw new Error((error.value as any)?.message || "Failed to fetch semesters");
    return data;
  },
  createSemester: async (body: Parameters<typeof api.admin.academic.semesters.post>[0]) => {
    const { data, error } = await api.admin.academic.semesters.post(body);
    if (error) throw new Error((error.value as any)?.message || "Failed to create semester");
    return data;
  },

  // Divisions
  getDivisions: async () => {
    const { data, error } = await api.admin.academic.divisions.get();
    if (error) throw new Error((error.value as any)?.message || "Failed to fetch divisions");
    return data;
  },
  createDivision: async (body: Parameters<typeof api.admin.academic.divisions.post>[0]) => {
    const { data, error } = await api.admin.academic.divisions.post(body);
    if (error) throw new Error((error.value as any)?.message || "Failed to create division");
    return data;
  },

  // Subjects
  getSubjects: async () => {
    const { data, error } = await api.admin.academic.subjects.get();
    if (error) throw new Error((error.value as any)?.message || "Failed to fetch subjects");
    return data;
  },
  createSubject: async (body: Parameters<typeof api.admin.academic.subjects.post>[0]) => {
    const { data, error } = await api.admin.academic.subjects.post(body);
    if (error) throw new Error((error.value as any)?.message || "Failed to create subject");
    return data;
  },
  updateSubject: async (id: string, body: any) => {
    const { data, error } = await api.admin.academic.subjects({ id }).patch(body);
    if (error) throw new Error((error.value as any)?.message || "Failed to update subject");
    return data;
  },
  deleteSubject: async (id: string) => {
    const { data, error } = await api.admin.academic.subjects({ id }).delete();
    if (error) throw new Error((error.value as any)?.message || "Failed to delete subject");
    return data;
  },
};
