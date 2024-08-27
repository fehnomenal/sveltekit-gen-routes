import type { PathParameter, QueryParamConfig, Route, RoutesConfig } from './types.js';
export declare const getDeclarationFileContentLines: (moduleName: string, declarationFilePath: string, paramMatchersDir: string, routes: Route[], config: RoutesConfig) => string[];
export declare function generateDeclsForRouteWithoutParams(url: string, routeIdentifier: string): Generator<string, void, unknown>;
export declare function generateDeclsForRouteWithParams(url: string, routeIdentifier: string, pathParams: PathParameter[], queryParams: [string, QueryParamConfig][]): Generator<string, void, unknown>;
