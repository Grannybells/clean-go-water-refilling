function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDate(input: string | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === "") return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toISODate(
  input: string | Date | null | undefined,
): string | null {
  const d = toDate(input);
  if (!d) return null;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function todayISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDate(
  input: string | Date | null | undefined,
  fallback = "",
): string {
  const d = toDate(input);
  if (!d) return fallback;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(
  input: string | Date | null | undefined,
  fallback = "",
): string {
  const d = toDate(input);
  if (!d) return fallback;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
