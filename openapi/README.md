# OpenAPI Artifacts

This directory contains the versioned local OpenAPI contract used by `ezkey-sdk-typescript`.

## Canonical file

- `integration-api.json`

## Update workflow

Refresh the contract from a live Ezkey Integration API stack with:

```bash
npm run update:spec
```

By default, the script fetches:

- `http://localhost:7080/api-docs`

Override the source URL with:

- `EZKEY_INTEGRATION_API_DOCS_URL`
