/// <reference types="@sveltejs/kit" />
/// <reference types="node" />
/// <reference types="bun-types" />
import type { base } from '$app/paths';
export type Base = typeof base;
export type ParamOfMatcher<T extends (...args: any) => any> = T extends (param: any) => param is infer P ? P : string;
export type QueryParams = URLSearchParams | Record<string, string | string[] | undefined> | [string, string | string[] | undefined][];
