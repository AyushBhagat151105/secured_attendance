import { z } from "zod";

export const createTimetableEntrySchema = z.object({
  programSemesterId: z.string().min(1, "Program Semester is required"),
  academicYearId: z.string().min(1, "Academic Year is required"),
  divisionId: z.string().min(1, "Division is required"),
  subjectId: z.string().min(1, "Subject is required"),
  roomId: z.string().min(1, "Room is required"),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  type: z.string().optional(),
  teacherCodes: z.string().optional(), // We'll process this to array in the component, or z.string().transform(v => v.split(',').map(s=>s.trim()).filter(Boolean))
});
export type CreateTimetableEntrySchema = z.infer<typeof createTimetableEntrySchema>;

export const updateTimetableEntrySchema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
  roomId: z.string().min(1, "Room is required"),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  type: z.string().optional(),
  teacherCodes: z.string().optional(),
});
export type UpdateTimetableEntrySchema = z.infer<typeof updateTimetableEntrySchema>;

export const createBuildingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  gpsLat: z.number(),
  gpsLng: z.number(),
  radiusMeters: z.number().min(1, "Radius must be positive"),
});
export type CreateBuildingSchema = z.infer<typeof createBuildingSchema>;

export const updateBuildingSchema = createBuildingSchema;
export type UpdateBuildingSchema = z.infer<typeof updateBuildingSchema>;

export const createRoomSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  type: z.string().min(1, "Type is required"),
  buildingId: z.string().min(1, "Building is required"),
});
export type CreateRoomSchema = z.infer<typeof createRoomSchema>;

export const updateRoomSchema = createRoomSchema;
export type UpdateRoomSchema = z.infer<typeof updateRoomSchema>;

export const createSubjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().min(1, "Code is required"),
  shortName: z.string().optional(),
  programId: z.string().min(1, "Program is required"),
});

export const updateSubjectSchema = createSubjectSchema;
export type CreateSubjectSchema = z.infer<typeof createSubjectSchema>;

export const createProgramSchema = z.object({
  name: z.string().min(1, "Program name is required"),
  code: z.string().min(1, "Code is required"),
  shortName: z.string().optional(),
});

export const updateProgramSchema = createProgramSchema;
export type CreateProgramSchema = z.infer<typeof createProgramSchema>;

export const createUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    role: z.enum(["student", "teacher", "admin"]),

    // Student fields
    enrollmentNo: z.string().optional(),
    programCode: z.string().optional(),
    semester: z.string().optional(),
    divisionId: z.string().optional(),

    // Teacher fields
    teacherCode: z.string().optional(),
    department: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "student") {
      if (!data.enrollmentNo)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for student",
          path: ["enrollmentNo"],
        });
      if (!data.programCode)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for student",
          path: ["programCode"],
        });
      if (!data.semester)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for student",
          path: ["semester"],
        });
      if (!data.divisionId)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for student",
          path: ["divisionId"],
        });
    }
    if (data.role === "teacher") {
      if (!data.teacherCode)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for teacher",
          path: ["teacherCode"],
        });
      if (!data.department)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for teacher",
          path: ["department"],
        });
    }
  });
export type CreateUserSchema = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["student", "teacher", "admin", "super_admin"]),
  status: z.enum(["active", "suspended", "pending"]),
});
export type EditUserSchema = z.infer<typeof editUserSchema>;
