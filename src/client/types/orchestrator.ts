/**
 * Orchestrator API Types
 */

export type OrchestratorStatus =
  | 'INGESTED'
  | 'OCR_IN_PROGRESS'
  | 'PINAX_EXTRACTION'
  | 'DESCRIPTION'
  | 'DONE'
  | 'ERROR';

export interface OrchestratorProgress {
  directories_total: number;
  directories_snapshot_published: number;
  directories_ocr_complete: number;
  directories_pinax_complete: number;
  directories_description_complete: number;
}

export interface OrchestratorStatusResponse {
  batch_id: string;
  status: OrchestratorStatus;
  progress: OrchestratorProgress;
  root_pi?: string;
  started_at: string;
  updated_at: string;
  completed_at?: string;
  error?: string;
}
