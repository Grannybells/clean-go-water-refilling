import { RowDataPacket, pool } from '../config/database';
import {
  createCustomer,
  listCustomerTypes,
  nextCustomerCode,
} from '../models/customerModel';
import { listBranches } from '../models/branchModel';

type SeedCustomer = {
  cus_name: string;
  cus_address: string;
  cus_contactno: string;
  cus_email: string;
  cus_birthdate: string;
  type_refno?: string;
};

const CUSTOMERS: SeedCustomer[] = [
  {
    cus_name: 'Juan Dela Cruz',
    cus_address: '123 Rizal St, Manila',
    cus_contactno: '+63 912 345 6789',
    cus_email: 'juan.delacruz@example.com',
    cus_birthdate: '1988-03-14',
  },
  {
    cus_name: 'Maria Santos',
    cus_address: '45 Mabini Ave, Quezon City',
    cus_contactno: '+63 917 555 0102',
    cus_email: 'maria.santos@example.com',
    cus_birthdate: '1992-07-22',
  },
  {
    cus_name: 'Pedro Reyes',
    cus_address: '9 Bonifacio St, Pasig',
    cus_contactno: '+63 918 221 4477',
    cus_email: 'pedro.reyes@example.com',
    cus_birthdate: '1975-11-02',
  },
  {
    cus_name: 'Ana Villanueva',
    cus_address: 'Blk 7 Lot 4 Greenfield Subd, Marikina',
    cus_contactno: '+63 919 808 3311',
    cus_email: 'ana.villanueva@example.com',
    cus_birthdate: '1995-01-19',
  },
  {
    cus_name: 'Carlos Mendoza',
    cus_address: '12 Aguinaldo Hwy, Cavite',
    cus_contactno: '+63 921 112 7788',
    cus_email: 'carlos.mendoza@example.com',
    cus_birthdate: '1983-09-05',
  },
  {
    cus_name: 'Liza Cruz',
    cus_address: '77 Katipunan Rd, Quezon City',
    cus_contactno: '+63 922 998 1111',
    cus_email: 'liza.cruz@example.com',
    cus_birthdate: '1990-12-30',
  },
  {
    cus_name: 'Mark Tan',
    cus_address: 'Unit 8B, Ortigas Centre, Pasig',
    cus_contactno: '+63 923 444 9090',
    cus_email: 'mark.tan@example.com',
    cus_birthdate: '1986-05-11',
  },
  {
    cus_name: 'Jenny Lim',
    cus_address: '55 Taft Ave, Manila',
    cus_contactno: '+63 926 303 7001',
    cus_email: 'jenny.lim@example.com',
    cus_birthdate: '1998-02-27',
  },
  {
    cus_name: 'Ramon Aquino',
    cus_address: '14 P. Guevarra St, San Juan',
    cus_contactno: '+63 927 010 2244',
    cus_email: 'ramon.aquino@example.com',
    cus_birthdate: '1968-08-17',
  },
  {
    cus_name: 'Teresa Navarro',
    cus_address: '203 Shaw Blvd, Mandaluyong',
    cus_contactno: '+63 928 441 9933',
    cus_email: 'teresa.navarro@example.com',
    cus_birthdate: '1979-04-09',
  },
  {
    cus_name: 'Diego Ramos',
    cus_address: '34 EDSA Extension, Pasay',
    cus_contactno: '+63 929 773 5566',
    cus_email: 'diego.ramos@example.com',
    cus_birthdate: '2001-06-21',
  },
  {
    cus_name: 'Patricia Dizon',
    cus_address: '88 West Ave, Quezon City',
    cus_contactno: '+63 930 250 1414',
    cus_email: 'patricia.dizon@example.com',
    cus_birthdate: '1993-10-03',
  },
  {
    cus_name: 'Noel Flores',
    cus_address: '6 Roxas Blvd, Parañaque',
    cus_contactno: '+63 932 617 8800',
    cus_email: 'noel.flores@example.com',
    cus_birthdate: '1971-01-12',
  },
  {
    cus_name: 'Grace Pangilinan',
    cus_address: '21 C. Raymundo Ave, Pasig',
    cus_contactno: '+63 933 989 2020',
    cus_email: 'grace.pangilinan@example.com',
    cus_birthdate: '1984-11-25',
  },
  {
    cus_name: 'Ricardo Bautista',
    cus_address: '59 Kamuning Rd, Quezon City',
    cus_contactno: '+63 935 100 6677',
    cus_email: 'ricardo.bautista@example.com',
    cus_birthdate: '1962-02-04',
  },
  {
    cus_name: 'Isabel Garcia',
    cus_address: '112 Lopez Ave, Antipolo',
    cus_contactno: '+63 936 448 3131',
    cus_email: 'isabel.garcia@example.com',
    cus_birthdate: '2003-09-29',
  },
  {
    cus_name: 'Francis Tolentino',
    cus_address: '2 Legarda St, Manila',
    cus_contactno: '+63 938 215 9090',
    cus_email: 'francis.tolentino@example.com',
    cus_birthdate: '1989-07-07',
  },
  {
    cus_name: 'Beatrice Uy',
    cus_address: '17 Banawe Ave, Quezon City',
    cus_contactno: '+63 939 302 4455',
    cus_email: 'beatrice.uy@example.com',
    cus_birthdate: '1996-12-18',
  },
  {
    cus_name: 'Arnold Castro',
    cus_address: '71 Sucat Rd, Muntinlupa',
    cus_contactno: '+63 945 776 1100',
    cus_email: 'arnold.castro@example.com',
    cus_birthdate: '1957-05-23',
  },
  {
    cus_name: 'Michelle Yap',
    cus_address: '4 Burgos St, Tagaytay',
    cus_contactno: '+63 947 220 8080',
    cus_email: 'michelle.yap@example.com',
    cus_birthdate: '2000-03-08',
  },
];

