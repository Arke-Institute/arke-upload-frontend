/**
 * Status API Client
 *
 * Single unified client that polls status.arke.institute
 * Replaces separate ingest-client and orchestrator-client
 */

export interface StatusResponse {
  batch_id: string;
  stage: 'ingest' | 'queue_preprocessing' | 'preprocessing' | 'queue_orchestrator' | 'orchestrator' | 'completed' | 'error';
  phase: string;
  results?: {
    root_pi?: string;
  };
  error?: string;
  started_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface StatusLog {
  batch_id: string;
  log_count: number;
  logs: Array<{
    timestamp: string;
    stage: string;
    phase: string;
    worker_response: any;
    status_changed: boolean;
  }>;
  source: string;
}

export class StatusClient {
  private batchId: string;
  private statusApiUrl: string;

  constructor(batchId: string, statusApiUrl: string) {
    this.batchId = batchId;
    this.statusApiUrl = statusApiUrl;
  }

  /**
   * Get current status (with exponential backoff retry)
   * statusApiUrl should be '/api/status' to use worker service binding
   */
  async getStatus(retryCount: number = 0, maxRetries: number = 5): Promise<StatusResponse> {
    try {
      const response = await fetch(`${this.statusApiUrl}/${this.batchId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as StatusResponse;
    } catch (error) {
      if (retryCount < maxRetries) {
        const backoffMs = Math.pow(2, retryCount) * 1000;
        console.warn(`[StatusClient] Retry ${retryCount + 1}/${maxRetries} after ${backoffMs}ms`, error);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return this.getStatus(retryCount + 1, maxRetries);
      }
      throw error;
    }
  }

  /**
   * Poll until batch is completed or failed
   */
  async pollUntilComplete(
    onProgress: (status: StatusResponse) => void,
    pollIntervalMs: number = 5000
  ): Promise<StatusResponse> {
    while (true) {
      const status = await this.getStatus();
      onProgress(status);

      if (status.stage === 'completed' || status.stage === 'error') {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }

  /**
   * Download full batch logs as JSON file
   */
  async downloadLogs(): Promise<void> {
    // Note: status API /logs endpoint - adjust path accordingly
    const logsUrl = this.statusApiUrl.replace('/status', '/logs');
    const response = await fetch(`${logsUrl}/${this.batchId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`);
    }

    const logs: StatusLog = await response.json() as StatusLog;

    // Trigger download
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-${this.batchId}-logs.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
