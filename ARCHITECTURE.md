# Architecture Overview

Complete modular frontend for Arke Institute upload system with orchestrator integration.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
├─────────────────────────────────────────────────────────────┤
│  Client Bundle (TypeScript → esbuild → minified JS)        │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Workflow  │→ │ Upload Phase │→ │ Orchestrator │        │
│  │ Controller │  │   Client     │  │    Phase     │        │
│  └────────────┘  └──────────────┘  └──────────────┘        │
│         ↓                ↓                   ↓              │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Progress  │  │Upload Server │  │Worker API    │        │
│  │  Manager   │  │   (CORS)     │  │(/api/orch)   │        │
│  └────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────┬───────────────────┬───────────────┘
                          │                   │
                          ↓                   ↓
             ┌─────────────────────┐  ┌────────────────┐
             │  Upload Server      │  │ Worker Handler │
             │  upload.arke.inst.  │  │ (This worker)  │
             └─────────────────────┘  └────────┬───────┘
                                              │
                                              ↓
                                    ┌──────────────────────┐
                                    │ Service Binding      │
                                    │ ORCHESTRATOR.fetch() │
                                    └──────────┬───────────┘
                                              │
                                              ↓
                                    ┌──────────────────────┐
                                    │ Arke Orchestrator    │
                                    │ (Durable Object)     │
                                    └──────────────────────┘
```

## Component Breakdown

### 1. Worker Side (Cloudflare Worker)

**Purpose**: Serve HTML, inline client JS, proxy orchestrator requests

**Components**:
- `src/index.ts`: Entry point, exports fetch handler
- `src/handler.ts`: Routes requests (HTML vs API)
- `src/api/orchestrator.ts`: Proxies orchestrator via service binding
- `src/templates/`: HTML generation functions
- `src/client-bundle.ts`: Auto-generated client code

**Flow**:
1. Browser requests `/`
2. Worker reads `client-bundle.ts` (contains minified client JS)
3. Worker renders HTML with inlined JS
4. Returns single HTML response

**API Route**:
- `GET /api/orchestrator/status/:batchId`
  - Calls `env.ORCHESTRATOR.fetch()`
  - Returns JSON from orchestrator

### 2. Client Side (Browser)

**Purpose**: Handle upload workflow, UI updates, progress tracking

**Architecture**:
```
main.ts
  └─ UploadWorkflow
      ├─ UploadPhase
      │   └─ UploadClient (calls upload.arke.institute)
      │
      └─ OrchestratorPhase
          └─ OrchestratorClient (calls /api/orchestrator)

  ProgressManager
      ├─ ProgressCalculator (unified progress 0-100%)
      └─ DOM utilities
```

**Client Components**:

| Component | Responsibility |
|-----------|----------------|
| `main.ts` | Form binding, event listeners |
| `workflow/upload-workflow.ts` | Orchestrates both phases |
| `workflow/upload-phase.ts` | Phase 1: Upload server interaction |
| `workflow/orchestrator-phase.ts` | Phase 2: Orchestrator polling |
| `api/upload-client.ts` | Upload server API calls |
| `api/orchestrator-client.ts` | Worker API calls |
| `ui/progress-manager.ts` | Updates UI elements |
| `ui/progress-calculator.ts` | Maps phases to percentages |
| `ui/dom-utils.ts` | DOM manipulation helpers |

**Type Safety**:
- All API responses typed (`types/upload.ts`, `types/orchestrator.ts`)
- Window config typed (`types/config.ts`)
- Full TypeScript coverage

### 3. Build System

**Two-Step Build Process**:

```
1. esbuild (Client Bundle)
   src/client/main.ts
   → Bundle all client TypeScript
   → Minify
   → Output: dist/client.js

2. Inject Script (Post-Build)
   scripts/inject-client.js
   → Read dist/client.js
   → Escape for string literal
   → Write to src/client-bundle.ts
   → Export as string

3. Wrangler (Worker Bundle)
   src/index.ts
   → Import src/client-bundle.ts
   → Bundle worker code
   → Deploy to Cloudflare
```

**Why This Approach?**:
- ✅ Single HTTP request (HTML + JS inlined)
- ✅ Type-safe client code
- ✅ Minified client bundle
- ✅ Modular, testable code
- ✅ No asset hosting needed

## Data Flow

### Phase 1: Upload Server (0-25%)

```
Browser → Upload Server (Direct CORS)

1. POST /api/v1/upload/init
   ← sessionId, uploadUrl

2. POST /api/v1/upload/:sessionId/files
   (multipart/form-data with all files)
   ← filesReceived, totalSize

3. POST /api/v1/upload/:sessionId/process
   ← status: "processing"

4. GET /api/v1/upload/:sessionId/status (poll every 2s)
   ← status, phase, progress

5. When status === "completed"
   ← batchId (extract for Phase 2)
