import { describe } from 'vitest';
import {
  generateDeclsForRouteWithParams,
  generateDeclsForRouteWithoutParams,
} from '../../src/plugin/declaration.js';

describe('routes without parameters', (test) => {
  test('server root route', ({ expect }) => {
    const lines = generateDeclsForRouteWithoutParams('/', 'SERVER__ROOT_HEAD');

    expect([...lines]).toMatchInlineSnapshot(`
      [
        "export const SERVER__ROOT_HEAD: \`\${Base}/\`;",
        "export function SERVER__ROOT_HEAD_query(",
        "  queryParams: QueryParams,",
        "): \`\${Base}/\${string /* queryParams */}\`;",
      ]
    `);
  });

  test('action root route', ({ expect }) => {
    const lines = generateDeclsForRouteWithoutParams('/?/login', 'ACTION__ROOT_login');

    expect([...lines]).toMatchInlineSnapshot(`
      [
        "export const ACTION__ROOT_login: \`\${Base}/?/login\`;",
        "export function ACTION__ROOT_login_query(",
        "  queryParams: QueryParams,",
        "): \`\${Base}/?/login\${string /* queryParams */}\`;",
      ]
    `);
  });

  test('sub route', ({ expect }) => {
    const lines = generateDeclsForRouteWithoutParams('/groups/more', 'PAGE_groups_group_more');

    expect([...lines]).toMatchInlineSnapshot(`
      [
        "export const PAGE_groups_group_more: \`\${Base}/groups/more\`;",
        "export function PAGE_groups_group_more_query(",
        "  queryParams: QueryParams,",
        "): \`\${Base}/groups/more\${string /* queryParams */}\`;",
      ]
    `);
  });
});

