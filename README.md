# Arke Upload Frontend

Modular Cloudflare Worker frontend for the Arke Institute upload system with integrated orchestrator polling.

## Features

- **Two-Phase Upload Workflow**: Upload server → Orchestrator processing
- **Real-Time Progress**: Unified progress tracking across both phases
- **Early Archive Access**: View archive link appears as soon as `root_pi` is available (after discovery)
- **Service Binding Integration**: Direct orchestrator communication via Cloudflare service bindings
- **Modular Architecture**: Clean separation of concerns with TypeScript
- **Type-Safe**: Full TypeScript coverage for worker and client code

## Architecture

### Project Structure

```
src/
├── index.ts                      # Worker entry point
├── handler.ts                    # Request router
├── client-bundle.ts              # Injected client code (auto-generated)
├── api/
│   └── orchestrator.ts           # Orchestrator API proxy (service binding)
├── templates/
│   ├── layout.ts                 # HTML shell
│   └── components/               # Reusable HTML components
├── client/                       # Browser-side code (bundled separately)
│   ├── main.ts                   # Client entry point
│   ├── workflow/                 # Upload orchestration logic
│   ├── api/                      # API clients
│   ├── ui/                       # Progress manager & DOM utils
│   └── types/                    # Client-side types
├── styles/
│   └── styles.ts                 # CSS
└── types/
    └── env.ts                    # Worker environment types
```

### Data Flow

```
Browser
  ├─ Phase 1: Upload Server (Direct CORS)
  │   POST /api/v1/upload/init
  │   POST /api/v1/upload/:id/files
  │   POST /api/v1/upload/:id/process
  │   GET  /api/v1/upload/:id/status → { batchId }
  │
  └─ Phase 2: Orchestrator (via Worker API)
      GET /api/orchestrator/status/:batchId
          └─ Worker → ORCHESTRATOR.fetch() (service binding)
```

### Progress Phases

| Phase | Percent | Description |
|-------|---------|-------------|
| **Upload Server** | 0-25% | |
| Scanning | 0-5% | Computing file CIDs |
| Preprocessing | 5-10% | Converting TIFFs |
| Uploading | 10-20% | Uploading to R2 storage |
| Finalizing | 20-25% | Creating batch |
| **Orchestrator** | 25-100% | |
| Discovery | 25-30% | Building directory tree |
| OCR | 30-60% | Processing images through OCR |
| PINAX | 60-80% | Extracting metadata |
| Descriptions | 80-95% | Generating AI descriptions |
| Done | 100% | Complete |

## Setup

### Prerequisites

- Node.js 18+
- A Cloudflare account
- Wrangler CLI

### Installation

```bash
npm install
```

### Configuration

The worker is configured in `wrangler.jsonc`:

```jsonc
{
  "vars": {
    "UPLOAD_API_URL": "http://upload.arke.institute",
    "ARKE_INSTITUTE_URL": "https://arke.institute"
  },
  "services": [
    {
      "binding": "ORCHESTRATOR",
      "service": "arke-orchestrator"
    }
  ]
}
```

Update these for your environment.

## Development

### Build Process

The project uses a two-step build:

1. **Build client bundle**: `esbuild` bundles client TypeScript
2. **Inject into worker**: Post-build script injects bundle into `client-bundle.ts`

### Development Workflow

```bash
# Build once and run dev server
npm run dev

# Watch mode (client rebuilds automatically)
npm run dev:watch
```

The dev server runs at `http://localhost:8787`

### Manual Build

```bash
# Build client bundle
npm run build:client

# Inject client into worker
npm run inject:client

# Or both
npm run build
```

## Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

### Custom Domain

After deployment, add a custom domain in the Cloudflare Dashboard:

1. Go to Workers & Pages
2. Select `arke-upload-frontend`
3. Settings → Domains & Routes
4. Add custom domain (e.g., `upload.arke.institute`)

## Usage

### Upload Workflow

1. **Enter your name** - Required uploader identifier
2. **Enter archive path** - Destination like `/archives/collection_name`
3. **Select directory** - Use folder picker
4. **Click "Start Upload"**

### Progress Display

The interface shows:

- **Upload Phase** (0-25%): File scanning, preprocessing, uploading to R2
- **Processing Phase** (25-100%): OCR, PINAX extraction, descriptions
- **Early Access**: Archive link appears after discovery completes (~30%)
- **Directory Counters**: Tracks processed/total directories
- **Current Item**: Shows which file/directory is being processed

### Completion

When `status = DONE`:
- Final success screen with archive link
- Opens `arke.institute/{root_pi}` in new tab
- Option to upload another directory

### Error Handling

If processing fails:
- Error message displayed
- Partial results link shown (if `root_pi` available)
- User can investigate partial archive

## API Endpoints

### Worker API

**GET `/api/orchestrator/status/:batchId`**

Proxies to orchestrator service via service binding.

**Response:**
```json
{
  "batch_id": "01K8Y6BB2ZC8WF2PRDBEHR2CXQ",
  "status": "OCR_IN_PROGRESS",
  "progress": {
    "directories_total": 42,
    "directories_ocr_complete": 15,
    ...
  },
  "root_pi": "01K8Y6BC4JQWXYZ123456789AB",
  ...
}
```

## Development Guide

### Adding New Features

**Client-Side (Browser):**

1. Add types to `src/client/types/`
2. Implement logic in `src/client/workflow/` or `src/client/ui/`
3. Update `src/client/main.ts` if needed
4. Rebuild: `npm run build:client`

**Worker-Side:**

1. Add handler to `src/api/` or update `src/handler.ts`
2. Update types in `src/types/env.ts`
3. Test with `npm run dev`

### Modifying UI

Edit components in `src/templates/components/`:
- `upload-form.ts` - Form inputs
- `progress-display.ts` - Progress UI
- `success-display.ts` - Completion screen

Update styles in `src/styles/styles.ts`.

### Testing

```bash
# Run dev server
npm run dev

# Test upload workflow
# 1. Open http://localhost:8787
# 2. Fill form
# 3. Select test directory
# 4. Monitor console for errors
```

## Troubleshooting

### Build Errors

**"Cannot find module './client-bundle'"**
- Run `npm run build:client && npm run inject:client`
- The client bundle must be built before the worker

**TypeScript errors in client code**
- Ensure `"lib": ["ES2021", "DOM"]` in `tsconfig.json`
- Check that types are imported correctly

### Runtime Errors

**"ORCHESTRATOR binding not found"**
- Verify `wrangler.jsonc` has service binding configured
- Ensure `arke-orchestrator` worker is deployed

**"Upload API CORS error"**
- Upload server must allow CORS from worker domain
- Check `UPLOAD_API_URL` is correct in `wrangler.jsonc`

**"No batchId in upload response"**
- Upload server must return `batchId` when status = "completed"
- Check upload server logs

## Architecture Decisions

### Why Service Binding for Orchestrator?

- **Performance**: Direct worker-to-worker communication (no public internet)
- **Security**: No need to expose orchestrator publicly
- **Cost**: No egress fees
- **Simplicity**: No CORS configuration needed

### Why Inline Client Bundle?

- **Single Request**: No separate JS file to fetch
- **Simplicity**: No asset hosting needed
- **Cache Control**: HTML and JS cached together

### Why Two-Step Build?

- **Type Safety**: Client code is fully typed and checked
- **Minification**: Client bundle is optimized by esbuild
- **Modularity**: Client code is separate, testable, maintainable

## Related Documentation

- [Upload Server API](./UPLOAD_API.md)
- [Orchestrator API](../arke-orchestrator/API_SPEC.md)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)

## License

MIT
