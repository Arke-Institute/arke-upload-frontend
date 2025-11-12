# Upload Monitor Test

This directory contains a test script that performs a real upload and logs all orchestrator responses to understand the actual status values and progress data being returned at each stage.

## Purpose

The monitor helps us:
- Understand what status values the backend actually returns
- See the complete progression through all upload phases
- Identify progress counter fields and their values
- Optimize frontend progress display based on empirical data
- Inform backend API improvements

## Usage

### Basic Usage

```bash
npm run test:monitor
```

This will:
1. Upload files from `drexel_1/` directory
2. Monitor ingest worker status
3. Monitor orchestrator status continuously
4. Save detailed logs to `test/logs/upload-TIMESTAMP.json`

### Configuration

You can configure the monitor using environment variables:

```bash
# Change which files to upload
TEST_FILES_PATH=./path/to/files npm run test:monitor

# Change uploader name
UPLOADER=my-test npm run test:monitor

# Change poll intervals (in milliseconds)
INGEST_POLL_INTERVAL=5000 ORCHESTRATOR_POLL_INTERVAL=2000 npm run test:monitor

# Use different URLs
INGEST_WORKER_URL=http://localhost:8787 npm run test:monitor
```

### Available Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INGEST_WORKER_URL` | `https://ingest.arke.institute` | Ingest worker URL |
| `ARKE_INSTITUTE_URL` | `https://arke.institute` | Archive URL |
| `UPLOADER` | `test-monitor-script` | Uploader identifier |
| `ROOT_PATH` | `test-upload-{timestamp}` | Root path for upload |
| `TEST_FILES_PATH` | `../drexel_1` | Path to files to upload |
| `INGEST_POLL_INTERVAL` | `2000` | Ingest polling interval (ms) |
| `ORCHESTRATOR_POLL_INTERVAL` | `3000` | Orchestrator polling interval (ms) |

## Output

### Console Output

Real-time colored output showing:
- **Cyan**: Upload phase events
- **Yellow**: Ingest phase events
- **Magenta**: Orchestrator phase events

Each event includes timestamp and full response data.

### Log Files

Logs are saved to `test/logs/upload-TIMESTAMP.json` with the following structure:

```json
{
  "logs": [
    {
      "timestamp": "2025-11-12T12:00:00.000Z",
      "phase": "orchestrator",
      "event": "Status update (attempt 1)",
      "data": {
        "batch_id": "...",
        "status": "SOME_STATUS",
        "progress": {
          "directories_total": 10,
          "directories_ocr_complete": 3,
          ...
        },
        ...
      }
    },
    ...
  ],
  "uniqueStatuses": ["INGESTED", "OCR_IN_PROGRESS", "DONE"],
  "summary": {
    "totalLogs": 50,
    "phases": {
      "upload": 5,
      "ingest": 3,
      "orchestrator": 42
    }
  }
}
```

## What to Look For

When analyzing the logs:

1. **Status Values**: Check `uniqueStatuses` to see all status strings returned
2. **Status Progression**: See how statuses change over time
3. **Progress Counters**: Look at `progress` objects to understand:
   - What fields are available
   - How they increment
   - Which counters correspond to which statuses
4. **Timing**: Observe how long each phase takes
5. **Edge Cases**: Watch for unexpected statuses or missing fields

## Example Analysis

After running the monitor, examine the log file to answer:

- What status values does the orchestrator actually use?
- Are there any intermediate statuses we're not handling?
- What progress counters are most reliable for calculating percentage?
- How long does each phase typically take?
- Are there any gaps in progress reporting?

Use this data to improve the frontend's progress calculation and display logic.
