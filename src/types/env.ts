/**
 * Cloudflare Worker Environment
 */
export interface Env {
  INGEST_WORKER_URL: string;
  ARKE_INSTITUTE_URL: string;
  ORCHESTRATOR: Fetcher;
  INGEST: Fetcher;
}
