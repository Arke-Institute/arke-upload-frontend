/**
 * Upload Server API Types
 */

export interface InitSessionRequest {
  uploader: string;
  rootPath: string;
  parentPi?: string;
  metadata?: Record<string, unknown>;
  processing?: {
    ocr?: boolean;
    describe?: boolean;
    pinax?: boolean;    
  };
  preprocessor?: {
    tiffMode?: 'convert' | 'preserve' | 'both' | 'none';
    tiffQuality?: number;
  };
}

export interface InitSessionResponse {
  sessionId: string;
  uploadUrl: string;
  statusUrl: string;
  expiresAt: string;
}

export interface UploadFilesResponse {
  sessionId: string;
  filesReceived: number;
  totalSize: number;
  status: string;
}

export interface ProcessRequest {
  dryRun?: boolean;
}

export interface ProcessResponse {
  sessionId: string;
  status: string;
  message: string;
}

export type SessionStatus =
  | 'initialized'
  | 'receiving'
  | 'ready'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ProcessingPhase =
  | 'scanning'
  | 'preprocessing'
  | 'uploading'
  | 'finalizing';

export interface UploadProgress {
  phase: ProcessingPhase;
  filesTotal: number;
  filesProcessed: number;
  filesUploaded: number;
  filesFailed: number;
  bytesTotal: number;
  bytesProcessed: number;
  bytesUploaded: number;
  percentComplete: number;
  currentFile: string;
}

export interface StatusResponse {
  sessionId: string;
  batchId?: string;
  status: SessionStatus;
  phase?: ProcessingPhase;
  progress?: UploadProgress;
  errors?: string[];
  startedAt: string;
  updatedAt: string;
}
