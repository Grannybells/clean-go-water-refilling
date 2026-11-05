export interface Station {
  station_id: string;
  station_name: string;
  station_address: string | null;
  station_lat: string | null;
  station_lng: string | null;
  contact_number: string | null;
  description: string | null;
  is_active: number | boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}
