export interface DemoIntegrationStatus {
  configured: boolean;
  clientReady: boolean;
  baseUrl: string;
  integrationKeyPreview: string | null;
  missingVariables: string[];
  statusMessage: string;
}
