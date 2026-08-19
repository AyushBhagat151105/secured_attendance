import { apiClient } from "@/lib/api-client";

const api = apiClient.api;

export const teacherApi = {
  getTodaySchedule: async () => {
    const { data, error } = await api.teacher.schedule.today.get();
    if (error) throw new Error(error.value?.message || "Failed to fetch schedule");
    return data;
  },
  
  startSession: async (timetableEntryId: string) => {
    const { data, error } = await api.teacher.sessions.post({ timetableEntryId });
    if (error) throw new Error(error.value?.message || "Failed to start session");
    return data;
  },

  closeSession: async (sessionId: string) => {
    const { data, error } = await api.teacher.sessions({ id: sessionId }).close.post({});
    if (error) throw new Error(error.value?.message || "Failed to close session");
    return data;
  },
  
  subscribeToSession: (sessionId: string) => {
    return api.teacher.ws.sessions({ id: sessionId }).subscribe();
  }
};
