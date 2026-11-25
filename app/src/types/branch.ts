export interface Branch {
  branch_id: string;
  branch_name: string;
  branch_address: string | null;
  branch_lat: string | null;
  branch_lng: string | null;
  contact_number: string | null;
  description: string | null;
  is_active: number | boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}
