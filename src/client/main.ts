/**
 * Client-side entry point
 */
import { UploadWorkflow, type WorkflowConfig } from './workflow/upload-workflow';
import { getElement } from './ui/dom-utils';

// Import types
import './types/config';

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const workflow = new UploadWorkflow();

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
