import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { createUser, findUserByEmail, roleExists } from '../models/userModel';
import { ROLE_TO_DEFAULT_GROUP } from '../config/modules';

export interface SeedUserConfig {
  role: string;
  emailEnv: string;
  passwordEnv: string;
  firstNameEnv: string;
  lastNameEnv: string;
}

export const seedUser = async (config: SeedUserConfig): Promise<void> => {
  const email = process.env[config.emailEnv];
  const password = process.env[config.passwordEnv];
  const firstName = process.env[config.firstNameEnv] ?? config.role;
  const lastName = process.env[config.lastNameEnv] ?? 'Account';

  if (!email || !password) {
    console.error(
      `Set ${config.emailEnv} and ${config.passwordEnv} in .env before running this script.`
    );
    process.exit(1);
  }

  if (!(await roleExists(config.role))) {
    console.error(
      `Role '${config.role}' does not exist. Run \`npm run db:init\` first to seed roles.`
    );
    process.exit(1);
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    console.log(
      `User ${email} already exists (role=${existing.role}). Nothing to do.`
    );
    return;
  }

  const defaultGroup = ROLE_TO_DEFAULT_GROUP[config.role];
  const passwordHash = await bcrypt.hash(password, 10);

  const id = await createUser({
    email,
    passwordHash,
    role: config.role,
    firstName,
    lastName,
    createdBy: null,
    groups: defaultGroup ? [defaultGroup] : [],
  });

  console.log(
    `Seeded ${config.role} account: ${email} (id=${id}), default group=${defaultGroup ?? 'none'}`
  );
};

export const runSeed = (config: SeedUserConfig): void => {
  seedUser(config)
    .then(async () => {
      await pool.end();
    })
    .catch(async (err) => {
      console.error(`${config.role} seed failed:`, err);
      await pool.end().catch(() => undefined);
      process.exit(1);
    });
};
