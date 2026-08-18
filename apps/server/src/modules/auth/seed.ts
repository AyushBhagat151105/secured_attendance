import db from "@secured_attendance/db";
import { auth } from "@secured_attendance/auth";
import { env } from "@secured_attendance/env/server";

export async function seedSuperAdmin() {
  const email = env.SUPER_ADMIN_EMAIL;
  const password = env.SUPER_ADMIN_PASSWORD;
  const name = env.SUPER_ADMIN_NAME;

  if (!email || !password) {
    console.warn("SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set. Skipping super admin seed.");
    return;
  }

  // Check if super admin already exists
  const existingAdmin = await db.user.findFirst({
    where: { email, role: "super_admin" },
  });

  if (existingAdmin) {
    console.log("Super admin account already exists.");
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
        data: { role: "super_admin" }
      });
      console.log(`Successfully created Super Admin account for ${name} (${email})`);
    }
  } catch (error) {
    console.error("Failed to seed Super Admin via Better Auth:", error);
  }
}

if (import.meta.main) {
  seedSuperAdmin()
    .then(() => {
      console.log("Seed script execution completed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed script failed:", error);
      process.exit(1);
    });
}
