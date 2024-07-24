import type { Config, DebugKey, Route } from './types.js';
export declare const sortRoutes: (routes: Route[]) => Route[];
export declare const getStrippedUrl: (routeId: string) => string;
export declare const baseUrlString: (baseName: string, url: string) => string;
export declare const isDebug: (debugConfig: Config['debug'], key: DebugKey) => boolean;
export declare const joinLines: (lines: string[]) => string;
export declare const getInSourceHelpersModulePath: () => string;
export declare const makeRelativePath: (from: string, to: string) => string;
export declare const isInSubdir: (parent: string, dir: string) => boolean;
