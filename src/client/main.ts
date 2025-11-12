/**
 * Client-side entry point
 */
import { UploadWorkflow, type WorkflowConfig } from './workflow/upload-workflow';
import { StatusClient } from './api/status-client';
import { getElement } from './ui/dom-utils';
import { urlState } from './state/url-state';

// Import types
import './types/config';

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const workflow = new UploadWorkflow();

  // Set up global click handlers (always needed, even when resuming)
  setupClickHandlers();

  // Listen for hash changes (browser back/forward)
  urlState.onHashChange((batchId) => {
    // Reload page to handle state change
    window.location.reload();
  });

  // Check if we're resuming from a batch ID in the URL
  const batchIdFromUrl = urlState.getBatchId();
  if (batchIdFromUrl) {
    console.log('[Main] Resuming from batch ID in URL:', batchIdFromUrl);
    workflow.resumeFromBatchId(batchIdFromUrl);
    return; // Skip form setup
  }

  // Get form elements
  const form = getElement<HTMLFormElement>('form');
  const uploaderInput = getElement<HTMLInputElement>('uploader');
  const institutionInput = getElement<HTMLInputElement>('institution');
  const parentPiInput = getElement<HTMLInputElement>('parentPi');
  const folderInput = getElement<HTMLInputElement>('folderInput');
  const fileCountEl = getElement('fileCount');

  // Update file count when directory selected
  folderInput.addEventListener('change', () => {
    const fileCount = folderInput.files?.length || 0;
    fileCountEl.textContent = `${fileCount} file${fileCount !== 1 ? 's' : ''} selected`;
  });

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const uploader = uploaderInput.value.trim();
    const institution = institutionInput.value.trim();
    const parentPi = parentPiInput.value.trim();
    const files = folderInput.files;

    if (!uploader) {
      alert('Please enter your name');
      return;
    }

    if (!institution) {
      alert('Please enter an institution');
      return;
    }

    if (!files || files.length === 0) {
      alert('Please select a directory');
      return;
    }

    // Build workflow config
    const config: WorkflowConfig = {
      uploader,
      rootPath: parentPi ? '/' : `/${institution}`, // Use institution as root path if no parent
      parentPi: parentPi || undefined, // Only include if provided
      metadata: {
        institution,
      },
    };

    // Start workflow with new SDK-based upload
    await workflow.start(config, files);
  });
});

/**
 * Set up global click handlers (called even when resuming from URL)
 */
function setupClickHandlers() {
  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;

    // Handle download logs button click
    if (target.id === 'downloadLogsBtn') {
      const batchId = target.dataset.batchId;
      if (!batchId) return;

      try {
        target.textContent = 'Downloading...';
        target.setAttribute('disabled', 'true');

        const statusClient = new StatusClient(batchId, window.CONFIG.statusApiUrl);
        await statusClient.downloadLogs();

        target.textContent = 'Downloaded ✓';
        setTimeout(() => {
          target.textContent = 'Download Technical Logs';
          target.removeAttribute('disabled');
        }, 2000);
      } catch (error) {
        console.error('Failed to download logs:', error);
        target.textContent = 'Download Failed';
        target.removeAttribute('disabled');
      }
    }

    // Handle "Start New Upload" button
    if (target.id === 'startNewUploadBtn') {
      urlState.clearBatchId();
      window.location.reload();
    }
  });
}
