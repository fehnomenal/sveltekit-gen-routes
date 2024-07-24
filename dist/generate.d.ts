import type { PathParameter, QueryParamConfig, Route, RoutesConfig } from './types.js';
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
export declare function generateRoutes(routes: Route[], config: RoutesConfig, generateRouteWithoutParameters: RouteGenerator<GeneratorParams>, getUrlReplacementString: PathParameterStringReplacer | null, generateRouteWithParameters: RouteGenerator<GeneratorParamsWithParams>): Generator<string, void, unknown>;
type FinalRoute = {
    type: Route['type'];
    codeFileName: string;
    key: string;
    baseUrl: string;
    urlSuffix?: string;
    pathParams: PathParameter[];
    queryParams: [string, QueryParamConfig][];
};
export declare const flattenRoutes: (routes: Route[], config: RoutesConfig) => FinalRoute[];
export {};
