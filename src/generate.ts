import type { NormalizedParameter, PathParam, QueryParamConfig, Route, RoutesConfig } from './types.js';
import { getStrippedUrl, normalizeParameters, sortRoutes } from './utils.js';

type GeneratorParams = {
  identifier: string;
  codeFileName: string;
  baseUrl: string;
  urlSuffix?: string;
};

type GeneratorParamsWithParams = GeneratorParams & {
  parameters: NormalizedParameter[];
};

export function* generateRoutes(
  routes: Route[],
  config: RoutesConfig,
  generateRouteWithoutParameters: (p: GeneratorParams) => Generator<string>,
  getUrlReplacementString: (param: NormalizedParameter) => string,
  generateRouteWithParameters: (p: GeneratorParamsWithParams) => Generator<string>,
) {
  for (const route of flattenRoutes(routes, config)) {
    yield* generateRoute(
      route,
      generateRouteWithoutParameters,
      getUrlReplacementString,
      generateRouteWithParameters,
    );
    yield '';
  }
}

type FinalRoute = {
  type: Route['type'];
  codeFileName: string;
  key: string;
  baseUrl: string;
  urlSuffix?: string;
  pathParams: PathParam[];
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
  generateRouteWithoutParameters: (p: GeneratorParams) => Generator<string>,
  getUrlReplacementString: (param: NormalizedParameter) => string,
  generateRouteWithParameters: (p: GeneratorParamsWithParams) => Generator<string>,
) {
  let { type, key, codeFileName, baseUrl, urlSuffix, pathParams, queryParams } = route;
  const identifier = `${type}_${key}`;

  if (pathParams.length === 0 && (!queryParams || Object.keys(queryParams).length === 0)) {
    yield* generateRouteWithoutParameters({
      identifier,
      codeFileName,
      baseUrl,
      urlSuffix,
    });

    return;
  }

  const parameters = normalizeParameters(pathParams, queryParams);

  for (const param of parameters) {
    if (param.urlReplaceSearch) {
      baseUrl = baseUrl.replace(param.urlReplaceSearch, getUrlReplacementString(param));
    }
  }

  yield* generateRouteWithParameters({
    identifier,
    codeFileName,
    baseUrl,
    urlSuffix,
    parameters,
  });
}
