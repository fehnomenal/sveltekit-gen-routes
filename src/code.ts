import { generateRoutes } from './generate.js';
import type { Route, RoutesConfig } from './types.js';

export const helperCodeLines = [
  `import { base } from '$app/paths';`,
  '',
  `const createSearch = (params, char='?') => {`,
  `  if (Array.isArray(params)) {`,
  `    params = filter(params);`,
  `  } else if (params && !(params instanceof URLSearchParams)) {`,
  `    params = filter(Object.entries(params));`,
  `  }`,
  `  const search = new URLSearchParams(params).toString();`,
  `  return search ? char+search : '';`,
  `};`,
  '',
  `const createSearchExtra = (params, extra, char) => {`,
  `  const extraEntries = Object.entries(extra);`,
  `  if (Array.isArray(params)) {`,
  `    return createSearch([...params, ...extraEntries], char);`,
  `  }`,
  `  if (params instanceof URLSearchParams) {`,
  `    for (const [k, v] of filter(extraEntries)) {`,
  `      params.set(k, v);`,
  `    }`,
  `    return createSearch(params, char);`,
  `  }`,
  `  return createSearch({ ...extra, ...params }, char);`,
  `};`,
  '',
  `const filter = (params) => params.filter((e) => !!e[1]);`,
  '',
  `/*@__NO_SIDE_EFFECTS__*/ export const route = (url) => base+'/'+url;`,
  `/*@__NO_SIDE_EFFECTS__*/ export const routeQuery = (url, char) => {`,
  `  url = route(url);`,
  `  return (q) => url + createSearch(q, char);`,
  `}`,
  `/*@__NO_SIDE_EFFECTS__*/ export const routeQueryParam = (url, q, char) => route(url) + createSearch(q, char);`,
  `/*@__NO_SIDE_EFFECTS__*/ export const routeQueryExtra = (url, q, extra, char) => route(url) + createSearchExtra(q, extra, char);`,
  '',
  `/*@__NO_SIDE_EFFECTS__*/ export const joinSegments = (segments) => typeof segments === 'string' ? segments : segments.join('/');`,
];

export const getIndexCodeLines = (routes: Route[], config: RoutesConfig, moduleName: string) => [
  ...generateRoutes(
    routes,
    config,
    function* ({ identifier, codeFileName }) {
      yield `export { ${identifier}, ${identifier}_query } from '${moduleName}/${codeFileName}';`;
    },
    () => '',
    function* ({ identifier, codeFileName }) {
      yield `export { ${identifier} } from '${moduleName}/${codeFileName}';`;
    },
  ),
];

export const getRouteKeyCodeLines = (routes: Route[], config: RoutesConfig, moduleName: string) => [
  `import { joinSegments, route, routeQuery, routeQueryParam, routeQueryExtra } from '${moduleName}/helpers';`,
  '',
  ...routesCode(routes, config),
];

const routesCode = (routes: Route[], config: RoutesConfig) =>
  generateRoutes(
    routes,
    config,
    function* ({ identifier, url }) {
      yield `export const ${identifier} = ${route(url)};`;
      yield `export const ${identifier}_query = ${routeQuery(url)};`;
    },
    (param) => (param.multi ? `\${joinSegments(${param.name})}` : `\${${param.name}}`),
    function* ({ identifier, url, parameters }) {
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

      parts.push(', q) => ');

      if (explicitQueryParamNames.length === 0) {
        parts.push(routeQueryParam(url));
      } else {
        parts.push(routeQueryExtra(url, explicitQueryParamNames));
      }

      yield parts.join('');
    },
  );

const route = (url: string) => routeCall('route', url);
const routeQuery = (url: string) => routeCall('routeQuery', url, [querySepCharArg(url)]);
const routeQueryParam = (url: string) => routeCall('routeQueryParam', url, ['q', querySepCharArg(url)]);
const routeQueryExtra = (url: string, explicitQueryParamNames: string[]) =>
  routeCall('routeQueryExtra', url, ['q', `{ ${explicitQueryParamNames.join(', ')} }`, querySepCharArg(url)]);

const routeCall = (fn: string, url: string, args: (string | false | null | undefined)[] = []) =>
  `${fn}(${[`\`${url}\``, ...args.filter(Boolean)].join(', ')})`;

const querySepCharArg = (url: string) => url.includes('?') && `'&'`;
