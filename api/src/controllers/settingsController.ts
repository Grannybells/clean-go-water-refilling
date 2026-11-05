import { Request, Response } from 'express';
import {
  createSettings,
  deleteSettings,
  findSettingsById,
  findSettingsByDeviceId,
  listSettings,
  updateSettings,
} from '../models/settingsModel';

const parseId = (raw: string): number | null => {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const STRING_FIELDS = [
  'station_id',
  'station_name',
  'user_name',
  'device_id',
  'device_name',
  'device_model',
  'os_name',
  'os_version',
  'app_version',
  'push_token',
] as const;

const validateBody = (
  body: Record<string, unknown>
): { ok: true; cleaned: Record<string, unknown> } | { ok: false; message: string } => {
  const cleaned: Record<string, unknown> = {};

  for (const key of STRING_FIELDS) {
    if (key in body) {
      const v = body[key];
      if (v !== null && typeof v !== 'string') {
        return { ok: false, message: `${key} must be a string or null` };
      }
      cleaned[key] = v;
    }
  }

  if ('user_id' in body) {
    const v = body.user_id;
    if (v !== null && (typeof v !== 'number' || !Number.isInteger(v))) {
      return { ok: false, message: 'user_id must be an integer or null' };
    }
    cleaned.user_id = v;
  }

  if ('last_seen_at' in body) {
    const v = body.last_seen_at;
    if (v !== null && (typeof v !== 'string' || Number.isNaN(Date.parse(v)))) {
      return { ok: false, message: 'last_seen_at must be an ISO date string or null' };
    }
    cleaned.last_seen_at = v;
  }

  return { ok: true, cleaned };
};

export const listSettingsHandler = async (_req: Request, res: Response): Promise<void> => {
  const settings = await listSettings();
  res.json({ settings });
};

export const getSettingsHandler = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ message: 'id must be a positive integer' });
    return;
  }
  const row = await findSettingsById(id);
  if (!row) {
    res.status(404).json({ message: 'Settings record not found' });
    return;
  }
  res.json({ settings: row });
};

export const createSettingsHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const result = validateBody(req.body ?? {});
  if (!result.ok) {
    res.status(400).json({ message: result.message });
    return;
  }

  const deviceId = result.cleaned.device_id as string | null | undefined;
  if (deviceId) {
    const existing = await findSettingsByDeviceId(deviceId);
    if (existing) {
      res.status(409).json({ message: `device_id '${deviceId}' is already registered` });
      return;
    }
  }

  const id = await createSettings({ ...result.cleaned, created_by: req.user.id });
  const settings = await findSettingsById(id);
  res.status(201).json({ settings });
};

export const updateSettingsHandler = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ message: 'id must be a positive integer' });
    return;
  }

  const existing = await findSettingsById(id);
  if (!existing) {
    res.status(404).json({ message: 'Settings record not found' });
    return;
  }

  const result = validateBody(req.body ?? {});
  if (!result.ok) {
    res.status(400).json({ message: result.message });
    return;
  }

  const deviceId = result.cleaned.device_id as string | null | undefined;
  if (deviceId && deviceId !== existing.device_id) {
    const other = await findSettingsByDeviceId(deviceId);
    if (other) {
      res.status(409).json({ message: `device_id '${deviceId}' is already registered` });
      return;
    }
  }

  const affected = await updateSettings(id, result.cleaned);
  if (affected === 0) {
    res.status(400).json({ message: 'No valid fields provided for update' });
    return;
  }

  const settings = await findSettingsById(id);
  res.json({ settings });
};

export const deleteSettingsHandler = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ message: 'id must be a positive integer' });
    return;
  }
  const affected = await deleteSettings(id);
  if (affected === 0) {
    res.status(404).json({ message: 'Settings record not found' });
    return;
  }
  res.status(204).send();
};
