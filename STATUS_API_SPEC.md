# Arke Ingest Status API - API Specification

**Base URL**: `https://status.arke.institute`

**Version**: 1.0.0

---

## Overview

The Arke Ingest Status API provides a unified endpoint to track batch progress across the entire ingest pipeline (ingest → preprocessing → orchestrator).

**Key Features**:
- Single batch_id parameter required
- Auto-starts tracking on first request
- Polls workers every 10 seconds via Durable Object alarms
- Caches status for fast responses
- Logs all status changes for debugging
- Archives completed logs to R2

---

## Authentication

Currently no authentication required (same as other pipeline workers).

---

## Endpoints

### 1. GET /health

Health check endpoint.

**Request:**
```bash
curl https://status.arke.institute/health
```

**Response:** `200 OK`
```json
{
  "status": "ok",
  "service": "arke-ingest-status",
  "timestamp": "2025-11-12T18:00:00.000Z"
}
```

---

### 2. GET /status/:batchId

Get current batch status. Returns cached status that updates every 10 seconds.

**Parameters:**
- `batchId` (path, required) - Batch identifier (ULID)
- `include_raw` (query, optional) - Include raw worker response (true/false)

**Request:**
```bash
# Basic status
curl https://status.arke.institute/status/01K8ABCDEFGHIJKLMNOPQRSTUV

# With raw worker response
curl "https://status.arke.institute/status/01K8ABCDEFGHIJKLMNOPQRSTUV?include_raw=true"
```

