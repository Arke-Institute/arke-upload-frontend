/**
 * Progress Calculation Logic
 */
import type { OrchestratorStatusResponse, OrchestratorStatus } from '../types/orchestrator';

export interface UnifiedProgress {
  percentage: number;
  phase: string;
  description: string;
}

/**
 * Calculate unified progress across upload and orchestrator phases
 * SDK handles upload progress (0-25%), we only need orchestrator calculation
 */
export class ProgressCalculator {
  /**
   * Calculate progress for orchestrator phase (28-100%)
   * Adjusted ranges:
   * - Discovery (28-35%)
   * - OCR (35-60%)
   * - PINAX (60-80%)
   * - Descriptions (80-95%)
   * - Done (100%)
   */
  calculateOrchestratorProgress(status: OrchestratorStatusResponse): UnifiedProgress {
    const phaseMap: Record<OrchestratorStatus, { base: number; range: number; description: string }> = {
      INGESTED: { base: 28, range: 7, description: 'Discovering files' },
      OCR_IN_PROGRESS: { base: 35, range: 25, description: 'Processing OCR' },
      PINAX_EXTRACTION: { base: 60, range: 20, description: 'Extracting metadata' },
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
