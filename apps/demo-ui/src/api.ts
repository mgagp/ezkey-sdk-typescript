import type { CreateAttemptResult, DemoIntegrationStatus, DemoLoginOutcome } from './types.js';

export function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim();
  const base = raw && raw.length > 0 ? raw : 'http://localhost:3000/api';
  return base.replace(/\/+$/, '');
}

export async function fetchDemoStatus(): Promise<DemoIntegrationStatus> {
  const r = await fetch(`${apiBase()}/demo/status`);
  if (!r.ok) {
    throw new Error(`HTTP ${r.status} loading demo status`);
  }
  return r.json() as Promise<DemoIntegrationStatus>;
}

export async function postLoginStart(userIdentifier: string): Promise<CreateAttemptResult> {
  const r = await fetch(`${apiBase()}/demo/login/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIdentifier }),
  });
  return r.json() as Promise<CreateAttemptResult>;
}

export async function postLoginWait(payload: {
  authAttemptId: number;
  userIdentifier: string;
  expiresAtIso: string;
  signal?: AbortSignal;
}): Promise<{ outcome: DemoLoginOutcome }> {
  const r = await fetch(`${apiBase()}/demo/login/wait`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      authAttemptId: payload.authAttemptId,
      userIdentifier: payload.userIdentifier,
      expiresAt: payload.expiresAtIso,
    }),
    signal: payload.signal,
  });
  if (!r.ok) {
    throw new Error(`HTTP ${r.status} during wait`);
  }
  return r.json() as Promise<{ outcome: DemoLoginOutcome }>;
}
