import { Body, Controller, Get, Inject, Post } from '@nestjs/common';

import type { CreateAttemptResult, DemoLoginOutcome } from './demo-auth.service.js';
import { DemoAuthService } from './demo-auth.service.js';
import { DemoService } from './demo.service.js';
import type { DemoIntegrationStatus } from './demo.types.js';

/**
 * JSON-only API consumed by the separate demo UI (Vite). Global prefix {@code api} is applied in {@code main.ts}.
 * {@code GET /health} is excluded from the prefix for simple probes.
 */
@Controller()
export class AppController {
  constructor(
    @Inject(DemoService) private readonly demoService: DemoService,
    @Inject(DemoAuthService) private readonly demoAuthService: DemoAuthService
  ) {}

  @Get('health')
  getHealth(): { ok: boolean; app: string } {
    return {
      ok: true,
      app: 'ezkey-demo-api',
    };
  }

  @Get('demo/status')
  getDemoStatus(): DemoIntegrationStatus {
    return this.demoService.getIntegrationStatus();
  }

  /**
   * Starts MFA: creates an auth attempt via the Integration API (by user identifier).
   */
  @Post('demo/login/start')
  postLoginStart(@Body() body: { userIdentifier?: string }): Promise<CreateAttemptResult> {
    return this.demoAuthService.createAttempt(body?.userIdentifier ?? '');
  }

  /**
   * Waits until the device responds or the attempt expires (long-polling loop server-side).
   */
  @Post('demo/login/wait')
  async postLoginWait(@Body() body: Record<string, unknown>): Promise<{ outcome: DemoLoginOutcome }> {
    const authAttemptId = Number(body?.authAttemptId);
    const userIdentifier = typeof body?.userIdentifier === 'string' ? body.userIdentifier : '';
    const expiresAt = typeof body?.expiresAt === 'string' ? body.expiresAt : '';

    if (
      !Number.isFinite(authAttemptId) ||
      authAttemptId <= 0 ||
      !userIdentifier.trim() ||
      !expiresAt.trim()
    ) {
      return {
        outcome: {
          kind: 'sdk_error',
          message: 'Invalid wait request. Start sign-in again from the UI.',
        },
      };
    }

    const outcome = await this.demoAuthService.waitUntilResolved(
      authAttemptId,
      userIdentifier.trim(),
      expiresAt.trim()
    );
    return { outcome };
  }
}
