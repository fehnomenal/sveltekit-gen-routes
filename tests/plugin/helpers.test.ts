import { describe, test } from 'vitest';
import { joinSegments, routeQuery, routeQueryExtra, routeQueryParam } from '../../src/plugin/helpers.js';
import type { QueryParams } from '../../src/plugin/public-types.js';

const route = routeQuery('/base');
const actionRoute = routeQuery('/base?/update', '&');

describe.each([
  ...[
    ['empty array', []],
    ['array with empty entry', [['a', undefined]]],
    ['empty object', {}],
    ['object with empty entry', { a: undefined }],
    ['empty URLSearchParams', new URLSearchParams()],
  ].map(([name, query]) => ({
    name,
    query: query as QueryParams,
    r: '/base',
    ra: '/base?/update',
  })),

  {
    name: 'filled URLSearchParams',
    query: new URLSearchParams({
      a: 'b',
      c: 'd',
    }),
    r: '/base?a=b&c=d',
    ra: '/base?/update&a=b&c=d',
  },

  {
    name: 'filled object',
    query: {
      a: 'b',
      c: 'd',
      e: ['f', 'g'],
      h: undefined,
    } satisfies QueryParams,
    r: '/base?a=b&c=d&e=f&e=g',
    ra: '/base?/update&a=b&c=d&e=f&e=g',
  },

  {
    name: 'filled array',
    query: [
      ['a', 'b'],
      ['c', 'd'],
      ['e', ['f', 'g']],
      ['h', 'i'],
      ['h', 'j'],
      ['k', undefined],
    ] satisfies QueryParams,
    r: '/base?a=b&c=d&e=f&e=g&h=i&h=j',
    ra: '/base?/update&a=b&c=d&e=f&e=g&h=i&h=j',
  },
] as const)('query: $name', ({ query, r, ra }) => {
  test.for([
    ['route', route(query)],
    ['routeQueryParam', routeQueryParam('/base', query)],
  ])('%s base', ([, url], { expect }) => {
    expect(url).toBe(r);
  });

  test.for([
    ['route', actionRoute(query)],
    ['routeQueryParam', routeQueryParam('/base?/update', query, '&')],
  ])('%s action', ([, url], { expect }) => {
    expect(url).toBe(ra);
  });
});

describe('extra query params', () => {
  describe.each([
    ['empty array', [] satisfies QueryParams],
    ['array with empty entry', [['a', undefined]] satisfies QueryParams],
    ['empty object', {}],
    ['object with empty entry', { a: undefined }],
    ['empty URLSearchParams', new URLSearchParams()],
  ] as const)('extra with %s', (_, query) => {
    test.for([
      ['base', '/base', undefined, '?'],
      ['action', '/base?/update', '&', '&'],
    ] as const)('%s', ([, url, char, expectedPrefix], { expect }) => {
      expect(routeQueryExtra(url, query, {}, char)).toBe(url);

      expect(routeQueryExtra(url, query, { a: undefined }, char)).toBe(url);

      expect(routeQueryExtra(url, query, { a: 'b' }, char)).toBe(`${url}${expectedPrefix}a=b`);

      expect(routeQueryExtra(url, query, { a: ['b', 'c'] }, char)).toBe(`${url}${expectedPrefix}a=b&a=c`);
    });
  });

  describe.each([
    [
      'filled array',
      [
        ['a', 'b'],
        ['a', 'c'],
        ['a', undefined],
        ['d', undefined],
      ] satisfies QueryParams,
    ],
    ['filled object', { a: ['b', 'c'], d: undefined } satisfies QueryParams],
    [
      'filled URLSearchParams',
      new URLSearchParams([
        ['a', 'b'],
        ['a', 'c'],
      ]),
    ],
  ] as const)('extra with %s', (_, query) => {
    test.for([
      ['base', '/base', undefined, '?'],
      ['action', '/base?/update', '&', '&'],
    ] as const)('%s', ([, url, char, expectedPrefix], { expect }) => {
      expect(routeQueryExtra(url, query, {}, char)).toBe(`${url}${expectedPrefix}a=b&a=c`);

      expect(routeQueryExtra(url, query, { e: undefined }, char)).toBe(`${url}${expectedPrefix}a=b&a=c`);

      expect(routeQueryExtra(url, query, { e: 'f' }, char)).toBe(`${url}${expectedPrefix}a=b&a=c&e=f`);

      expect(routeQueryExtra(url, query, { e: ['f', 'g'] }, char)).toBe(
        `${url}${expectedPrefix}a=b&a=c&e=f&e=g`,
      );

      expect(routeQueryExtra(url, query, { a: 'd' }, char)).toBe(`${url}${expectedPrefix}a=b&a=c&a=d`);
      expect(routeQueryExtra(url, query, { a: ['d'] }, char)).toBe(`${url}${expectedPrefix}a=b&a=c&a=d`);
      expect(routeQueryExtra(url, query, { a: ['d', 'e'] }, char)).toBe(
        `${url}${expectedPrefix}a=b&a=c&a=d&a=e`,
      );
    });
  });
});

test.for([
  ['single empty segment', '', ''],
  ['single segment', 'dashboard', '/dashboard'],
  ['multiple empty segments', [] as string[], ''],
  ['multiple segments', ['dashboard', 'users'], '/dashboard/users'],
  ['multiple segments with empty', ['dashboard', '', 'users'], '/dashboard/users'],
] as const)('join %s', ([, segments, expected], { expect }) => {
  expect(joinSegments(segments as string | string[])).toBe(expected);
});
