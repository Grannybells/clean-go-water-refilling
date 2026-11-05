import { api } from "./api";
import type { Station } from "@/types/station";

export interface StationInput {
  station_id?: string;
  station_name?: string;
  station_address?: string | null;
  station_lat?: number | null;
  station_lng?: number | null;
  contact_number?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export async function listStations(): Promise<Station[]> {
  const { stations } = await api.get<{ stations: Station[] }>("/api/stations");
  return stations;
}

export async function createStation(input: StationInput): Promise<Station> {
  const { station } = await api.post<{ station: Station }>(
    "/api/stations",
    input,
  );
  return station;
}

export async function updateStation(
  id: string,
  input: StationInput,
): Promise<Station> {
  const { station } = await api.patch<{ station: Station }>(
    `/api/stations/${encodeURIComponent(id)}`,
    input,
  );
  return station;
}

export async function deleteStation(id: string): Promise<void> {
  await api.delete(`/api/stations/${encodeURIComponent(id)}`);
}