**Response:** `200 OK`
```json
{
  "batch_id": "01K8ABCDEFGHIJKLMNOPQRSTUV",
  "stage": "orchestrator",
  "phase": "OCR_IN_PROGRESS",
  "results": {
    "root_pi": "01K8Y6BC4JQWXYZ123456789AB"
  },
  "started_at": "2025-11-12T10:00:00.000Z",
  "updated_at": "2025-11-12T10:05:32.000Z"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `batch_id` | string | Batch identifier (ULID) |
| `stage` | string | Current pipeline stage (see stages below) |
| `phase` | string | Current phase within stage (pass-through from worker) |
| `results` | object | Available results (e.g., root_pi) |
| `results.root_pi` | string | Root entity PI (available after orchestrator DISCOVERY phase) |
| `started_at` | string | ISO 8601 timestamp when tracking started |
| `updated_at` | string | ISO 8601 timestamp of last status update |
| `completed_at` | string | ISO 8601 timestamp when batch completed (only when stage=completed) |
| `error` | string | Error message (only when stage=error) |
| `raw_worker_response` | object | Raw response from current worker (only if include_raw=true) |

**Stages:**

| Stage | Description |
|-------|-------------|
| `ingest` | Files being uploaded to ingest worker |
| `queue_preprocessing` | Batch waiting in queue between ingest → preprocessing |
| `preprocessing` | TIFF conversion and image processing |
| `queue_orchestrator` | Batch waiting in queue between preprocessing → orchestrator |
| `orchestrator` | Main processing (OCR, reorganization, metadata, descriptions) |
| `completed` | All processing complete |
| `error` | Failed after 5 consecutive polling errors |

**Example Responses:**

**During Upload (Ingest Stage):**
```json
{
  "batch_id": "01K8ABCDEFGHIJKLMNOPQRSTUV",
  "stage": "ingest",
  "phase": "uploading",
  "started_at": "2025-11-12T10:00:00.000Z",
  "updated_at": "2025-11-12T10:00:05.000Z"
}
```

**Waiting in Queue:**
```json
{
  "batch_id": "01K8ABCDEFGHIJKLMNOPQRSTUV",
  "stage": "queue_preprocessing",
  "phase": "QUEUED",
  "started_at": "2025-11-12T10:00:00.000Z",
  "updated_at": "2025-11-12T10:05:00.000Z"
}
```

**During Processing (with root_pi):**
```json
{
  "batch_id": "01K8ABCDEFGHIJKLMNOPQRSTUV",
  "stage": "orchestrator",
  "phase": "OCR_IN_PROGRESS",
  "results": {
    "root_pi": "01K8Y6BC4JQWXYZ123456789AB"
  },
  "started_at": "2025-11-12T10:00:00.000Z",
  "updated_at": "2025-11-12T10:15:32.000Z"
}
```

**Completed:**
```json
{
  "batch_id": "01K8ABCDEFGHIJKLMNOPQRSTUV",
  "stage": "completed",
  "phase": "DONE",
  "results": {
    "root_pi": "01K8Y6BC4JQWXYZ123456789AB"
  },
  "started_at": "2025-11-12T10:00:00.000Z",
  "updated_at": "2025-11-12T10:30:00.000Z",
  "completed_at": "2025-11-12T10:30:00.000Z"
}
```

**Error:**
```json
{
  "batch_id": "01K8ABCDEFGHIJKLMNOPQRSTUV",
  "stage": "error",
  "phase": "ERROR",
  "error": "Failed after 5 consecutive polling attempts",
  "started_at": "2025-11-12T10:00:00.000Z",
  "updated_at": "2025-11-12T10:05:00.000Z",
  "completed_at": "2025-11-12T10:05:00.000Z"
}
```

**Error Responses:**

| Status | Description | Response Body |
|--------|-------------|---------------|
| 500 | Internal server error | `{"error": "Internal server error", "message": "..."}` |

---

### 3. GET /logs/:batchId

Get full polling log for debugging. Returns all status changes that occurred during batch processing.

**Parameters:**
- `batchId` (path, required) - Batch identifier (ULID)

**Request:**
```bash
curl https://status.arke.institute/logs/01K8ABCDEFGHIJKLMNOPQRSTUV
```

**Response:** `200 OK`
```json
{
  "batch_id": "01K8ABCDEFGHIJKLMNOPQRSTUV",
  "log_count": 8,
  "logs": [
    {
      "timestamp": "2025-11-12T10:00:00.000Z",
      "stage": "ingest",
      "phase": "uploading",
      "worker_response": {
        "status": "uploading",
        "files_uploaded": 10,
        "file_count": 47
      },
      "status_changed": true
    },
    {
      "timestamp": "2025-11-12T10:05:00.000Z",
      "stage": "queue_preprocessing",
      "phase": "QUEUED",
      "worker_response": {
        "status": "enqueued"
      },
      "status_changed": true
    },
    {
      "timestamp": "2025-11-12T10:06:00.000Z",
      "stage": "preprocessing",
      "phase": "TIFF_CONVERSION",
      "worker_response": {
        "status": "TIFF_CONVERSION",
        "progress": {
          "tasks_completed": 10,
          "tasks_total": 50
        }
      },
      "status_changed": true
    }
  ],
  "source": "durable_object"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `batch_id` | string | Batch identifier |
| `log_count` | number | Total number of log entries |
| `logs` | array | Array of log entries (chronological order) |
| `source` | string | Where logs came from: "durable_object" (active) or "r2" (completed) |

**Log Entry Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string | ISO 8601 timestamp when this status was observed |
| `stage` | string | Pipeline stage at this time |
| `phase` | string | Phase within stage at this time |
| `worker_response` | object | Full response from the worker that was polled |
| `status_changed` | boolean | Always true (only logs when status changes) |

**Notes:**
- Logs are only created when stage or phase changes
- For active batches, logs come from Durable Object storage
- For completed/error batches, logs are retrieved from R2 bucket
- Logs are automatically uploaded to R2 when batch completes

---

## Usage Examples

### JavaScript/TypeScript

```typescript
// Get batch status
const response = await fetch(
  'https://status.arke.institute/status/01K8ABCDEFGHIJKLMNOPQRSTUV'
);
const status = await response.json();

console.log(`Stage: ${status.stage}`);
console.log(`Phase: ${status.phase}`);

if (status.results?.root_pi) {
  console.log(`Root PI: ${status.results.root_pi}`);
}

// Get logs
const logsResponse = await fetch(
  'https://status.arke.institute/logs/01K8ABCDEFGHIJKLMNOPQRSTUV'
);
const logs = await logsResponse.json();

console.log(`Total status changes: ${logs.log_count}`);
logs.logs.forEach(entry => {
  console.log(`[${entry.timestamp}] ${entry.stage} - ${entry.phase}`);
});
```

### Python

```python
import requests

# Get batch status
response = requests.get(
    'https://status.arke.institute/status/01K8ABCDEFGHIJKLMNOPQRSTUV'
)
status = response.json()

print(f"Stage: {status['stage']}")
print(f"Phase: {status['phase']}")

if 'results' in status and 'root_pi' in status['results']:
    print(f"Root PI: {status['results']['root_pi']}")

# Get logs
logs_response = requests.get(
    'https://status.arke.institute/logs/01K8ABCDEFGHIJKLMNOPQRSTUV'
)
logs = logs_response.json()

print(f"Total status changes: {logs['log_count']}")
for entry in logs['logs']:
    print(f"[{entry['timestamp']}] {entry['stage']} - {entry['phase']}")
```

### cURL

```bash
# Get status
curl https://status.arke.institute/status/01K8ABCDEFGHIJKLMNOPQRSTUV

# Get status with raw worker response
curl "https://status.arke.institute/status/01K8ABCDEFGHIJKLMNOPQRSTUV?include_raw=true"

# Get logs
curl https://status.arke.institute/logs/01K8ABCDEFGHIJKLMNOPQRSTUV

# Pretty print JSON
curl -s https://status.arke.institute/status/01K8ABCDEFGHIJKLMNOPQRSTUV | jq
```

---

## Polling Strategy

### Client-Side Polling

For real-time status updates, poll the status endpoint periodically:

```typescript
async function pollBatchStatus(batchId: string) {
  const pollInterval = 5000; // 5 seconds

  while (true) {
    const response = await fetch(
      `https://status.arke.institute/status/${batchId}`
    );
    const status = await response.json();

    console.log(`Current stage: ${status.stage} - ${status.phase}`);

    // Check if completed
    if (status.stage === 'completed' || status.stage === 'error') {
      console.log('Batch processing finished');
      break;
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}
```

**Recommended Intervals:**
- **5 seconds** - Good for user-facing status displays
- **10 seconds** - Reduces API calls, still responsive
- **30+ seconds** - For background monitoring

**Note**: The API updates status every 10 seconds via alarms, so polling faster than that returns cached results.

---

## Stage Flow

```
┌──────────┐
│  ingest  │ Files being uploaded
└─────┬────┘
      │
      ▼
