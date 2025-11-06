/**
 * Progress UI Manager
 */
import { setText, show, hide, setStyle } from './dom-utils';
import { ProgressCalculator } from './progress-calculator';
import type { StatusResponse } from '../types/upload';
import type { OrchestratorStatusResponse } from '../types/orchestrator';

export class ProgressManager {
  private calculator = new ProgressCalculator();
  public rootPiLinkShown = false;

  /**
   * Show progress display and hide form
   */
  startProgress(sessionId: string): void {
    console.log('[ProgressManager] Starting progress display for session:', sessionId);
    hide('uploadForm');
    show('progressDisplay');
    setText('sessionId', sessionId);
    console.log('[ProgressManager] Progress display shown');
  }

  /**
   * Update progress from upload server status
   */
  updateUploadProgress(status: StatusResponse): void {
    console.log('[ProgressManager] Updating upload progress:', status);
    const progress = this.calculator.calculateUploadProgress(status);
    console.log('[ProgressManager] Calculated progress:', progress);

    setText('status', status.status);
    setText('phase', progress.description);
    setText('percentage', `${Math.round(progress.percentage)}%`);
    setStyle('progressBar', 'width', `${progress.percentage}%`);

    if (status.progress) {
      setText('filesProcessed', status.progress.filesProcessed.toString());
      setText('filesTotal', status.progress.filesTotal.toString());
      setText('currentFile', status.progress.currentFile || '-');
    }
  }

  /**
   * Show ingest queue phase (25-26%)
   */
  showIngestQueue(batchId: string): void {
    console.log('[ProgressManager] Showing ingest queue phase for batch:', batchId);

    setText('status', 'Preparing batch');
    setText('phase', 'Adding to processing queue...');
    setText('percentage', '26%');
    setStyle('progressBar', 'width', '26%');

    // Update file counters to show waiting state
    setText('filesProcessed', '-');
    setText('filesTotal', '-');
    setText('currentFile', 'Finalizing batch upload...');
  }

  /**
   * Show orchestrator queue waiting phase (28%)
   */
  showQueueWaiting(batchId: string): void {
    console.log('[ProgressManager] Showing orchestrator queue waiting phase for batch:', batchId);

    setText('status', 'Queued for processing');
    setText('phase', 'Waiting in processing queue...');
    setText('percentage', '28%');
    setStyle('progressBar', 'width', '28%');

    // Update file counters to show waiting state
    setText('filesProcessed', '-');
    setText('filesTotal', '-');
    setText('currentFile', 'Batch queued, waiting for processing to begin...');
  }

  /**
   * Update progress from orchestrator status
   */
  updateOrchestratorProgress(status: OrchestratorStatusResponse): void {
    const progress = this.calculator.calculateOrchestratorProgress(status);

    setText('status', status.status);
    setText('phase', progress.description);
    setText('percentage', `${Math.round(progress.percentage)}%`);
    setStyle('progressBar', 'width', `${progress.percentage}%`);

    // Update directory counters
    if (status.progress) {
      let processed = 0;
      switch (status.status) {
        case 'OCR_IN_PROGRESS':
          processed = status.progress.directories_ocr_complete;
          break;
        case 'PINAX_EXTRACTION':
          processed = status.progress.directories_pinax_complete;
          break;
        case 'DESCRIPTION':
          processed = status.progress.directories_description_complete;
          break;
        case 'DONE':
          processed = status.progress.directories_total;
          break;
      }

      setText('filesProcessed', processed.toString());
      setText('filesTotal', status.progress.directories_total.toString());
      setText('currentFile', `Processing directories...`);
    }

    // Show root_pi link as soon as available
    if (status.root_pi && !this.rootPiLinkShown) {
      this.showRootPiLink(status.root_pi);
      this.rootPiLinkShown = true;
    }
  }

  /**
   * Show root_pi link (early, while still processing)
   */
  showRootPiLink(rootPi: string): void {
    const arkeUrl = window.CONFIG.arkeInstituteUrl;
    const linkHtml = `
      <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p class="text-sm text-blue-800 mb-2">Archive is ready to view:</p>
        <a
          href="${arkeUrl}/${rootPi}"
          target="_blank"
          class="inline-block text-blue-600 hover:text-blue-800 font-medium underline"
        >
          ${arkeUrl}/${rootPi} →
        </a>
        <p class="text-xs text-blue-600 mt-2">Processing will continue in the background</p>
      </div>
    `;

    const container = document.getElementById('rootPiLinkContainer');
    if (container) {
      container.innerHTML = linkHtml;
      show('rootPiLinkContainer');
    }
  }

  /**
   * Show final success screen
   */
  showSuccess(rootPi: string): void {
    hide('spinner');
    hide('progressDisplay');
    show('successDisplay');

    const arkeUrl = window.CONFIG.arkeInstituteUrl;
    const viewLink = document.getElementById('viewLink') as HTMLAnchorElement;
    if (viewLink) {
      viewLink.href = `${arkeUrl}/${rootPi}`;
    }
  }

  /**
   * Show error with optional root_pi link
   */
  showError(error: string, rootPi?: string): void {
    console.log('[ProgressManager] Showing error:', error, 'rootPi:', rootPi);
    hide('spinner');
    show('errorDisplay');

    // Enhanced error message with formatting
    const errorHtml = `
      <p class="text-sm font-medium text-red-800 mb-2">Upload Failed</p>
      <div class="text-sm text-red-700 bg-red-50 p-3 rounded border border-red-200 mb-4">
        <pre class="whitespace-pre-wrap font-mono text-xs">${error}</pre>
      </div>
      <details class="text-xs text-red-600 mb-4">
        <summary class="cursor-pointer hover:text-red-800">Show technical details</summary>
        <div class="mt-2 p-2 bg-red-50 rounded">
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Error:</strong> ${error}</p>
        </div>
      </details>
    `;

    const errorDisplay = document.getElementById('errorDisplay');
    if (errorDisplay) {
      errorDisplay.innerHTML = errorHtml;
    }

    if (rootPi) {
      // Show partial results link
      const arkeUrl = window.CONFIG.arkeInstituteUrl;
      const partialLinkHtml = `
        <div class="mt-4">
          <p class="text-sm text-red-700 mb-2">Partial results may be available:</p>
          <a
            href="${arkeUrl}/${rootPi}"
            target="_blank"
            class="inline-block text-red-600 hover:text-red-800 font-medium underline"
          >
            View Archive →
          </a>
        </div>
      `;
      if (errorDisplay) {
        errorDisplay.innerHTML += partialLinkHtml;
      }
    }
  }
}
