/**
 * Client-side entry point
 */
import { UploadWorkflow } from './workflow/upload-workflow';
import { getElement } from './ui/dom-utils';
import type { InitSessionRequest } from './types/upload';

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

    // Build request with minimal config to use server defaults
    const request: InitSessionRequest = {
      uploader,
      rootPath: parentPi ? '/' : `/${institution}`, // Use institution as root path if no parent
      parentPi: parentPi || undefined, // Only include if provided
      metadata: {
        institution,
      },
      processing: {
        ocr: true,      // ← Was true (you got OCR)
        describe: true, // ← Was false (no description)
        pinax: true,    // ← Was true (you got PINAX)
      }
      
      // Omit processing and preprocessor to use server defaults
      // Server defaults: ocr=true, describe=true, pinax=true, tiffMode='convert'
    };

    // Start workflow
    await workflow.start(request, files);
  });
});
