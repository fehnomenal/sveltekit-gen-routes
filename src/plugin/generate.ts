import type {
  ActionRoute,
  PathParameter,
  QueryParamConfig,
  Route,
  RoutesConfig,
  ServerRoute,
} from './types.js';
import { getActionRouteKeys, getServerRouteKeys, normalizeUrl, sortRoutes } from './utils.js';

type GeneratorParams = {
  identifier: string;
  codeFileName: string;
  baseUrl: string;
  urlSuffix?: string;
};

type GeneratorParamsWithParams = GeneratorParams & {
  pathParams: PathParameter[];
  queryParams: [string, QueryParamConfig][];
};

type RouteGenerator<Params extends GeneratorParams> = (p: Params) => Generator<string, 'stop' | void>;

export function* generateRoutes(
  routes: Route[],
  config: RoutesConfig,
  generateRouteWithoutParameters: RouteGenerator<GeneratorParams>,
  generateRouteWithParameters: RouteGenerator<GeneratorParamsWithParams>,
) {
  for (const route of flattenRoutes(routes, config)) {
    const maybeStop = yield* generateRoute(
      route,
      generateRouteWithoutParameters,
      generateRouteWithParameters,
    );
    yield '';

    if (maybeStop === 'stop') {
      break;
    }
  }
}

type FinalRoute = {
  identifier: string;
  codeFileName: string;
  baseUrl: string;
  urlSuffix?: string;
  pathParams: PathParameter[];
  queryParams: [string, QueryParamConfig][];
};

const flattenRoutes = (routes: Route[], config: RoutesConfig): FinalRoute[] => {
  const finalRoutes: FinalRoute[] = [];

  for (const route of sortRoutes(routes)) {
    if (route.type === 'PAGE') {
      finalRoutes.push({
        identifier: `${route.type}_${route.key}`,
        codeFileName: route.key,
        baseUrl: normalizeUrl(route.routeId),
        pathParams: route.pathParams,
        queryParams: Object.entries(config.PAGES?.[route.key]?.explicitQueryParams ?? {}),
      });
    } else if (route.type === 'SERVER' && route.methods.length > 0) {
      finalRoutes.push(...expandServerRoute(route, config.SERVERS));
    } else if (route.type === 'ACTION' && route.names.length > 0) {
      finalRoutes.push(...expandActionRoute(route, config.ACTIONS));
    }
  }

  return finalRoutes;
};

export const expandServerRoute = (route: ServerRoute, config: RoutesConfig['SERVERS']): FinalRoute[] =>
  getServerRouteKeys(route).map(({ key }) => ({
    identifier: `${route.type}_${key}`,
    codeFileName: route.key,
    baseUrl: normalizeUrl(route.routeId),
    pathParams: route.pathParams,
    queryParams: Object.entries(config?.[key]?.explicitQueryParams ?? []),
  }));

export const expandActionRoute = (route: ActionRoute, config: RoutesConfig['ACTIONS']): FinalRoute[] =>
  getActionRouteKeys(route).map(({ key, name }) => ({
    identifier: `${route.type}_${key}`,
    codeFileName: route.key,
    baseUrl: normalizeUrl(route.routeId),
    urlSuffix: name === 'default' ? undefined : `?/${name}`,
    pathParams: route.pathParams,
    queryParams: Object.entries(config?.[key]?.explicitQueryParams ?? []),
  }));

function* generateRoute(
  route: FinalRoute,
  generateRouteWithoutParameters: RouteGenerator<GeneratorParams>,
  generateRouteWithParameters: RouteGenerator<GeneratorParamsWithParams>,
) {
  let { identifier, codeFileName, baseUrl, urlSuffix, pathParams, queryParams } = route;

  if (pathParams.length + queryParams.length === 0) {
    return yield* generateRouteWithoutParameters({
      identifier,
      codeFileName,
      baseUrl,
      urlSuffix,
    });
  }

  return yield* generateRouteWithParameters({
    identifier,
    codeFileName,
    baseUrl,
    urlSuffix,
    pathParams,
    queryParams,
  });
}
