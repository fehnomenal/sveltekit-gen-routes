import type { Config, DebugKey, NormalizedParameter, PathParam, QueryParamConfig, Route } from './types.js';

export const sortRoutes = (routes: Route[]) =>
  [
    routes.filter((r) => r.type === 'PAGE'),
    routes.filter((r) => r.type === 'SERVER'),
    routes.filter((r) => r.type === 'ACTION'),
  ]
    .map((routes) => routes.sort((a, b) => a.key.localeCompare(b.key)))
    .flat();

export const getStrippedUrl = (routeId: string) =>
  routeId
    .replaceAll(/\([^/]+?\)/g, '')
    .replaceAll(/\/\/+/g, '/')
    .replace(/^\//, '');

export const normalizeParameters = (
  pathParams: PathParam[],
  queryParams: [string, QueryParamConfig][],
): NormalizedParameter[] => {
  const params: NormalizedParameter[] = [];

  for (const { name, matcher, multi } of pathParams) {
    let type = 'string';
    let urlReplaceSearch = `[${name}]`;

    if (matcher) {
      type = `Param_${matcher}`;
      urlReplaceSearch = `[${name}=${matcher}]`;
    }

    if (multi) {
      type = `string | ${type}[]`;
      urlReplaceSearch = `[...${name}]`;
    }

    params.push({ name, type, multi: multi ?? false, required: true, urlReplaceSearch });
  }

  if (queryParams) {
    for (const [name, { type, required }] of queryParams) {
      params.push({ name, type, multi: false, required: required ?? false });
    }
  }

  return params;
};

export const isDebug = (debugConfig: Config['debug'], key: DebugKey): boolean => {
  if (typeof debugConfig === 'boolean') {
    return debugConfig;
  }

  return debugConfig?.[key] ?? false;
};

export const joinLines = (lines: string[]) => lines.join('\n').trim() + '\n';
