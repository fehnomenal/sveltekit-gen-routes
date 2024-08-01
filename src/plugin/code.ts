import { name } from '../../package.json';
import { generateRoutes } from './generate.js';
import {
  joinSegmentsName,
  routeQueryExtraName,
  routeQueryName,
  routeQueryParamName,
} from './helpers.macro.js' with { type: 'macro' };
import type { PathParameter, QueryParamConfig, Route, RoutesConfig } from './types.js';
import { baseUrlString, getInSourceHelpersModulePath, replacePathParams } from './utils';

export const getIndexCodeLines = (routes: Route[], config: RoutesConfig, moduleName: string) => [
  ...generateRoutes(
    routes,
    config,
    function* ({ identifier, key }) {
      yield `export { ${identifier}, ${identifier}_query } from './${moduleName}/${key}.js';`;
    },
    function* ({ identifier, key }) {
      yield `export { ${identifier} } from './${moduleName}/${key}.js';`;
    },
  ),
];

const helpersModule =
  process.env.NODE_ENV === 'production' ? `${name}/helpers` : getInSourceHelpersModulePath();

export const getRouteKeyCodeLines = (routes: Route[], config: RoutesConfig) => [
  `import { base } from '$app/paths';`,
  `import { ${joinSegmentsName()}, ${routeQueryName()}, ${routeQueryParamName()}, ${routeQueryExtraName()} } from '${helpersModule}';`,
  '',
  ...genBaseRoute(routes, config),
  ...routesCode(routes, config),
];

const genBaseRoute = (routes: Route[], config: RoutesConfig) =>
  generateRoutes(
    routes,
    config,
    function* ({ baseUrl }) {
      yield* generateCodeForBaseRouteWithoutParams(baseUrl);

      return 'stop';
    },
    function* ({ baseUrl, pathParams, queryParams }) {
      yield* generateCodeForBaseRouteWithParams(baseUrl, pathParams, queryParams);

      return 'stop';
    },
  );

export function* generateCodeForBaseRouteWithoutParams(url: string) {
  yield `const route = \`${baseUrlString('base', url)}\`;`;
}

export function* generateCodeForBaseRouteWithParams(
  url: string,
  pathParams: PathParameter[],
  queryParams: [string, QueryParamConfig][],
) {
  if (pathParams.length === 0) {
    yield* generateCodeForBaseRouteWithoutParams(url);
  } else {
    url = replacePathParams(url, pathParams, (param) => {
      if (!param.multi) {
        return `\${${param.name}}`;
      }

      // The rest param is the only parameter.
      let needSlashFallback = pathParams.length === 1;
      if (needSlashFallback) {
        const u = new URL(url, 'http://localhost');
        const segments = u.pathname.split('/').filter(Boolean);

        // And it is the last path segment.
        needSlashFallback = segments.indexOf(param.rawInRoute) === segments.length - 1;
      }

      return `\${${joinSegmentsName()}(${param.name})${needSlashFallback ? ` || '/'` : ''}}`;
    });

    const parts = [`const route = (`];

    parts.push(pathParams.map((p) => p.name).join(', '));

    parts.push(') => `');
    parts.push(baseUrlString('base', url));
    parts.push('`;');

    yield parts.join('');
  }
}

const routesCode = (routes: Route[], config: RoutesConfig) =>
  generateRoutes(
    routes,
    config,
    function* ({ identifier, baseUrl, urlSuffix }) {
      yield* generateCodeForRouteWithoutParams(baseUrl, urlSuffix, identifier);
    },
    function* ({ identifier, baseUrl, urlSuffix, pathParams, queryParams }) {
      yield* generateCodeForRouteWithParams(baseUrl, urlSuffix, identifier, pathParams, queryParams);
    },
  );

export function* generateCodeForRouteWithoutParams(
  baseUrl: string,
  urlSuffix: string | undefined,
  routeIdentifier: string,
) {
  let route = 'route';
  const url = baseUrl + (urlSuffix ?? '');

  if (urlSuffix) {
    route = `route_${routeIdentifier}`;

    yield `const ${route} = \`\${route}${urlSuffix}\`;`;
  }

  yield `export const ${routeIdentifier} = ${route};`;
  yield `export const ${routeIdentifier}_query = ${buildRouteQuery(route, url)};`;
}

export function* generateCodeForRouteWithParams(
  baseUrl: string,
  urlSuffix: string | undefined,
  routeIdentifier: string,
  pathParams: PathParameter[],
  queryParams: [string, QueryParamConfig][],
) {
  let route: string;
  const url = baseUrl + (urlSuffix ?? '');

  if (pathParams.length === 0) {
    route = 'route';
  } else {
    route = `route(${pathParams.map((p) => p.name).join(', ')})`;
  }

  if (urlSuffix) {
    route = `\`\${${route}}${urlSuffix}\``;
  }

  const parts = [`export const ${routeIdentifier} = (`];

  const pathParamNames = pathParams.map((p) => p.name);
  const queryParamNames = queryParams.map(([name]) => name);
  const paramNames = [...pathParamNames, ...queryParamNames];

  if (pathParams.length + queryParams.length === 1) {
    const [paramName] = paramNames;
    parts.push(paramName!);
  } else {
    parts.push('{ ');
    parts.push(paramNames.join(', '));
    parts.push(' }');

    const anyRequired = !pathParams.every((p) => p.multi) || queryParams.some(([, p]) => p.required);

    if (!anyRequired) {
      parts.push(' = {}');
    }
  }

  parts.push(`, ${EXTRA_QUERY_PARAM_NAME}) => `);

  if (queryParams.length === 0) {
    parts.push(buildRouteQueryParam(route, url));
  } else {
    parts.push(buildRouteQueryExtra(route, url, queryParamNames));
  }

  parts.push(';');

  yield parts.join('');
}

const EXTRA_QUERY_PARAM_NAME = 'q';

const buildRouteQuery = (route: string, url: string) =>
  routeCall(routeQueryName(), route, querySepCharArg(url));

const buildRouteQueryParam = (route: string, url: string) =>
  routeCall(routeQueryParamName(), route, EXTRA_QUERY_PARAM_NAME, querySepCharArg(url));

const buildRouteQueryExtra = (route: string, url: string, explicitQueryParamNames: string[]) =>
  routeCall(
    routeQueryExtraName(),
    route,
    EXTRA_QUERY_PARAM_NAME,
    `{ ${explicitQueryParamNames.join(', ')} }`,
    querySepCharArg(url),
  );

const routeCall = (fnName: string, url: string, ...args: (string | false | null | undefined)[]) =>
  `${fnName}(${[url, ...args.filter(Boolean)].join(', ')})`;

const querySepCharArg = (url: string) => (url.includes('?') ? `'&'` : undefined);
