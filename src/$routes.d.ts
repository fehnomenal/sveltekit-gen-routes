/* eslint-disable */
// prettier-ignore
declare module '$routes' {
  import type { Base, ParamOfMatcher, QueryParams } from '@fehnomenal/sveltekit-gen-routes/types';

  type Param_int = ParamOfMatcher<typeof import('./params/int.js').match>;

  export const PAGE__ROOT: `${Base}/`;
  export function PAGE__ROOT_query(
    queryParams: QueryParams,
  ): `${Base}/${string /* queryParams */}`;

  export const PAGE_groups_group: `${Base}/groups`;
  export function PAGE_groups_group_query(
    queryParams: QueryParams,
  ): `${Base}/groups${string /* queryParams */}`;

  export const PAGE_groups_group_more: `${Base}/groups/more`;
  export function PAGE_groups_group_more_query(
    queryParams: QueryParams,
  ): `${Base}/groups/more${string /* queryParams */}`;

  export function PAGE_params_one(
    one: string,
    queryParams?: QueryParams,
  ): `${Base}/${typeof one}${string /* queryParams */}`;

  export function PAGE_params_one_two_int(
    params: {
      one: string,
      two: Param_int,
    },
    queryParams?: QueryParams,
  ): `${Base}/${typeof params.one}/${typeof params.two}${string /* queryParams */}`;

  export function PAGE_params_only_rest(
    only_rest: string | string[],
    queryParams?: QueryParams,
  ): `${Base}${string /* only_rest */}${string /* queryParams */}`;

  export const SERVER__ROOT_HEAD: `${Base}/`;
  export function SERVER__ROOT_HEAD_query(
    queryParams: QueryParams,
  ): `${Base}/${string /* queryParams */}`;

  export function SERVER_params_one_two_int_more_GET(
    params: {
      one: string,
      two: Param_int,
      more: string | string[],
    },
    queryParams?: QueryParams,
  ): `${Base}/${typeof params.one}/${typeof params.two}${string /* more */}${string /* queryParams */}`;

  export function SERVER_params_one_two_int_more_POST(
    params: {
      one: string,
      two: Param_int,
      more: string | string[],
    },
    queryParams?: QueryParams,
  ): `${Base}/${typeof params.one}/${typeof params.two}${string /* more */}${string /* queryParams */}`;

  export function SERVER_params_one_two_int_more_PUT(
    params: {
      one: string,
      two: Param_int,
      more: string | string[],
    },
    queryParams?: QueryParams,
  ): `${Base}/${typeof params.one}/${typeof params.two}${string /* more */}${string /* queryParams */}`;

  export const ACTION_groups_group_more_do_that: `${Base}/groups/more?/do_that`;
  export function ACTION_groups_group_more_do_that_query(
    queryParams: QueryParams,
  ): `${Base}/groups/more?/do_that${string /* queryParams */}`;

  export const ACTION_groups_group_more_do_this: `${Base}/groups/more?/do_this`;
  export function ACTION_groups_group_more_do_this_query(
    queryParams: QueryParams,
  ): `${Base}/groups/more?/do_this${string /* queryParams */}`;

  export function ACTION_params_one_default(
    one: string,
    queryParams?: QueryParams,
  ): `${Base}/${typeof one}${string /* queryParams */}`;

  export type ROUTES = {
    PAGES: {
      _ROOT: never;
      groups_group: never;
      groups_group_more: never;
      params_one: 'one';
      params_one_two_int: 'one' | 'two';
      params_only_rest: 'only_rest';
    };
    SERVERS: {
      _ROOT_HEAD: never;
      params_one_two_int_more_GET: 'one' | 'two' | 'more';
      params_one_two_int_more_POST: 'one' | 'two' | 'more';
      params_one_two_int_more_PUT: 'one' | 'two' | 'more';
    };
    ACTIONS: {
      groups_group_more_do_that: never;
      groups_group_more_do_this: never;
      params_one_default: 'one';
    };
  };

  export {};
}
