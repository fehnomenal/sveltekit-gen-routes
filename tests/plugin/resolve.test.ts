import { describe } from 'vitest';
import { getRouteId, resolveRouteInfo } from '../../src/plugin/resolve.js';
import type { Route } from '../../src/plugin/types.js';

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

describe('resolve route info', (test) => {
  describe('page', (test) => {
    test('simple', ({ expect }) => {
      const routes: Route[] = [];

      resolveRouteInfo('/users', 'PAGE', () => '', routes);

      expect(routes[0]).toStrictEqual({
        type: 'PAGE',
        routeId: '/users',
        key: 'users',
        pathParams: [],
      });
    });

    test('path params', ({ expect }) => {
      const routes: Route[] = [];

      resolveRouteInfo('/users/new=[user_type=user_type]', 'PAGE', () => '', routes);
      resolveRouteInfo('/users/id=[user_id]', 'PAGE', () => '', routes);
      resolveRouteInfo('/(public_pages)/[...path]', 'PAGE', () => '', routes);

      resolveRouteInfo('/(params)/[one]', 'PAGE', () => '', routes);
      resolveRouteInfo(
        '/(params)/[one]/[two=int]/[...more]',
        'SERVER',
        () => 'export const GET = () => new Response;',
        routes,
      );

      expect(routes).toStrictEqual([
        {
          type: 'PAGE',
          routeId: '/users/new=[user_type=user_type]',
          key: 'users_new_user_type_user_type',
          pathParams: [
            {
              name: 'user_type',
              type: 'Param_user_type',
              rawInRoute: '[user_type=user_type]',
              matcher: 'user_type',
              multi: false,
            },
          ],
        },
        {
          type: 'PAGE',
          routeId: '/users/id=[user_id]',
          key: 'users_id_user_id',
          pathParams: [
            {
              name: 'user_id',
              type: 'string',
              rawInRoute: '[user_id]',
              matcher: undefined,
              multi: false,
            },
          ],
        },
        {
          type: 'PAGE',
          routeId: '/(public_pages)/[...path]',
          key: 'public_pages_path',
          pathParams: [
            {
              name: 'path',
              type: 'string | string[]',
              rawInRoute: '[...path]',
              matcher: undefined,
              multi: true,
            },
          ],
        },

        {
          type: 'PAGE',
          routeId: '/(params)/[one]',
          key: 'params_one',
          pathParams: [
            {
              name: 'one',
              type: 'string',
              rawInRoute: '[one]',
              matcher: undefined,
              multi: false,
            },
          ],
        },

        {
          type: 'SERVER',
          routeId: '/(params)/[one]/[two=int]/[...more]',
          key: 'params_one_two_int_more',
          pathParams: [
            {
              name: 'one',
              type: 'string',
              rawInRoute: '[one]',
              matcher: undefined,
              multi: false,
            },
            {
              name: 'two',
              type: 'Param_int',
              rawInRoute: '[two=int]',
              matcher: 'int',
              multi: false,
            },
            {
              name: 'more',
              type: 'string | string[]',
              rawInRoute: '[...more]',
              matcher: undefined,
              multi: true,
            },
          ],
          methods: ['GET'],
        },
      ]);

      expect(() => resolveRouteInfo('/view/[[id=int]]', 'PAGE', () => '', routes)).toThrow(
        'Optional path parameters are not supported yet!',
      );
    });
  });

  test('server', ({ expect }) => {
    const routes: Route[] = [];

    resolveRouteInfo('/api/health', 'SERVER', () => 'export const GET = () => new Response();', routes);
    resolveRouteInfo('/empty', 'SERVER', () => '', routes);

    expect(routes).toStrictEqual([
      {
        type: 'SERVER',
        routeId: '/api/health',
        key: 'api_health',
        pathParams: [],
        methods: ['GET'],
      },
      {
        type: 'SERVER',
        routeId: '/empty',
        key: 'empty',
        pathParams: [],
        methods: [],
      },
    ]);
  });

  test('action', ({ expect }) => {
    const routes: Route[] = [];

    resolveRouteInfo(
      '/users/id=[user_id]',
      'ACTION',
      () => `
        export const actions = {
          create: () => new Response(),
          update: () => new Response(),
          delete: () => new Response(),
        };
      `,
      routes,
    );
    resolveRouteInfo('/empty', 'ACTION', () => '', routes);

    expect(routes).toStrictEqual([
      {
        type: 'ACTION',
        routeId: '/users/id=[user_id]',
        key: 'users_id_user_id',
        pathParams: [
          {
            name: 'user_id',
            type: 'string',
            rawInRoute: '[user_id]',
            matcher: undefined,
            multi: false,
          },
        ],
        names: ['create', 'delete', 'update'],
      },
      {
        type: 'ACTION',
        routeId: '/empty',
        key: 'empty',
        pathParams: [],
        names: [],
      },
    ]);
  });
});