┌──────────────────────┐
│ queue_preprocessing  │ Waiting in queue
└──────────┬───────────┘
           │
           ▼
┌──────────────────┐
│  preprocessing   │ TIFF conversion, image resizing
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ queue_orchestrator   │ Waiting in queue
└──────────┬───────────┘
           │
           ▼
┌──────────────┐
│ orchestrator │ OCR, reorganization, metadata, descriptions
└──────┬───────┘
       │
       ▼
┌───────────┐
│ completed │ All done
└───────────┘
```

At any point, if 5 consecutive polls fail, stage transitions to **`error`**.

---

## How It Works

### First Request
1. Client calls `GET /status/:batchId`
2. Durable Object created for that batch (if doesn't exist)
3. Immediate poll of ingest worker
4. Alarm scheduled for 10 seconds later
5. Returns current status

### Continuous Updates
1. Every 10 seconds, alarm fires
2. DO polls appropriate worker based on current stage
3. Updates cached state if status changed
4. Logs change if stage or phase changed
5. Schedules next alarm

### Completion
1. When stage reaches `completed` or `error`
2. Stops scheduling alarms
3. Uploads logs to R2 bucket `arke-batch-logs`
4. Clears logs from DO storage

---

## Error Handling

### Queue Gaps (Expected)

When batches transition between stages, they may sit in Cloudflare Queues. During this time:
- Previous worker returns 404 (batch no longer there)
- Next worker returns 404 (batch not arrived yet)
- API returns stage: `queue_preprocessing` or `queue_orchestrator`
- This is **expected behavior**, not an error

### Transient Errors

Single poll failures are retried automatically via the alarm mechanism.

### Persistent Errors

After **5 consecutive polling failures** (50 seconds):
- Stage set to `error`
- Error message stored
- `completed_at` timestamp set
- Alarms stop
- Logs uploaded to R2

---

## Rate Limits

Currently no rate limits enforced. The API returns cached status, so multiple rapid requests don't increase load on backend workers.

---

## CORS

CORS is enabled for all origins:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

---

## Performance

- **First request**: 10-50ms (DO initialization + poll)
- **Cached requests**: 5-10ms (DO storage read)
- **Poll frequency**: Every 10 seconds per active batch
- **Log storage**: ~10-50 KB per batch (R2)

---

## Limitations

1. **No batch listing** - Must know batch_id to query
2. **No authentication** - Open API (same as other workers)
3. **No batch reset** - Cannot restart tracking once started
4. **No custom poll intervals** - Fixed at 10 seconds
5. **No webhooks** - Must poll for updates

---

## Future Enhancements

- WebSocket/SSE support for real-time push updates
- Batch listing and search
- Authentication and rate limiting
- Custom poll intervals per batch
- Webhook notifications on stage changes
- Historical analytics

---

## Support

For issues or questions:
- Check logs: `wrangler tail arke-ingest-status`
- Review R2 logs: `wrangler r2 object get arke-batch-logs batch-logs/{batchId}.json`
- Contact: Arke Institute development team

---

## Version History

**v1.0.0** (2025-11-12)
- Initial release
- Auto-start polling on first request
- 10-second alarm-based updates
- Change-based logging
- R2 log archival
- Queue gap handling
