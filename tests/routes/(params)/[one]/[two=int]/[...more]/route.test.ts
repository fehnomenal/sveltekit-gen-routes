import { test } from 'vitest';
import { GET, POST, PUT } from '../../../../../../src/routes/(params)/[one]/[two=int]/[...more]/+server.js';

test('endpoint', async ({ expect }) => {
  expect((await GET().json()).SERVER_params_one_two_int_more_GET).toBe('/1/2');

  expect((await GET().json()).SERVER_params_one_two_int_more_GET_query).toBe('/1/2?a=123');

  expect((await POST().json()).SERVER_params_one_two_int_more_POST).toBe('/1/2/abc');

  expect((await PUT().json()).SERVER_params_one_two_int_more_PUT).toBe('/1/2/a/b/c');
});
