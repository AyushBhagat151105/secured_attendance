/**
 * ==============================================================================
 * UNIFIED SEED CONTROLLER — CHARUSAT SECURED ATTENDANCE
 * ==============================================================================
 * This file serves as the single source of truth for database seeding.
 *
 * It supports two modes:
 *
 * 1. Development University Seed (`bun run seed:dev` or `bun run db:seed --dev`):
 *    - Populates complete CHARUSAT campus structures (CMPICA Building, Lab 301,
 *      MSIT Div-A/B, timetable slots, 5 sample students, teacher, dev admin).
 *    - TRI-LAYER PRODUCTION GUARDS: Physically aborts if executed in production,
 *      without explicit ALLOW_DEV_SEED=true, or against remote databases.
 *
 * 2. Production Bootstrap Seed (`bun run db:seed`):
 *    - Bootstraps ONLY the initial Super Admin user from environment variables
 *      (SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_NAME).
 *    - Zero dummy data, zero fake buildings, zero test students.
 * ==============================================================================
 */

import "dotenv/config";
import db from "@secured_attendance/db";
import { auth } from "@secured_attendance/auth";
import { env } from "@secured_attendance/env/server";

// ==============================================================================
// 1. TRI-LAYER PRODUCTION PROTECTION GUARDS
// ==============================================================================

export function verifyDevSeedSafety(): void {
  // Guard 1: Never allow running in production
  if (process.env.NODE_ENV === "production" || env.NODE_ENV === "production") {
    throw new Error(
      "FATAL SAFETY ABORT: Attempted to run development seed script in a PRODUCTION environment! Aborting immediately.",
    );
  }

  // Guard 2: Require explicit confirmation variable
  if (process.env.ALLOW_DEV_SEED !== "true") {
    throw new Error(
      "SAFETY ABORT: Development seeding requires explicit opt-in. Please run with ALLOW_DEV_SEED=true or 'bun run seed:dev'.",
    );
  }

  // Guard 3: Ensure database URL is strictly local (localhost / 127.0.0.1)
  const dbUrl = process.env.DATABASE_URL || "";
  const isLocal =
    dbUrl.includes("localhost") ||
    dbUrl.includes("127.0.0.1") ||
    dbUrl.includes("0.0.0.0") ||
    dbUrl.includes("host.docker.internal");

  if (!isLocal) {
    throw new Error(
      "FATAL SAFETY ABORT: DATABASE_URL does not point to localhost or 127.0.0.1! Cannot run dev seed against remote or cloud databases.",
    );
  }
}

// ==============================================================================
// 2. PRODUCTION BOOTSTRAP SEED (SUPER ADMIN ONLY)
// ==============================================================================

export async function seedSuperAdmin() {
  const email = env.SUPER_ADMIN_EMAIL;
  const password = env.SUPER_ADMIN_PASSWORD;
  const name = env.SUPER_ADMIN_NAME;

  if (!email || !password) {
    console.warn(
      "SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set in environment. Skipping super admin bootstrap.",
    );
    return;
  }

  // Check if super admin already exists
  const existingAdmin = await db.user.findFirst({
    where: { email, role: "super_admin" },
  });

  if (existingAdmin) {
    console.log(`Super admin account (${email}) already exists.`);
    return;
  }

  try {
    const newUser = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    if (newUser?.user) {
      await db.user.update({
        where: { id: newUser.user.id },
        data: { role: "super_admin", requiresPasswordChange: false } as any,
      });
      console.log(`Successfully created Super Admin account for ${name} (${email})`);
    }
  } catch (error) {
    console.error("Failed to seed Super Admin via Better Auth:", error);
  }
}

// ==============================================================================
// 3. DEVELOPMENT CAMPUS SEED (CHARUSAT SAMPLE DATA)
// ==============================================================================

