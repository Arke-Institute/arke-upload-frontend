/**
 * Client-side configuration injected from worker
 */
export interface ClientConfig {
  uploadApiUrl: string;
  arkeInstituteUrl: string;
}

declare global {
  interface Window {
    CONFIG: ClientConfig;
  }
}
