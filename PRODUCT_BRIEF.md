# Ezkey TypeScript SDK Product Brief

## Purpose

`ezkey-sdk-typescript` exists to provide a practical, developer-friendly TypeScript backend integration path for Ezkey.

The repository is intended for developers who want to adopt Ezkey in a backend stack built with TypeScript. Its primary goal is to make Ezkey Integration API usage simple, clear, and realistic for modern Node.js backend teams.

## Product Position

This repository is not a general JavaScript frontend SDK and it is not a mobile SDK.

It is a backend-first TypeScript integration workspace built around two complementary parts:

- a framework-agnostic TypeScript SDK for Ezkey Integration API operations;
- a runnable split reference demo: a **Vite + TypeScript merchant UI** and a **NestJS JSON API** that alone uses the SDK against Ezkey (two processes, realistic boundaries).

The SDK is the product. The NestJS example is the reference adoption path.

## Target Audience

The primary audience is:

- backend developers integrating Ezkey into a Node.js or TypeScript application;
- teams using frameworks such as NestJS, Fastify, Express, or custom Node.js services;
- developers who want a clear machine-to-machine integration path using Ezkey API keys and the Integration API.

The secondary audience is:

- evaluators exploring Ezkey adoption from a TypeScript stack;
- contributors who want a concrete example of how the SDK should be used in a real application.

## Core Problem

Developers adopting Ezkey from a TypeScript backend should not need to reverse-engineer the Integration API from raw HTTP calls or infer the recommended integration shape from unrelated examples.

They need:

- a small and dependable SDK surface for common Integration API workflows;
- clear typing and predictable error handling;
- a realistic reference application that shows how Ezkey fits into a modern backend flow;
- documentation and structure that make the intended adoption path obvious.

## Product Goals

### 1. Provide a framework-agnostic backend SDK

The core SDK should remain independent from any specific web framework. It should work cleanly in NestJS, Fastify, Express, and plain Node.js backends.

### 2. Focus on the Integration API adoption path

The repository should prioritize the machine-to-machine backend integration surface that application developers need when they want to create, wait for, and cancel Ezkey authentication attempts.

### 3. Offer a realistic NestJS reference example

The repository should include a runnable example: a NestJS **API** that embeds the SDK, plus a separate **browser UI** (Vite, vanilla TypeScript) that calls only that API. Together they demonstrate how a TypeScript backend uses the SDK in a practical login or approval flow while staying small enough to understand quickly.

### 4. Keep the example useful but lightweight

The example should include both a minimal backend API and a small UI (separate dev servers), but it must remain clearly positioned as a reference demo, not as a second product inside the repository.

### 5. Make the repository easy to understand

The repository structure, naming, and documentation should help a developer understand within a few minutes:

- what the SDK is for;
- what the example is for;
- which package is published;
- how to run the example;
- how to adopt the SDK in another TypeScript backend.

## Non-Goals

The initial scope of this repository does not aim to provide:

- a browser-first client SDK;
- a mobile SDK;
- full coverage of every Ezkey API surface if that would dilute the primary backend integration purpose;
- multiple framework examples at the start;
- a production-ready starter kit for every TypeScript architecture style.

## Repository Intent

`ezkey-sdk-typescript` should be a single repository that contains:

- the published TypeScript integration SDK;
- a runnable split demo (NestJS API + Vite UI);
- supporting documentation for adoption and local evaluation.

At this stage, the example should stay in the same repository as the SDK so the product surface, example usage, and documentation evolve together.

## Initial Product Shape

The intended initial shape is:

- one publishable SDK package focused on the Ezkey Integration API;
- one NestJS **demo API** using the SDK (Ezkey credentials server-side only);
- one **demo UI** (Vite) that talks only to that API over HTTP;
- configuration that allows a developer to connect the API to a real Ezkey instance and API key, and the UI to the API base URL.

The example should be simple enough to read as documentation, but real enough to be used for local exploration and manual validation.

## Design Principles

### Simplicity

Prefer the smallest SDK surface that solves the main integration tasks well.

### Pragmatism

Optimize for real backend adoption, not for theoretical completeness.

### Clarity

Make the intended integration path obvious in the API design, repository structure, and documentation.

### Agnostic core, opinionated example

Keep the SDK framework-agnostic, while allowing the example application to make an opinionated framework choice for clarity and developer familiarity.

### Realistic demonstration

The example should reflect how a backend team would actually integrate Ezkey: API keys and SDK usage stay on the server; the browser talks only to the merchant backend; plus a minimal user-facing UI on a separate origin in development.

## Success Criteria

This repository is successful when:

- a TypeScript backend developer can quickly understand whether the SDK fits their stack;
- the SDK feels straightforward to use from any Node.js backend framework;
- the split NestJS API + UI example clearly demonstrates the recommended integration path;
- the example helps developers test Ezkey against a real backend instance without unnecessary setup complexity;
- the repository remains small, coherent, and easy to maintain.

## Immediate Direction

The initial implementation direction is:

1. keep the SDK focused on Integration API workflows;
2. keep the SDK framework-agnostic;
3. provide one official NestJS example with a small UI and backend;
4. treat the example as a reference integration, not as a separate product;
5. refine repository structure and naming so this intent is obvious from the top level.
