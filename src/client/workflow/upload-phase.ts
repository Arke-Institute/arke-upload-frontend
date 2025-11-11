/**
 * Upload Phase using @arke/upload-client SDK
 * Uploads files directly to R2 with parallel uploads and progress tracking
 */
import type { ProgressManager } from '../ui/progress-manager';

// SDK types for browser
interface UploadProgress {
  phase: 'scanning' | 'uploading' | 'finalizing' | 'complete';
  filesTotal: number;
  filesUploaded: number;
  bytesTotal: number;
  bytesUploaded: number;
  currentFile?: string;
  percentComplete: number;
}

// SDK is loaded globally via script tag (UMD bundle)
declare const ArkeUploadClient: {
  ArkeUploader: new (config: any) => {
    uploadBatch: (files: File[], options: { onProgress: (p: UploadProgress) => void }) => Promise<{ batchId: string; filesUploaded: number; bytesUploaded: number }>;
  };
};

export interface UploadConfig {
  workerUrl: string;
  uploader: string;
  rootPath: string;
  parentPi?: string;
  metadata?: Record<string, unknown>;
}

export class UploadPhase {
  async execute(
    config: UploadConfig,
    files: FileList,
    progressManager: ProgressManager
  ): Promise<{ batchId: string }> {
    console.log('[UploadPhase] Starting upload phase with SDK');
    console.log('[UploadPhase] Config:', config);
    console.log('[UploadPhase] Files:', files.length);

    const { ArkeUploader } = ArkeUploadClient;
    const uploader = new ArkeUploader({
      workerUrl: config.workerUrl,
      uploader: config.uploader,
      rootPath: config.rootPath,
      parentPi: config.parentPi,
      metadata: config.metadata,
      processing: {
        ocr: true,
        describe: true,
        pinax: true,
      },
      parallelUploads: 5, // Upload 5 files concurrently for better performance
    });

    console.log('[UploadPhase] ArkeUploader created, starting batch upload');

    const result = await uploader.uploadBatch(Array.from(files), {
      onProgress: (progress: UploadProgress) => {
        console.log(
          `[UploadPhase] Progress: ${progress.phase} - ${progress.percentComplete}% ` +
          `(${progress.filesUploaded}/${progress.filesTotal} files, ` +
          `${Math.round(progress.bytesUploaded / 1024 / 1024)}MB/${Math.round(progress.bytesTotal / 1024 / 1024)}MB)`
        );
        progressManager.updateSDKProgress(progress);
      },
    });

    console.log('[UploadPhase] Upload complete. Result:', result);
    console.log('[UploadPhase] BatchId:', result.batchId);

    return { batchId: result.batchId };
  }
}
