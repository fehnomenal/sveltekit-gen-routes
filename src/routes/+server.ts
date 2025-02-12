import { SERVER__ROOT_GET, SERVER__ROOT_HEAD, SERVER__ROOT_HEAD_query, SERVER__ROOT_POST } from '$routes';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const HEAD = (() =>
  json({
    SERVER__ROOT_HEAD: SERVER__ROOT_HEAD,
    SERVER__ROOT_HEAD_query: SERVER__ROOT_HEAD_query({}),
  })) satisfies RequestHandler;

export function GET() {
  return json({ SERVER__ROOT_GET: SERVER__ROOT_GET });
}

export async function POST() {
  return json({ SERVER__ROOT_POST: SERVER__ROOT_POST });
}
