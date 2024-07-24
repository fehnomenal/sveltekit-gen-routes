import { type Plugin } from 'vite';
import type { AllRoutesMeta, Config } from './types.js';
export declare const sveltekitRoutes: <Meta extends AllRoutesMeta = AllRoutesMeta>({ moduleName, routesDir, paramMatchersDir, outputDir, debug, ...routesConfig }?: Config<Meta>) => Plugin;
