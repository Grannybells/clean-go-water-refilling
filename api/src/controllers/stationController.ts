import { Request, Response } from 'express';
import {
  createStation,
  deleteStation,
  findStationById,
  listStations,
  stationExists,
  updateStation,
} from '../models/stationModel';

const STATION_ID_RE = /^[A-Za-z0-9_-]{1,20}$/;

export const createStationHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const {
    station_id,
    station_name,
    station_address,
    station_lat,
    station_lng,
    contact_number,
    description,
    is_active,
  } = req.body ?? {};

  if (!station_id || !station_name || !station_address) {
    res
      .status(400)
      .json({ message: 'station_id, station_name, and station_address are required' });
    return;
  }
  if (!STATION_ID_RE.test(station_id)) {
    res.status(400).json({
      message: 'station_id must be 1-20 chars, letters/digits/underscore/hyphen only',
    });
    return;
  }

  if (await stationExists(station_id)) {
    res.status(409).json({ message: `station_id '${station_id}' already exists` });
    return;
  }

  await createStation({
    station_id,
    station_name,
    station_address,
    station_lat,
    station_lng,
    contact_number,
    description,
    is_active,
    created_by: req.user.id,
  });

  const station = await findStationById(station_id);
  res.status(201).json({ station });
};

export const listStationsHandler = async (_req: Request, res: Response): Promise<void> => {
  const stations = await listStations();
  res.json({ stations });
};

export const getStationHandler = async (req: Request, res: Response): Promise<void> => {
  const station = await findStationById(req.params.id);
  if (!station) {
    res.status(404).json({ message: 'Station not found' });
    return;
  }
  res.json({ station });
};

export const updateStationHandler = async (req: Request, res: Response): Promise<void> => {
  const stationId = req.params.id;
  if (!(await stationExists(stationId))) {
    res.status(404).json({ message: 'Station not found' });
    return;
  }

  const affected = await updateStation(stationId, req.body ?? {});
  if (affected === 0) {
    res.status(400).json({ message: 'No valid fields provided for update' });
    return;
  }

  const station = await findStationById(stationId);
  res.json({ station });
};

export const deleteStationHandler = async (req: Request, res: Response): Promise<void> => {
  const affected = await deleteStation(req.params.id);
  if (affected === 0) {
    res.status(404).json({ message: 'Station not found' });
    return;
  }
  res.status(204).send();
};
