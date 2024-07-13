import type { QueryParams } from './public-types.ts';
export declare const routeQuery: (url: string, char?: string) => (q: QueryParams) => string;
export declare const routeQueryParam: (url: string, q: QueryParams, char?: string) => string;
export declare const routeQueryExtra: (url: string, q: QueryParams, extra: Record<string, string | string[] | undefined>, char?: string) => string;
export declare const joinSegments: (segments: string | string[]) => string;
