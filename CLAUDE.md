# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cloudflare Worker that provides a web interface for the Arke Institute upload system. This is a modular TypeScript application with a two-phase architecture: a worker-side server and a client-side bundle that orchestrates file uploads through a three-phase workflow.

## Build System

This project uses a **two-step build process** that is critical to understand:

1. **Build client bundle**: `npm run build:client` - Uses esbuild to bundle `src/client/**/*.ts` into `dist/client.js`
2. **Inject into worker**: `npm run inject:client` - Runs `scripts/inject-client.js` which reads the built bundle and injects it as a string literal into `src/client-bundle.ts`

The worker then serves this inlined JavaScript by importing from `src/client-bundle.ts`. This means:
- Client code is compiled separately from worker code
- The worker code imports the client bundle as a pre-built string
- `src/client-bundle.ts` is auto-generated and should not be edited manually
- **Always run both steps** when modifying client code: `npm run build`

### Common Commands

```bash
# Development
npm run dev              # Build once, then start wrangler dev server
npm run dev:watch        # Watch client code and auto-rebuild, run dev server

# Building
npm run build:client     # Build client bundle only (output: dist/client.js)
npm run inject:client    # Inject client bundle into worker code
npm run build            # Build both (client + inject)

# Deployment
npm run deploy           # Build and deploy to Cloudflare Workers
npm run tail             # Stream worker logs
```

## Architecture Overview

### Code Organization

```
src/
├── index.ts                    # Worker entry point - exports fetch handler
├── handler.ts                  # Request router for all endpoints
├── client-bundle.ts            # AUTO-GENERATED - inlined client JS
├── api/                        # Worker-side API handlers
│   ├── orchestrator.ts         # Proxy to orchestrator via service binding
│   ├── ingest.ts              # Proxy to ingest worker via service binding
│   └── upload-proxy.ts         # Proxy to upload server via HTTP
├── templates/                  # Server-side HTML generation
│   ├── layout.ts              # Main HTML shell
│   └── components/            # HTML component generators
├── client/                     # Browser-side code (bundled separately)
│   ├── main.ts                # Client entry point
│   ├── workflow/              # Multi-phase upload orchestration
│   │   ├── upload-workflow.ts # Main coordinator for all phases
│   │   ├── upload-phase.ts    # Phase 1: Upload to upload server
│   │   ├── ingest-phase.ts    # Phase 2: Wait for ingest queue
│   │   └── orchestrator-phase.ts # Phase 3: Poll orchestrator
│   ├── api/                   # Client-side API clients
│   ├── ui/                    # Progress UI and DOM utilities
│   └── types/                 # Client-side type definitions
├── types/
│   └── env.ts                 # Worker environment interface
└── styles/
    └── styles.ts              # Inlined CSS
```

### Three-Phase Upload Workflow

The client orchestrates uploads through three sequential phases:

**Phase 1: Upload Server** (`upload-phase.ts`)
- Browser communicates directly with upload server (CORS)
- Steps: init session → upload files → process batch
- Output: `batchId`

**Phase 2: Ingest Queue** (`ingest-phase.ts`)
- Browser polls worker which proxies to ingest worker via service binding
- Waits for batch to be picked up from queue
- Output: confirmation that processing has begun

**Phase 3: Orchestrator Processing** (`orchestrator-phase.ts`)
- Browser polls worker which proxies to orchestrator via service binding
- Tracks OCR, PINAX extraction, and AI description generation
- Shows `root_pi` link as soon as available (after discovery phase)
- Output: `rootPi` for final archive

All phases report progress to `ProgressManager` which updates the UI.

### Service Bindings

The worker uses Cloudflare service bindings to communicate with other workers:

```typescript
// src/types/env.ts
export interface Env {
  UPLOAD_API_URL: string;         // External upload server (HTTP)
  ARKE_INSTITUTE_URL: string;     // Final archive URL
  ORCHESTRATOR: Fetcher;          // Service binding to arke-orchestrator
  INGEST: Fetcher;                // Service binding to arke-ingest-worker
}
```

Service bindings enable direct worker-to-worker communication without public internet. The worker acts as a proxy:
- Browser → Worker → Service Binding → Other Worker
- No CORS configuration needed for service bindings
- Configured in `wrangler.jsonc`

## Working with This Codebase

### Adding Client-Side Features

1. Add/modify code in `src/client/`
2. Run `npm run build:client && npm run inject:client`
3. Test with `npm run dev`

Client code has access to DOM APIs and uses types from `src/client/types/`.

### Adding Worker-Side Features

1. Add handlers in `src/api/` or modify `src/handler.ts`
2. Update `src/types/env.ts` if new bindings/vars needed
3. Test with `npm run dev`

Worker code runs in Cloudflare Workers runtime (no DOM, limited Node.js APIs).

### Modifying the Upload Workflow

The workflow coordinator is in `src/client/workflow/upload-workflow.ts`. Each phase is a separate class that:
- Takes `ProgressManager` to report progress
- Returns data needed for next phase
- Throws errors which are caught by the coordinator

### Testing Service Bindings

Use the test endpoints to verify service bindings work:

```bash
# Test orchestrator binding
curl http://localhost:8787/api/test-orchestrator?batchId=<batch_id>

# Test ingest binding
curl http://localhost:8787/api/test-ingest?batchId=<batch_id>
```

### TypeScript Configuration

- Worker code: Targets ES2021, uses `@cloudflare/workers-types`
- Client code: Includes DOM types for browser APIs
- Both use strict mode with full type checking
- `tsconfig.json` includes both worker and client code for IDE support

### Common Pitfalls

1. **Forgetting to rebuild client**: After changing `src/client/`, you must run `npm run build:client && npm run inject:client` or the changes won't appear
2. **Service binding URLs**: Use format `https://servicename/path` (not `http://`, not actual domain)
3. **CORS**: Upload server needs CORS headers; service bindings don't need CORS
4. **Build order**: Client must build before worker since worker imports the built bundle

## Configuration

Worker behavior is configured in `wrangler.jsonc`:
- `vars`: Environment variables (URLs, feature flags)
- `services`: Service bindings to other workers
- `compatibility_flags`: Enables Node.js compatibility mode

Update these values for different environments (dev, staging, prod).
