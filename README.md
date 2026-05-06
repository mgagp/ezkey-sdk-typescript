# Ezkey TypeScript SDK Workspace

`ezkey-sdk-typescript` is the TypeScript backend integration workspace for Ezkey.

It contains:

- a framework-agnostic SDK for the Ezkey Integration API;
- a **split reference demo**: `apps/demo-ui` (Vite + vanilla TypeScript — merchant UI only) and `apps/demo-api` (NestJS JSON API — Integration SDK + Ezkey only).

See [`PRODUCT_BRIEF.md`](PRODUCT_BRIEF.md) for the product framing.

## Quick test

Use this path when you only want to run the split demo against the shared **EXP1** Integration API.

1. **Install and build** (from the repo root). `npm run build` compiles the SDK, demo API, and demo UI and catches TypeScript errors before you run the dev servers:

   ```bash
   npm install
   npm run build
   ```

2. **Default Integration API URL**: if you do not set `EZKEY_BASE_URL`, the demo API targets **EXP1** at `https://exp1-integration-api.ezkey.org` (see `apps/demo-api/.env.example`).

3. **Backend environment file**: copy `apps/demo-api/.env.example` to `apps/demo-api/.env` and set your **integration key pair**—at minimum `EZKEY_INTEGRATION_KEY` and `EZKEY_SECRET_KEY` (the public integration key and the secret shown once at key creation). No Ezkey credentials belong in the UI; only this API process uses them.

4. **Run API and UI in two separate terminals** (from the repo root after `npm install` and `npm run build`). Each window runs one npm script:

   **Terminal 1 — `npm run demo:api`** (Nest demo API, watch mode):

   ```bash
   npm run demo:api
   ```

   **Terminal 2 — `npm run demo:ui`** (Vite demo UI):

   ```bash
   npm run demo:ui
   ```

5. Open **http://localhost:5173** in a browser. The UI calls the demo API; the demo API calls Ezkey using `ezkey-integration-sdk`.

For a single command that starts both processes, `npm run demo` is available. CORS, optional UI env, and behaviour details are in the **Demo (split UI + API)** section below.

## Contract Workflow

This repository follows a simple contract-first workflow from a live Ezkey stack.

The source of truth for the API contract is the live Integration API OpenAPI document exposed by:

- default URL: `https://exp1-integration-api.ezkey.org/api-docs` (EXP1)
- override: `EZKEY_INTEGRATION_API_DOCS_URL` (use `http://localhost:7080/api-docs` for a local Integration API)

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

## Demo (split UI + API)

Two processes represent a realistic integration: the **browser only talks to your demo API**; the **demo API alone** calls Ezkey with `ezkey-integration-sdk`.

### 1. Configuration

**Demo API** (`apps/demo-api`): copy `.env.example` to `apps/demo-api/.env` and set `EZKEY_*` (Integration API URL + API key pair). Optional: `PORT` (default `3000`), `DEMO_UI_ORIGIN` (CORS — default `http://localhost:5173`). Multiple origins allowed as a comma-separated list.

**Demo UI** (`apps/demo-ui`): optional `apps/demo-ui/.env` with `VITE_API_BASE_URL` (default `http://localhost:3000/api` — must include the `/api` prefix).

### 2. Run both (recommended)

From the repo root:

```bash
npm install
npm run build
npm run demo
```

This starts the **API** (watch) and the **Vite UI** together via `concurrently`. Use the same `npm install` / `npm run build` prerequisite before the two-terminal commands below.

Or run two terminals (same npm commands as in **Quick test**):

**Terminal 1 — `npm run demo:api`**

```bash
npm run demo:api
```

**Terminal 2 — `npm run demo:ui`**

```bash
npm run demo:ui
```

Open **http://localhost:5173**. The UI calls `VITE_API_BASE_URL` (see above).

### 3. CORS

The demo API enables CORS only for origins listed in `DEMO_UI_ORIGIN`. If you change the Vite port or use preview on another origin, update `DEMO_UI_ORIGIN` to match (or add several comma-separated origins).

### 4. Behaviour

Enter the enrollment **user identifier** on the UI. The UI calls `POST .../demo/login/start` then `POST .../demo/login/wait` on the demo API; the API uses `createAuthAttemptByUserIdentifier` and chunked waits against Ezkey — no JSON mapping file.

When the Integration API contract changes:

1. refresh the local OpenAPI spec from the live stack;
2. regenerate TypeScript types;
3. adapt the hand-written SDK if needed;
4. verify both demo apps still work;
5. commit the spec, generated types, and SDK changes together.
