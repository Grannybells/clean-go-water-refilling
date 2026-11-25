import { RowDataPacket, ResultSetHeader, pool } from '../config/database';

export interface TxnHeader {
  wth_refno: number;
  wth_stncode: string | null;
  wth_docno: string;
  wth_date: string;
  wth_cuscode: string | null;
  wth_type: 'WI' | 'PU' | 'DL';
  wth_totalamt: number;
  wth_payoption: string | null;
  wth_status: string;
  wth_datecreated: string;
  wth_userid: string | null;
}

export interface TxnDetail {
  wtd_refno: number;
  wtd_stncode: string | null;
  wtd_docno: string;
  wtd_seqno: number;
  wtd_itemcode: string;
  wtd_qty: number;
  wtd_uprice: number;
  wtd_amount: number;
}

export const listTransactions = async (
  branchId?: string | null
): Promise<TxnHeader[]> => {
  if (branchId) {
    const [rows] = await pool.query<RowDataPacket>(
      `SELECT wth_refno, wth_stncode, wth_docno, wth_date, wth_cuscode,
              wth_type, wth_totalamt, wth_payoption, wth_status,
              wth_datecreated, wth_userid
         FROM water_tranheader
         WHERE wth_stncode = ?
         ORDER BY wth_datecreated DESC`,
      [branchId]
    );
    return rows as TxnHeader[];
  }
  const [rows] = await pool.query<RowDataPacket>(
    `SELECT wth_refno, wth_stncode, wth_docno, wth_date, wth_cuscode,
            wth_type, wth_totalamt, wth_payoption, wth_status,
            wth_datecreated, wth_userid
       FROM water_tranheader
       ORDER BY wth_datecreated DESC`
  );
  return rows as TxnHeader[];
};

export const findTransactionByDocno = async (
  docno: string
): Promise<TxnHeader | null> => {
  const [rows] = await pool.query<RowDataPacket>(
    `SELECT TOP 1 wth_refno, wth_stncode, wth_docno, wth_date, wth_cuscode,
            wth_type, wth_totalamt, wth_payoption, wth_status,
            wth_datecreated, wth_userid
       FROM water_tranheader
       WHERE wth_docno = ?`,
    [docno]
  );
  return (rows[0] as TxnHeader) ?? null;
};

export interface TxnHeaderWithCustomer extends TxnHeader {
  customer_refno: number | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_contactno: string | null;
  customer_email: string | null;
}

const DELIVERY_SELECT = `
  SELECT h.wth_refno, h.wth_stncode, h.wth_docno, h.wth_date, h.wth_cuscode,
         h.wth_type, h.wth_totalamt, h.wth_payoption, h.wth_status,
         h.wth_datecreated, h.wth_userid,
         c.cus_refno       AS customer_refno,
         c.cus_name        AS customer_name,
         c.cus_address     AS customer_address,
         c.cus_contactno   AS customer_contactno,
         c.cus_email       AS customer_email
    FROM water_tranheader h
    LEFT JOIN CustomerInfo c ON c.cus_code = h.wth_cuscode
`;

export const listPendingDeliveries = async (
  branchId?: string | null
): Promise<TxnHeaderWithCustomer[]> => {
  if (branchId) {
    const [rows] = await pool.query<RowDataPacket>(
      `${DELIVERY_SELECT}
       WHERE h.wth_type = 'DL' AND h.wth_status = 'P' AND h.wth_stncode = ?
       ORDER BY h.wth_datecreated DESC`,
      [branchId]
    );
    return rows as TxnHeaderWithCustomer[];
  }
  const [rows] = await pool.query<RowDataPacket>(
    `${DELIVERY_SELECT}
     WHERE h.wth_type = 'DL' AND h.wth_status = 'P'
     ORDER BY h.wth_datecreated DESC`
  );
  return rows as TxnHeaderWithCustomer[];
};

export const findDeliveryByDocno = async (
  docno: string
): Promise<TxnHeaderWithCustomer | null> => {
  const [rows] = await pool.query<RowDataPacket>(
    `${DELIVERY_SELECT}
     WHERE h.wth_docno = ?`,
    [docno]
  );
  return (rows[0] as TxnHeaderWithCustomer) ?? null;
};

export const closeDeliveryTransaction = async (
  docno: string,
  lineUpdates: PickupLineUpdate[]
): Promise<number> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [headerRes] = await conn.query<ResultSetHeader>(
      `UPDATE water_tranheader
         SET wth_status = 'D'
       WHERE wth_docno = ? AND wth_type = 'DL' AND wth_status = 'P'`,
      [docno]
    );
    const affected = headerRes.affectedRows ?? 0;
    if (affected === 0) {
      await conn.rollback();
      return 0;
    }
    for (const u of lineUpdates) {
      if (u.qtypickup === null) continue;
      await conn.query<ResultSetHeader>(
        `UPDATE water_trandetails
           SET wtd_qtypickup = ?
         WHERE wtd_docno = ? AND wtd_seqno = ?`,
        [u.qtypickup, docno, u.seqno]
      );
    }
    await conn.commit();
    return affected;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const listPendingPickups = async (
  branchId?: string | null
): Promise<TxnHeader[]> => {
  if (branchId) {
    const [rows] = await pool.query<RowDataPacket>(
      `SELECT wth_refno, wth_stncode, wth_docno, wth_date, wth_cuscode,
              wth_type, wth_totalamt, wth_payoption, wth_status,
              wth_datecreated, wth_userid
         FROM water_tranheader
         WHERE wth_type = 'PU' AND wth_status = 'P' AND wth_stncode = ?
         ORDER BY wth_datecreated DESC`,
      [branchId]
    );
    return rows as TxnHeader[];
  }
  const [rows] = await pool.query<RowDataPacket>(
    `SELECT wth_refno, wth_stncode, wth_docno, wth_date, wth_cuscode,
            wth_type, wth_totalamt, wth_payoption, wth_status,
            wth_datecreated, wth_userid
       FROM water_tranheader
       WHERE wth_type = 'PU' AND wth_status = 'P'
       ORDER BY wth_datecreated DESC`
  );
  return rows as TxnHeader[];
};

