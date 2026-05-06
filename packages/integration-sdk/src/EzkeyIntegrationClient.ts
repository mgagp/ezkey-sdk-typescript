/*
 * Ezkey - Open Source Cryptographic MFA Platform
 *
 * Copyright (c) 2025 Ezkey contributors
 * Licensed under the MIT License. See LICENSE file in the project root for full license information.
 */

import type {
  AuthAttemptCancelResult,
  AuthAttemptContext,
  AuthAttemptCreateResult,
  AuthAttemptSnapshot,
  AuthAttemptWaitResult,
  EzkeyIntegrationSdkConfig,
} from './types.js';
import { EzkeyIntegrationError } from './EzkeyIntegrationError.js';

const AUTH_ATTEMPTS_PATH = '/api/v1/auth-attempts';
const DEFAULT_BASE_URL = 'https://exp1-integration-api.ezkey.org';
const ENV_BASE_URL = 'EZKEY_BASE_URL';
const ENV_INTEGRATION_KEY = 'EZKEY_INTEGRATION_KEY';
const ENV_SECRET_KEY = 'EZKEY_SECRET_KEY';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function buildBasicAuthHeader(integrationKey: string, secretKey: string): string {
  const encoded = Buffer.from(`${integrationKey}:${secretKey}`, 'utf8').toString('base64');
  return `Basic ${encoded}`;
}

/** Extra guidance when Integration API returns 401 with no JSON/detail body (common with Spring Security). */
function integration401Hint(body: string): string {
  const trimmed = body?.trim() ?? '';
  const extracted = extractErrorMessage(trimmed);
  if (trimmed.length > 0 && extracted !== 'No details provided.') {
    return extracted;
  }
  return (
    'Verify EZKEY_INTEGRATION_KEY and EZKEY_SECRET_KEY match an active API key (secret is the plaintext shown once at creation). ' +
    'If the key has an IP whitelist, allow your client address (local dev on this machine: 127.0.0.1 or ::1).'
  );
}

function extractErrorMessage(body: string): string {
  if (!body || !body.trim()) {
    return 'No details provided.';
  }
  try {
    const obj = JSON.parse(body) as Record<string, unknown>;
    const detail = obj.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    const title = obj.title;
    if (typeof title === 'string' && title.trim()) {
      return title;
    }
    const message = obj.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  } catch {
    /* not JSON */
  }
  return body.length > 200 ? `${body.substring(0, 200)}...` : body;
}

/** @internal */
async function consumeBodyText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

/**
 * Thin, dependency-free Integration API client (API key authentication, HTTP Basic).
 *
 * Mirrors the machine-to-machine flow used by the Ezkey Java SDK (`org.ezkey.sdk.EzkeyClient`):
 * create attempt, long-poll wait, cancel.
 */
export class EzkeyIntegrationClient {
  private readonly normalizedBaseUrl: string;
  private readonly authHeader: string;
  private readonly defaultTimeoutMs: number;
  private readonly waitTimeoutMs: number;

  /**
   * @param config - Base URL plus integration key pair
   */
  constructor(config: EzkeyIntegrationSdkConfig) {
    if (!config.baseUrl?.trim()) {
      throw new Error('baseUrl must not be blank');
    }
    if (!config.integrationKey?.trim()) {
      throw new Error('integrationKey must not be blank');
    }
    if (!config.secretKey?.trim()) {
      throw new Error('secretKey must not be blank');
    }
    this.normalizedBaseUrl = normalizeBaseUrl(config.baseUrl);
    this.authHeader = buildBasicAuthHeader(config.integrationKey.trim(), config.secretKey.trim());
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 30_000;
    this.waitTimeoutMs = config.waitTimeoutMs ?? 300_000;
  }

  /**
   * Builds from {@code EZKEY_BASE_URL}, {@code EZKEY_INTEGRATION_KEY}, {@code EZKEY_SECRET_KEY}.
   *
   * @throws Error when required variables are missing
   */
  static fromEnvironment(): EzkeyIntegrationClient {
    const ik = process.env[ENV_INTEGRATION_KEY]?.trim();
    const sk = process.env[ENV_SECRET_KEY]?.trim();
    const base = process.env[ENV_BASE_URL]?.trim() || DEFAULT_BASE_URL;
    if (!ik) {
      throw new Error(`Environment variable ${ENV_INTEGRATION_KEY} is required`);
    }
    if (!sk) {
      throw new Error(`Environment variable ${ENV_SECRET_KEY} is required`);
    }
    return new EzkeyIntegrationClient({
      baseUrl: base,
      integrationKey: ik,
      secretKey: sk,
    });
  }

  /** Current normalized base URL. */
  getBaseUrl(): string {
    return this.normalizedBaseUrl;
  }

  /**
   * {@code POST /api/v1/auth-attempts} with {@code enrollmentId}.
   */
  async createAuthAttempt(
    enrollmentId: number,
    challengeRequested: boolean,
    context?: AuthAttemptContext | null
  ): Promise<AuthAttemptCreateResult> {
    return this.createAuthAttemptInternal({ enrollmentId, challengeRequested }, context);
  }

  /**
   * {@code POST /api/v1/auth-attempts} with {@code userIdentifier} lookup within the integration.
   */
  async createAuthAttemptByUserIdentifier(
    userIdentifier: string,
    challengeRequested: boolean,
    context?: AuthAttemptContext | null
  ): Promise<AuthAttemptCreateResult> {
    const uid = userIdentifier?.trim();
    if (!uid) {
      throw new Error('userIdentifier must not be blank');
    }
    return this.createAuthAttemptInternal({ userIdentifier: uid, challengeRequested }, context);
  }

