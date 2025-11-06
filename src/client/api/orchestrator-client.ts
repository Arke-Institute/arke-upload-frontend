/**
 * Orchestrator API Client (via Worker API)
 */
import type { OrchestratorStatusResponse } from '../types/orchestrator';

export class OrchestratorClient {
  private batchId: string;

  constructor(batchId: string) {
    this.batchId = batchId;
  }

  async getStatus(retryCount: number = 0, maxRetries: number = 24): Promise<OrchestratorStatusResponse> {
    console.log('[OrchestratorClient] Checking queue for batch:', this.batchId, `(attempt ${retryCount + 1}/${maxRetries + 1})`);
    console.log('[OrchestratorClient] URL:', `/api/orchestrator/status/${this.batchId}`);

    // Call worker API endpoint which uses service binding
    const response = await fetch(`/api/orchestrator/status/${this.batchId}`);

    console.log('[OrchestratorClient] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OrchestratorClient] Error response:', errorText);

      // Check if it's a "Batch not found" error and we have retries left
      if (errorText.includes('Batch not found') && retryCount < maxRetries) {
        // Exponential backoff with 10s max: 1s, 2s, 4s, 8s, 10s, 10s, ...
        // Total time: ~2 minutes over 24 retries
        const backoffMs = Math.min(Math.pow(2, retryCount) * 1000, 10000);
        console.log(`[OrchestratorClient] Waiting in queue, checking again in ${backoffMs / 1000}s... (${retryCount + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return this.getStatus(retryCount + 1, maxRetries);
      }

      throw new Error(`Failed to fetch orchestrator status: ${errorText}`);
    }

    const data = await response.json();
    console.log('[OrchestratorClient] Status data:', data);
    return data;
  }

  async pollUntilComplete(
    onProgress: (status: OrchestratorStatusResponse) => void,
    pollIntervalMs: number = 5000
  ): Promise<OrchestratorStatusResponse> {
    while (true) {
      const status = await this.getStatus();
      onProgress(status);

      if (status.status === 'DONE') {
        return status;
      }

      if (status.status === 'ERROR') {
        throw new Error(status.error || 'Orchestrator processing failed');
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }
}
