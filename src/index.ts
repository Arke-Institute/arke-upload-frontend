/**
 * Arke Upload Frontend - Cloudflare Worker Entry Point
 */
import { handleRequest } from './handler';
import type { Env } from './types/env';

export { Env };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, env);
  },
};
