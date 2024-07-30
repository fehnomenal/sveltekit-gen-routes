import { describe } from 'vitest';
import {
  generateCodeForBaseRouteWithParams,
  generateCodeForBaseRouteWithoutParams,
  generateCodeForRouteWithParams,
  generateCodeForRouteWithoutParams,
} from '../../src/plugin/code.js';
import type { QueryParamConfig } from '../../src/plugin/types.js';

describe('routes without parameters', (test) => {
  test('server root route', ({ expect }) => {
    const baseLines = generateCodeForBaseRouteWithoutParams('/');

    expect([...baseLines]).toMatchInlineSnapshot(`
      [
        "const route = \`\${base}/\`;",
      ]
    `);

    const routeLines = generateCodeForRouteWithoutParams('/', undefined, 'SERVER__ROOT');

    expect([...routeLines]).toMatchInlineSnapshot(`
      [
        "export const SERVER__ROOT = route;",
        "export const SERVER__ROOT_query = routeQuery(route);",
      ]
    `);
  });

  test('action root route', ({ expect }) => {
    const baseLines = generateCodeForBaseRouteWithoutParams('/');

    expect([...baseLines]).toMatchInlineSnapshot(`
      [
        "const route = \`\${base}/\`;",
      ]
    `);

    const routeLines = generateCodeForRouteWithoutParams('/', '?/login', 'ACTION__ROOT_login');

    expect([...routeLines]).toMatchInlineSnapshot(`
      [
        "const route_ACTION__ROOT_login = \`\${route}?/login\`;",
        "export const ACTION__ROOT_login = route_ACTION__ROOT_login;",
        "export const ACTION__ROOT_login_query = routeQuery(route_ACTION__ROOT_login, '&');",
      ]
    `);
  });

  test('sub route', ({ expect }) => {
    const baseLines = generateCodeForBaseRouteWithoutParams('/groups/more');

    expect([...baseLines]).toMatchInlineSnapshot(`
      [
        "const route = \`\${base}/groups/more\`;",
      ]
    `);

    const routeLines = generateCodeForRouteWithoutParams('/groups/more', undefined, 'PAGE_groups_group_more');

    expect([...routeLines]).toMatchInlineSnapshot(`
      [
        "export const PAGE_groups_group_more = route;",
        "export const PAGE_groups_group_more_query = routeQuery(route);",
      ]
    `);
  });
});

describe('routes with only path parameters', (test) => {
  test('single param', ({ expect }) => {
    const baseUrl = '/[one]';

    const pathParams = [
      {
        name: 'one',
        type: 'string',
        rawInRoute: '[one]',
        matcher: undefined,
        multi: false,
      },
    ];

    const baseLines = generateCodeForBaseRouteWithParams(baseUrl, pathParams, []);

    expect([...baseLines]).toMatchInlineSnapshot(`
      [
        "const route = (one) => \`\${base}/\${one}\`;",
      ]
    `);

    const routeLines = generateCodeForRouteWithParams(baseUrl, undefined, 'PAGE_params_one', pathParams, []);

    expect([...routeLines]).toMatchInlineSnapshot(`
      [
        "export const PAGE_params_one = (one, q) => routeQueryParam(route(one), q);",
      ]
    `);
  });

  test('params with matcher', ({ expect }) => {
    const baseUrl = '/[one]/[two=int]/[...more]';
    const pathParams = [
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
    ];

    const baseLines = generateCodeForBaseRouteWithParams(baseUrl, pathParams, []);

    expect([...baseLines]).toMatchInlineSnapshot(`
      [
        "const route = (one, two, more) => \`\${base}/\${one}/\${two}\${joinSegments(more)}\`;",
      ]
    `);

    const routeLines = generateCodeForRouteWithParams(
      baseUrl,
      undefined,
      'SERVER_params_one_two_int_more_GET',
      pathParams,
      [],
    );

    expect([...routeLines]).toMatchInlineSnapshot(`
      [
        "export const SERVER_params_one_two_int_more_GET = ({ one, two, more }, q) => routeQueryParam(route(one, two, more), q);",
      ]
    `);
  });

  test('rest with following path', ({ expect }) => {
    const baseUrl = '/pages/[...path]/edit';
    const pathParams = [
      {
        name: 'path',
        type: 'string | string[]',
        rawInRoute: '[...path]',
        matcher: undefined,
        multi: true,
      },
    ];

    const baseLines = generateCodeForBaseRouteWithParams(baseUrl, pathParams, []);

    expect([...baseLines]).toMatchInlineSnapshot(`
      [
        "const route = (path) => \`\${base}/pages\${joinSegments(path)}/edit\`;",
      ]
    `);

    const routeLines = generateCodeForRouteWithParams(
      baseUrl,
      undefined,
      'PAGE_pages_path_edit',
      pathParams,
      [],
    );

    expect([...routeLines]).toMatchInlineSnapshot(`
      [
        "export const PAGE_pages_path_edit = (path, q) => routeQueryParam(route(path), q);",
      ]
    `);
  });

  test('rest with following param', ({ expect }) => {
    const baseUrl = '/pages/[...path]/[action]';
    const pathParams = [
      {
        name: 'path',
        type: 'string | string[]',
        rawInRoute: '[...path]',
        matcher: undefined,
        multi: true,
      },
      {
        name: 'action',
        type: 'string',
        rawInRoute: '[action]',
        matcher: undefined,
        multi: false,
      },
    ];

    const baseLines = generateCodeForBaseRouteWithParams(baseUrl, pathParams, []);

    expect([...baseLines]).toMatchInlineSnapshot(`
      [
        "const route = (path, action) => \`\${base}/pages\${joinSegments(path)}/\${action}\`;",
      ]
    `);

    const routeLines = generateCodeForRouteWithParams(
      baseUrl,
      undefined,
      'PAGE_pages_path_action',
      pathParams,
      [],
    );

    expect([...routeLines]).toMatchInlineSnapshot(`
      [
        "export const PAGE_pages_path_action = ({ path, action }, q) => routeQueryParam(route(path, action), q);",
      ]
    `);
  });
});

