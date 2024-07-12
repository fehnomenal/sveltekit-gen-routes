import { name } from '../package.json' with { type: 'json' };
import { generateRoutes } from './generate.js';
import type { Route, RoutesConfig } from './types.js';

export const getIndexCodeLines = (routes: Route[], config: RoutesConfig, moduleName: string) => [
  ...generateRoutes(
    routes,
    config,
    function* ({ identifier, codeFileName }) {
      yield `export { ${identifier}, ${identifier}_query } from '${moduleName}/${codeFileName}.js';`;
    },
    () => '',
    function* ({ identifier, codeFileName }) {
      yield `export { ${identifier} } from '${moduleName}/${codeFileName}.js';`;
    },
  ),
];

export const getRouteKeyCodeLines = (routes: Route[], config: RoutesConfig) => [
  `import { base } from '$app/paths';`,
  `import { joinSegments, routeQuery, routeQueryParam, routeQueryExtra } from '${name}/helpers';`,
  '',
  ...genBaseRoute(routes[0], config),
  ...routesCode(routes, config),
];

const genBaseRoute = (route: Route, config: RoutesConfig) =>
  generateRoutes(
    [route],
    config,
    function* ({ baseUrl }) {
      yield `const route = ${buildRoute(baseUrl)};`;
    },
    (param) => (param.multi ? `\${joinSegments(${param.name})}` : `\${${param.name}}`),
    function* ({ baseUrl, parameters }) {
      const pathParams = parameters.filter((p) => p.urlReplaceSearch !== undefined);

      if (pathParams.length === 0) {
        yield `const route = ${buildRoute(baseUrl)};`;
      } else {
        const parts = [`const route = (`];

        parts.push(pathParams.map((p) => p.name).join(', '));

        parts.push(') => ');
        parts.push(buildRoute(baseUrl));

        yield parts.join('');
      }
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
    (param) => (param.multi ? `\${joinSegments(${param.name})}` : `\${${param.name}}`),
    function* ({ identifier, baseUrl, urlSuffix, parameters }) {
      let route: string;
      const url = baseUrl + (urlSuffix ?? '');

      const pathParams = parameters.filter((p) => p.urlReplaceSearch !== undefined);

      if (pathParams.length === 0) {
        route = 'route';
      } else {
        route = `route(${pathParams.map((p) => p.name).join(', ')})`;
      }

      if (urlSuffix) {
        route = `\`\${${route}}${urlSuffix}\``;
      }

      const parts = [`export const ${identifier} = (`];

      const explicitQueryParamNames = parameters
        .filter((p) => p.urlReplaceSearch === undefined)
        .map((p) => p.name);

      if (parameters.length === 1) {
        parts.push(parameters[0].name);
      } else {
        parts.push('{ ');
        parts.push(parameters.map((p) => p.name).join(', '));
        parts.push(' }');
      }

      parts.push(`, ${EXTRA_QUERY_PARAM_NAME}) => `);

      if (explicitQueryParamNames.length === 0) {
        parts.push(buildRouteQueryParam(route, url));
      } else {
        parts.push(buildRouteQueryExtra(route, url, explicitQueryParamNames));
      }

      yield parts.join('');
    },
  );

const EXTRA_QUERY_PARAM_NAME = 'q';

const buildRoute = (url: string) => `\`\${base}/${url}\``;

const buildRouteQuery = (route: string, url: string) => routeCall('routeQuery', route, querySepCharArg(url));

const buildRouteQueryParam = (route: string, url: string) =>
  routeCall('routeQueryParam', route, EXTRA_QUERY_PARAM_NAME, querySepCharArg(url));

const buildRouteQueryExtra = (route: string, url: string, explicitQueryParamNames: string[]) =>
  routeCall(
    'routeQueryExtra',
    route,
    EXTRA_QUERY_PARAM_NAME,
    `{ ${explicitQueryParamNames.join(', ')} }`,
    querySepCharArg(url),
  );

const routeCall = (fnName: string, url: string, ...args: (string | false | null | undefined)[]) =>
  `${fnName}(${[url, ...args.filter(Boolean)].join(', ')})`;

const querySepCharArg = (url: string) => (url.includes('?') ? `'&'` : undefined);
