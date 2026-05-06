/** Mirrors {@code DemoIntegrationStatus} from the demo API. */
export interface DemoIntegrationStatus {
  configured: boolean;
  clientReady: boolean;
  baseUrl: string;
  integrationKeyPreview: string | null;
  missingVariables: string[];
  statusMessage: string;
}

/** Mirrors {@code DemoLoginOutcome} from the demo API. */
export type DemoLoginOutcome =
  | { kind: 'not_configured'; message: string }
  | { kind: 'missing_user_identifier'; message: string }
  | { kind: 'sdk_error'; message: string; detail?: string }
  | { kind: 'expired'; message: string }
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
