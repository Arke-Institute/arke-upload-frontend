/**
 * Upload Server API Client
 * Uses worker proxy to avoid CORS issues
 */
import type {
  InitSessionRequest,
  InitSessionResponse,
  ProcessRequest,
  ProcessResponse,
  StatusResponse,
  UploadFilesResponse,
} from '../types/upload';

export class UploadClient {
  private baseUrl: string;

  constructor() {
    // Use worker proxy instead of direct upload server access
    this.baseUrl = '/api/upload';
  }

  async initSession(request: InitSessionRequest): Promise<InitSessionResponse> {
    console.log('[UploadClient] Calling init via proxy:', `${this.baseUrl}/init`);
    const response = await fetch(`${this.baseUrl}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[UploadClient] Init failed:', response.status, errorText);
      throw new Error(`Failed to initialize session: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[UploadClient] Init response:', data);

    // Rewrite uploadUrl to use proxy
    if (data.uploadUrl) {
      const originalUrl = data.uploadUrl;
      // Extract session ID from URL like: https://upload.arke.institute/api/v1/upload/SESSION_ID/files
      const sessionIdMatch = originalUrl.match(/\/upload\/([^/]+)\/files/);
      if (sessionIdMatch) {
        data.uploadUrl = `/api/upload/${sessionIdMatch[1]}/files`;
        console.log('[UploadClient] Rewrote uploadUrl:', originalUrl, '→', data.uploadUrl);
      }
    }

    return data;
  }

  async uploadFiles(uploadUrl: string, files: FileList): Promise<UploadFilesResponse> {
    console.log('[UploadClient] Uploading files to:', uploadUrl);
    const formData = new FormData();

    for (const file of Array.from(files)) {
      const filename = (file as any).webkitRelativePath || file.name;
      formData.append('files', file, filename);
    }

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[UploadClient] Upload failed:', response.status, errorText);
      throw new Error(`Failed to upload files: ${response.statusText}`);
    }

    return response.json();
  }

  async triggerProcessing(sessionId: string, request: ProcessRequest = {}): Promise<ProcessResponse> {
    console.log('[UploadClient] Triggering processing for:', sessionId);
    const response = await fetch(`${this.baseUrl}/${sessionId}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[UploadClient] Process trigger failed:', response.status, errorText);
      throw new Error(`Failed to trigger processing: ${response.statusText}`);
    }

    return response.json();
  }

  async getStatus(sessionId: string): Promise<StatusResponse> {
    const response = await fetch(`${this.baseUrl}/${sessionId}/status`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[UploadClient] Status fetch failed:', response.status, errorText);
      throw new Error(`Failed to fetch status: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[UploadClient] Status response:', JSON.stringify(data));
    return data;
  }

  async pollUntilComplete(
    sessionId: string,
    onProgress: (status: StatusResponse) => void,
    pollIntervalMs: number = 2000
  ): Promise<StatusResponse> {
    while (true) {
      const status = await this.getStatus(sessionId);
      onProgress(status);

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error(`Upload failed: ${status.errors?.join(', ') || 'Unknown error'}`);
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }
}
