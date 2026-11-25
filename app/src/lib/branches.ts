import { api } from "./api";
import type { Branch } from "@/types/branch";

export interface BranchInput {
  branch_id?: string;
  branch_name?: string;
  branch_address?: string | null;
  branch_lat?: number | null;
  branch_lng?: number | null;
  contact_number?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export async function listBranches(): Promise<Branch[]> {
  const { branches } = await api.get<{ branches: Branch[] }>("/api/branches");
  return branches;
}

export async function createBranch(input: BranchInput): Promise<Branch> {
  const { branch } = await api.post<{ branch: Branch }>(
    "/api/branches",
    input,
  );
  return branch;
}

export async function updateBranch(
  id: string,
  input: BranchInput,
): Promise<Branch> {
  const { branch } = await api.patch<{ branch: Branch }>(
    `/api/branches/${encodeURIComponent(id)}`,
    input,
  );
  return branch;
}

export async function deleteBranch(id: string): Promise<void> {
  await api.delete(`/api/branches/${encodeURIComponent(id)}`);
}
