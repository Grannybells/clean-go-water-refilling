import { Request, Response } from 'express';
import {
  createContract,
  deleteContract,
  findContractById,
  listContracts,
  updateContract,
  userExists,
} from '../models/contractModel';
import { stationExists } from '../models/stationModel';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (value: unknown): value is string =>
  typeof value === 'string' && DATE_RE.test(value) && !Number.isNaN(Date.parse(value));

export const createContractHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { user_id, station_id, start_date, end_date } = req.body ?? {};

  if (user_id === undefined || !station_id || !start_date) {
    res.status(400).json({ message: 'user_id, station_id, and start_date are required' });
    return;
  }
  if (typeof user_id !== 'number' || !Number.isInteger(user_id)) {
    res.status(400).json({ message: 'user_id must be an integer' });
    return;
  }
  if (!isValidDate(start_date)) {
    res.status(400).json({ message: 'start_date must be YYYY-MM-DD' });
    return;
  }
  if (end_date !== undefined && end_date !== null && !isValidDate(end_date)) {
    res.status(400).json({ message: 'end_date must be YYYY-MM-DD or null' });
    return;
  }
  if (isValidDate(end_date) && end_date < start_date) {
    res.status(400).json({ message: 'end_date must be on or after start_date' });
    return;
  }

  if (!(await userExists(user_id))) {
    res.status(404).json({ message: `User ${user_id} not found` });
    return;
  }
  if (!(await stationExists(station_id))) {
    res.status(404).json({ message: `Station '${station_id}' not found` });
    return;
  }

  const id = await createContract({
    user_id,
    station_id,
    start_date,
    end_date: end_date ?? null,
    created_by: req.user.id,
  });

  const contract = await findContractById(id);
  res.status(201).json({ contract });
};

export const listContractsHandler = async (req: Request, res: Response): Promise<void> => {
  const userIdQ = req.query.user_id;
  const stationIdQ = req.query.station_id;

  const filters: { user_id?: number; station_id?: string } = {};
  if (typeof userIdQ === 'string' && userIdQ.length > 0) {
    const n = Number(userIdQ);
    if (!Number.isInteger(n)) {
      res.status(400).json({ message: 'user_id must be an integer' });
      return;
    }
    filters.user_id = n;
  }
  if (typeof stationIdQ === 'string' && stationIdQ.length > 0) {
    filters.station_id = stationIdQ;
  }

  const contracts = await listContracts(filters);
  res.json({ contracts });
};

export const getContractHandler = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ message: 'id must be an integer' });
    return;
  }
  const contract = await findContractById(id);
  if (!contract) {
    res.status(404).json({ message: 'Contract not found' });
    return;
  }
  res.json({ contract });
};

export const updateContractHandler = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ message: 'id must be an integer' });
    return;
  }

  const existing = await findContractById(id);
  if (!existing) {
    res.status(404).json({ message: 'Contract not found' });
    return;
  }

  const { user_id, station_id, start_date, end_date } = req.body ?? {};

  if (user_id !== undefined) {
    if (typeof user_id !== 'number' || !Number.isInteger(user_id)) {
      res.status(400).json({ message: 'user_id must be an integer' });
      return;
    }
    if (!(await userExists(user_id))) {
      res.status(404).json({ message: `User ${user_id} not found` });
      return;
    }
  }
  if (station_id !== undefined) {
    if (typeof station_id !== 'string' || !station_id) {
      res.status(400).json({ message: 'station_id must be a non-empty string' });
      return;
    }
    if (!(await stationExists(station_id))) {
      res.status(404).json({ message: `Station '${station_id}' not found` });
      return;
    }
  }
  if (start_date !== undefined && !isValidDate(start_date)) {
    res.status(400).json({ message: 'start_date must be YYYY-MM-DD' });
    return;
  }
  if (end_date !== undefined && end_date !== null && !isValidDate(end_date)) {
    res.status(400).json({ message: 'end_date must be YYYY-MM-DD or null' });
    return;
  }

  const effectiveStart = (start_date as string | undefined) ?? existing.start_date;
  const effectiveEnd =
    end_date === undefined ? existing.end_date : (end_date as string | null);
  if (effectiveEnd && effectiveEnd < effectiveStart) {
    res.status(400).json({ message: 'end_date must be on or after start_date' });
    return;
  }

  const affected = await updateContract(id, { user_id, station_id, start_date, end_date });
  if (affected === 0) {
    res.status(400).json({ message: 'No valid fields provided for update' });
    return;
  }

  const contract = await findContractById(id);
  res.json({ contract });
};

export const deleteContractHandler = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ message: 'id must be an integer' });
    return;
  }
  const affected = await deleteContract(id);
  if (affected === 0) {
    res.status(404).json({ message: 'Contract not found' });
    return;
  }
  res.status(204).send();
};
