import { relative, resolve } from 'node:path';
import { name } from '../package.json' with { type: 'json' };
import { flattenRoutes, generateRoutes } from './generate.js';
import type { Route, RoutesConfig } from './types.js';

export const getDeclarationFileContentLines = (
  moduleName: string,
  outputDir: string,
  paramMatchersDir: string,
  routes: Route[],
  config: RoutesConfig,
) => [
  `/* eslint-disable */`,
  `// prettier-ignore`,
  `declare module '${moduleName}' {`,
  ...[
    ...preludeDecls(outputDir, paramMatchersDir, routes),
    ...routeDecls(routes, config),
    ...routesMeta(routes),
    '',
    `export {};`,
  ].map((l) => `  ${l}`.trimEnd()),
  `}`,
];

function* preludeDecls(outputDir: string, paramMatchersDir: string, routes: Route[]) {
  yield `import type { Base, ParamOfMatcher, QueryParams } from '${name}/types';`;
  yield '';

  const matchers = routes
    .flatMap((route) => route.pathParams.flatMap((p) => (p.matcher ? [p.matcher] : [])))
    .sort()
    .filter((m, idx, arr) => arr.indexOf(m) === idx);

  for (const matcher of matchers) {
    let file = relative(outputDir, resolve(paramMatchersDir, `${matcher}.js`));
    if (!file.startsWith('.')) {
      file = `./${file}`;
    }

    yield `type Param_${matcher} = ParamOfMatcher<typeof import('${file}').match>;`;
  }
  yield '';
}

const routeDecls = (routes: Route[], config: RoutesConfig) =>
  generateRoutes(
    routes,
    config,
    function* ({ identifier, baseUrl, urlSuffix }) {
      const url = baseUrl + (urlSuffix ?? '');

      yield `export const ${identifier}: \`\${Base}/${url}\`;`;
      yield `export const ${identifier}_query: (`;
      yield `  queryParams: QueryParams,`;
      yield `) => \`\${Base}/${url}\${string}\`;`;
    },
    (param) => (param.multi ? '${string}' : `\${${param.type}}`),
    function* ({ identifier, baseUrl, urlSuffix, parameters }) {
      const url = baseUrl + (urlSuffix ?? '');

      yield `export const ${identifier} = (`;
      if (parameters.length === 1) {
        yield `  ${paramToString(parameters[0])},`;
      } else {
        yield `  params: {`;
        for (const param of parameters) {
          yield `    ${paramToString(param)},`;
        }
        yield `  },`;
      }
      yield `  queryParams?: QueryParams,`;
      yield `) => \`\${Base}/${url}\${string}\`;`;
    },
  );

const paramToString = (param: { name: string; type: string; required: boolean }) => {
  const parts = [param.name];

  if (!param.required) {
    parts.push('?');
  }

  parts.push(': ');
  parts.push(param.type);

  return parts.join('');
};

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
