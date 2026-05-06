import { Injectable } from '@nestjs/common';

@Injectable()
export class DemoConfigService {
  readonly baseUrl = process.env.EZKEY_BASE_URL?.trim() || 'http://localhost:7080';

  readonly integrationKey = process.env.EZKEY_INTEGRATION_KEY?.trim() || '';

  readonly secretKey = process.env.EZKEY_SECRET_KEY?.trim() || '';

  getMissingVariables(): string[] {
    const missing: string[] = [];

    if (!this.integrationKey) {
      missing.push('EZKEY_INTEGRATION_KEY');
    }
    if (!this.secretKey) {
      missing.push('EZKEY_SECRET_KEY');
    }

    return missing;
  }

  isConfigured(): boolean {
    return this.getMissingVariables().length === 0;
  }
}
