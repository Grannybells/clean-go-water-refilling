export function hasModule(modules: string[], required: string): boolean {
  if (!required) return true;
  if (modules.includes("*")) return true;
  if (modules.includes(required)) return true;

  const parts = required.split(".");
  for (let i = parts.length - 1; i >= 1; i--) {
    const prefix = parts.slice(0, i).join(".");
    if (modules.includes(`${prefix}.*`)) return true;
  }
  return false;
}

export function hasAnyModule(modules: string[], required: string[]): boolean {
  if (required.length === 0) return true;
  return required.some((m) => hasModule(modules, m));
}
