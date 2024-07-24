import type { PathParameter, QueryParamConfig, Route, RoutesConfig } from './types.js';
import { getStrippedUrl, sortRoutes } from './utils.js';

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

type PathParameterStringReplacer = (args: {
  param: PathParameter;
  pathParams: PathParameter[];
  queryParams: [string, QueryParamConfig][];
}) => string;

export function* generateRoutes(
  routes: Route[],
  config: RoutesConfig,
  generateRouteWithoutParameters: RouteGenerator<GeneratorParams>,
  getUrlReplacementString: PathParameterStringReplacer | null,
  generateRouteWithParameters: RouteGenerator<GeneratorParamsWithParams>,
) {
  for (const route of flattenRoutes(routes, config)) {
    const maybeStop = yield* generateRoute(
      route,
      generateRouteWithoutParameters,
      getUrlReplacementString,
      generateRouteWithParameters,
    );
    yield '';

    if (maybeStop === 'stop') {
      break;
    }
  }
}

type FinalRoute = {
  type: Route['type'];
  codeFileName: string;
  key: string;
  baseUrl: string;
  urlSuffix?: string;
  pathParams: PathParameter[];
  queryParams: [string, QueryParamConfig][];
};

export const flattenRoutes = (routes: Route[], config: RoutesConfig): FinalRoute[] => {
  const finalRoutes: FinalRoute[] = [];

  for (const route of sortRoutes(routes)) {
    const strippedUrl = getStrippedUrl(route.routeId);

    if (route.type === 'PAGE') {
      finalRoutes.push({
        type: route.type,
        codeFileName: route.key,
        key: route.key,
        baseUrl: strippedUrl,
        pathParams: route.pathParams,
        queryParams: Object.entries(config.PAGES?.[route.key]?.explicitQueryParams ?? {}),
      });
    } else if (route.type === 'SERVER' && route.methods.length > 0) {
      finalRoutes.push(
        ...route.methods.map(
          (method) =>
            ({
              type: route.type,
              codeFileName: route.key,
              key: `${route.key}_${method}`,
              baseUrl: strippedUrl,
              pathParams: route.pathParams,
              queryParams: Object.entries(
                config.SERVERS?.[`${route.key}_${method}`]?.explicitQueryParams ?? [],
              ),
            }) satisfies FinalRoute,
        ),
      );
    } else if (route.type === 'ACTION' && route.names.length > 0) {
      finalRoutes.push(
        ...route.names.map(
          (name) =>
            ({
              type: route.type,
              codeFileName: route.key,
              key: `${route.key}_${name}`,
              baseUrl: strippedUrl,
              urlSuffix: name === 'default' ? undefined : `?/${name}`,
              pathParams: route.pathParams,
              queryParams: Object.entries(
                config.SERVERS?.[`${route.key}_${name}`]?.explicitQueryParams ?? [],
              ),
            }) satisfies FinalRoute,
        ),
      );
    }
  }

  return finalRoutes;
};

function* generateRoute(
  route: FinalRoute,
  generateRouteWithoutParameters: RouteGenerator<GeneratorParams>,
  getUrlReplacementString: PathParameterStringReplacer | null,
  generateRouteWithParameters: RouteGenerator<GeneratorParamsWithParams>,
) {
  let { type, key, codeFileName, baseUrl, urlSuffix, pathParams, queryParams } = route;
  const identifier = `${type}_${key}`;

  const paramCount = pathParams.length + queryParams.length;

  if (paramCount === 0) {
    return yield* generateRouteWithoutParameters({
      identifier,
      codeFileName,
      baseUrl,
      urlSuffix,
    });
  }

  if (getUrlReplacementString) {
    for (const param of pathParams) {
      // For multi parameters also replace the leading slash. When there are values to join it will
      // be added again later.
      const searchValue = param.multi ? `/${param.rawInRoute}` : param.rawInRoute;

      const replaceValue = getUrlReplacementString({
        param,
        pathParams,
        queryParams,
      });

      baseUrl = baseUrl.replace(searchValue, replaceValue);
    }
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
