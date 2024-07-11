import type { Route } from './types.js';
export declare const isServerEndpointFile: (file: string) => boolean;
export declare const isPageFile: (file: string) => boolean;
export declare const getRouteId: (routesDir: string, file: string) => string;
export declare const resolveRouteInfo: (routesDir: string, file: string, routes: Route[]) => void;
