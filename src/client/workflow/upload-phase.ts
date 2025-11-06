/**
 * Upload Server Phase
 */
import { UploadClient } from '../api/upload-client';
import type { ProgressManager } from '../ui/progress-manager';
import type { InitSessionRequest } from '../types/upload';

export class UploadPhase {
  private client = new UploadClient();

  async execute(
    request: InitSessionRequest,
    files: FileList,
    progressManager: ProgressManager
  ): Promise<{ batchId: string }> {
    console.log('[UploadPhase] Starting upload phase');

    // Step 1: Initialize session
    console.log('[UploadPhase] Step 1: Initializing session');
    const { sessionId, uploadUrl } = await this.client.initSession(request);
    console.log('[UploadPhase] Session initialized:', sessionId);

    progressManager.startProgress(sessionId);

    // Step 2: Upload files
    console.log('[UploadPhase] Step 2: Uploading files to', uploadUrl);
    await this.client.uploadFiles(uploadUrl, files);
    console.log('[UploadPhase] Files uploaded');

    // Step 3: Trigger processing
    console.log('[UploadPhase] Step 3: Triggering processing');
    await this.client.triggerProcessing(sessionId);
    console.log('[UploadPhase] Processing triggered');

    // Step 4: Poll until upload complete
    console.log('[UploadPhase] Step 4: Polling for completion');
    const finalStatus = await this.client.pollUntilComplete(sessionId, (status) => {
      console.log('[UploadPhase] Status update:', status.status, status.phase, `${status.progress?.percentComplete || 0}%`);
      progressManager.updateUploadProgress(status);
    });
    console.log('[UploadPhase] Upload complete. Final status:', finalStatus);

    // Extract batchId from final status
    if (!finalStatus.batchId) {
      console.error('[UploadPhase] ERROR: No batchId in final status:', finalStatus);
      throw new Error('Upload completed but no batchId received');
    }

    console.log('[UploadPhase] BatchId extracted:', finalStatus.batchId);
    return { batchId: finalStatus.batchId };
  }
}
