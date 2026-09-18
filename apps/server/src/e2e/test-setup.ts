// Set safe test environment variables before module imports
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/secured_attendance_test";
process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || "institutional-super-secret-test-key-32-chars-long";
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

import prisma from "@secured_attendance/db";
import { auth } from "@secured_attendance/auth";
import { defaultQrTokenManager, InMemoryQrStorageAdapter } from "../domain/qr-token-manager";
import { attendanceRedis } from "../lib/redis";
import { app } from "../index";

// ─── Guard: Zero-Production-Risk Safety Check ─────────────────────────────────
export function verifyTestSafety(): void {
  const dbUrl = process.env.DATABASE_URL || "";
  const isLocal =
    !dbUrl ||
    dbUrl.includes("localhost") ||
    dbUrl.includes("127.0.0.1") ||
    dbUrl.includes("0.0.0.0") ||
    dbUrl.includes("host.docker.internal") ||
    dbUrl.includes("test");

  if (!isLocal) {
    throw new Error(
      "FATAL SAFETY ABORT: E2E tests attempted to run against a remote/production database! Tests must be strictly isolated.",
    );
  }
}

verifyTestSafety();

// ─── In-Memory Test State ─────────────────────────────────────────────────────

export interface MockDataStore {
  users: Map<string, any>;
  studentProfiles: Map<string, any>;
  teacherProfiles: Map<string, any>;
  divisions: Map<string, any>;
  buildings: Map<string, any>;
  rooms: Map<string, any>;
  subjects: Map<string, any>;
  timetableEntries: Map<string, any>;
  attendanceSessions: Map<string, any>;
  attendances: Map<string, any>;
  qrTokens: Map<string, any>;
  auditLogs: any[];
  anomalies: any[];
}

export const inMemoryStore: MockDataStore = {
  users: new Map(),
  studentProfiles: new Map(),
  teacherProfiles: new Map(),
  divisions: new Map(),
  buildings: new Map(),
  rooms: new Map(),
  subjects: new Map(),
  timetableEntries: new Map(),
  attendanceSessions: new Map(),
  attendances: new Map(),
  qrTokens: new Map(),
  auditLogs: [],
  anomalies: [],
};

const inMemoryQrStorage = new InMemoryQrStorageAdapter();

// ─── Standard CHARUSAT Fixtures ───────────────────────────────────────────────

