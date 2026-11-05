import { api } from "./api";

export interface ModuleEntry {
  module_name: string;
  page: string;
  action: string;
  description: string | null;
}

export async function listModules(page?: string): Promise<ModuleEntry[]> {
  const path = page
    ? `/api/modules?page=${encodeURIComponent(page)}`
    : "/api/modules";
  const { modules } = await api.get<{ modules: ModuleEntry[] }>(path);
  return modules;
}

export async function updateModuleDescription(
  moduleName: string,
  description: string | null,
): Promise<ModuleEntry> {
  const { module } = await api.patch<{ module: ModuleEntry }>(
    `/api/modules/${encodeURIComponent(moduleName)}`,
    { description },
  );
  return module;
}
