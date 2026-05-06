/*
 * Ezkey - Open Source Cryptographic MFA Platform
 *
 * Copyright (c) 2025 Ezkey contributors
 * Licensed under the MIT License. See LICENSE file in the project root for full license information.
 */

import type { components, operations, paths } from './generated/integration-api.js';

/** Raw OpenAPI path map generated from the live Integration API contract. */
export type IntegrationApiPaths = paths;

/** Raw OpenAPI operation map generated from the live Integration API contract. */
export type IntegrationApiOperations = operations;

/** Raw OpenAPI schema map generated from the live Integration API contract. */
export type IntegrationApiSchemas = components['schemas'];

/**
 * Contract-derived request body for {@code POST /api/v1/auth-attempts}.
 *
 * The public SDK keeps a smaller convenience surface on top of this shape.
 */
export type AuthAttemptCreateRequestBody = components['schemas']['AuthAttemptCreateRequestDto'];

/** Contract-derived auth attempt object returned by the Integration API. */
export type AuthAttemptDto = components['schemas']['AuthAttemptDto'];

/** Contract-derived wait response body returned by the Integration API. */
export type AuthAttemptWaitResponseBody = components['schemas']['AuthAttemptWaitResponseDto'];

/**
 * Known auth attempt statuses exposed by the Integration API.
 *
 * `EXPIRED` is included here because it exists on the auth attempt object itself and is useful on
 * the consumer side even when some endpoint-specific response enums are narrower.
 */
export type AuthAttemptStatus = AuthAttemptDto['authAttemptStatus'] | 'EXPIRED';

/**
 * Immutable configuration for connecting to the Ezkey Integration API using API key credentials.
 */
export interface EzkeyIntegrationSdkConfig {
  /**
   * Integration API base URL (no trailing slash). Ezkey is normally on-prem or customer-hosted—there is
   * no SDK-wide default; use the origin where your Integration API is deployed (for example
   * {@code https://integration-api.example.com} or {@code http://localhost:7080} for local development).
   */
  baseUrl: string;
  /** Public integration key ({@code ezkey_ikey_...}). */
  integrationKey: string;
  /** Secret key ({@code ezkey_skey_...}). */
  secretKey: string;
  /**
   * Abort timeout for ordinary requests (create, cancel), in milliseconds.
   * @defaultValue 30_000
   */
  defaultTimeoutMs?: number;
  /**
   * Abort timeout for long-poll {@code /wait}, in milliseconds.
   * @defaultValue 300_000
   */
  waitTimeoutMs?: number;
}

/**
 * Optional business context surfaced on the mobile approval card.
 */
export type AuthAttemptContext = Pick<AuthAttemptCreateRequestBody, 'contextTitle' | 'contextMessage'>;

/**
 * Public SDK response shape for {@code POST /api/v1/auth-attempts} (201 Created).
 *
 * The current Integration API OpenAPI document does not yet provide a strongly typed 201 body for
 * this operation, so the SDK keeps this result shape explicit and stable.
 */
export interface AuthAttemptCreateResult {
  authAttemptId: number;
  authAttemptChallenge: number | null;
  timeoutSeconds: number;
  expiresAt: string | null;
  contextTitle: string | null;
  contextMessage: string | null;
}

/**
 * Public SDK view of the auth attempt object returned inside the wait envelope.
 */
export type AuthAttemptSnapshot = AuthAttemptDto;

/**
 * Public SDK response shape for {@code GET /api/v1/auth-attempts/{id}/wait}.
 *
 * The SDK keeps nullable guards in case the live backend returns an incomplete payload during
 * transitional contract changes, while still aligning field names with the generated contract.
 */
export interface AuthAttemptWaitResult {
  authAttempt: AuthAttemptSnapshot | null;
  status: AuthAttemptStatus | string;
  completed: boolean;
  timeoutReached: boolean;
  waitDuration: number | null;
  completedAt: string | null;
}

/**
 * Response body from {@code POST /api/v1/auth-attempts/{id}/cancel}.
 */
export interface AuthAttemptCancelResult {
  authAttemptId: number;
  authAttemptStatus: string | null;
}
