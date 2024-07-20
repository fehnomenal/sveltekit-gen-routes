import type { NormalizedParameter, PathParam, QueryParamConfig, Route, RoutesConfig } from './types.js';
type GeneratorParams = {
    identifier: string;
    codeFileName: string;
    baseUrl: string;
    urlSuffix?: string;
};
type GeneratorParamsWithParams = GeneratorParams & {
    parameters: NormalizedParameter[];
};
export declare function generateRoutes(routes: Route[], config: RoutesConfig, generateRouteWithoutParameters: (p: GeneratorParams) => Generator<string, 'stop' | void>, getUrlReplacementString: ((param: NormalizedParameter) => string) | null, generateRouteWithParameters: (p: GeneratorParamsWithParams) => Generator<string, 'stop' | void>): Generator<string, void, unknown>;
type FinalRoute = {
    type: Route['type'];
    codeFileName: string;
    key: string;
    baseUrl: string;
    urlSuffix?: string;
    pathParams: PathParam[];
    queryParams: [string, QueryParamConfig][];
};
export declare const flattenRoutes: (routes: Route[], config: RoutesConfig) => FinalRoute[];
export {};