export async function seedDevUniversityData() {
  verifyDevSeedSafety();

  console.log("Starting safe development university data seed for CHARUSAT...");

  // 1. Academic Year
  const academicYear = await db.academicYear.upsert({
    where: { name: "2026-2027" },
    update: {},
    create: {
      name: "2026-2027",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2027-06-30"),
      isCurrent: true,
    },
  });

  // 2. Program (MSIT)
  const program = await db.program.upsert({
    where: { code: "MSIT" },
    update: {},
    create: {
      name: "Master of Science in Information Technology",
      code: "MSIT",
      shortName: "MSIT",
    },
  });

  // 3. Program Semester 1
  const programSemester = await db.programSemester.upsert({
    where: {
      programId_academicYearId_semester: {
        programId: program.id,
        academicYearId: academicYear.id,
        semester: 1,
      },
    },
    update: {},
    create: {
      programId: program.id,
      academicYearId: academicYear.id,
      semester: 1,
      orgSlug: "msit-sem-1-2026",
    },
  });

  // 4. Divisions
  const divA = await db.division.upsert({
    where: {
      programSemesterId_name: {
        programSemesterId: programSemester.id,
        name: "Div-A",
      },
    },
    update: {},
    create: {
      name: "Div-A",
      programSemesterId: programSemester.id,
    },
  });

  const divB = await db.division.upsert({
    where: {
      programSemesterId_name: {
        programSemesterId: programSemester.id,
        name: "Div-B",
      },
    },
    update: {},
    create: {
      name: "Div-B",
      programSemesterId: programSemester.id,
    },
  });

  // 5. Campus Building with CHARUSAT GPS Geofence
  const building = await db.building.upsert({
    where: { code: "CMPICA" },
    update: {
      gpsLat: 22.5995,
      gpsLng: 72.8205,
      radiusMeters: 60,
    },
    create: {
      name: "CMPICA Building",
      code: "CMPICA",
      gpsLat: 22.5995,
      gpsLng: 72.8205,
      radiusMeters: 60,
    },
  });

  // 6. Classroom / Lab
  const room = await db.room.upsert({
    where: {
      buildingId_name: {
        buildingId: building.id,
        name: "Lab 301",
      },
    },
    update: {},
    create: {
      name: "Lab 301",
      type: "lab",
      buildingId: building.id,
      floor: 3,
      capacity: 60,
    },
  });

  // 7. Subject
  const subject = await db.subject.upsert({
    where: { code: "MSIT101" },
    update: {},
    create: {
      code: "MSIT101",
      name: "Advanced Web Architecture",
      shortName: "AWA",
      programId: program.id,
    },
  });

  // 8. Super Admin
  const adminEmail = "admin@charusat.edu.in";
  let adminUser = await db.user.findFirst({ where: { email: adminEmail } });
  if (!adminUser) {
    const signup = await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: "Admin@1234",
        name: "Club System Admin",
      },
    });
    if (signup?.user) {
      adminUser = await db.user.update({
        where: { id: signup.user.id },
        data: { role: "super_admin", requiresPasswordChange: false },
      });
    }
  }

  // 9. Teacher
  const teacherEmail = "hmp@charusat.ac.in";
  let teacherUser = await db.user.findFirst({ where: { email: teacherEmail } });
  if (!teacherUser) {
    const signup = await auth.api.signUpEmail({
      body: {
        email: teacherEmail,
        password: "Teacher@1234",
        name: "Prof. Hitesh Patel",
      },
    });
    if (signup?.user) {
      teacherUser = await db.user.update({
        where: { id: signup.user.id },
        data: { role: "teacher", requiresPasswordChange: false },
      });
      await db.teacherProfile.upsert({
        where: { userId: teacherUser.id },
        update: {},
        create: {
          userId: teacherUser.id,
          code: "HMP",
          department: "Computer Science",
        },
      });
    }
  }

  // 10. Sample Students
  const sampleStudents = [
    {
      enrollment: "26msit001",
      name: "Ayush Bhagat",
      email: "26msit001@charusat.edu.in",
      divId: divA.id,
      deviceBound: false,
      deviceId: null,
      deviceModel: null,
      status: "active",
    },
    {
      enrollment: "26msit002",
      name: "Bhavya Shah",
      email: "26msit002@charusat.edu.in",
      divId: divA.id,
      deviceBound: true,
      deviceId: "sample-device-hw-fingerprint-002",
      deviceModel: "Samsung Galaxy S24",
      status: "active",
    },
    {
      enrollment: "26msit003",
      name: "Chirag Patel",
      email: "26msit003@charusat.edu.in",
      divId: divA.id,
      deviceBound: false,
      deviceId: null,
      deviceModel: null,
      status: "active",
    },
    {
      enrollment: "26msit004",
      name: "Devanshi Joshi",
      email: "26msit004@charusat.edu.in",
      divId: divB.id, // In Division B
      deviceBound: false,
      deviceId: null,
      deviceModel: null,
      status: "active",
    },
    {
      enrollment: "26msit005",
      name: "Ekta Sharma",
      email: "26msit005@charusat.edu.in",
      divId: divA.id,
      deviceBound: true,
      deviceId: "sample-device-hw-fingerprint-005",
      deviceModel: "Apple iPhone 15",
      status: "suspended", // Suspended
    },
  ];

  for (const s of sampleStudents) {
    let studentUser = await db.user.findFirst({ where: { email: s.email } });
    if (!studentUser) {
      const signup = await auth.api.signUpEmail({
        body: {
          email: s.email,
          password: "Student@1234",
          name: s.name,
        },
      });
      if (signup?.user) {
        studentUser = await db.user.update({
          where: { id: signup.user.id },
          data: {
            role: "student",
            requiresPasswordChange: false,
            banned: s.status === "suspended",
          },
        });
      }
    }

    if (studentUser) {
      await db.studentProfile.upsert({
        where: { userId: studentUser.id },
        update: {
          status: s.status,
          deviceBound: s.deviceBound,
          deviceId: s.deviceId,
          deviceModel: s.deviceModel ?? null,
          divisionId: s.divId,
        },
        create: {
          userId: studentUser.id,
          enrollmentNo: s.enrollment,
          programCode: "msit",
          admissionYear: 2026,
          rollNumber: s.enrollment.slice(-3),
          divisionId: s.divId,
          deviceBound: s.deviceBound,
          deviceId: s.deviceId,
          deviceModel: s.deviceModel,
          status: s.status,
        },
      });
    }
  }

  // 11. Timetable Entry (Mon-Fri)
  for (let day = 1; day <= 5; day++) {
    const existingEntry = await db.timetableEntry.findFirst({
      where: {
        programSemesterId: programSemester.id,
        subjectId: subject.id,
        dayOfWeek: day,
      },
    });

    if (!existingEntry) {
      const entry = await db.timetableEntry.create({
        data: {
          programSemesterId: programSemester.id,
          academicYearId: academicYear.id,
          subjectId: subject.id,
          roomId: room.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "11:00",
          type: "lecture",
          teacherCodes: ["HMP"],
        },
      });

      await db.timetableEntryDivision.create({
        data: {
          timetableEntryId: entry.id,
          divisionId: divA.id,
        },
      });
    }
  }

  console.log("Safe development university seed completed successfully!");
  console.log(`
Development Credentials:
--------------------------------------------------------------
Role         Email                       Password
--------------------------------------------------------------
Super Admin: admin@charusat.edu.in       Admin@1234
Teacher:     hmp@charusat.ac.in          Teacher@1234
Student 1:   26msit001@charusat.edu.in   Student@1234 (Div-A, Unbound / Ready to Bind)
Student 2:   26msit002@charusat.edu.in   Student@1234 (Div-A, Bound)
Student 3:   26msit003@charusat.edu.in   Student@1234 (Div-A, Unbound)
Student 4:   26msit004@charusat.edu.in   Student@1234 (Div-B, Unbound)
Student 5:   26msit005@charusat.edu.in   Student@1234 (Suspended)
--------------------------------------------------------------
  `);
}

// ==============================================================================
// 4. CLI DISPATCHER
// ==============================================================================

if (import.meta.main) {
  const isDevMode =
    process.argv.includes("--dev") || process.env.ALLOW_DEV_SEED === "true";

  const runner = isDevMode ? seedDevUniversityData() : seedSuperAdmin();

  runner
    .then(() => {
      console.log("Seed script execution completed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed script failed:", error);
      process.exit(1);
    });
}
