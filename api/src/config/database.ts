import sql from 'mssql';
import { env } from './env';

export type RowDataPacket = Record<string, any>;
export interface ResultSetHeader {
  insertId: number;
  affectedRows: number;
}

type QueryResult<T = any> = [T[] & Partial<ResultSetHeader>, unknown[]];

const buildConfig = (database?: string): sql.config => ({
  server: env.db.server,
  database,
  user: env.db.user,
  password: env.db.password,
  port: env.db.port,
  options: {
    instanceName: env.db.instanceName,
    trustServerCertificate: true,
    encrypt: false,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
});

const exec = async (
  target: sql.ConnectionPool | sql.Transaction,
  sqlText: string,
  params: unknown[] = []
): Promise<QueryResult> => {
  const request = target.request();
  let i = 0;
  const converted = sqlText.replace(/\?/g, () => {
    const name = `p${i}`;
    request.input(name, params[i]);
    i += 1;
    return `@${name}`;
  });

  const isInsert = /^\s*INSERT\s/i.test(sqlText);
  const finalSql = isInsert
    ? `${converted}; SELECT CAST(SCOPE_IDENTITY() AS BIGINT) AS insertId;`
    : converted;

  const result = await request.query(finalSql);
  const affected = result.rowsAffected?.[0] ?? 0;

  if (isInsert) {
    const insertId = Number(result.recordset?.[0]?.insertId ?? 0);
    const arr: any[] & Partial<ResultSetHeader> = [];
    arr.insertId = insertId;
    arr.affectedRows = affected;
    return [arr, []];
  }

  const arr: any[] & Partial<ResultSetHeader> = result.recordset
    ? [...result.recordset]
    : [];
  arr.affectedRows = affected;
  return [arr, []];
};

class ConnectionShim {
  private tx: sql.Transaction | null = null;
  constructor(private readonly pool: sql.ConnectionPool) {}

  async query<T = any>(sqlText: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return exec(this.tx ?? this.pool, sqlText, params) as Promise<QueryResult<T>>;
  }

  async execute<T = any>(sqlText: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return this.query<T>(sqlText, params);
  }

  async ping(): Promise<void> {
    await exec(this.pool, 'SELECT 1 AS ok');
  }

  async beginTransaction(): Promise<void> {
    this.tx = new sql.Transaction(this.pool);
    await this.tx.begin();
  }

  async commit(): Promise<void> {
    if (this.tx) {
      await this.tx.commit();
      this.tx = null;
    }
  }

  async rollback(): Promise<void> {
    if (this.tx) {
      await this.tx.rollback();
      this.tx = null;
    }
  }

  release(): void {
    this.tx = null;
  }
}

class PoolShim {
  private poolPromise: Promise<sql.ConnectionPool>;

  constructor() {
    this.poolPromise = new sql.ConnectionPool(buildConfig(env.db.database)).connect();
  }

  async query<T = any>(sqlText: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const pool = await this.poolPromise;
    return exec(pool, sqlText, params) as Promise<QueryResult<T>>;
  }

  async execute<T = any>(sqlText: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return this.query<T>(sqlText, params);
  }

  async getConnection(): Promise<ConnectionShim> {
    const pool = await this.poolPromise;
    return new ConnectionShim(pool);
  }

  async end(): Promise<void> {
    const pool = await this.poolPromise;
    await pool.close();
  }
}

export const pool = new PoolShim();

export const testConnection = async (): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
};

export const createBootstrapPool = async (): Promise<sql.ConnectionPool> => {
  return new sql.ConnectionPool(buildConfig('master')).connect();
};
