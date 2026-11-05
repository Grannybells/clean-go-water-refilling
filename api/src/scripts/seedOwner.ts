import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { createUser, findUserByEmail, ownerExists } from '../models/userModel';

const run = async (): Promise<void> => {
  const email = process.env.SEED_OWNER_EMAIL;
  const password = process.env.SEED_OWNER_PASSWORD;
  const firstName = process.env.SEED_OWNER_FIRST_NAME ?? 'Owner';
  const lastName = process.env.SEED_OWNER_LAST_NAME ?? 'Account';

  if (!email || !password) {
    console.error('Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD in .env before running this script.');
    process.exit(1);
  }

  if (await ownerExists()) {
    console.log('An owner already exists. Nothing to do.');
    await pool.end();
    return;
  }

  if (await findUserByEmail(email)) {
    console.error(`A user with email ${email} already exists but is not an owner. Promote them in SQL instead.`);
    await pool.end();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = await createUser({
    email,
    passwordHash,
    role: 'owner',
    firstName,
    lastName,
  });

  console.log(`Seeded owner account: ${email} (id=${id})`);
  await pool.end();
};

run().catch(async (err) => {
  console.error('Owner seed failed:', err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
