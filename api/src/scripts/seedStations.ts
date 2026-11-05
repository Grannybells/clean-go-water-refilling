import { RowDataPacket } from 'mysql2';
import { pool } from '../config/database';
import { createStation, stationExists } from '../models/stationModel';

const STATIONS: Array<{ station_id: string; station_name: string; station_address: string }> = [
  { station_id: 'MCH', station_name: 'Marcos Highway',          station_address: 'Marcos Highway' },
  { station_id: 'ABA', station_name: 'A. Bonifacio Avenue',     station_address: 'A. Bonifacio Avenue' },
  { station_id: 'ARP', station_name: 'Acop, Rosales, Pangasinan', station_address: 'Acop, Rosales, Pangasinan' },
  { station_id: 'ANR', station_name: 'Angono, Rizal',           station_address: 'Angono, Rizal' },
];

const randomLat = (): number => +(Math.random() * (18.5 - 6.0) + 6.0).toFixed(7);
const randomLng = (): number => +(Math.random() * (126.5 - 117.0) + 117.0).toFixed(7);

const resolveSeederId = async (): Promise<number | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE role = 'owner' ORDER BY id ASC LIMIT 1"
  );
  return (rows[0]?.id as number | undefined) ?? null;
};

const run = async (): Promise<void> => {
  const createdBy = await resolveSeederId();
  if (createdBy === null) {
    console.warn('No owner account found — stations will be created with created_by = NULL.');
  }

  let created = 0;
  let skipped = 0;

  for (const s of STATIONS) {
    if (await stationExists(s.station_id)) {
      console.log(`Skip: station '${s.station_id}' already exists.`);
      skipped += 1;
      continue;
    }

    await createStation({
      station_id: s.station_id,
      station_name: s.station_name,
      station_address: s.station_address,
      station_lat: randomLat(),
      station_lng: randomLng(),
      contact_number: null,
      description: null,
      is_active: true,
      created_by: createdBy,
    });

    console.log(`Created: ${s.station_id} — ${s.station_name}`);
    created += 1;
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped.`);
  await pool.end();
};

run().catch(async (err) => {
  console.error('Station seed failed:', err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
