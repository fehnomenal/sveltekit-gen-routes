import type { NormalizedParameter, PathParam, QueryParams, Route, RoutesConfig } from './types.js';
type GeneratorParams = {
    identifier: string;
    codeFileName: string;
    url: string;
};
type GeneratorParamsWithParams = GeneratorParams & {
    parameters: NormalizedParameter[];
};
export declare function generateRoutes(routes: Route[], config: RoutesConfig, generateRouteWithoutParameters: (p: GeneratorParams) => Generator<string>, getUrlReplacementString: (param: NormalizedParameter) => string, generateRouteWithParameters: (p: GeneratorParamsWithParams) => Generator<string>): Generator<string, void, unknown>;
type FinalRoute = [
    type: Route['type'],
    codeFileName: string,
    key: string,
    url: string,
    pathParams: PathParam[],
    queryParams: QueryParams | null
];
export declare const flattenRoutes: (routes: Route[], config: RoutesConfig) => FinalRoute[];
export {};
