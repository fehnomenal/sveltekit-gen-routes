import type { ActionRoute, PathParameter, QueryParamConfig, Route, RoutesConfig, ServerRoute } from './types.js';
type GeneratorParams = {
    identifier: string;
    key: string;
    baseUrl: string;
    urlSuffix?: string;
};
type GeneratorParamsWithParams = GeneratorParams & {
    pathParams: PathParameter[];
    queryParams: [string, QueryParamConfig][];
};
type RouteGenerator<Params extends GeneratorParams> = (p: Params) => Generator<string, 'stop' | void>;
export declare function generateRoutes(routes: Route[], config: RoutesConfig, generateRouteWithoutParameters: RouteGenerator<GeneratorParams>, generateRouteWithParameters: RouteGenerator<GeneratorParamsWithParams>): Generator<string, void, unknown>;
type FinalRoute = {
    identifier: string;
    key: string;
    baseUrl: string;
    urlSuffix?: string;
    pathParams: PathParameter[];
    queryParams: [string, QueryParamConfig][];
};
export declare const expandServerRoute: (route: ServerRoute, config: RoutesConfig['SERVERS']) => FinalRoute[];
export declare const expandActionRoute: (route: ActionRoute, config: RoutesConfig['ACTIONS']) => FinalRoute[];
export {};
