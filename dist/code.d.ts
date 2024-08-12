import type { PathParameter, QueryParamConfig, Route, RoutesConfig } from './types.js';
export declare const getIndexCodeLines: (routes: Route[], config: RoutesConfig, moduleName: string) => string[];
type RequiredImports = {
    base: boolean;
    helperNames: Set<string>;
};
export declare const getRouteKeyCodeLines: (routes: Route[], config: RoutesConfig) => string[];
export declare function generateCodeForBaseRouteWithoutParams(url: string, requiredImports?: RequiredImports): Generator<string, void, unknown>;
export declare function generateCodeForBaseRouteWithParams(url: string, pathParams: PathParameter[], queryParams: [string, QueryParamConfig][], requiredImports?: RequiredImports): Generator<string, void, unknown>;
export declare function generateCodeForRouteWithoutParams(baseUrl: string, urlSuffix: string | undefined, routeIdentifier: string, requiredImports?: RequiredImports): Generator<string, void, unknown>;
export declare function generateCodeForRouteWithParams(baseUrl: string, urlSuffix: string | undefined, routeIdentifier: string, pathParams: PathParameter[], queryParams: [string, QueryParamConfig][], requiredImports?: RequiredImports): Generator<string, void, unknown>;
export {};