export const FIXTURES = {
  building: {
    id: "bldg-cmpica",
    code: "CMPICA",
    name: "CMPICA Building",
    gpsLat: 22.5995,
    gpsLng: 72.8205,
    radiusMeters: 60,
  },
  room: {
    id: "room-lab-301",
    name: "Lab 301",
    buildingId: "bldg-cmpica",
    type: "lab",
    floor: 3,
    capacity: 60,
  },
  subject: {
    id: "subj-msit101",
    code: "MSIT101",
    name: "Advanced Web Architecture",
    shortName: "AWA",
    programId: "prog-msit",
  },
  divisionA: {
    id: "div-msit-a",
    name: "Div-A",
    programSemesterId: "sem-1",
  },
  divisionB: {
    id: "div-msit-b",
    name: "Div-B",
    programSemesterId: "sem-1",
  },
  adminUser: {
    id: "user-admin-1",
    email: "admin@charusat.edu.in",
    name: "Club System Admin",
    role: "super_admin",
    banned: false,
  },
  teacherUser: {
    id: "user-teacher-hmp",
    email: "hmp@charusat.ac.in",
    name: "Prof. Hitesh Patel",
    role: "teacher",
    banned: false,
  },
  teacherProfile: {
    id: "prof-teacher-hmp",
    userId: "user-teacher-hmp",
    code: "HMP",
    department: "Computer Science",
  },
  studentValid: {
    user: {
      id: "user-student-001",
      email: "26msit001@charusat.edu.in",
      name: "Ayush Bhagat",
      role: "student",
      banned: false,
    },
    profile: {
      id: "prof-student-001",
      userId: "user-student-001",
      enrollmentNo: "26msit001",
      programCode: "msit",
      admissionYear: 2026,
      rollNumber: "001",
      divisionId: "div-msit-a",
      deviceBound: true,
      deviceId: "device-hw-fingerprint-001",
      deviceModel: "Google Pixel 8",
      status: "active",
      streak: 5,
    },
  },
  studentUnbound: {
    user: {
      id: "user-student-002",
      email: "26msit002@charusat.edu.in",
      name: "Bhavya Shah",
      role: "student",
      banned: false,
    },
    profile: {
      id: "prof-student-002",
      userId: "user-student-002",
      enrollmentNo: "26msit002",
      programCode: "msit",
      admissionYear: 2026,
      rollNumber: "002",
      divisionId: "div-msit-a",
      deviceBound: false,
      deviceId: null,
      deviceModel: null,
      status: "active",
      streak: 0,
    },
  },
  studentDivB: {
    user: {
      id: "user-student-003",
      email: "26msit003@charusat.edu.in",
      name: "Chirag Patel",
      role: "student",
      banned: false,
    },
    profile: {
      id: "prof-student-003",
      userId: "user-student-003",
      enrollmentNo: "26msit003",
      programCode: "msit",
      admissionYear: 2026,
      rollNumber: "003",
      divisionId: "div-msit-b",
      deviceBound: true,
      deviceId: "device-hw-fingerprint-003",
      deviceModel: null,
      status: "active",
      streak: 1,
    },
  },
  studentSuspended: {
    user: {
      id: "user-student-004",
      email: "26msit004@charusat.edu.in",
      name: "Devanshi Joshi",
      role: "student",
      banned: true,
    },
    profile: {
      id: "prof-student-004",
      userId: "user-student-004",
      enrollmentNo: "26msit004",
      programCode: "msit",
      admissionYear: 2026,
      rollNumber: "004",
      divisionId: "div-msit-a",
      deviceBound: true,
      deviceId: "device-hw-fingerprint-004",
      deviceModel: null,
      status: "suspended",
      streak: 0,
    },
  },
  timetableEntry: {
    id: "tt-msit-101",
    academicYearId: "ay-2026",
    programSemesterId: "sem-1",
    subjectId: "subj-msit101",
    roomId: "room-lab-301",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "11:00",
    type: "lecture",
    teacherCodes: ["HMP"],
    divisions: [{ divisionId: "div-msit-a" }],
  },
};

// ─── Reset / Seed In-Memory Store ─────────────────────────────────────────────

export function resetInMemoryDb(): void {
  inMemoryStore.users.clear();
  inMemoryStore.studentProfiles.clear();
  inMemoryStore.teacherProfiles.clear();
  inMemoryStore.divisions.clear();
  inMemoryStore.buildings.clear();
  inMemoryStore.rooms.clear();
  inMemoryStore.subjects.clear();
  inMemoryStore.timetableEntries.clear();
  inMemoryStore.attendanceSessions.clear();
  inMemoryStore.attendances.clear();
  inMemoryStore.qrTokens.clear();
  inMemoryStore.auditLogs = [];
  inMemoryStore.anomalies = [];
  inMemoryQrStorage.clear();

  // Seed Static Fixtures
  inMemoryStore.buildings.set(FIXTURES.building.id, { ...FIXTURES.building });
  inMemoryStore.rooms.set(FIXTURES.room.id, {
    ...FIXTURES.room,
    building: FIXTURES.building,
  });
  inMemoryStore.subjects.set(FIXTURES.subject.id, { ...FIXTURES.subject });
  inMemoryStore.divisions.set(FIXTURES.divisionA.id, {
    ...FIXTURES.divisionA,
    students: [],
  });
  inMemoryStore.divisions.set(FIXTURES.divisionB.id, {
    ...FIXTURES.divisionB,
    students: [],
  });

  // Users & Profiles
  inMemoryStore.users.set(FIXTURES.adminUser.id, { ...FIXTURES.adminUser });
  inMemoryStore.users.set(FIXTURES.teacherUser.id, { ...FIXTURES.teacherUser });
  inMemoryStore.teacherProfiles.set(FIXTURES.teacherProfile.userId, {
    ...FIXTURES.teacherProfile,
    user: FIXTURES.teacherUser,
  });
  inMemoryStore.teacherProfiles.set(FIXTURES.teacherProfile.id, {
    ...FIXTURES.teacherProfile,
    user: FIXTURES.teacherUser,
  });

  const students = [
    FIXTURES.studentValid,
    FIXTURES.studentUnbound,
    FIXTURES.studentDivB,
    FIXTURES.studentSuspended,
  ];

  for (const s of students) {
    inMemoryStore.users.set(s.user.id, { ...s.user });
    const profileWithUser = { ...s.profile, user: s.user };
    inMemoryStore.studentProfiles.set(s.profile.userId, profileWithUser);
    inMemoryStore.studentProfiles.set(s.profile.id, profileWithUser);

    const div = inMemoryStore.divisions.get(s.profile.divisionId);
    if (div) {
      div.students.push(profileWithUser);
    }
  }

  // Timetable
  inMemoryStore.timetableEntries.set(FIXTURES.timetableEntry.id, {
    ...FIXTURES.timetableEntry,
    subject: FIXTURES.subject,
    room: { ...FIXTURES.room, building: FIXTURES.building },
    divisions: [
      {
        divisionId: FIXTURES.divisionA.id,
        division: inMemoryStore.divisions.get(FIXTURES.divisionA.id),
      },
    ],
  });
}

