import { Inject, Injectable } from '@nestjs/common';
import { EzkeyIntegrationClient } from 'ezkey-integration-sdk';

import { DemoConfigService } from './demo-config.service.js';
import type { DemoIntegrationStatus } from './demo.types.js';

@Injectable()
export class DemoService {
  constructor(@Inject(DemoConfigService) private readonly configService: DemoConfigService) {}

  getIntegrationStatus(): DemoIntegrationStatus {
    const missingVariables = this.configService.getMissingVariables();

    if (missingVariables.length > 0) {
      return {
        configured: false,
        clientReady: false,
        baseUrl: this.configService.baseUrl,
        integrationKeyPreview: this.getIntegrationKeyPreview(),
        missingVariables,
        statusMessage: 'Set the missing environment variables to enable Ezkey Integration API calls.',
      };
    }

    try {
      new EzkeyIntegrationClient({
        baseUrl: this.configService.baseUrl,
        integrationKey: this.configService.integrationKey,
        secretKey: this.configService.secretKey,
      });

      return {
        configured: true,
        clientReady: true,
        baseUrl: this.configService.baseUrl,
        integrationKeyPreview: this.getIntegrationKeyPreview(),
        missingVariables: [],
        statusMessage: 'SDK configuration is valid. This API is ready for integration flows.',
      };
    } catch (error) {
      return {
        configured: true,
        clientReady: false,
        baseUrl: this.configService.baseUrl,
        integrationKeyPreview: this.getIntegrationKeyPreview(),
        missingVariables: [],
        statusMessage: `SDK configuration is present but invalid: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private getIntegrationKeyPreview(): string | null {
    const key = this.configService.integrationKey;

    if (!key) {
      return null;
    }

    if (key.length <= 16) {
      return key;
    }

    return `${key.slice(0, 12)}...${key.slice(-4)}`;
  }
}
