/**
 * Cloudflare Worker Environment
 */
export interface Env {
  UPLOAD_API_URL: string;
  ARKE_INSTITUTE_URL: string;
  ORCHESTRATOR: Fetcher;
  INGEST: Fetcher;
}
