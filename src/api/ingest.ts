/**
 * Ingest Worker API Handler (Worker-side)
 */
import type { Env } from '../types/env';

/**
 * Test endpoint to verify ingest service binding
 */
export async function handleTestIngest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const batchId = url.searchParams.get('batchId') || '01K9CV137N2KWESXW7C5MATQ5X';

  console.log('[TestIngest] Testing service binding with batchId:', batchId);
  console.log('[TestIngest] Service binding type:', typeof env.INGEST);
  console.log('[TestIngest] Service binding exists:', !!env.INGEST);

  if (!env.INGEST) {
    return new Response(
      JSON.stringify({
        error: 'INGEST service binding is not configured',
        envKeys: Object.keys(env),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const testUrl = `https://ingest/api/batches/${batchId}/status`;
    console.log('[TestIngest] Calling:', testUrl);

    const response = await env.INGEST.fetch(testUrl, {
      method: 'GET',
    });

    console.log('[TestIngest] Response status:', response.status);
    console.log('[TestIngest] Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('[TestIngest] Response body:', responseText);

    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
        batchId,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[TestIngest] Exception:', error);
    return new Response(
      JSON.stringify({
        error: 'Exception during service binding call',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        batchId,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

export async function handleIngestAPI(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // Match /api/ingest/batches/:batchId/status
  const match = url.pathname.match(/^\/api\/ingest\/batches\/(.+)\/status$/);

  if (!match) {
    return new Response('Not found', { status: 404 });
  }

  const batchId = match[1];

  try {
    console.log('[IngestAPI] Calling service binding for batchId:', batchId);

    // Call ingest worker service via service binding
    // Service binding URL format: https://servicename/path
    const ingestResponse = await env.INGEST.fetch(
      `https://ingest/api/batches/${batchId}/status`,
      {
        method: 'GET',
      }
    );

    console.log('[IngestAPI] Service binding response status:', ingestResponse.status);

    // Clone response so we can log body without consuming it
    const clonedResponse = ingestResponse.clone();
    const responseBody = await clonedResponse.text();
    console.log('[IngestAPI] Response body:', responseBody);

    if (!ingestResponse.ok) {
      console.error('[IngestAPI] Service binding error:', ingestResponse.status, responseBody);
      throw new Error(`Ingest worker returned ${ingestResponse.status}: ${responseBody}`);
    }

    // Pass through the response with CORS headers
    const response = new Response(ingestResponse.body, {
      status: ingestResponse.status,
      statusText: ingestResponse.statusText,
      headers: ingestResponse.headers,
    });

    // Add CORS headers for browser access
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET');
    response.headers.set('Content-Type', 'application/json');

    return response;
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch ingest status',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