  private async createAuthAttemptInternal(
    core: Record<string, string | number | boolean>,
    context: AuthAttemptContext | null | undefined
  ): Promise<AuthAttemptCreateResult> {
    const body: Record<string, string | number | boolean> = { ...core };
    if (context?.contextTitle != null && context.contextTitle !== '') {
      body.contextTitle = context.contextTitle;
    }
    if (context?.contextMessage != null && context.contextMessage !== '') {
      body.contextMessage = context.contextMessage;
    }

    const res = await this.doFetch('POST', AUTH_ATTEMPTS_PATH, JSON.stringify(body), false);
    await this.ensureStatus(res, 201);
    const text = await consumeBodyText(res);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new EzkeyIntegrationError('Invalid JSON in create auth attempt response', res.status, text);
    }

    const authAttemptId = Number(parsed.authAttemptId);
    if (!Number.isFinite(authAttemptId)) {
      throw new EzkeyIntegrationError('Missing authAttemptId in response', res.status, text);
    }

    const challengeRaw = parsed.authAttemptChallenge;
    const authAttemptChallenge =
      challengeRaw === null || challengeRaw === undefined
        ? null
        : typeof challengeRaw === 'number'
          ? challengeRaw
          : typeof challengeRaw === 'string'
            ? Number(challengeRaw)
            : NaN;

    return {
      authAttemptId,
      authAttemptChallenge: Number.isFinite(authAttemptChallenge) ? authAttemptChallenge : null,
      timeoutSeconds: typeof parsed.timeoutSeconds === 'number' ? parsed.timeoutSeconds : 120,
      expiresAt: typeof parsed.expiresAt === 'string' ? parsed.expiresAt : null,
      contextTitle: typeof parsed.contextTitle === 'string' ? parsed.contextTitle : null,
      contextMessage: typeof parsed.contextMessage === 'string' ? parsed.contextMessage : null,
    };
  }

  /**
   * {@code GET /api/v1/auth-attempts/{id}/wait} long-polling wait.
   */
  async waitForAuthAttempt(
    authAttemptId: number,
    timeoutSeconds = 30,
    pollingSeconds = 2
  ): Promise<AuthAttemptWaitResult> {
    const path = `${AUTH_ATTEMPTS_PATH}/${authAttemptId}/wait?timeout=${timeoutSeconds}&polling=${pollingSeconds}`;
    const res = await this.doFetch('GET', path, undefined, true);
    await this.ensureStatus(res, 200);
    const text = await consumeBodyText(res);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new EzkeyIntegrationError('Invalid JSON in wait response', res.status, text);
    }

    const authAttempt =
      parsed.authAttempt && typeof parsed.authAttempt === 'object'
        ? (parsed.authAttempt as AuthAttemptSnapshot)
        : null;

    const status = typeof parsed.status === 'string' ? parsed.status : '';
    const completed = Boolean(parsed.completed);
    const timeoutReached = Boolean(parsed.timeoutReached);

    return {
      authAttempt,
      status,
      completed,
      timeoutReached,
      waitDuration: typeof parsed.waitDuration === 'number' ? parsed.waitDuration : null,
      completedAt: typeof parsed.completedAt === 'string' ? parsed.completedAt : null,
    };
  }

  /**
   * {@code POST /api/v1/auth-attempts/{id}/cancel}.
   */
  async cancelAuthAttempt(authAttemptId: number): Promise<AuthAttemptCancelResult> {
    const path = `${AUTH_ATTEMPTS_PATH}/${authAttemptId}/cancel`;
    const res = await this.doFetch('POST', path, undefined, false);
    await this.ensureStatus(res, 200);
    const text = await consumeBodyText(res);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new EzkeyIntegrationError('Invalid JSON in cancel response', res.status, text);
    }

    const id = Number(parsed.authAttemptId ?? authAttemptId);
    const authAttemptStatus =
      typeof parsed.authAttemptStatus === 'string' ? parsed.authAttemptStatus : null;

    return { authAttemptId: id, authAttemptStatus };
  }

  private async doFetch(
    method: 'GET' | 'POST',
    path: string,
    body: string | undefined,
    isWait: boolean
  ): Promise<Response> {
    const url = `${this.normalizedBaseUrl}${path}`;
    const timeoutMs = isWait ? this.waitTimeoutMs : this.defaultTimeoutMs;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        method,
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body === undefined ? undefined : body,
        signal: controller.signal,
      });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new EzkeyIntegrationError(
          `Request timed out after ${timeoutMs}ms to ${method} ${path}`,
          0,
          ''
        );
      }
      throw new EzkeyIntegrationError(
        `Network error connecting to Ezkey Integration API at ${this.normalizedBaseUrl}: ${e instanceof Error ? e.message : String(e)}`,
        0,
        ''
      );
    } finally {
      clearTimeout(t);
    }
  }

  private async ensureStatus(res: Response, expected: number): Promise<void> {
    if (res.status === expected) {
      return;
    }
    const text = await consumeBodyText(res);
    const fallback = `Unexpected HTTP ${res.status} from Integration API`;
    const message = (() => {
      switch (res.status) {
        case 401:
          return `Authentication failed (401). ${integration401Hint(text)}`;
        case 403:
          return `Access denied (403). Enrollment may not belong to this integration. ${extractErrorMessage(text)}`;
        case 404:
          return `Resource not found (404). Check auth attempt ID and base URL. ${extractErrorMessage(text)}`;
        case 400:
          return `Bad request (400). ${extractErrorMessage(text)}`;
        case 429:
          return `Rate limit exceeded (429). ${extractErrorMessage(text)}`;
        case 503:
          return `Service unavailable (503). ${extractErrorMessage(text)}`;
        default:
          return `${fallback}: ${extractErrorMessage(text)}`;
      }
    })();
    throw new EzkeyIntegrationError(message.trim(), res.status, text);
  }
}
