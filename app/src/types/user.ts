export type UserRole = 'owner' | 'admin' | 'operator' | 'staff' | (string & {});

export interface User {
  id: number;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone: string | null;
  address: string | null;
  birth_date: string | null;
  gender: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  modules: string[];
}

export interface MeResponse {
  user: User;
  modules: string[];
}
