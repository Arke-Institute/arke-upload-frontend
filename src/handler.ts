/**
 * Request Handler
 */
import { renderLayout } from './templates/layout';
import { handleOrchestratorAPI, handleTestOrchestrator } from './api/orchestrator';
import { handleIngestAPI, handleTestIngest } from './api/ingest';
import { handleUploadProxy } from './api/upload-proxy';
import type { Env } from './types/env';
import clientJSContent from './client-bundle';

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Test endpoints
  if (url.pathname === '/api/test-orchestrator') {
    return handleTestOrchestrator(request, env);
  }

  if (url.pathname === '/api/test-ingest') {
    return handleTestIngest(request, env);
  }

  // API routes
  if (url.pathname.startsWith('/api/ingest')) {
    return handleIngestAPI(request, env);
  }

  if (url.pathname.startsWith('/api/orchestrator')) {
    return handleOrchestratorAPI(request, env);
  }

  // Upload proxy routes
  if (url.pathname.startsWith('/api/upload')) {
    return handleUploadProxy(request, env);
  }

  // Serve HTML
  if (request.method === 'GET') {
    const html = renderLayout(env, clientJSContent);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'no-cache',
      },
    });
  }

  return new Response('Not found', { status: 404 });
}
