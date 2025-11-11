/**
 * Ingest Worker Queue Phase
 * Handles: uploading → preprocessing → enqueued
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
    console.log('[IngestPhase] Starting ingest phase for batch:', this.batchId);

    // Poll until batch is enqueued (may go through preprocessing)
    while (true) {
      const status = await this.client.getStatus();

      console.log('[IngestPhase] Status:', status.status);
      console.log('[IngestPhase] Files:', status.files_uploaded, '/', status.file_count);

      // Handle preprocessing phase (TIFF conversion, PDF splitting)
      if (status.status === 'preprocessing') {
        console.log('[IngestPhase] Batch is being preprocessed');
        progressManager.showPreprocessing(status);
      }

      // Exit when enqueued (ready for orchestrator)
      if (status.status === 'enqueued') {
        console.log('[IngestPhase] Batch enqueued successfully');
        progressManager.showEnqueued(status);
        return;
      }

      // Also exit if already processing or completed
      if (status.status === 'processing' || status.status === 'completed') {
        console.log('[IngestPhase] Batch already in later stage:', status.status);
        return;
      }

      if (status.status === 'failed') {
        throw new Error('Batch failed during ingest/preprocessing');
      }

      // Still uploading, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
