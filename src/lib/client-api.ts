"use client";

/** Same-origin fetch that respects a deployment base path and sends cookies. */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_PATH}${path}`, { credentials: "same-origin", ...init });
}
