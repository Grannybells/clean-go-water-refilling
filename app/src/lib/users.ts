import { api } from "./api";
import type { User, UserRole } from "@/types/user";

export interface CreateUserInput {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: UserRole;
  phone?: string;
  address?: string;
  birth_date?: string;
  gender?: string;
  avatar_url?: string;
  modules?: string[];
  groups?: string[];
}

export interface DirectModuleGrant {
  id: number;
  module_name: string;
  granted_by: number | null;
  created_at: string;
}

export interface GroupMembership {
  id: number;
  group_name: string;
  assigned_by: number | null;
  created_at: string;
  modules: string[];
}

export interface UserDetail {
  user: User;
  modules: {
    effective: string[];
    direct: DirectModuleGrant[];
    groups: GroupMembership[];
  };
}

export async function listUsers(): Promise<User[]> {
  const { users } = await api.get<{ users: User[] }>("/api/users");
  return users;
}

export async function getUser(id: number): Promise<UserDetail> {
  return api.get<UserDetail>(`/api/users/${id}`);
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { user } = await api.post<{ user: User }>("/api/users", input);
  return user;
}

export interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  address?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  avatar_url?: string | null;
}

export async function updateUserProfile(
  id: number,
  input: UpdateProfileInput,
): Promise<User> {
  const { user } = await api.patch<{ user: User }>(`/api/users/${id}`, input);
  return user;
}

export async function updateOwnProfile(
  input: UpdateProfileInput,
): Promise<User> {
  const { user } = await api.patch<{ user: User }>(`/api/users/me`, input);
  return user;
}

export async function updateUserRole(
  id: number,
  role: UserRole,
): Promise<User> {
  const { user } = await api.patch<{ user: User; requires_relogin?: boolean }>(
    `/api/users/${id}/role`,
    { role },
  );
  return user;
}

export async function grantUserModule(
  userId: number,
  moduleName: string,
): Promise<void> {
  await api.post(`/api/users/${userId}/modules`, { module_name: moduleName });
}

export async function revokeUserModule(
  userId: number,
  moduleName: string,
): Promise<void> {
  await api.delete(
    `/api/users/${userId}/modules/${encodeURIComponent(moduleName)}`,
  );
}

export async function assignUserGroup(
  userId: number,
  groupName: string,
): Promise<void> {
  await api.post(`/api/users/${userId}/groups`, { group_name: groupName });
}

export async function removeUserGroup(
  userId: number,
  groupName: string,
): Promise<void> {
  await api.delete(
    `/api/users/${userId}/groups/${encodeURIComponent(groupName)}`,
  );
}
