/**
 * Main Upload Workflow
 *
 * Phase 1: Upload files via SDK → get batchId
 * Phase 2: Poll status API until complete → show results
 */
import { UploadPhase, type UploadConfig } from './upload-phase';
import { StatusClient } from '../api/status-client';
import { ProgressManager } from '../ui/progress-manager';
import { urlState } from '../state/url-state';

export interface WorkflowConfig {
  uploader: string;
  rootPath: string;
  parentPi?: string;
  metadata?: Record<string, unknown>;
}

export class UploadWorkflow {
  private progressManager = new ProgressManager();

  async start(config: WorkflowConfig, files: FileList): Promise<void> {
    console.log('[UploadWorkflow] Starting workflow');
    console.log('[UploadWorkflow] Config:', config);
    console.log('[UploadWorkflow] Files:', files.length);

    try {
      // Phase 1: Upload via SDK
      console.log('[UploadWorkflow] Phase 1: Upload via SDK');
      const uploadPhase = new UploadPhase();

      const uploadConfig: UploadConfig = {
        workerUrl: window.CONFIG.ingestWorkerUrl,
        uploader: config.uploader,
        rootPath: config.rootPath,
        parentPi: config.parentPi,
        metadata: config.metadata,
      };

      const { batchId } = await uploadPhase.execute(uploadConfig, files, this.progressManager);
      console.log('[UploadWorkflow] Upload complete. BatchId:', batchId);

      // Update URL with batch ID for shareability
      urlState.setBatchId(batchId);

      // Phase 2: Monitor via Status API
      await this.monitorBatch(batchId);
    } catch (error) {
      console.error('[UploadWorkflow] Error:', error);
      this.progressManager.showError(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Resume monitoring from existing batch ID (for page reload / shared links)
   */
  async resumeFromBatchId(batchId: string): Promise<void> {
    console.log('[UploadWorkflow] Resuming from batch ID:', batchId);

    try {
      this.progressManager.showResuming(batchId);
      await this.monitorBatch(batchId);
    } catch (error) {
      console.error('[UploadWorkflow] Error resuming:', error);

      // Check if it's a 404 (batch not found)
      if (error instanceof Error && error.message.includes('404')) {
        this.progressManager.showInvalidBatch(batchId);
      } else {
        this.progressManager.showError(
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  }

  /**
   * Monitor batch status (shared by both start and resume)
   */
  private async monitorBatch(batchId: string): Promise<void> {
    console.log('[UploadWorkflow] Phase 2: Monitor status');
    const statusClient = new StatusClient(batchId, window.CONFIG.statusApiUrl);

    const finalStatus = await statusClient.pollUntilComplete((status) => {
      console.log('[UploadWorkflow] Status update:', status.stage, status.phase);
      this.progressManager.updateStatus(status);
    });

    console.log('[UploadWorkflow] Processing complete:', finalStatus.stage);

    // Show result
    if (finalStatus.stage === 'completed' && finalStatus.results?.root_pi) {
      this.progressManager.showSuccess(finalStatus.results.root_pi, batchId);
    } else if (finalStatus.stage === 'error') {
      this.progressManager.showError(
        finalStatus.error || 'Processing failed',
        finalStatus.results?.root_pi,
        batchId
      );
    }
  }
}
