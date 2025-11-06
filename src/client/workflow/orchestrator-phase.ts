/**
 * Orchestrator Processing Phase
 */
import { OrchestratorClient } from '../api/orchestrator-client';
import type { ProgressManager } from '../ui/progress-manager';

export class OrchestratorPhase {
  private client: OrchestratorClient;
  private batchId: string;

  constructor(batchId: string) {
    console.log('[OrchestratorPhase] Constructed with batchId:', batchId);
    this.batchId = batchId;
    this.client = new OrchestratorClient(batchId);
  }

  async execute(progressManager: ProgressManager): Promise<{ rootPi: string }> {
    console.log('[OrchestratorPhase] Starting orchestrator polling for batch:', this.batchId);

    // Show queue waiting state immediately
    progressManager.showQueueWaiting(this.batchId);

    // Give orchestrator a moment to receive batch notification from upload server
    console.log('[OrchestratorPhase] Waiting 3s before first queue check...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Wait for batch to appear in orchestrator (with retries over ~2 minutes)
    console.log('[OrchestratorPhase] Checking processing queue...');
    const initialStatus = await this.client.getStatus();
    console.log('[OrchestratorPhase] Batch found in queue! Status:', initialStatus.status);

    // Show root_pi link immediately if available
    if (initialStatus.root_pi) {
      console.log('[OrchestratorPhase] Root PI available:', initialStatus.root_pi);
      progressManager.showRootPiLink(initialStatus.root_pi);
    }

    // Update with initial orchestrator status
    progressManager.updateOrchestratorProgress(initialStatus);

    // If already done, return immediately
    if (initialStatus.status === 'DONE') {
      if (!initialStatus.root_pi) {
        throw new Error('Processing completed but no root_pi received');
      }
      return { rootPi: initialStatus.root_pi };
    }

    // Continue polling until complete
    console.log('[OrchestratorPhase] Polling for completion...');
    const finalStatus = await this.client.pollUntilComplete((status) => {
      console.log('[OrchestratorPhase] Progress update:', status);
      progressManager.updateOrchestratorProgress(status);

      // Show root_pi link as soon as it appears (if not shown yet)
      if (status.root_pi && !progressManager.rootPiLinkShown) {
        progressManager.showRootPiLink(status.root_pi);
      }
    });

    if (!finalStatus.root_pi) {
      throw new Error('Processing completed but no root_pi received');
    }

    return { rootPi: finalStatus.root_pi };
  }
}