```

### Phase 2: Orchestrator (25-100%)

```
Browser → Worker → Orchestrator (Service Binding)

1. GET /api/orchestrator/status/:batchId (poll every 5s)
   Worker calls: env.ORCHESTRATOR.fetch('/status/:batchId')
   ← status, progress, root_pi

2. When root_pi exists (after discovery)
   → Show archive link (early access!)

3. When status === "DONE"
   → Show final success screen
```

## Progress Calculation

**Unified Progress Bar (0-100%)**:

| Phase | % Range | Granularity |
|-------|---------|-------------|
| Upload: Scanning | 0-5% | Estimated |
| Upload: Preprocessing | 5-10% | Estimated |
| Upload: Uploading | 10-20% | From upload progress |
| Upload: Finalizing | 20-25% | Estimated |
| Orch: Discovery | 25-30% | Estimated |
| Orch: OCR | 30-60% | `directories_ocr_complete / total` |
| Orch: PINAX | 60-80% | `directories_pinax_complete / total` |
| Orch: Descriptions | 80-95% | `directories_description_complete / total` |
| Orch: Done | 100% | Complete |

**Formula**:
```typescript
percentage = basePercentage + (itemsComplete / itemsTotal) * phaseRange
```

## Security Considerations

### Upload Server CORS

Upload server must allow:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST
Access-Control-Allow-Headers: Content-Type
```

### Service Binding Security

- Orchestrator not exposed publicly
- Only this worker can call orchestrator
- No API keys needed (binding is secure)

### Input Validation

Client-side:
- Required fields enforced (HTML5)
- File count display before upload

Server-side:
- Upload server validates files
- Orchestrator validates batch structure

## Performance Optimizations

1. **Inlined Client JS**: Single HTTP request
2. **Minified Bundle**: esbuild optimization
3. **Service Binding**: No internet round-trip for orchestrator
4. **Polling Intervals**:
   - Upload: 2s (fast file ops)
   - Orchestrator: 5s (slow processing)
5. **Tailwind CDN**: No build step for CSS

## Error Handling

### Client Errors

| Error | Handling |
|-------|----------|
| Network failure | Try/catch → show error message |
| Upload timeout | Upload client throws after N retries |
| Orchestrator ERROR status | Show error + root_pi link (if available) |
| Missing batchId | Throw error, display in UI |

### Recovery

- If orchestrator errors but root_pi exists → user can view partial results
- Form validation prevents invalid inputs
- All errors shown in `errorDisplay` component

## Deployment

### Development

```bash
npm install
npm run build
npm run dev
# → http://localhost:8787
```

### Production

```bash
npm run deploy
# → https://arke-upload-frontend.<subdomain>.workers.dev
```

### Requirements

- Cloudflare account
- `arke-orchestrator` worker deployed (for service binding)
- Upload server accessible at `UPLOAD_API_URL`

## Future Enhancements

### Potential Improvements

1. **Resumable Uploads**: Store session IDs in localStorage
2. **Batch Uploads**: Queue multiple directory uploads
3. **File Preview**: Show thumbnails before upload
4. **Progress Persistence**: Survive page reloads
5. **Authentication**: API keys for upload/orchestrator
6. **Analytics**: Track upload success rates
7. **Notifications**: Browser notifications on completion

### Scalability

Current design handles:
- ✅ Large directories (5GB per file limit)
- ✅ Long processing times (hours for OCR)
- ✅ Concurrent users (worker auto-scales)

Limitations:
- ❌ Browser memory (very large directories in one POST)
- ❌ No chunked file uploads
- ❌ No upload pause/resume

## Testing Strategy

### Manual Testing

1. Small directory (10 files)
2. Large directory (1000+ files)
3. Mixed file types (PDF, JPG, TIFF)
4. Network interruption (kill upload server mid-upload)
5. Error scenarios (invalid paths, missing batchId)

### Automated Testing (Future)

- Unit tests for progress calculator
- Integration tests for API clients
- E2E tests with Playwright

## Monitoring

### Logs to Check

**Worker Logs**:
```bash
npm run tail
```

**Upload Server Logs**:
- File upload progress
- Batch creation

**Orchestrator Logs**:
- Batch processing phases
- Error messages

### Key Metrics

- Upload success rate
- Average upload duration
- Average processing duration
- Error frequency by type

## Conclusion

This architecture provides:

✅ **Modularity**: Easy to modify/extend
✅ **Type Safety**: Full TypeScript coverage
✅ **Performance**: Optimized builds, direct service bindings
✅ **User Experience**: Unified progress, early archive access
✅ **Maintainability**: Clear separation of concerns
✅ **Scalability**: Cloudflare Workers auto-scale

The two-phase workflow (upload → orchestrator) is transparent to users via the unified progress bar, while the modular codebase makes development straightforward.
