/**
 * Centralized API Client for NEXUS-CRIME.
 * Automatically attaches Firebase ID token (or demo-mode header) to every request.
 * All backend API calls should go through this client.
 */

import { getIdToken, isDemoMode } from '../auth/firebase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

/**
 * Builds auth headers for the current session.
 * - Firebase mode: attaches `Authorization: Bearer <idToken>`
 * - Demo mode: attaches `X-Demo-Investigator-Id` header
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  if (isDemoMode()) {
    return {
      'X-Demo-Investigator-Id': 'INV-DEMO-001',
      'X-Auth-Mode': 'demo',
    };
  }

  const token = await getIdToken();
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  // No token available — request will likely be rejected by backend
  return {};
}

/**
 * Core fetch wrapper with automatic auth header injection.
 */
export async function apiFetch(
  path: string,
  options: RequestOptions = {}
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const { headers: customHeaders, ...rest } = options;

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...customHeaders,
    },
  });

  return response;
}

/**
 * GET request with auth.
 */
export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`API GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * POST request with auth and JSON body.
 */
export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`API POST ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * POST request for file uploads with auth (uses FormData, no JSON content-type).
 */
export async function apiUpload(
  path: string,
  formData: FormData
): Promise<Response> {
  const authHeaders = await getAuthHeaders();

  // Remove Content-Type so browser sets multipart/form-data boundary
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      ...authHeaders,
    },
    body: formData,
  });

  return response;
}

export { API_BASE };
