import { Inject, Injectable } from '@nestjs/common';
import { EzkeyIntegrationClient, EzkeyIntegrationError } from 'ezkey-integration-sdk';

import { DemoConfigService } from './demo-config.service.js';

export type DemoLoginOutcome =
  | {
      kind: 'not_configured';
      message: string;
    }
  | {
      kind: 'missing_user_identifier';
      message: string;
    }
  | {
      kind: 'sdk_error';
      message: string;
      detail?: string;
    }
  | {
      kind: 'expired';
      message: string;
    }
  | {
      kind: 'completed';
      userIdentifier: string;
      authAttemptId: number;
      enrollmentId: number | null;
      waitStatus: string;
      attemptStatus: string | null;
      completed: boolean;
      timeoutReached: boolean;
    }
  | {
      kind: 'rejected';
      userIdentifier: string;
      authAttemptId: number;
      enrollmentId: number | null;
      waitStatus: string;
      attemptStatus: string | null;
    }
  | {
      kind: 'attempt_closed';
      userIdentifier: string;
      authAttemptId: number;
      enrollmentId: number | null;
      waitStatus: string;
      attemptStatus: string | null;
      /** Terminal status from the Integration API (e.g. INVALID, EXPIRED). */
      terminalStatus: string;
    };

export type CreateAttemptResult =
  | {
      ok: true;
      authAttemptId: number;
      timeoutSeconds: number;
      expiresAtIso: string;
      userIdentifier: string;
    }
  | { ok: false; outcome: DemoLoginOutcome };

/**
 * Demo auth: create attempt by {@code userIdentifier}, then wait on the Integration API (chunked long-poll).
 */
@Injectable()
export class DemoAuthService {
  constructor(@Inject(DemoConfigService) private readonly configService: DemoConfigService) {}

  private buildClient(): EzkeyIntegrationClient {
    return new EzkeyIntegrationClient({
      baseUrl: this.configService.baseUrl,
      integrationKey: this.configService.integrationKey,
      secretKey: this.configService.secretKey,
    });
  }

  async createAttempt(rawUserIdentifier: string): Promise<CreateAttemptResult> {
    if (this.configService.getMissingVariables().length > 0) {
      return {
        ok: false,
        outcome: {
          kind: 'not_configured',
          message: 'Configure EZKEY_INTEGRATION_KEY and EZKEY_SECRET_KEY before calling this API.',
        },
      };
    }

    const userIdentifier = rawUserIdentifier?.trim() ?? '';

    if (!userIdentifier) {
      return {
        ok: false,
        outcome: {
          kind: 'missing_user_identifier',
          message:
            'Enter the enrollment user identifier (the integrated-app user id stored on the enrollment in Ezkey).',
        },
      };
    }

    try {
      const client = this.buildClient();
      const created = await client.createAuthAttemptByUserIdentifier(userIdentifier, false);
      const timeoutSeconds = Math.min(Math.max(created.timeoutSeconds ?? 120, 1), 86400);
      const expiresAtIso =
        created.expiresAt?.trim() ||
        new Date(Date.now() + timeoutSeconds * 1000).toISOString();

      return {
        ok: true,
        authAttemptId: created.authAttemptId,
        timeoutSeconds,
        expiresAtIso,
        userIdentifier,
      };
    } catch (error) {
      return {
        ok: false,
        outcome: this.mapUnknownError(error),
      };
    }
  }

  async waitUntilResolved(
    authAttemptId: number,
    userIdentifier: string,
    expiresAtIso: string
  ): Promise<DemoLoginOutcome> {
    if (this.configService.getMissingVariables().length > 0) {
      return {
        kind: 'not_configured',
        message: 'Configure EZKEY_INTEGRATION_KEY and EZKEY_SECRET_KEY before calling this API.',
      };
    }

    const deadline = new Date(expiresAtIso).getTime();
    if (!Number.isFinite(deadline)) {
      return {
        kind: 'sdk_error',
        message: 'Invalid session expiry. Start sign-in again.',
      };
    }

    const client = this.buildClient();

    try {
      while (Date.now() < deadline) {
        const remainingSec = Math.ceil((deadline - Date.now()) / 1000);
        if (remainingSec <= 0) {
          break;
        }
        const chunk = Math.min(120, Math.max(2, remainingSec));
        const waited = await client.waitForAuthAttempt(authAttemptId, chunk, 2);

        if (waited.completed) {
          const attemptStatusRaw =
            waited.authAttempt?.authAttemptStatus != null
              ? String(waited.authAttempt.authAttemptStatus)
              : String(waited.status ?? '');
          const normalized = attemptStatusRaw.trim().toUpperCase();

          const enrollmentId =
            typeof waited.authAttempt?.enrollmentId === 'number'
              ? waited.authAttempt.enrollmentId
              : null;

          const attemptStatus =
            waited.authAttempt?.authAttemptStatus != null
              ? String(waited.authAttempt.authAttemptStatus)
              : null;

          const waitStatusStr = String(waited.status);

          if (normalized === 'ACCEPTED') {
            return {
              kind: 'completed',
              userIdentifier,
              authAttemptId,
              enrollmentId,
              waitStatus: waitStatusStr,
              attemptStatus,
              completed: waited.completed,
              timeoutReached: waited.timeoutReached,
            };
          }

          if (normalized === 'REJECTED') {
            return {
              kind: 'rejected',
              userIdentifier,
              authAttemptId,
              enrollmentId,
              waitStatus: waitStatusStr,
              attemptStatus,
            };
          }

          return {
            kind: 'attempt_closed',
            userIdentifier,
            authAttemptId,
            enrollmentId,
            waitStatus: waitStatusStr,
            attemptStatus,
            terminalStatus: normalized || attemptStatusRaw,
          };
        }
      }

      return {
        kind: 'expired',
        message:
          'Time ran out before the device responded. Approve or deny faster next time, or start again.',
      };
    } catch (error) {
      return this.mapUnknownError(error);
    }
  }

  private mapUnknownError(error: unknown): DemoLoginOutcome {
    if (error instanceof EzkeyIntegrationError) {
      return {
        kind: 'sdk_error',
        message: error.message,
        detail: error.responseBody?.trim() ? error.responseBody : undefined,
      };
    }

    return {
      kind: 'sdk_error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
