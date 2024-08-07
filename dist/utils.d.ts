import type { ActionRoute, Config, DebugKey, PathParameter, Route, ServerRoute } from './types.js';
export declare const sortRoutes: (routes: Route[]) => Route[];
export declare const normalizeUrl: (routeId: string) => string;
export declare const baseUrlString: (baseName: string, url: string) => string;
export declare const isDebug: (debugConfig: Config['debug'], key: DebugKey) => boolean;
export declare const joinLines: (lines: string[]) => string;
export declare const getInSourceHelpersModulePath: () => string;
export declare const makeRelativePath: (from: string, to: string) => string;
export declare const isInSubdir: (parent: string, dir: string) => boolean;
export declare const replacePathParams: (url: string, pathParams: PathParameter[], replaceValue: (param: PathParameter) => string) => string;
export declare const getServerRouteKeys: (route: ServerRoute) => {
    key: string;
    method: string;
}[];
export declare const getActionRouteKeys: (route: ActionRoute) => {
    key: string;
    name: string;
}[];
