import { createRequire } from 'node:module';
import { isAbsolute, relative, sep } from 'node:path';
import { normalizePath } from 'vite';
import type { ActionRoute, Config, DebugKey, PathParameter, Route, ServerRoute } from './types.js';

export const sortRoutes = (routes: Route[]) =>
  [
    routes.filter((r) => r.type === 'PAGE'),
    routes.filter((r) => r.type === 'SERVER'),
    routes.filter((r) => r.type === 'ACTION'),
  ]
    .map((routes) => routes.sort((a, b) => a.key.localeCompare(b.key)))
    .flat();

export const normalizeUrl = (routeId: string) =>
  routeId.replaceAll(/\([^/]+?\)/g, '').replaceAll(/\/{2,}/g, '/');

export const baseUrlString = (baseName: string, url: string) =>
  `\${${baseName}}${url.endsWith('/') && url !== '/' ? url.slice(0, -1) : url}`;

export const isDebug = (debugConfig: Config['debug'], key: DebugKey): boolean => {
  if (typeof debugConfig === 'boolean') {
    return debugConfig;
  }

  return debugConfig?.[key] ?? false;
};

export const joinLines = (lines: string[]) => lines.join('\n').trim() + '\n';

export const getInSourceHelpersModulePath = () =>
  normalizePath(createRequire(import.meta.url).resolve(`./helpers.ts`));

export const makeRelativePath = (from: string, to: string) => {
  const rel = relative(from, to);
  return rel.startsWith('.') ? rel : `.${sep}${rel}`;
};

export const isInSubdir = (parent: string, dir: string) => {
  const rel = relative(parent, dir);
  return rel.length > 0 && !rel.startsWith('..') && !isAbsolute(rel);
};

export const replacePathParams = (
  url: string,
  pathParams: PathParameter[],
  replaceValue: (param: PathParameter) => string,
) => {
  for (const param of pathParams) {
    // For multi parameters also replace the leading slash. When there are values to join it will
    // be added again later.
    const searchValue = param.multi ? `/${param.rawInRoute}` : param.rawInRoute;

    url = url.replace(searchValue, replaceValue(param));
  }

  return url;
};

export const getServerRouteKeys = (route: ServerRoute): { key: string; method: string }[] =>
  route.methods.map((method) => ({ key: `${route.key}_${method}`, method }));

export const getActionRouteKeys = (route: ActionRoute): { key: string; name: string }[] =>
  route.names.map((name) => ({ key: `${route.key}_${name}`, name }));
