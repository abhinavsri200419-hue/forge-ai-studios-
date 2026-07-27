/**
 * Creates (or updates the password of) the first admin user.
 * Run with: npm run seed:admin
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const name = process.env.SEED_ADMIN_NAME || "Forge Admin";
  const email = (process.env.SEED_ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD || "";

  if (!email || !password) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in your .env before seeding.");
  }
  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters.");
  }

  const hashed = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { password: hashed, name },
    create: { name, email, password: hashed, role: "SUPERADMIN" },
  });

  console.log(`✔ Admin user ready: ${admin.email} (${admin.role})`);
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
