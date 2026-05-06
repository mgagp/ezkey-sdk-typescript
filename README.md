# Ezkey TypeScript SDK Workspace

`ezkey-sdk-typescript` is the TypeScript backend integration workspace for Ezkey.

It contains:

- a framework-agnostic SDK for the Ezkey Integration API;
- a runnable demo application that will evolve toward the official NestJS reference example.

See [`PRODUCT_BRIEF.md`](PRODUCT_BRIEF.md) for the product framing.

## Contract Workflow

This repository follows a simple contract-first workflow from a live Ezkey stack.

The source of truth for the API contract is the live Integration API OpenAPI document exposed by:

- default URL: `http://localhost:7080/api-docs`
- override: `EZKEY_INTEGRATION_API_DOCS_URL`

### Refresh the local OpenAPI spec

```bash
npm run update:spec
```

This downloads the live OpenAPI JSON into:

- `openapi/integration-api.json`

### Generate TypeScript types

```bash
npm run generate:api
```

This generates contract-derived types into:

- `packages/integration-sdk/src/generated/integration-api.ts`

The repository uses `openapi-typescript` for this step.

## Versioning Policy

The following files are versioned in git:

- `openapi/integration-api.json`
- `packages/integration-sdk/src/generated/integration-api.ts`

This keeps contract changes and generated type changes reviewable in pull requests.

## SDK Design Rule

The public SDK is not generated wholesale from OpenAPI.

Instead, this repository uses:

- a versioned OpenAPI contract;
- generated TypeScript types;
- a hand-written public SDK optimized for backend developer experience.

This keeps the contract explicit while preserving a stable, ergonomic API surface for consumers.

## Typical Local Workflow

```bash
npm run update:spec
npm run generate:api
npm run build
```

When the Integration API contract changes:

1. refresh the local OpenAPI spec from the live stack;
2. regenerate TypeScript types;
3. adapt the hand-written SDK if needed;
4. verify the demo application still works;
5. commit the spec, generated types, and SDK changes together.
