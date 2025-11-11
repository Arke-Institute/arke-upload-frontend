/**
 * Main Upload Workflow Orchestrator
 */
import { UploadPhase, type UploadConfig } from './upload-phase';
import { IngestPhase } from './ingest-phase';
import { OrchestratorPhase } from './orchestrator-phase';
import { ProgressManager } from '../ui/progress-manager';

export interface WorkflowConfig {
  uploader: string;
  rootPath: string;
  parentPi?: string;
  metadata?: Record<string, unknown>;
}

export class UploadWorkflow {
  private progressManager = new ProgressManager();

  async start(config: WorkflowConfig, files: FileList): Promise<void> {
    console.log('[UploadWorkflow] Starting upload workflow');
    console.log('[UploadWorkflow] Config:', config);
    console.log('[UploadWorkflow] Files:', files.length);

    try {
      // Phase 1: Upload via SDK (0-25%)
      console.log('[UploadWorkflow] Starting Phase 1: Upload via SDK');
      const uploadPhase = new UploadPhase();

      const uploadConfig: UploadConfig = {
        workerUrl: window.CONFIG.ingestWorkerUrl,
        uploader: config.uploader,
        rootPath: config.rootPath,
        parentPi: config.parentPi,
        metadata: config.metadata,
      };

      const { batchId } = await uploadPhase.execute(uploadConfig, files, this.progressManager);
      console.log('[UploadWorkflow] Phase 1 complete. BatchId:', batchId);

      // Phase 2: Wait for preprocessing and enqueue (20-28%)
      console.log('[UploadWorkflow] Starting Phase 2: Ingest/Preprocessing');
      const ingestPhase = new IngestPhase(batchId);
      await ingestPhase.execute(this.progressManager);
      console.log('[UploadWorkflow] Phase 2 complete. Batch enqueued.');

      // Phase 3: Poll orchestrator for processing (28-100%)
      console.log('[UploadWorkflow] Starting Phase 3: Orchestrator');
      const orchestratorPhase = new OrchestratorPhase(batchId);
      const { rootPi } = await orchestratorPhase.execute(this.progressManager);
      console.log('[UploadWorkflow] Phase 3 complete. RootPi:', rootPi);

      // Show final success
      console.log('[UploadWorkflow] Showing success screen');
      this.progressManager.showSuccess(rootPi);
    } catch (error) {
      console.error('[UploadWorkflow] ERROR:', error);
      console.error('[UploadWorkflow] Error stack:', error instanceof Error ? error.stack : 'No stack');

      // Try to recover root_pi if possible
      let rootPi: string | undefined;
      let batchId: string | undefined;

      // Check if error has batchId property
      if ((error as any).batchId && typeof (error as any).batchId === 'string') {
        batchId = (error as any).batchId;
      }

      if (batchId && batchId.length > 0) {
        console.log('[UploadWorkflow] Attempting to recover root_pi for batchId:', batchId);
        try {
          const orchClient = new (await import('../api/orchestrator-client')).OrchestratorClient(batchId);
          const status = await orchClient.getStatus();
          rootPi = status.root_pi;
          console.log('[UploadWorkflow] Recovered root_pi:', rootPi);
        } catch (recoveryError) {
          console.warn('[UploadWorkflow] Could not recover root_pi:', recoveryError instanceof Error ? recoveryError.message : recoveryError);
        }
      } else {
        console.log('[UploadWorkflow] No valid batchId available, skipping root_pi recovery');
      }

      this.progressManager.showError(
        error instanceof Error ? error.message : 'An unknown error occurred',
        rootPi
      );
    }
  }
}
