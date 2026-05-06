# `ezkey-integration-sdk`

Minimal TypeScript client for the **Ezkey Integration API** (machine-to-machine, HTTP Basic with integration key + secret).

This package is published from [`ezkey-sdk-typescript`](../..) alongside a runnable demo application.

## Supported operations

- `POST /api/v1/auth-attempts` — create attempt (`enrollmentId` or `userIdentifier`)
- `GET /api/v1/auth-attempts/{id}/wait` — long-poll for completion
- `POST /api/v1/auth-attempts/{id}/cancel` — cancel pending/read attempt

## Quick usage

```typescript
import { EzkeyIntegrationClient } from 'ezkey-integration-sdk';

const client = new EzkeyIntegrationClient({
  baseUrl: process.env.EZKEY_BASE_URL!,
  integrationKey: process.env.EZKEY_INTEGRATION_KEY!,
  secretKey: process.env.EZKEY_SECRET_KEY!,
});

const created = await client.createAuthAttempt(42, false);
const waited = await client.waitForAuthAttempt(created.authAttemptId, 60, 2);
console.log(waited.status, waited.completed);
```

Or `EzkeyIntegrationClient.fromEnvironment()`, which requires all three: `EZKEY_BASE_URL` (no default—your Integration API origin), `EZKEY_INTEGRATION_KEY`, and `EZKEY_SECRET_KEY`.

## Requirements

- Node.js 18+ (global `fetch`)

## Documentation

See the repository root [**README**](https://github.com/mgagp/ezkey-sdk-typescript#readme) and [`docs/`](../..//docs/).

## License

MIT
