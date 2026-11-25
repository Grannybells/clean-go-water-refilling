export interface Contract {
  id: number;
  user_id: number;
  branch_id: string;
  start_date: string;
  end_date: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  user_first_name: string | null;
  user_last_name: string | null;
  user_email: string | null;
  branch_name: string | null;
}