// ─── Attach In-Memory Interceptors to Prisma & Auth ───────────────────────────

export function setupInMemoryHarness(): void {
  // 1. Swap QR storage adapter to RAM & stub Redis
  (defaultQrTokenManager as any).storage = inMemoryQrStorage;
  attendanceRedis.incr = (async () => 1) as any;
  attendanceRedis.expire = (async () => 1) as any;
  attendanceRedis.get = (async () => null) as any;
  attendanceRedis.setex = (async () => "OK") as any;

  // 2. Mock auth.api.getSession to inspect test headers
  auth.api.getSession = (async (context: any) => {
    const headers = context?.headers;
    const testUserId =
      (typeof headers?.get === "function" ? headers.get("x-test-user-id") : headers?.["x-test-user-id"]) || "";
    const testUserRole =
      (typeof headers?.get === "function" ? headers.get("x-test-user-role") : headers?.["x-test-user-role"]) || "";

    if (!testUserId || !testUserRole) {
      return null;
    }

    const user = inMemoryStore.users.get(testUserId) || {
      id: testUserId,
      email: `${testUserId}@charusat.edu.in`,
      name: `Test ${testUserRole}`,
      role: testUserRole,
      banned: false,
    };

    return {
      user,
      session: {
        id: `mock-session-${testUserId}`,
        userId: testUserId,
        expiresAt: new Date(Date.now() + 3600000),
      },
    };
  }) as any;

  // 3. Mock Prisma User queries
  prisma.user.findFirst = (async (args: any) => {
    for (const u of inMemoryStore.users.values()) {
      if (args?.where?.email && u.email === args.where.email) return u;
      if (args?.where?.id && u.id === args.where.id) return u;
    }
    return null;
  }) as any;

  prisma.user.findUnique = (async (args: any) => {
    return inMemoryStore.users.get(args?.where?.id) || null;
  }) as any;

  prisma.user.findMany = (async (_args: any) => {
    return Array.from(inMemoryStore.users.values()).map((u) => ({
      ...u,
      createdAt: new Date(),
      studentProfile: inMemoryStore.studentProfiles.get(u.id) || null,
      teacherProfile: inMemoryStore.teacherProfiles.get(u.id) || null,
    }));
  }) as any;

  prisma.user.count = (async () => {
    return inMemoryStore.users.size;
  }) as any;

  prisma.user.delete = (async (args: any) => {
    const existing = inMemoryStore.users.get(args.where.id);
    if (!existing) throw new Error("Record not found");
    inMemoryStore.users.delete(args.where.id);
    return existing;
  }) as any;

  prisma.user.update = (async (args: any) => {
    const existing = inMemoryStore.users.get(args.where.id);
    if (!existing) throw new Error("Record not found");
    const updated = { ...existing, ...args.data };
    inMemoryStore.users.set(args.where.id, updated);
    return updated;
  }) as any;

  // 4. Mock Prisma Student Profile
  prisma.studentProfile.findFirst = (async (args: any) => {
    if (args?.where?.userId) {
      return inMemoryStore.studentProfiles.get(args.where.userId) || null;
    }
    if (args?.where?.id) {
      return inMemoryStore.studentProfiles.get(args.where.id) || null;
    }
    for (const p of inMemoryStore.studentProfiles.values()) {
      return p;
    }
    return null;
  }) as any;

  prisma.studentProfile.updateMany = (async (args: any) => {
    let count = 0;
    if (args?.where?.userId) {
      const p = inMemoryStore.studentProfiles.get(args.where.userId);
      if (p) {
        Object.assign(p, args.data);
        count++;
      }
    }
    return { count };
  }) as any;

  prisma.studentProfile.findUnique = (async (args: any) => {
    if (args?.where?.userId) {
      return inMemoryStore.studentProfiles.get(args.where.userId) || null;
    }
    if (args?.where?.id) {
      return inMemoryStore.studentProfiles.get(args.where.id) || null;
    }
    return null;
  }) as any;

  prisma.studentProfile.update = (async (args: any) => {
    const id = args.where.id || args.where.userId;
    const existing = inMemoryStore.studentProfiles.get(id);
    if (!existing) throw new Error("Record not found");
    const updated = { ...existing, ...args.data };
    inMemoryStore.studentProfiles.set(id, updated);
    inMemoryStore.studentProfiles.set(updated.id, updated);
    inMemoryStore.studentProfiles.set(updated.userId, updated);
    return updated;
  }) as any;

  // 5. Mock Prisma Teacher Profile
  prisma.teacherProfile.findUnique = (async (args: any) => {
    if (args?.where?.userId) {
      return inMemoryStore.teacherProfiles.get(args.where.userId) || null;
    }
    if (args?.where?.id) {
      return inMemoryStore.teacherProfiles.get(args.where.id) || null;
    }
    return null;
  }) as any;

  // 6. Mock Prisma Timetable Entry
  prisma.timetableEntry.findUnique = (async (args: any) => {
    return inMemoryStore.timetableEntries.get(args?.where?.id) || null;
  }) as any;

  // 7. Mock Prisma Attendance Session
  prisma.attendanceSession.findFirst = (async (args: any) => {
    for (const sess of inMemoryStore.attendanceSessions.values()) {
      if (args?.where?.teacherProfileId && sess.teacherProfileId !== args.where.teacherProfileId) continue;
      if (args?.where?.status && sess.status !== args.where.status) continue;
      return sess;
    }
    return null;
  }) as any;

  prisma.attendanceSession.findUnique = (async (args: any) => {
    return inMemoryStore.attendanceSessions.get(args?.where?.id) || null;
  }) as any;

  prisma.attendanceSession.create = (async (args: any) => {
    const id = `sess-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const newSession = {
      id,
      createdAt: new Date(Date.now() - 10_000),
      ...args.data,
      attendances: [],
      sessionDivisions: (args.data.sessionDivisions?.create || []).map((sd: any) => ({
        divisionId: sd.divisionId,
        division: inMemoryStore.divisions.get(sd.divisionId),
      })),
      room: inMemoryStore.rooms.get(args.data.roomId),
      subject: inMemoryStore.subjects.get(args.data.subjectId),
    };
    inMemoryStore.attendanceSessions.set(id, newSession);
    return newSession;
  }) as any;

  prisma.attendanceSession.update = (async (args: any) => {
    const existing = inMemoryStore.attendanceSessions.get(args.where.id);
    if (!existing) throw new Error("Session not found");
    const updated = { ...existing, ...args.data };
    inMemoryStore.attendanceSessions.set(args.where.id, updated);
    return updated;
  }) as any;

  // 8. Mock Prisma Attendance
  prisma.attendance.findFirst = (async (args: any) => {
    for (const att of inMemoryStore.attendances.values()) {
      if (args?.where?.studentProfileId && att.studentProfileId !== args.where.studentProfileId) continue;
      if (args?.where?.sessionId && att.sessionId !== args.where.sessionId) continue;
      return att;
    }
    return null;
  }) as any;

  prisma.attendance.findMany = (async (args: any) => {
    const result: any[] = [];
    for (const att of inMemoryStore.attendances.values()) {
      if (args?.where?.sessionId && att.sessionId !== args.where.sessionId) continue;
      if (args?.where?.studentProfileId && att.studentProfileId !== args.where.studentProfileId) continue;
      result.push(att);
    }
    return result;
  }) as any;

  prisma.attendance.findUnique = (async (args: any) => {
    const composite = args?.where?.studentProfileId_sessionId;
    if (composite) {
      const key = `${composite.sessionId}:${composite.studentProfileId}`;
      return inMemoryStore.attendances.get(key) || null;
    }
    return inMemoryStore.attendances.get(args?.where?.id) || null;
  }) as any;

  prisma.attendance.create = (async (args: any) => {
    const id = `att-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const rec = {
      id,
      ...args.data,
      timestamp: new Date(),
    };
    const key = `${rec.sessionId}:${rec.studentProfileId}`;
    inMemoryStore.attendances.set(key, rec);

    const session = inMemoryStore.attendanceSessions.get(rec.sessionId);
    if (session) {
      session.attendances.push(rec);
    }
    return rec;
  }) as any;

  prisma.attendance.createMany = (async (args: any) => {
    let count = 0;
    for (const item of args.data) {
      const id = `att-${Date.now()}-${count++}`;
      const rec = { id, ...item, timestamp: new Date() };
      const key = `${rec.sessionId}:${rec.studentProfileId}`;
      inMemoryStore.attendances.set(key, rec);
      const session = inMemoryStore.attendanceSessions.get(rec.sessionId);
      if (session) {
        session.attendances.push(rec);
      }
    }
    return { count };
  }) as any;

  prisma.attendance.deleteMany = (async (args: any) => {
    let count = 0;
    if (args?.where?.id?.in) {
      const idsToDelete = new Set(args.where.id.in);
      for (const [key, val] of inMemoryStore.attendances.entries()) {
        if (idsToDelete.has(val.id)) {
          inMemoryStore.attendances.delete(key);
          count++;
        }
      }
    }
    return { count };
  }) as any;

  // 9. Mock Prisma $transaction
  prisma.$transaction = (async (arg: any) => {
    if (typeof arg === "function") {
      return arg(prisma);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg;
  }) as any;

  // 10. Mock Audit & Anomalies
  (prisma as any).anomalyAlert = {
    create: async (args: any) => {
      const rec = { id: `anom-${Date.now()}`, ...args.data };
      inMemoryStore.anomalies.push(rec);
      return rec;
    },
  };
  (prisma as any).attendanceAnomaly = (prisma as any).anomalyAlert;
  (prisma as any).auditLog = {
    create: async (args: any) => {
      inMemoryStore.auditLogs.push(args.data);
      return args.data;
    },
  };
}

// ─── HTTP Test Dispatch Helper ────────────────────────────────────────────────

export interface DispatchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  asUser?: { id: string; role: string };
  headers?: Record<string, string>;
}

export async function dispatchAppRequest(path: string, options: DispatchOptions = {}) {
  const method = options.method || "GET";
  const reqHeaders = new Headers(options.headers || {});

  if (options.body && method !== "GET") {
    reqHeaders.set("content-type", "application/json");
  }

  if (options.asUser) {
    reqHeaders.set("x-test-user-id", options.asUser.id);
    reqHeaders.set("x-test-user-role", options.asUser.role);
  }

  const reqInit: RequestInit = {
    method,
    headers: reqHeaders,
  };

  if (options.body && method !== "GET") {
    reqInit.body = JSON.stringify(options.body);
  }

  const response = await app.handle(new Request(`http://localhost${path}`, reqInit));
  const contentType = response.headers.get("content-type") || "";
  let data: any = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    data,
  };
}
