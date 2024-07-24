import { SERVER__ROOT_HEAD, SERVER__ROOT_HEAD_query } from '$routes';
import { json } from '@sveltejs/kit';

export const HEAD = () =>
  json({
    SERVER__ROOT_HEAD: SERVER__ROOT_HEAD,
    SERVER__ROOT_HEAD_query: SERVER__ROOT_HEAD_query({}),
  });
