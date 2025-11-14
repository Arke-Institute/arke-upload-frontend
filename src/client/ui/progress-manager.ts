/**
 * Progress UI Manager
 */
import { setText, show, hide } from './dom-utils';
import type { StatusResponse } from '../api/status-client';

// SDK types for browser (Phase 1 only)
interface UploadProgress {
  phase: 'scanning' | 'uploading' | 'finalizing' | 'complete';
  filesTotal: number;
  filesUploaded: number;
  bytesTotal: number;
  bytesUploaded: number;
  currentFile?: string;
  percentComplete: number;
}

// Stage names for display
const STAGE_NAMES: Record<string, string> = {
  ingest: 'Upload',
  queue_preprocessing: 'Queued for Preprocessing',
  preprocessing: 'Preprocessing',
  queue_orchestrator: 'Queued for Processing',
  orchestrator: 'Processing',
  completed: 'Complete',
  error: 'Error',
};

// Stage numbers (1-7 per spec)
const STAGE_NUMBERS: Record<string, number> = {
  ingest: 1,
  queue_preprocessing: 2,
  preprocessing: 3,
  queue_orchestrator: 4,
  orchestrator: 5,
  completed: 7,
  error: 7,
};

export class ProgressManager {
  private sessionStarted = false;
  private rootPiLinkShown = false;
  private batchId?: string;

  startProgress(): void {
    if (!this.sessionStarted) {
      hide('uploadForm');
      show('progressDisplay');
      this.sessionStarted = true;
    }
  }

  /**
   * Show "resuming" state when loading from URL
   */
  showResuming(batchId: string): void {
    this.startProgress();
    this.batchId = batchId;

    setText('stageName', 'Resuming');
    setText('stageNumber', 'Batch ' + batchId.substring(0, 8) + '...');
    setText('phase', 'Checking status...');
    setText('filesInfo', '');
  }

  /**
   * Update from SDK (Phase 1: Upload)
   */
  updateSDKProgress(progress: UploadProgress): void {
    this.startProgress();

    setText('stageName', 'Upload');
    setText('stageNumber', 'Stage 1 of 7');
    setText('phase', progress.phase);
    setText('filesInfo', `${progress.filesUploaded} / ${progress.filesTotal} files`);

    // Clear any retry warnings when progress continues
    this.clearRetryWarning();
  }

  /**
   * Show retry warning (temporary issue, not failure)
   */
  showRetryWarning(message: string): void {
    const container = document.getElementById('retryWarningContainer');
    if (container) {
      container.innerHTML = `
        <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p class="text-sm text-yellow-800">
            <span class="font-medium">⚠️ Temporary issue:</span> ${message}
          </p>
          <p class="text-xs text-yellow-600 mt-1">Retrying automatically...</p>
        </div>
      `;
      show('retryWarningContainer');
    }
  }

  /**
   * Clear retry warning
   */
  clearRetryWarning(): void {
    const container = document.getElementById('retryWarningContainer');
    if (container) {
      container.innerHTML = '';
      hide('retryWarningContainer');
    }
  }

  /**
   * Update from Status API (Phase 2: Processing)
   */
  updateStatus(status: StatusResponse): void {
    this.startProgress();
    this.batchId = status.batch_id;

    const stageName = STAGE_NAMES[status.stage] || status.stage;
    const stageNumber = STAGE_NUMBERS[status.stage] || 0;

    setText('stageName', stageName);
    setText('stageNumber', `Stage ${stageNumber} of 7`);
    setText('phase', status.phase);
    setText('filesInfo', ''); // Clear file info

    // Show root_pi link as soon as available
    if (status.results?.root_pi && !this.rootPiLinkShown) {
      this.showRootPiLink(status.results.root_pi);
      this.rootPiLinkShown = true;
    }
  }