export interface PickupLineUpdate {
  seqno: number;
  qtypickup: number | null;
}

export const closePickupTransaction = async (
  docno: string,
  lineUpdates: PickupLineUpdate[]
): Promise<number> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [headerRes] = await conn.query<ResultSetHeader>(
      `UPDATE water_tranheader
         SET wth_status = 'C'
       WHERE wth_docno = ? AND wth_type = 'PU' AND wth_status = 'P'`,
      [docno]
    );
    const affected = headerRes.affectedRows ?? 0;
    if (affected === 0) {
      await conn.rollback();
      return 0;
    }
    for (const u of lineUpdates) {
      if (u.qtypickup === null) continue;
      await conn.query<ResultSetHeader>(
        `UPDATE water_trandetails
           SET wtd_qtypickup = ?
         WHERE wtd_docno = ? AND wtd_seqno = ?`,
        [u.qtypickup, docno, u.seqno]
      );
    }
    await conn.commit();
    return affected;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const listTransactionDetails = async (
  docno: string
): Promise<TxnDetail[]> => {
  const [rows] = await pool.query<RowDataPacket>(
    `SELECT wtd_refno, wtd_stncode, wtd_docno, wtd_seqno, wtd_itemcode,
            wtd_qty, wtd_uprice, wtd_amount
       FROM water_trandetails
       WHERE wtd_docno = ?
       ORDER BY wtd_seqno ASC`,
    [docno]
  );
  return rows as TxnDetail[];
};

export type TxnType = 'WI' | 'PU' | 'DL';
export type PayOption = 'CS' | 'QR' | 'GC' | 'CR';

export interface TxnLineInput {
  wr_code: string;
  qty: number;
  uprice: number;
}

export interface CreateTxnInput {
  stncode: string | null;
  cuscode: string | null;
  type: TxnType;
  payoption: PayOption | null;
  totalamt: number;
  userid: number | null;
  lines: TxnLineInput[];
}

export interface CreatedTxn {
  wth_refno: number;
  wth_docno: string;
}

const currentYYMM = (): string => {
  const now = new Date();
  const yy = String(now.getFullYear() % 100).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
};

/**
 * Peeks at the highest existing docno for the current YYMM prefix and
 * returns the next in sequence. Safe inside a transaction when the caller
 * holds UPDLOCK/HOLDLOCK on water_tranheader, otherwise two concurrent
 * sales in the same minute could collide — guard the INSERT with a unique
 * index on wth_docno and retry on duplicate-key.
 */
export const nextDocNo = async (yymm: string): Promise<string> => {
  const prefix = yymm;
  const [rows] = await pool.query<RowDataPacket>(
    `SELECT TOP 1 wth_docno FROM water_tranheader
       WHERE wth_docno LIKE ?
       ORDER BY wth_docno DESC`,
    [`${prefix}%`]
  );
  const last = rows[0]?.wth_docno as string | undefined;
  const seq = last ? Number(last.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(8, '0')}`;
};

export const createTransaction = async (
  input: CreateTxnInput
): Promise<CreatedTxn> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const docno = await nextDocNo(currentYYMM());
    const status = input.type === 'WI' ? 'C' : 'P';

    const [headerRes] = await conn.query<ResultSetHeader>(
      `INSERT INTO water_tranheader
         (wth_stncode, wth_docno, wth_date, wth_cuscode, wth_type,
          wth_totalamt, wth_payoption, wth_status,
          wth_datecreated, wth_userid)
       VALUES (?, ?, CAST(SYSUTCDATETIME() AS DATE), ?, ?, ?, ?, ?,
               SYSUTCDATETIME(), ?)`,
      [
        input.stncode,
        docno,
        input.cuscode,
        input.type,
        input.totalamt,
        input.payoption,
        status,
        input.userid,
      ]
    );
    const headerId = headerRes.insertId ?? 0;

    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      const amount = Number((line.uprice * line.qty).toFixed(2));

      await conn.query<ResultSetHeader>(
        `INSERT INTO water_trandetails
           (wtd_stncode, wtd_docno, wtd_seqno, wtd_itemcode,
            wtd_qty, wtd_uprice, wtd_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          input.stncode,
          docno,
          i + 1,
          line.wr_code,
          line.qty,
          line.uprice,
          amount,
        ]
      );
    }

    await conn.commit();
    return { wth_refno: headerId, wth_docno: docno };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
