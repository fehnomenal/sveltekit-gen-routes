export type PathParam = {
    name: string;
    matcher?: string;
    multi?: boolean;
};
type BaseRoute = {
    routeId: string;
    key: string;
    pathParams: PathParam[];
};
export type ServerRoute = BaseRoute & {
    type: 'SERVER';
    methods: string[];
};
export type PageRoute = BaseRoute & {
    type: 'PAGE';
};
export type ActionRoute = BaseRoute & {
    type: 'ACTION';
    names: string[];
};
export type Route = ServerRoute | PageRoute | ActionRoute;
export type QueryParams = Record<string, QueryParamConfig>;
export type QueryParamConfig = {
    type: string;
    required?: boolean;
};
export type NormalizedParameter = {
    name: string;
    type: string;
    multi: boolean;
    required: boolean;
    urlReplaceSearch?: string;
};
export type AllRoutesMeta = {
    PAGES?: Record<string, PathParamName>;
    SERVERS?: Record<string, PathParamName>;
    ACTIONS?: Record<string, PathParamName>;
};
type PathParamName = string | never;
export type RoutesConfig<Meta extends AllRoutesMeta = AllRoutesMeta> = {
    [T in keyof Meta]?: Partial<Record<keyof Meta[T] extends never ? string : keyof Meta[T], {
        explicitQueryParams?: QueryParams;
    }>>;
};
export type Config<Meta extends AllRoutesMeta = AllRoutesMeta> = {
    /**
     * Module to import routes from.
     * @default '$routes'
     */
    moduleName?: string;
    /**
     * Path to your routes folder.
     * @default './src/routes'
     */
    routesDir?: string;
    /**
     * Path to your params folder.
     * @default './src/params'
     */
    paramMatchersDir?: string;
    /**
     * Folder to place the generated file(s) in.
     * @default './src'
     */
    outputDir?: string;
    debug?: boolean | Partial<Record<DebugKey, boolean>>;
} & RoutesConfig<Meta>;
export type DebugKey = 'code';
export {};