describe('routes with only path parameters', (test) => {
  test('single param', ({ expect }) => {
    const lines = generateDeclsForRouteWithParams(
      '/[one]',
      'PAGE_params_one',
      [
        {
          name: 'one',
          type: 'string',
          rawInRoute: '[one]',
          matcher: undefined,
          multi: false,
        },
      ],
      [],
    );

    expect([...lines]).toMatchInlineSnapshot(`
        [
          "export function PAGE_params_one(",
          "  one: string,",
          "  queryParams?: QueryParams,",
          "): \`\${Base}/\${typeof one}\${string /* queryParams */}\`;",
        ]
      `);
  });

  test('params with matcher', ({ expect }) => {
    const lines = generateDeclsForRouteWithParams(
      '/[one]/[two=int]/[...more]',
      'SERVER_params_one_two_int_more_GET',
      [
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
      [],
    );

    expect([...lines]).toMatchInlineSnapshot(`
      [
        "export function SERVER_params_one_two_int_more_GET(",
        "  params: {",
        "    one: string,",
        "    two: Param_int,",
        "    more?: string | string[],",
        "  },",
        "  queryParams?: QueryParams,",
        "): \`\${Base}/\${typeof params.one}/\${typeof params.two}\${string /* params.more */}\${string /* queryParams */}\`;",
      ]
    `);
  });

  test('rest with following path', ({ expect }) => {
    const lines = generateDeclsForRouteWithParams(
      '/pages/[...path]/edit',
      'PAGE_pages_path_edit',
      [
        {
          name: 'path',
          type: 'string | string[]',
          rawInRoute: '[...path]',
          matcher: undefined,
          multi: true,
        },
      ],
      [],
    );

    expect([...lines]).toMatchInlineSnapshot(`
      [
        "export function PAGE_pages_path_edit(",
        "  path: string | string[],",
        "  queryParams?: QueryParams,",
        "): \`\${Base}/pages\${string /* path */}/edit\${string /* queryParams */}\`;",
      ]
    `);
  });

  test('rest with following param', ({ expect }) => {
    const lines = generateDeclsForRouteWithParams(
      '/pages/[...path]/[action]',
      'PAGE_pages_path_action',
      [
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
      ],
      [],
    );

    expect([...lines]).toMatchInlineSnapshot(`
      [
        "export function PAGE_pages_path_action(",
        "  params: {,",
        "    path?: string | string[],",
        "    action: string,",
        "  },",
        "  queryParams?: QueryParams,",
        "): \`\${Base}/pages\${string /* params.path */}/\${typeof params.action}\${string /* queryParams */}\`;",
      ]
    `);
  });
});

describe('routes with only query parameters', (test) => {
  test('single required param', ({ expect }) => {
    const lines = generateDeclsForRouteWithParams(
      '/',
      'PAGE__ROOT',
      [],
      [['a', { type: 'string', required: true }]],
    );

    expect([...lines]).toMatchInlineSnapshot(`
      [
        "export function PAGE__ROOT(",
        "  a: string,",
        "  queryParams?: QueryParams,",
        "): \`\${Base}/\${string /* queryParams */}\`;",
      ]
    `);
  });

  test('single optional param', ({ expect }) => {
    const lines = generateDeclsForRouteWithParams(
      '/',
      'PAGE__ROOT',
      [],
      [['a', { type: 'string', required: false }]],
    );

    expect([...lines]).toMatchInlineSnapshot(`
      [
        "export function PAGE__ROOT(",
        "  a?: string,",
        "  queryParams?: QueryParams,",
        "): \`\${Base}/\${string /* queryParams */}\`;",
      ]
    `);
  });

  test('mixed params', ({ expect }) => {
    const lines = generateDeclsForRouteWithParams(
      '/',
      'PAGE__ROOT',
      [],
      [
        ['a', { type: 'string', required: false }],
        ['b', { type: 'string', required: true }],
      ],
    );

    expect([...lines]).toMatchInlineSnapshot(`
      [
        "export function PAGE__ROOT(",
        "  params: {",
        "    a?: string,",
        "    b: string,",
        "  },",
        "  queryParams?: QueryParams,",
        "): \`\${Base}/\${string /* queryParams */}\`;",
      ]
    `);
  });

  test('only optional params', ({ expect }) => {
    const lines = generateDeclsForRouteWithParams(
      '/',
      'PAGE__ROOT',
      [],
      [
        ['a', { type: 'string' }],
        ['b', { type: 'string' }],
      ],
    );

    expect([...lines]).toMatchInlineSnapshot(`
      [
        "export function PAGE__ROOT(",
        "  params?: {",
        "    a?: string,",
        "    b?: string,",
        "  },",
        "  queryParams?: QueryParams,",
        "): \`\${Base}/\${string /* queryParams */}\`;",
      ]
    `);
  });
});

describe('routes with both path and query parameters', (test) => {
  test('both required', ({ expect }) => {
    const lines = generateDeclsForRouteWithParams(
      '/[one]',
      'PAGE_params_one',
      [
        {
          name: 'one',
          type: 'string',
          rawInRoute: '[one]',
          matcher: undefined,
          multi: false,
        },
      ],
      [['a', { type: 'string', required: true }]],
    );

    expect([...lines]).toMatchInlineSnapshot(`
      [
        "export function PAGE_params_one(",
        "  params: {",
        "    one: string,",
        "    a: string,",
        "  },",
        "  queryParams?: QueryParams,",
        "): \`\${Base}/\${typeof params.one}\${string /* queryParams */}\`;",
      ]
    `);
  });

  test('both optional', ({ expect }) => {
    const lines = generateDeclsForRouteWithParams(
      '/[...rest]',
      'PAGE_params_one',
      [
        {
          name: 'rest',
          type: 'string | string[]',
          rawInRoute: '[...rest]',
          matcher: undefined,
          multi: true,
        },
      ],
      [['a', { type: 'string' }]],
    );

    expect([...lines]).toMatchInlineSnapshot(`
      [
        "export function PAGE_params_one(",
        "  params?: {",
        "    rest?: string | string[],",
        "    a?: string,",
        "  },",
        "  queryParams?: QueryParams,",
        "): \`\${Base}\${string /* params.rest */}\${string /* queryParams */}\`;",
      ]
    `);
  });
});
