import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { createUser, findUserByEmail, roleExists } from '../models/userModel';
import { ROLE_TO_DEFAULT_GROUP } from '../config/modules';

interface SeedUser {
  role: string;
  email: string;
  firstName: string;
  lastName: string;
}

const USERS: SeedUser[] = [
  { role: 'owner',    email: 'owner@example.com',     firstName: 'Owner',    lastName: 'One' },
  { role: 'admin',    email: 'admin@example.com',     firstName: 'Admin',    lastName: 'One' },
  { role: 'operator', email: 'operator1@example.com', firstName: 'Operator', lastName: 'One' },
  { role: 'operator', email: 'operator2@example.com', firstName: 'Operator', lastName: 'Two' },
  { role: 'staff',    email: 'staff1@example.com',    firstName: 'Staff',    lastName: 'One' },
  { role: 'staff',    email: 'staff2@example.com',    firstName: 'Staff',    lastName: 'Two' },
  { role: 'staff',    email: 'staff3@example.com',    firstName: 'Staff',    lastName: 'Three' },
  { role: 'staff',    email: 'staff4@example.com',    firstName: 'Staff',    lastName: 'Four' },
];

const run = async (): Promise<void> => {
  const password = process.env.SEED_USERS_PASSWORD ?? 'changeme123';
  const passwordHash = await bcrypt.hash(password, 10);

  console.log(`Seeding ${USERS.length} users (shared password from SEED_USERS_PASSWORD)...`);

  let created = 0;
  let skipped = 0;

  for (const u of USERS) {
    if (!(await roleExists(u.role))) {
      console.error(`  ! role '${u.role}' missing — run \`npm run db:init\` first.`);
      process.exit(1);
    }

    if (await findUserByEmail(u.email)) {
      console.log(`  skip: ${u.email} (${u.role}) already exists.`);
      skipped += 1;
      continue;
    }

    const defaultGroup = ROLE_TO_DEFAULT_GROUP[u.role];
    const id = await createUser({
      email: u.email,
      passwordHash,
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
      createdBy: null,
      groups: defaultGroup ? [defaultGroup] : [],
    });
    console.log(`  created: ${u.email} (id=${id}, role=${u.role}, group=${defaultGroup ?? 'none'})`);
    created += 1;
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped. Password: ${password}`);
  await pool.end();
};

run().catch(async (err) => {
  console.error('User seed failed:', err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
