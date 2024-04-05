import type { NormalizedParameter, PathParam, QueryParams, Route, RoutesConfig } from './types.js';
import { getStrippedUrl, normalizeParameters, sortRoutes } from './utils.js';

type GeneratorParams = {
  identifier: string;
  codeFileName: string;
  url: string;
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
  for (const [type, codeFileName, key, url, pathParams, queryParams] of flattenRoutes(routes, config)) {
    yield* generateRoute(
      type,
      codeFileName,
      key,
      url,
      pathParams,
      queryParams,
      generateRouteWithoutParameters,
      getUrlReplacementString,
      generateRouteWithParameters,
    );
    yield '';
  }
}

type FinalRoute = [
  type: Route['type'],
  codeFileName: string,
  key: string,
  url: string,
  pathParams: PathParam[],
  queryParams: QueryParams | null,
];

export const flattenRoutes = (routes: Route[], config: RoutesConfig): FinalRoute[] => {
  const finalRoutes: FinalRoute[] = [];

  for (const route of sortRoutes(routes)) {
    const strippedUrl = getStrippedUrl(route.routeId);

    if (route.type === 'PAGE') {
      finalRoutes.push([
        route.type,
        route.key,
        route.key,
        strippedUrl,
        route.pathParams,
        config.PAGES?.[route.key]?.explicitQueryParams ?? null,
      ]);
    } else if (route.type === 'SERVER' && route.methods.length > 0) {
      finalRoutes.push(
        ...route.methods.map(
          (method) =>
            [
              route.type,
              route.key,
              `${route.key}_${method}`,
              strippedUrl,
              route.pathParams,
              config.SERVERS?.[`${route.key}_${method}`]?.explicitQueryParams ?? null,
            ] satisfies FinalRoute,
        ),
      );
    } else if (route.type === 'ACTION' && route.names.length > 0) {
      finalRoutes.push(
        ...route.names.map(
          (name) =>
            [
              route.type,
              route.key,
              `${route.key}_${name}`,
              `${strippedUrl}${name === 'default' ? '' : `?/${name}`}`,
              route.pathParams,
              config.SERVERS?.[`${route.key}_${name}`]?.explicitQueryParams ?? null,
            ] satisfies FinalRoute,
        ),
      );
    }
  }

  return finalRoutes;
};

function* generateRoute(
  type: Route['type'],
  codeFileName: string,
  key: string,
  url: string,
  pathParams: PathParam[],
  explicitQueryParams: QueryParams | null,
  generateRouteWithoutParameters: (p: GeneratorParams) => Generator<string>,
  getUrlReplacementString: (param: NormalizedParameter) => string,
  generateRouteWithParameters: (p: GeneratorParamsWithParams) => Generator<string>,
) {
  const identifier = `${type}_${key}`;

  if (pathParams.length === 0 && (!explicitQueryParams || Object.keys(explicitQueryParams).length === 0)) {
    yield* generateRouteWithoutParameters({ identifier, codeFileName, url });

    return;
  }

  const parameters = normalizeParameters(pathParams, explicitQueryParams);

  for (const param of parameters) {
    if (param.urlReplaceSearch) {
      url = url.replace(param.urlReplaceSearch, getUrlReplacementString(param));
    }
  }

  yield* generateRouteWithParameters({ identifier, codeFileName, url, parameters });
}
