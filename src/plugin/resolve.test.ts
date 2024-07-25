import { describe } from 'vitest';
import { getRouteId } from './resolve.js';

describe('route id', (test) => {
  test('root', ({ expect }) => {
    expect(getRouteId('+page.svelte')).toBe('/');
  });

  test('sub', ({ expect }) => {
    expect(getRouteId('api/health/+server.js')).toBe('/api/health');
  });

  test('sub group', ({ expect }) => {
    expect(getRouteId('(app)/+page.ts')).toBe('/(app)');
  });

  test('sub matcher', ({ expect }) => {
    expect(getRouteId('api/items/[collection]/+server.ts')).toBe('/api/items/[collection]');
  });

  test('matcher param', ({ expect }) => {
    expect(getRouteId('user/id=[user_id=int]/+page.server.js')).toBe('/user/id=[user_id=int]');
  });
});
