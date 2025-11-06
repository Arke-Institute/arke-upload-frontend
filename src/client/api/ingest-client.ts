/**
 * Ingest Worker API Client (via Worker API)
 */
import type { IngestBatchStatusResponse } from '../types/ingest';

export class IngestClient {
  private batchId: string;

  constructor(batchId: string) {
    this.batchId = batchId;
  }

  async getStatus(): Promise<IngestBatchStatusResponse> {
    console.log('[IngestClient] Fetching status for batchId:', this.batchId);
    console.log('[IngestClient] URL:', `/api/ingest/batches/${this.batchId}/status`);

    // Call worker API endpoint which uses service binding
    const response = await fetch(`/api/ingest/batches/${this.batchId}/status`);

    console.log('[IngestClient] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[IngestClient] Error response:', errorText);
      throw new Error(`Failed to fetch ingest status: ${errorText}`);
    }

    const data = await response.json();
    console.log('[IngestClient] Status data:', data);
    return data;
  }

  /**
   * Wait for batch to be enqueued (retries for up to 30 seconds)
   */
  async waitForEnqueued(retryCount: number = 0, maxRetries: number = 15): Promise<IngestBatchStatusResponse> {
    console.log('[IngestClient] Checking if batch is enqueued... (attempt ${retryCount + 1}/${maxRetries + 1})');

    const status = await this.getStatus();

    // If enqueued, processing, completed, or failed - we're done
    if (status.status !== 'uploading') {
      console.log('[IngestClient] Batch status is:', status.status);
      return status;
    }

    // Still uploading, retry if we have attempts left
    if (retryCount < maxRetries) {
      const backoffMs = 2000; // 2s per attempt = 30s total
      console.log(`[IngestClient] Still uploading, checking again in ${backoffMs / 1000}s... (${retryCount + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return this.waitForEnqueued(retryCount + 1, maxRetries);
    }

    // Timeout
    throw new Error('Timeout waiting for batch to be enqueued');
  }
}
