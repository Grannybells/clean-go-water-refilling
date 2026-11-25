import { Request, Response } from 'express';
import {
  closeDeliveryTransaction,
  closePickupTransaction,
  createTransaction,
  findDeliveryByDocno,
  findTransactionByDocno,
  listPendingDeliveries,
  listPendingPickups,
  listTransactionDetails,
  listTransactions,
  type CreateTxnInput,
  type PayOption,
  type PickupLineUpdate,
  type TxnLineInput,
  type TxnType,
} from '../models/transactionModel';

const VALID_TYPES: TxnType[] = ['WI', 'PU', 'DL'];

export const listTransactionsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const branchFilter =
    req.user.role === 'owner' ? null : req.user.contract?.branch_id ?? null;
  if (req.user.role !== 'owner' && !branchFilter) {
    res.json({ transactions: [] });
    return;
  }
  const transactions = await listTransactions(branchFilter);
  res.json({ transactions });
};

export const listPendingPickupsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const branchFilter =
    req.user.role === 'owner' ? null : req.user.contract?.branch_id ?? null;
  if (req.user.role !== 'owner' && !branchFilter) {
    res.json({ transactions: [] });
    return;
  }
  const transactions = await listPendingPickups(branchFilter);
  res.json({ transactions });
};

export const closePickupHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const docno = req.params.docno;
  const existing = await findTransactionByDocno(docno);
  if (!existing) {
    res.status(404).json({ message: 'Transaction not found' });
    return;
  }
  if (existing.wth_type !== 'PU' || existing.wth_status !== 'P') {
    res.status(400).json({ message: 'Only pending pickup transactions can be closed here' });
    return;
  }
  if (
    req.user.role !== 'owner' &&
    existing.wth_stncode &&
    req.user.contract?.branch_id !== existing.wth_stncode
  ) {
    res.status(403).json({ message: 'Forbidden: other branch' });
    return;
  }

  const raw = (req.body?.lines as unknown[]) ?? [];
  const updates: PickupLineUpdate[] = [];
  for (const r of raw) {
    const line = r as { seqno?: unknown; qtypickup?: unknown };
    const seqno = Number(line.seqno);
    if (!Number.isInteger(seqno) || seqno <= 0) continue;
    if (line.qtypickup === null || line.qtypickup === undefined || line.qtypickup === '') {
      updates.push({ seqno, qtypickup: null });
      continue;
    }
    const n = Number(line.qtypickup);
    if (!Number.isFinite(n) || n < 0) continue;
    updates.push({ seqno, qtypickup: Math.floor(n) });
  }

  const affected = await closePickupTransaction(docno, updates);
  if (affected === 0) {
    res.status(409).json({ message: 'Transaction was already closed' });
    return;
  }
  const refreshed = await findTransactionByDocno(docno);
  res.json({ transaction: refreshed });
};

export const listPendingDeliveriesHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const branchFilter =
    req.user.role === 'owner' ? null : req.user.contract?.branch_id ?? null;
  if (req.user.role !== 'owner' && !branchFilter) {
    res.json({ transactions: [] });
    return;
  }
  const transactions = await listPendingDeliveries(branchFilter);
  res.json({ transactions });
};

export const closeDeliveryHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const docno = req.params.docno;
  const existing = await findDeliveryByDocno(docno);
  if (!existing) {
    res.status(404).json({ message: 'Transaction not found' });
    return;
  }
  if (existing.wth_type !== 'DL' || existing.wth_status !== 'P') {
    res.status(400).json({ message: 'Only pending delivery transactions can be closed here' });
    return;
  }
  if (
    req.user.role !== 'owner' &&
    existing.wth_stncode &&
    req.user.contract?.branch_id !== existing.wth_stncode
  ) {
    res.status(403).json({ message: 'Forbidden: other branch' });
    return;
  }

  const raw = (req.body?.lines as unknown[]) ?? [];
  const updates: PickupLineUpdate[] = [];
  for (const r of raw) {
    const line = r as { seqno?: unknown; qtypickup?: unknown };
    const seqno = Number(line.seqno);
    if (!Number.isInteger(seqno) || seqno <= 0) continue;
    if (line.qtypickup === null || line.qtypickup === undefined || line.qtypickup === '') {
      updates.push({ seqno, qtypickup: null });
      continue;
    }
    const n = Number(line.qtypickup);
    if (!Number.isFinite(n) || n < 0) continue;
    updates.push({ seqno, qtypickup: Math.floor(n) });
  }

  const affected = await closeDeliveryTransaction(docno, updates);
  if (affected === 0) {
    res.status(409).json({ message: 'Transaction was already closed' });
    return;
  }
  const refreshed = await findDeliveryByDocno(docno);
  res.json({ transaction: refreshed });
};