const resolveSeederId = async (): Promise<number | null> => {
  const [rows] = await pool.query<RowDataPacket>(
    "SELECT TOP 1 id FROM users WHERE role = 'owner' ORDER BY id ASC"
  );
  return (rows[0]?.id as number | undefined) ?? null;
};

const emailExists = async (email: string): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket>(
    'SELECT TOP 1 1 AS ok FROM CustomerInfo WHERE cus_email = ?',
    [email]
  );
  return rows.length > 0;
};

const currentYYMM = (): string => {
  const now = new Date();
  const yy = String(now.getFullYear() % 100).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
};

const run = async (): Promise<void> => {
  const types = await listCustomerTypes();
  if (types.length === 0) {
    console.error(
      'No rows in customer_type — seed that table first (needs at least one customer_refno).'
    );
    await pool.end();
    process.exit(1);
  }

  const branches = await listBranches();
  if (branches.length === 0) {
    console.warn(
      'No branches found — customers will be seeded with cus_branch = NULL.'
    );
  }

  const createdBy = await resolveSeederId();
  if (createdBy === null) {
    console.warn(
      'No owner account found — customers will be created with cus_userid = NULL.'
    );
  }

  const yymm = currentYYMM();
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < CUSTOMERS.length; i++) {
    const c = CUSTOMERS[i];
    const type = types[i % types.length];
    const typeRefno = c.type_refno ?? type.customer_refno;
    const branchId =
      branches.length > 0 ? branches[i % branches.length].branch_id : null;

    if (await emailExists(c.cus_email)) {
      console.log(`Skip: ${c.cus_email} already present.`);
      skipped += 1;
      continue;
    }

    const cus_code = await nextCustomerCode(typeRefno, yymm);

    const insertId = await createCustomer({
      cus_name: c.cus_name,
      cus_address: c.cus_address,
      cus_contactno: c.cus_contactno,
      cus_email: c.cus_email,
      cus_birthdate: c.cus_birthdate,
      cus_type: typeRefno,
      cus_branch: branchId,
      cus_userid: createdBy,
      cus_code,
    });

    console.log(
      `Created: #${insertId} ${c.cus_name} — ${cus_code} (type ${typeRefno}, branch ${branchId ?? 'none'})`
    );
    created += 1;
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped.`);
  await pool.end();
};

run().catch(async (err) => {
  console.error('Customer seed failed:', err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
