/**
 * Main Upload Workflow Orchestrator
 */
import { UploadPhase } from './upload-phase';
import { IngestPhase } from './ingest-phase';
import { OrchestratorPhase } from './orchestrator-phase';
import { ProgressManager } from '../ui/progress-manager';
import type { InitSessionRequest } from '../types/upload';

export class UploadWorkflow {
  private progressManager = new ProgressManager();

  async start(request: InitSessionRequest, files: FileList): Promise<void> {
    console.log('[UploadWorkflow] Starting upload workflow');
    console.log('[UploadWorkflow] Request:', request);
    console.log('[UploadWorkflow] Files:', files.length);

    try {
      // Phase 1: Upload to upload server
      console.log('[UploadWorkflow] Starting Phase 1: Upload Server');
      const uploadPhase = new UploadPhase();
      const { batchId } = await uploadPhase.execute(request, files, this.progressManager);
      console.log('[UploadWorkflow] Phase 1 complete. BatchId:', batchId);

      // Phase 2: Wait for ingest queue
      console.log('[UploadWorkflow] Starting Phase 2: Ingest Queue');
      const ingestPhase = new IngestPhase(batchId);
      await ingestPhase.execute(this.progressManager);
      console.log('[UploadWorkflow] Phase 2 complete. Batch enqueued.');

      // Phase 3: Poll orchestrator for processing
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

      // Only try to get root_pi if we have a valid batchId
      let rootPi: string | undefined;

      // Try to extract batchId from error or from a failed orchestrator phase
      let batchId: string | undefined;

      // Check if error has batchId property (from OrchestratorPhase)
      if ((error as any).batchId && typeof (error as any).batchId === 'string') {
        batchId = (error as any).batchId;
      }

      // Or check if we're in orchestrator phase and constructor has it
      if (!batchId && error instanceof Error && error.message.includes('orchestrator')) {
        // Orchestrator phase error, but we don't have the batchId in error
        console.log('[UploadWorkflow] Orchestrator error but no batchId in error object');
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
