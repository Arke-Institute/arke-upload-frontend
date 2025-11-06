/**
 * Upload Server Proxy Handler (Worker-side)
 * Proxies requests to upload server to avoid CORS issues
 */
import type { Env } from '../types/env';

export async function handleUploadProxy(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // Extract the path after /api/upload/
  // e.g., /api/upload/init -> /api/v1/upload/init
  const uploadPath = url.pathname.replace(/^\/api\/upload/, '/api/v1/upload');

  console.log('[UploadProxy] Proxying request:', request.method, uploadPath);

  try {
    // Build the upstream URL
    const upstreamUrl = `${env.UPLOAD_API_URL}${uploadPath}`;
    console.log('[UploadProxy] Upstream URL:', upstreamUrl);

    // For multipart/form-data (file uploads), pass body as-is
    // For JSON, pass body as-is
    const proxyRequest = new Request(upstreamUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    // Call upload server
    const response = await fetch(proxyRequest);

    console.log('[UploadProxy] Response status:', response.status);

    // Clone response and add CORS headers
    const proxyResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    // Add CORS headers for browser
    proxyResponse.headers.set('Access-Control-Allow-Origin', '*');
    proxyResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    proxyResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return proxyResponse;
  } catch (error) {
    console.error('[UploadProxy] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Upload proxy error',
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
