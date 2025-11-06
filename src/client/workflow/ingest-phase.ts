/**
 * Ingest Worker Queue Phase
 */
import { IngestClient } from '../api/ingest-client';
import type { ProgressManager } from '../ui/progress-manager';

export class IngestPhase {
  private client: IngestClient;
  private batchId: string;

  constructor(batchId: string) {
    console.log('[IngestPhase] Constructed with batchId:', batchId);
    this.batchId = batchId;
    this.client = new IngestClient(batchId);
  }

  async execute(progressManager: ProgressManager): Promise<void> {
    console.log('[IngestPhase] Starting ingest queue check for batch:', this.batchId);

    // Show ingest queue state
    progressManager.showIngestQueue(this.batchId);

    // Wait for batch to be enqueued (up to 30 seconds)
    console.log('[IngestPhase] Waiting for batch to be enqueued...');
    const status = await this.client.waitForEnqueued();

    console.log('[IngestPhase] Batch status:', status.status);
    console.log('[IngestPhase] Files uploaded:', status.files_uploaded, '/', status.file_count);

    if (status.status === 'failed') {
      throw new Error('Batch failed during ingest');
    }

    console.log('[IngestPhase] Ingest phase complete, batch is ready for orchestrator');
  }
}
