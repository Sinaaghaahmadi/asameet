"use client";

/**
 * API access layer. Every deployment talks to the real /api/* routes; the
 * session lives in an httpOnly cookie, so requests just need same-origin
 * credentials (the browser default) and no auth plumbing here.
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_PATH}${path}`, { credentials: "same-origin", ...init });
}

/** CSV export — generated server-side for admins. */
export function openExport(kind: string) {
  window.open(`${BASE_PATH}/api/admin/export?kind=${kind}`, "_blank");
}
