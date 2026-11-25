import { api } from "./api";
import type { Contract } from "@/types/contract";

export interface ContractFilters {
  user_id?: number;
  branch_id?: string;
}

export interface CreateContractInput {
  user_id: number;
  branch_id: string;
  start_date: string;
  end_date?: string | null;
}

export interface UpdateContractInput {
  user_id?: number;
  branch_id?: string;
  start_date?: string;
  end_date?: string | null;
}

function buildQuery(filters: ContractFilters): string {
  const params: string[] = [];
  if (filters.user_id !== undefined) {
    params.push(`user_id=${encodeURIComponent(filters.user_id)}`);
  }
  if (filters.branch_id !== undefined) {
    params.push(`branch_id=${encodeURIComponent(filters.branch_id)}`);
  }
  return params.length ? `?${params.join("&")}` : "";
}

export async function listContracts(
  filters: ContractFilters = {},
): Promise<Contract[]> {
  const { contracts } = await api.get<{ contracts: Contract[] }>(
    `/api/contracts${buildQuery(filters)}`,
  );
  return contracts;
}

export async function getContract(id: number): Promise<Contract> {
  const { contract } = await api.get<{ contract: Contract }>(
    `/api/contracts/${id}`,
  );
  return contract;
}

export async function createContract(
  input: CreateContractInput,
): Promise<Contract> {
  const { contract } = await api.post<{ contract: Contract }>(
    "/api/contracts",
    input,
  );
  return contract;
}

export async function updateContract(
  id: number,
  input: UpdateContractInput,
): Promise<Contract> {
  const { contract } = await api.patch<{ contract: Contract }>(
    `/api/contracts/${id}`,
    input,
  );
  return contract;
}

export async function deleteContract(id: number): Promise<void> {
  await api.delete(`/api/contracts/${id}`);
}