describe('routes with only query parameters', (test) => {
  test('single required param', ({ expect }) => {
    const baseUrl = '/';
    const queryParams = [['a', { type: 'string', required: true }]] satisfies [string, QueryParamConfig][];

    const baseLines = generateCodeForBaseRouteWithParams('/', [], queryParams);

    expect([...baseLines]).toMatchInlineSnapshot(`
      [
        "const route = \`\${base}/\`;",
      ]
    `);

    const routeLines = generateCodeForRouteWithParams(baseUrl, undefined, 'PAGE__ROOT', [], queryParams);

    expect([...routeLines]).toMatchInlineSnapshot(`
      [
        "export const PAGE__ROOT = (a, q) => routeQueryExtra(route, q, { a });",
      ]
    `);
  });

  test('single optional param', ({ expect }) => {
    const baseUrl = '/';
    const queryParams = [['a', { type: 'string', required: false }]] satisfies [string, QueryParamConfig][];

    const baseLines = generateCodeForBaseRouteWithParams(baseUrl, [], queryParams);

    expect([...baseLines]).toMatchInlineSnapshot(`
      [
        "const route = \`\${base}/\`;",
      ]
    `);

    const routeLines = generateCodeForRouteWithParams(baseUrl, undefined, 'PAGE__ROOT', [], queryParams);

    expect([...routeLines]).toMatchInlineSnapshot(`
      [
        "export const PAGE__ROOT = (a, q) => routeQueryExtra(route, q, { a });",
      ]
    `);
  });

  test('mixed params', ({ expect }) => {
    const baseUrl = '/';
    const queryParams = [
      ['a', { type: 'string', required: false }],
      ['b', { type: 'string', required: true }],
    ] satisfies [string, QueryParamConfig][];

    const baseLines = generateCodeForBaseRouteWithParams(baseUrl, [], queryParams);

    expect([...baseLines]).toMatchInlineSnapshot(`
      [
        "const route = \`\${base}/\`;",
      ]
    `);

    const routeLines = generateCodeForRouteWithParams(baseUrl, undefined, 'PAGE__ROOT', [], queryParams);

    expect([...routeLines]).toMatchInlineSnapshot(`
      [
        "export const PAGE__ROOT = ({ a, b }, q) => routeQueryExtra(route, q, { a, b });",
      ]
    `);
  });

  test('only optional params', ({ expect }) => {
    const baseUrl = '/';
    const queryParams = [
      ['a', { type: 'string' }],
      ['b', { type: 'string' }],
    ] satisfies [string, QueryParamConfig][];

    const baseLines = generateCodeForBaseRouteWithParams(baseUrl, [], queryParams);

    expect([...baseLines]).toMatchInlineSnapshot(`
      [
        "const route = \`\${base}/\`;",
      ]
    `);

    const routeLines = generateCodeForRouteWithParams(baseUrl, undefined, 'PAGE__ROOT', [], queryParams);

    expect([...routeLines]).toMatchInlineSnapshot(`
      [
        "export const PAGE__ROOT = ({ a, b } = {}, q) => routeQueryExtra(route, q, { a, b });",
      ]
    `);
  });
});

describe('routes with both path and query parameters', (test) => {
  test('both required', ({ expect }) => {
    const baseUrl = '/[one]';
    const pathParams = [
      {
        name: 'one',
        type: 'string',
        rawInRoute: '[one]',
        matcher: undefined,
        multi: false,
      },
    ];
    const queryParams = [['a', { type: 'string', required: true }]] satisfies [string, QueryParamConfig][];

    const baseLines = generateCodeForBaseRouteWithParams(baseUrl, pathParams, queryParams);

    expect([...baseLines]).toMatchInlineSnapshot(`
      [
        "const route = (one) => \`\${base}/\${one}\`;",
      ]
    `);

    const routeLines = generateCodeForRouteWithParams(
      baseUrl,
      undefined,
      'PAGE_params_one',
      pathParams,
      queryParams,
    );

    expect([...routeLines]).toMatchInlineSnapshot(`
      [
        "export const PAGE_params_one = ({ one, a }, q) => routeQueryExtra(route(one), q, { a });",
      ]
    `);
  });

  test('both optional', ({ expect }) => {
    const baseUrl = '/[...rest]';
    const pathParams = [
      {
        name: 'rest',
        type: 'string | string[]',
        rawInRoute: '[...rest]',
        matcher: undefined,
        multi: true,
      },
    ];
    const queryParams = [['a', { type: 'string' }]] satisfies [string, QueryParamConfig][];

    const baseLines = generateCodeForBaseRouteWithParams(baseUrl, pathParams, queryParams);

    expect([...baseLines]).toMatchInlineSnapshot(`
      [
        "const route = (rest) => \`\${base}\${joinSegments(rest) || '/'}\`;",
      ]
    `);

    const routeLines = generateCodeForRouteWithParams(
      baseUrl,
      undefined,
      'PAGE_params_one',
      pathParams,
      queryParams,
    );

    expect([...routeLines]).toMatchInlineSnapshot(`
      [
        "export const PAGE_params_one = ({ rest, a } = {}, q) => routeQueryExtra(route(rest), q, { a });",
      ]
    `);
  });
});
