/**
 * Ingest Worker API Types
 */

export type IngestBatchStatus =
  | 'uploading'
  | 'enqueued'
  | 'processing'
  | 'completed'
  | 'failed';

export interface IngestBatchStatusResponse {
  batch_id: string;
  session_id: string;
  status: IngestBatchStatus;
  uploader: string;
  root_path: string;
  parent_pi: string;
  file_count: number;
  files_uploaded: number;
  total_size: number;
  total_bytes_uploaded: number;
  created_at: string;
  enqueued_at: string | null;
  metadata: Record<string, unknown>;
  files: IngestFileInfo[];
}

export interface IngestFileInfo {
  r2_key: string;
  file_name: string;
  file_size: number;
  logical_path: string;
  content_type: string;
  processing_config: {
    ocr: boolean;
    describe: boolean;
    pinax: boolean;
  };
  upload_type: string;
  status: string;
  completed_at?: string;
  cid?: string | null;
}
