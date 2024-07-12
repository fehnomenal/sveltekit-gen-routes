import type { QueryParams } from './public-types.ts';

const createSearchFromParams = (params: URLSearchParams, char = '?') => {
  const search = params.toString();
  return search ? char + search : '';
};

const createSearchFromObject = (params: Record<string, string | string[] | undefined>, char?: string) => {
  return createSearchFromArray(Object.entries(params), char);
};

const createSearchFromArray = (params: [string, string | string[] | undefined][], char?: string) => {
  const _params = new URLSearchParams();

  for (const [name, val] of params) {
    if (Array.isArray(val)) {
      for (const v of val) {
        _params.append(name, v);
      }
    } else if (val) {
      _params.append(name, val);
    }
  }

  return createSearchFromParams(_params as URLSearchParams, char);
};

const createSearch = (params: QueryParams, char?: string) => {
  if (Array.isArray(params)) {
    return createSearchFromArray(params, char);
  } else if (params instanceof URLSearchParams) {
    return createSearchFromParams(params, char);
  } else if (params) {
    return createSearchFromObject(params, char);
  }
  return '';
};

const createSearchExtra = (
  params: QueryParams,
  extra: Record<string, string | string[] | undefined>,
  char?: string,
) => {
  if (Array.isArray(params)) {
    return createSearchFromArray([...params, ...Object.entries(extra)], char);
  } else if (params instanceof URLSearchParams) {
    return createSearchFromArray([...params.entries(), ...Object.entries(extra)], char);
  } else if (params) {
    return createSearchFromArray([...Object.entries(params), ...Object.entries(extra)], char);
  }
  return '';
};

export const routeQuery = (url: string, char?: string) => (q: QueryParams) => url + createSearch(q, char);

export const routeQueryParam = (url: string, q: QueryParams, char?: string) => url + createSearch(q, char);

export const routeQueryExtra = (
  url: string,
  q: QueryParams,
  extra: Record<string, string | string[] | undefined>,
  char?: string,
) => url + createSearchExtra(q, extra, char);

export const joinSegments = (segments: string | string[]) =>
  typeof segments === 'string' ? segments : segments.join('/');
