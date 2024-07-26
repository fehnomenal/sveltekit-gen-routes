import { name } from '../../package.json';
import { generateRoutes } from './generate.js';
import {
  joinSegmentsName,
  routeQueryExtraName,
  routeQueryName,
  routeQueryParamName,
} from './helpers.macro.js' with { type: 'macro' };
import type { Route, RoutesConfig } from './types.js';
import { baseUrlString, getInSourceHelpersModulePath, replacePathParams } from './utils';

export const getIndexCodeLines = (routes: Route[], config: RoutesConfig, moduleName: string) => [
  ...generateRoutes(
    routes,
    config,
    function* ({ identifier, codeFileName }) {
      yield `export { ${identifier}, ${identifier}_query } from './${moduleName}/${codeFileName}.js';`;
    },
    function* ({ identifier, codeFileName }) {
      yield `export { ${identifier} } from './${moduleName}/${codeFileName}.js';`;
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
      yield `const route = \`${baseUrlString('base', baseUrl)}\`;`;

      return 'stop';
    },
    function* ({ baseUrl, pathParams, queryParams }) {
      baseUrl = replacePathParams(baseUrl, pathParams, (param) =>
        param.multi
          ? `\${${joinSegmentsName()}(${param.name})${pathParams.length + queryParams.length === 1 ? ` || '/'` : ''}}`
          : `\${${param.name}}`,
      );

      if (pathParams.length === 0) {
        yield `const route = \`${baseUrlString('base', baseUrl)}\`;`;
      } else {
        const parts = [`const route = (`];

        parts.push(pathParams.map((p) => p.name).join(', '));

        parts.push(') => `');
        parts.push(baseUrlString('base', baseUrl));
        parts.push('`');

        yield parts.join('');
      }

      return 'stop';
    },
  );

const routesCode = (routes: Route[], config: RoutesConfig) =>
  generateRoutes(
    routes,
    config,
    function* ({ identifier, baseUrl, urlSuffix }) {
      let route = 'route';
      const url = baseUrl + (urlSuffix ?? '');

      if (urlSuffix) {
        route = `route_${identifier}`;

        yield `const ${route} = \`\${route}${urlSuffix}\`;`;
      }

      yield `export const ${identifier} = ${route};`;
      yield `export const ${identifier}_query = ${buildRouteQuery(route, url)}`;
    },
    function* ({ identifier, baseUrl, urlSuffix, pathParams, queryParams }) {
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

      const parts = [`export const ${identifier} = (`];

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

        const anyRequired = pathParams.length > 0 || queryParams.some(([, p]) => p.required);
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

      yield parts.join('');
    },
  );

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