  showRootPiLink(rootPi: string): void {
    const arkeUrl = window.CONFIG.arkeInstituteUrl;
    const container = document.getElementById('rootPiLinkContainer');
    if (container) {
      container.innerHTML = `
        <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <p class="text-sm text-blue-800 mb-2">Archive ready to view:</p>
          <a href="${arkeUrl}/${rootPi}" target="_blank"
             class="text-blue-600 hover:text-blue-800 font-medium underline">
            ${arkeUrl}/${rootPi} →
          </a>
          <p class="text-xs text-blue-600 mt-2">Processing continues in background</p>
        </div>
      `;
      show('rootPiLinkContainer');
    }
  }

  showSuccess(rootPi: string, batchId?: string): void {
    hide('spinner');
    hide('progressDisplay');
    show('successDisplay');

    const viewLink = document.getElementById('viewLink') as HTMLAnchorElement;
    if (viewLink) {
      viewLink.href = `${window.CONFIG.arkeInstituteUrl}/${rootPi}`;
    }

    this.addDownloadLogsButton(batchId);
    this.addStartNewUploadButton();
  }

  showError(error: string, rootPi?: string, batchId?: string): void {
    hide('spinner');
    show('errorDisplay');

    const errorDisplay = document.getElementById('errorDisplay');
    if (errorDisplay) {
      let html = `
        <p class="font-medium text-red-800 mb-2">Upload Failed</p>
        <div class="text-sm text-red-700 bg-red-50 p-3 rounded mb-4">
          ${error}
        </div>
      `;

      if (rootPi) {
        html += `
          <div class="mt-4">
            <p class="text-sm text-red-700 mb-2">Partial results available:</p>
            <a href="${window.CONFIG.arkeInstituteUrl}/${rootPi}" target="_blank"
               class="text-red-600 hover:text-red-800 underline">
              View Archive →
            </a>
          </div>
        `;
      }

      errorDisplay.innerHTML = html;
    }

    this.addDownloadLogsButton(batchId);
    this.addStartNewUploadButton();
  }

  /**
   * Show invalid batch error (404 / not found)
   */
  showInvalidBatch(batchId: string): void {
    hide('spinner');
    show('errorDisplay');

    const errorDisplay = document.getElementById('errorDisplay');
    if (errorDisplay) {
      errorDisplay.innerHTML = `
        <p class="font-medium text-red-800 mb-2">Batch Not Found</p>
        <div class="text-sm text-red-700 bg-red-50 p-3 rounded mb-4">
          Batch ID <code class="font-mono">${batchId}</code> was not found. It may have expired or is invalid.
        </div>
      `;
    }

    this.addStartNewUploadButton();
  }

  private addDownloadLogsButton(batchId?: string): void {
    if (!batchId) return;

    const button = `
      <div class="mt-4">
        <button id="downloadLogsBtn" data-batch-id="${batchId}"
                class="text-sm text-gray-600 hover:text-gray-800 underline">
          Download Technical Logs
        </button>
      </div>
    `;

    const successDisplay = document.getElementById('successDisplay');
    const errorDisplay = document.getElementById('errorDisplay');

    if (successDisplay && !successDisplay.querySelector('#downloadLogsBtn')) {
      successDisplay.innerHTML += button;
    } else if (errorDisplay && !errorDisplay.querySelector('#downloadLogsBtn')) {
      errorDisplay.innerHTML += button;
    }
  }

  private addStartNewUploadButton(): void {
    const button = `
      <div class="mt-6">
        <button id="startNewUploadBtn"
                class="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
          Start New Upload
        </button>
      </div>
    `;

    const successDisplay = document.getElementById('successDisplay');
    const errorDisplay = document.getElementById('errorDisplay');

    if (successDisplay && !successDisplay.querySelector('#startNewUploadBtn')) {
      successDisplay.innerHTML += button;
    } else if (errorDisplay && !errorDisplay.querySelector('#startNewUploadBtn')) {
      errorDisplay.innerHTML += button;
    }
  }
}
