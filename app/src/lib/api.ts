import { API_BASE_URL, STORAGE_KEYS } from './constants';
import { secureStorage } from './secureStorage';

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

type Options = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  timeoutMs?: number;
};

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const m = (payload as { message?: unknown }).message;
    if (typeof m === 'string' && m.length > 0) return m;
  }
  return fallback;
}

export async function apiRequest<T = unknown>(
  path: string,
  { body, headers = {}, auth = true, timeoutMs = 15000, ...init }: Options = {},
): Promise<T> {
  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = await secureStorage.getItem(STORAGE_KEYS.authToken);
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: finalHeaders,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out', null);
    }
    throw new ApiError(0, 'Network request failed', null);
  }
  clearTimeout(timer);

  const payload = await readJson(response);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractMessage(payload, `Request failed (${response.status})`),
      payload,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, opts?: Options) =>
    apiRequest<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Options) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: Options) =>
    apiRequest<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: Options) =>
    apiRequest<T>(path, { ...opts, method: 'DELETE' }),
};
