/**
 * Request Handler
 */
import { renderLayout } from './templates/layout';
import { handleStatusAPI } from './api/status';
import type { Env } from './types/env';

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // API routes - proxy to status worker via service binding
  // Handles both /api/status and /api/logs
  if (url.pathname.startsWith('/api/status') || url.pathname.startsWith('/api/logs')) {
    return handleStatusAPI(request, env);
  }

  // Serve HTML for root path
  if (url.pathname === '/' && request.method === 'GET') {
    const html = renderLayout(env);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'no-cache',
      },
    });
  }

  return new Response('Not found', { status: 404 });
}
