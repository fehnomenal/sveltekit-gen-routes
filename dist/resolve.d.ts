import type { Route } from './types.js';
export declare const isServerEndpointFile: (file: string) => boolean;
export declare const isPageFile: (file: string) => boolean;
export declare const isPageServerFile: (file: string) => boolean;
export declare const getRouteId: (routesDirRelativePath: string) => string;
export declare const resolveRouteInfo: (routeId: string, file: string, routes: Route[]) => void;
