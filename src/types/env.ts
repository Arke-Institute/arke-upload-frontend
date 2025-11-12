/**
 * Cloudflare Worker Environment
 */
export interface Env {
  // Service Bindings
  STATUS: Fetcher;                // Service binding to arke-ingest-status worker

  // Environment Variables
  UPLOAD_API_URL: string;         // Upload server URL (for SDK)
  ARKE_INSTITUTE_URL: string;     // Archive viewer URL
}
