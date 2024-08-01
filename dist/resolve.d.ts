import type { Route } from './types.js';
export declare const getRouteId: (routesDirRelativePath: string) => string;
type FileType = NonNullable<ReturnType<typeof getFileTypeFromFileName>>;
export declare const getFileTypeFromFileName: (fileName: string) => 'SERVER_SCRIPT' | 'PAGE_COMPONENT' | 'PAGE_SCRIPT' | 'PAGE_SERVER_SCRIPT' | null;
export declare const getRouteTypeFromFileType: (fileType: FileType) => Route['type'];
export declare const resolveRouteInfo: (routeId: string, fileType: FileType, getSource: () => string, routes: Route[]) => void;
export {};
