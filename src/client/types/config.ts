/**
 * Client-side configuration injected from worker
 */
export interface ClientConfig {
  ingestWorkerUrl: string;
  arkeInstituteUrl: string;
}

declare global {
  interface Window {
    CONFIG: ClientConfig;
  }
}
