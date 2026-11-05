import { api } from "./api";

export interface ModuleGroupSummary {
  group_name: string;
  modules: string[];
  user_count: number;
  is_reserved: boolean;
}

export interface ModuleGroupDetail extends ModuleGroupSummary {
  description: string | null;
  created_at: string | null;
}

export async function listModuleGroups(): Promise<ModuleGroupSummary[]> {
  const { groups } = await api.get<{ groups: ModuleGroupSummary[] }>(
    "/api/module-groups",
  );
  return groups;
}

export async function getModuleGroup(name: string): Promise<ModuleGroupDetail> {
  const { group } = await api.get<{ group: ModuleGroupDetail }>(
    `/api/module-groups/${encodeURIComponent(name)}`,
  );
  return group;
}

export interface CreateGroupInput {
  group_name: string;
  modules: string[];
  description?: string;
}

export async function createModuleGroup(
  input: CreateGroupInput,
): Promise<ModuleGroupDetail> {
  const { group } = await api.post<{ group: ModuleGroupDetail }>(
    "/api/module-groups",
    input,
  );
  return group;
}

export async function renameModuleGroup(
  name: string,
  newName: string,
): Promise<ModuleGroupDetail> {
  const { group } = await api.patch<{ group: ModuleGroupDetail }>(
    `/api/module-groups/${encodeURIComponent(name)}`,
    { new_name: newName },
  );
  return group;
}

export async function deleteModuleGroup(name: string): Promise<void> {
  await api.delete(`/api/module-groups/${encodeURIComponent(name)}`);
}

export async function addModuleToGroup(
  name: string,
  moduleName: string,
): Promise<ModuleGroupDetail> {
  const { group } = await api.post<{ group: ModuleGroupDetail }>(
    `/api/module-groups/${encodeURIComponent(name)}/modules`,
    { module_name: moduleName },
  );
  return group;
}

export async function removeModuleFromGroup(
  name: string,
  moduleName: string,
): Promise<ModuleGroupDetail> {
  const { group } = await api.delete<{ group: ModuleGroupDetail }>(
    `/api/module-groups/${encodeURIComponent(name)}/modules/${encodeURIComponent(moduleName)}`,
  );
  return group;
}