export const getTransactionHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const docno = req.params.docno;
  const header = await findTransactionByDocno(docno);
  if (!header) {
    res.status(404).json({ message: 'Transaction not found' });
    return;
  }
  if (
    req.user.role !== 'owner' &&
    header.wth_stncode &&
    req.user.contract?.branch_id !== header.wth_stncode
  ) {
    res.status(403).json({ message: 'Forbidden: other branch' });
    return;
  }
  const details = await listTransactionDetails(docno);
  res.json({ transaction: { header, details } });
};
const VALID_PAYMENTS: PayOption[] = ['CS', 'QR', 'GC', 'CR'];

export const createTransactionHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const body = (req.body ?? {}) as {
    stncode?: unknown;
    cuscode?: unknown;
    type?: unknown;
    payoption?: unknown;
    lines?: unknown;
  };

  if (!VALID_TYPES.includes(body.type as TxnType)) {
    res.status(400).json({ message: `type must be one of ${VALID_TYPES.join(', ')}` });
    return;
  }
  const hasPay = body.payoption !== null && body.payoption !== undefined;
  if (hasPay && !VALID_PAYMENTS.includes(body.payoption as PayOption)) {
    res.status(400).json({
      message: `payoption must be one of ${VALID_PAYMENTS.join(', ')}`,
    });
    return;
  }
  if (body.type === 'WI' && !hasPay) {
    res.status(400).json({
      message: 'payoption is required for walk-in transactions',
    });
    return;
  }

  const cuscode =
    typeof body.cuscode === 'string' && body.cuscode ? body.cuscode : null;
  if ((body.type === 'PU' || body.type === 'DL') && !cuscode) {
    res.status(400).json({
      message: 'cuscode (selected customer) is required for pickup and delivery',
    });
    return;
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    res.status(400).json({ message: 'lines must be a non-empty array' });
    return;
  }

  const lines: TxnLineInput[] = [];
  for (const raw of body.lines) {
    const l = raw as { wr_code?: unknown; qty?: unknown; uprice?: unknown };
    if (typeof l.wr_code !== 'string' || l.wr_code.length === 0) {
      res.status(400).json({ message: 'each line needs a wr_code string' });
      return;
    }
    const qty = Number(l.qty);
    const uprice = Number(l.uprice);
    if (!Number.isInteger(qty) || qty <= 0) {
      res.status(400).json({ message: 'each line qty must be a positive integer' });
      return;
    }
    if (!Number.isFinite(uprice) || uprice < 0) {
      res.status(400).json({ message: 'each line uprice must be a non-negative number' });
      return;
    }
    lines.push({ wr_code: l.wr_code, qty, uprice });
  }

  const totalamt = Number(
    lines.reduce((sum, l) => sum + l.qty * l.uprice, 0).toFixed(2)
  );

  const input: CreateTxnInput = {
    stncode: typeof body.stncode === 'string' && body.stncode ? body.stncode : null,
    cuscode,
    type: body.type as TxnType,
    payoption: hasPay ? (body.payoption as PayOption) : null,
    totalamt,
    userid: req.user.id,
    lines,
  };

  const created = await createTransaction(input);
  res.status(201).json({ transaction: created });
};
