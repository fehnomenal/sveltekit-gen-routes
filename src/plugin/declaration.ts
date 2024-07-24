import { dirname, relative } from 'node:path';
import { normalizePath } from 'vite';
import { name } from '../../package.json';
import { flattenRoutes, generateRoutes } from './generate.js';
import type { PathParameter, QueryParamConfig, Route, RoutesConfig } from './types.js';
import { baseUrlString } from './utils';

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
  yield '';
}

const routeDecls = (routes: Route[], config: RoutesConfig) =>
  generateRoutes(
    routes,
    config,
    function* ({ identifier, baseUrl, urlSuffix }) {
      const url = baseUrl + (urlSuffix ?? '');

      yield `export const ${identifier}: \`${baseUrlString('Base', url)}\`;`;
      yield `export function ${identifier}_query(`;
      yield `  queryParams: QueryParams,`;
      yield `): \`${baseUrlString('Base', url)}\${string /* queryParams */}\`;`;
    },
    ({ param, pathParams, queryParams }) =>
      param.multi
        ? `\${string /* ${param.name} */}`
        : `\${typeof ${pathParams.length + queryParams.length > 1 ? 'params.' : ''}${param.name}}`,
    function* ({ identifier, baseUrl, urlSuffix, pathParams, queryParams }) {
      const url = baseUrl + (urlSuffix ?? '');

      const pathParamsStringified = pathParams.map(pathParamToString);
      const queryParamsStringified = queryParams.map(queryParamToString);
      const paramsStringified = [...pathParamsStringified, ...queryParamsStringified];

      yield `export function ${identifier}(`;
      if (pathParams.length + queryParams.length === 1) {
        const [param] = paramsStringified;
        yield `  ${param},`;
      } else {
        const anyRequired = pathParams.length > 0 || queryParams.some(([, p]) => p.required);

        if (anyRequired) {
          yield `  params: {`;
        } else {
          yield `  params?: {`;
        }

        for (const param of paramsStringified) {
          yield `    ${param},`;
        }
        yield `  },`;
      }
      yield `  queryParams?: QueryParams,`;
      yield `): \`${baseUrlString('Base', url)}\${string /* queryParams */}\`;`;
    },
  );

const pathParamToString = (param: PathParameter) => [param.name, ': ', param.type].join('');
const queryParamToString = ([name, param]: [string, QueryParamConfig]) =>
  [name, param.required && '?', ': ', param.type].filter(Boolean).join('');

function* routesMeta(routes: Route[]) {
  const meta: Record<Route['type'], Record<string, string>> = {
    PAGE: {},
    SERVER: {},
    ACTION: {},
  };

  for (const { type, key, pathParams } of flattenRoutes(routes, {})) {
    meta[type][key] = pathParams.length === 0 ? 'never' : pathParams.map((p) => `'${p.name}'`).join(' | ');
  }

  yield `export type ROUTES = {`;

  for (const [type, routes] of Object.entries(meta)) {
    if (Object.keys(routes).length === 0) {
      continue;
    }

    yield `  ${type}S: {`;

    for (const [route, pathParams] of Object.entries(routes)) {
      yield `    ${route}: ${pathParams};`;
    }

    yield `  };`;
  }

  yield `};`;
}
