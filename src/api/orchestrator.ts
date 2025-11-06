/**
 * Orchestrator API Handler (Worker-side)
 */
import type { Env } from '../types/env';

/**
 * Test endpoint to verify orchestrator service binding
 */
export async function handleTestOrchestrator(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const batchId = url.searchParams.get('batchId') || '01K9CRZ5ZFTX8WT97XMCS8CTR0';

  console.log('[TestOrchestrator] Testing service binding with batchId:', batchId);
  console.log('[TestOrchestrator] Service binding type:', typeof env.ORCHESTRATOR);
  console.log('[TestOrchestrator] Service binding exists:', !!env.ORCHESTRATOR);

  if (!env.ORCHESTRATOR) {
    return new Response(
      JSON.stringify({
        error: 'ORCHESTRATOR service binding is not configured',
        envKeys: Object.keys(env),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const testUrl = `https://orchestrator/status/${batchId}`;
    console.log('[TestOrchestrator] Calling:', testUrl);

    const response = await env.ORCHESTRATOR.fetch(testUrl, {
      method: 'GET',
    });

    console.log('[TestOrchestrator] Response status:', response.status);
    console.log('[TestOrchestrator] Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('[TestOrchestrator] Response body:', responseText);

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
    console.error('[TestOrchestrator] Exception:', error);
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

export async function handleOrchestratorAPI(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // Match /api/orchestrator/status/:batchId
  const match = url.pathname.match(/^\/api\/orchestrator\/status\/(.+)$/);

  if (!match) {
    return new Response('Not found', { status: 404 });
  }

  const batchId = match[1];

  try {
    console.log('[OrchestratorAPI] Calling service binding for batchId:', batchId);

    // Call orchestrator service via service binding
    // Service binding URL format: https://servicename/path
    const orchestratorResponse = await env.ORCHESTRATOR.fetch(
      `https://orchestrator/status/${batchId}`,
      {
        method: 'GET',
      }
    );

    console.log('[OrchestratorAPI] Service binding response status:', orchestratorResponse.status);

    // Clone response so we can log body without consuming it
    const clonedResponse = orchestratorResponse.clone();
    const responseBody = await clonedResponse.text();
    console.log('[OrchestratorAPI] Response body:', responseBody);

    if (!orchestratorResponse.ok) {
      console.error('[OrchestratorAPI] Service binding error:', orchestratorResponse.status, responseBody);
      throw new Error(`Orchestrator returned ${orchestratorResponse.status}: ${responseBody}`);
    }

    // Pass through the response with CORS headers
    const response = new Response(orchestratorResponse.body, {
      status: orchestratorResponse.status,
      statusText: orchestratorResponse.statusText,
      headers: orchestratorResponse.headers,
    });

    // Add CORS headers for browser access
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET');
    response.headers.set('Content-Type', 'application/json');

    return response;
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch orchestrator status',
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
