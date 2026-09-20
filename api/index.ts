import app from '../serverApp.ts';

/**
 * Vercel Serverless Function Handler
 * Automatically handles all /api/* routes on Vercel deployments.
 */
export default function handler(req: any, res: any) {
  return app(req, res);
}
