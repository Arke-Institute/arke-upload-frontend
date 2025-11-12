/**
 * Status API Proxy (via Service Binding)
 */
import type { Env } from '../types/env';

/**
 * Proxy requests to status API via service binding
 */
export async function handleStatusAPI(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // Extract the path after /api, keeping /status prefix
  // /api/status/01K9... -> /status/01K9...
  const path = url.pathname.replace('/api', '');

  // Forward to STATUS service binding
  const statusRequest = new Request(`https://status${path}${url.search}`, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  return env.STATUS.fetch(statusRequest);
}
