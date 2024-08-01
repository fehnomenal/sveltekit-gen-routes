import type { PathParameter, QueryParamConfig, Route, RoutesConfig } from './types.js';
export declare const getIndexCodeLines: (routes: Route[], config: RoutesConfig, moduleName: string) => string[];
export declare const getRouteKeyCodeLines: (routes: Route[], config: RoutesConfig) => string[];
export declare function generateCodeForBaseRouteWithoutParams(url: string): Generator<string, void, unknown>;
export declare function generateCodeForBaseRouteWithParams(url: string, pathParams: PathParameter[], queryParams: [string, QueryParamConfig][]): Generator<string, void, unknown>;
export declare function generateCodeForRouteWithoutParams(baseUrl: string, urlSuffix: string | undefined, routeIdentifier: string): Generator<string, void, unknown>;
export declare function generateCodeForRouteWithParams(baseUrl: string, urlSuffix: string | undefined, routeIdentifier: string, pathParams: PathParameter[], queryParams: [string, QueryParamConfig][]): Generator<string, void, unknown>;
