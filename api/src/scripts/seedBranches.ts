import { RowDataPacket, pool } from '../config/database';
import { createBranch, branchExists } from '../models/branchModel';

const BRANCHES: Array<{ branch_id: string; branch_name: string; branch_address: string }> = [
  { branch_id: 'MCH', branch_name: 'Marcos Highway',          branch_address: 'Marcos Highway' },
  { branch_id: 'ABA', branch_name: 'A. Bonifacio Avenue',     branch_address: 'A. Bonifacio Avenue' },
  { branch_id: 'ARP', branch_name: 'Acop, Rosales, Pangasinan', branch_address: 'Acop, Rosales, Pangasinan' },
  { branch_id: 'ANR', branch_name: 'Angono, Rizal',           branch_address: 'Angono, Rizal' },
];

const randomLat = (): number => +(Math.random() * (18.5 - 6.0) + 6.0).toFixed(7);
const randomLng = (): number => +(Math.random() * (126.5 - 117.0) + 117.0).toFixed(7);

const resolveSeederId = async (): Promise<number | null> => {
  const [rows] = await pool.query<RowDataPacket>(
    "SELECT TOP 1 id FROM users WHERE role = 'owner' ORDER BY id ASC"
  );
  return (rows[0]?.id as number | undefined) ?? null;
};

const run = async (): Promise<void> => {
  const createdBy = await resolveSeederId();
  if (createdBy === null) {
    console.warn('No owner account found — branches will be created with created_by = NULL.');
  }

  let created = 0;
  let skipped = 0;

  for (const b of BRANCHES) {
    if (await branchExists(b.branch_id)) {
      console.log(`Skip: branch '${b.branch_id}' already exists.`);
      skipped += 1;
      continue;
    }

    await createBranch({
      branch_id: b.branch_id,
      branch_name: b.branch_name,
      branch_address: b.branch_address,
      branch_lat: randomLat(),
      branch_lng: randomLng(),
      contact_number: null,
      description: null,
      is_active: true,
      created_by: createdBy,
    });

    console.log(`Created: ${b.branch_id} — ${b.branch_name}`);
    created += 1;
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped.`);
  await pool.end();
};

run().catch(async (err) => {
  console.error('Branch seed failed:', err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
