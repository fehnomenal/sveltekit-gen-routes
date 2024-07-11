import type { Config, DebugKey, NormalizedParameter, PathParam, QueryParams, Route } from './types.js';
export declare const sortRoutes: (routes: Route[]) => Route[];
export declare const getStrippedUrl: (routeId: string) => string;
export declare const normalizeParameters: (pathParams: PathParam[], queryParams: QueryParams | null) => NormalizedParameter[];
export declare const isDebug: (debugConfig: Config['debug'], key: DebugKey) => boolean;
export declare const joinLines: (lines: string[]) => string;
