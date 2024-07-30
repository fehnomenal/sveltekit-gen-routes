import { dirname, relative } from 'node:path';
import { normalizePath } from 'vite';
import { name } from '../../package.json';
import { generateRoutes } from './generate.js';
import type { PathParameter, QueryParamConfig, Route, RoutesConfig } from './types.js';
import { baseUrlString, getActionRouteKeys, getServerRouteKeys, replacePathParams } from './utils';

export const getDeclarationFileContentLines = (
  moduleName: string,
  declarationFilePath: string,
  paramMatchersDir: string,
  routes: Route[],
  config: RoutesConfig,
) => [
  `/* eslint-disable */`,
  `// prettier-ignore`,
  `declare module '${moduleName}' {`,
  ...[
    ...preludeDecls(declarationFilePath, paramMatchersDir, routes),
    ...routeDecls(routes, config),
    ...routesMeta(routes),
    '',
    `export {};`,
  ].map((l) => `  ${l}`.trimEnd()),
  `}`,
];

function* preludeDecls(declarationFilePath: string, paramMatchersDir: string, routes: Route[]) {
  yield `import type { Base, ParamOfMatcher, QueryParams } from '${name}/types';`;
  yield '';

  const matchers = routes
    .flatMap((route) => route.pathParams.flatMap((p) => (p.matcher ? [p.matcher] : [])))
    .sort()
    .filter((m, idx, arr) => arr.indexOf(m) === idx);

  const paramMatcherModulePrefix = normalizePath(relative(dirname(declarationFilePath), paramMatchersDir));

  for (const matcher of matchers) {
    yield `type Param_${matcher} = ParamOfMatcher<typeof import('./${paramMatcherModulePrefix}/${matcher}.js').match>;`;
  }

  if (matchers.length > 0) {
    yield '';
  }
}

const routeDecls = (routes: Route[], config: RoutesConfig) =>
  generateRoutes(
    routes,
    config,
    function* ({ identifier, baseUrl, urlSuffix }) {
      const url = baseUrl + (urlSuffix ?? '');

      yield* generateDeclsForRouteWithoutParams(url, identifier);
    },
    function* ({ identifier, baseUrl, urlSuffix, pathParams, queryParams }) {
      const url = baseUrl + (urlSuffix ?? '');

      yield* generateDeclsForRouteWithParams(url, identifier, pathParams, queryParams);
    },
  );

export function* generateDeclsForRouteWithoutParams(url: string, routeIdentifier: string) {
  yield `export const ${routeIdentifier}: \`${baseUrlString('Base', url)}\`;`;
  yield `export function ${routeIdentifier}_query(`;
  yield `  queryParams: QueryParams,`;
  yield `): \`${baseUrlString('Base', url)}\${string /* queryParams */}\`;`;
}

export function* generateDeclsForRouteWithParams(
  url: string,
  routeIdentifier: string,
  pathParams: PathParameter[],
  queryParams: [string, QueryParamConfig][],
) {
  url = replacePathParams(url, pathParams, (param) =>
    param.multi
      ? `\${string /* ${pathParams.length + queryParams.length > 1 ? 'params.' : ''}${param.name} */}`
      : `\${typeof ${pathParams.length + queryParams.length > 1 ? 'params.' : ''}${param.name}}`,
  );

  const pathParamsStringified = pathParams.map((p) => paramToString(p.name, p.multi, p.type));
  const queryParamsStringified = queryParams.map(([name, p]) => paramToString(name, !p.required, p.type));
  const paramsStringified = [...pathParamsStringified, ...queryParamsStringified];

  yield `export function ${routeIdentifier}(`;
  if (pathParams.length + queryParams.length === 1) {
    const [param] = paramsStringified;
    yield `  ${param},`;
  } else {
    const allOptional = pathParams.every((p) => p.multi) && queryParams.every(([, p]) => !p.required);

    if (allOptional) {
      yield `  params?: {`;
    } else {
      yield `  params: {`;
    }

    for (const param of paramsStringified) {
      yield `    ${param},`;
    }
    yield `  },`;
  }
  yield `  queryParams?: QueryParams,`;
  yield `): \`${baseUrlString('Base', url)}\${string /* queryParams */}\`;`;
}

const paramToString = (name: string, optional: boolean, type: string) =>
  [name, optional && '?', ': ', type].filter(Boolean).join('');

function* routesMeta(routes: Route[]) {
  const meta: Record<Route['type'], Record<string, string>> = {
    PAGE: {},
    SERVER: {},
    ACTION: {},
  };

  for (const route of routes) {
    let keyHolders: { key: string }[];

    if (route.type === 'PAGE') {
      keyHolders = [{ key: route.key }];
    } else if (route.type === 'SERVER') {
      keyHolders = getServerRouteKeys(route);
    } else if (route.type === 'ACTION') {
      keyHolders = getActionRouteKeys(route);
    } else {
      continue;
    }

    for (const { key } of keyHolders) {
      meta[route.type][key] =
        route.pathParams.length === 0 ? 'never' : route.pathParams.map((p) => `'${p.name}'`).join(' | ');
    }
  }

  yield `export type ROUTES = {`;

  for (const [type, routes] of Object.entries(meta)) {
    if (Object.keys(routes).length === 0) {
      continue;
    }

    yield `  ${type}S: {`;

    for (const [route, pathParams] of Object.entries(routes).sort((a, b) => a[0].localeCompare(b[0]))) {
      yield `    ${route}: ${pathParams};`;
    }

    yield `  };`;
  }

  yield `};`;
}
