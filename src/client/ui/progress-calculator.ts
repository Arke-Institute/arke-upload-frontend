/**
 * Progress Calculation Logic
 */
import type { StatusResponse, ProcessingPhase } from '../types/upload';
import type { OrchestratorStatusResponse, OrchestratorStatus } from '../types/orchestrator';

export interface UnifiedProgress {
  percentage: number;
  phase: string;
  description: string;
}

/**
 * Calculate unified progress across upload and orchestrator phases
 */
export class ProgressCalculator {
  /**
   * Calculate progress for upload server phase (0-25%)
   */
  calculateUploadProgress(status: StatusResponse): UnifiedProgress {
    const phaseMap: Record<ProcessingPhase, { base: number; description: string }> = {
      scanning: { base: 5, description: 'Scanning files' },
      preprocessing: { base: 10, description: 'Preprocessing images' },
      uploading: { base: 15, description: 'Uploading to storage' },
      finalizing: { base: 25, description: 'Finalizing upload' },
    };

    const phase = status.phase || 'scanning';
    const phaseInfo = phaseMap[phase];
    const uploadProgress = status.progress;

    // Use server-provided percentage if available, otherwise use base
    let percentage = phaseInfo.base;
    if (uploadProgress?.percentComplete) {
      // Map server percentage (0-100) to upload phase range (0-25)
      percentage = (uploadProgress.percentComplete / 100) * 25;
    }

    return {
      percentage,
      phase,
      description: phaseInfo.description,
    };
  }

  /**
   * Calculate progress for orchestrator phase (30-100%)
   * Adjusted to account for ingest queue phase (25-26%) and orchestrator queue (28%)
   */
  calculateOrchestratorProgress(status: OrchestratorStatusResponse): UnifiedProgress {
    const phaseMap: Record<OrchestratorStatus, { base: number; range: number; description: string }> = {
      INGESTED: { base: 30, range: 10, description: 'Discovering files' },
      OCR_IN_PROGRESS: { base: 40, range: 25, description: 'Processing OCR' },
      PINAX_EXTRACTION: { base: 65, range: 15, description: 'Extracting metadata' },
      DESCRIPTION: { base: 80, range: 15, description: 'Generating descriptions' },
      DONE: { base: 100, range: 0, description: 'Complete' },
      ERROR: { base: 0, range: 0, description: 'Error occurred' },
    };

    const phaseInfo = phaseMap[status.status];
    let percentage = phaseInfo.base;

    // Calculate fine-grained progress within phase
    if (status.progress && status.progress.directories_total > 0) {
      const total = status.progress.directories_total;
      let completed = 0;

      switch (status.status) {
        case 'OCR_IN_PROGRESS':
          completed = status.progress.directories_ocr_complete;
          break;
        case 'PINAX_EXTRACTION':
          completed = status.progress.directories_pinax_complete;
          break;
        case 'DESCRIPTION':
          completed = status.progress.directories_description_complete;
          break;
      }

      if (completed > 0) {
        const phaseProgress = (completed / total) * phaseInfo.range;
        percentage = phaseInfo.base + phaseProgress;
      }
    }

    return {
      percentage: Math.min(100, percentage),
      phase: status.status,
      description: phaseInfo.description,
    };
  }
}
