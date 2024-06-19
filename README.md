# sveltekit-gen-routes

This vite plugin generates route helpers for sveltekit routes.

## Getting started

Choose the one for your package manager.

```sh
npm install -D 'github:fehnomenal/sveltekit-gen-routes#semver:1.1.0'
```

```sh
yarn install -D 'github:fehnomenal/sveltekit-gen-routes#semver:1.1.0'
```

```sh
pnpm install -D 'github:fehnomenal/sveltekit-gen-routes#semver:1.1.0'
```

```sh
bun add -D 'github:fehnomenal/sveltekit-gen-routes#semver:1.1.0'
```

Import and include the plugin in your `vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { sveltekitRoutes } from 'sveltekit-gen-routes';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit(),
    sveltekitRoutes(),
  ],
});
```

Run `pnpm dev` and a new module (by default `$routes`) will be available containing constants and functions for all of your page routes, server endpoints and form actions:

```ts
import { PAGE__ROOT, PAGE_blog_post } from '$routes';

console.log(PAGE__ROOT);
// Output without base path: '/'

console.log(PAGE_blog_post(123));
// Output without base path: '/blog/123'
```

## What?

On each build and during development a declaration file (by default `src/$routes.d.ts`) will be generated containing constants and functions for each of your page routes, server endpoints and form actions.
The names are derived from the route id prefixed with the type (`PAGE`, `SERVER` or `ACTION`) and potentially suffixed with the endpoint method or action name.

Additionally a `PAGE__ROOT` constant is generated for the root route.

Routes without path (or query) parameters are simple string constants. To allow setting query parameters a second function (suffixed with `_query`) is generated that takes the query parameters as the only argument and returns a string with the query string appended.

Routes with a single path (or query) parameter will become a function with one argument for the parameter and an optional second argument for arbitrary query parameters.

Routes with more than one path (or query) parameter will become a function taking an object of parameter names to values as the first argument and optionally arbitrary query as the second argument.

For example for the following route structure:

```
src/params
└── int.ts
src/routes
├── (home)
│  └── +page.svelte
├── api
│  └── health
│     └── +server.ts       <-- GET handler
├── blog
│  └── [category_slug]
│     ├── +page.svelte
│     └── [post_id=int]
│        └── +page.svelte
└── contact
   ├── +page.server.ts     <-- submit_form action
   └── +page.svelte
```

This module declaration is generated:

```ts
declare module '$routes' {
  type Base = typeof import('$app/paths').base;

  type Param_int = Parameters<typeof import('./params/int.js').match>[0];

  type QueryParams = URLSearchParams | Record<string, string | undefined> | [string, string | undefined][];

  export const PAGE__ROOT: `${Base}/`;
  export const PAGE__ROOT_query: (
    queryParams: QueryParams,
  ) => `${Base}/${string}`;

  export const PAGE_blog_category_slug = (
    category_slug: string | number,
    queryParams?: QueryParams,
  ) => `${Base}/blog/${string | number}${string}`;

  export const PAGE_blog_category_slug_post_id_int = (
    params: {
      category_slug: string | number,
      post_id: Param_int,
    },
    queryParams?: QueryParams,
  ) => `${Base}/blog/${string | number}/${Param_int}${string}`;

  export const PAGE_contact: `${Base}/contact`;
  export const PAGE_contact_query: (
    queryParams: QueryParams,
  ) => `${Base}/contact${string}`;

  export const PAGE_home: `${Base}/`;
  export const PAGE_home_query: (
    queryParams: QueryParams,
  ) => `${Base}/${string}`;

  export const SERVER_api_health_GET: `${Base}/api/health`;
  export const SERVER_api_health_GET_query: (
    queryParams: QueryParams,
  ) => `${Base}/api/health${string}`;

  export const ACTION_contact_submit_form: `${Base}/contact?/submit_form`;
  export const ACTION_contact_submit_form_query: (
    queryParams: QueryParams,
  ) => `${Base}/contact?/submit_form${string}`;
}
```

## Configuration

The `sveltekitRoutes` function takes an object for configuration. Here you can change the name of the module (also changes the name of the generated file), the paths of your application and the output directory:

```ts
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
```

You can define explicit query parameters for each route:

```ts
    sveltekitRoutes({
      SERVERS: {
        api_health_GET: {
          explicitQueryParams: {
            module: { type: 'string', required: true },
          },
        },
      },
    }),
```

This removes the generated constant (as the route has parameters now) and changes the function:

```ts
  export const SERVER_api_health_GET = (
    module: string,
    queryParams?: QueryParams,
  ) => `${Base}/api/health${string}`;
```

You can even get typesafety inside the configuration object:

```diff
+import type { ROUTES } from '$routes';
 import { sveltekit } from '@sveltejs/kit/vite';
 import { sveltekitRoutes } from 'sveltekit-gen-routes';
 import { defineConfig } from 'vite';

 export default defineConfig({
   plugins: [
     sveltekit(),
-    sveltekitRoutes(),
+    sveltekitRoutes<ROUTES>({
+      SERVERS: {
+        api_health_GET: {
+          explicitQueryParams: {
+            module: { type: 'string' },
+          },
+        },
+      }
+    }),
   ],
 });
```

# Development and publishing

## Dev

```sh
> bun i
> # work work work
> bun changeset
> git add ...
> git commit
```

## Publish

```sh
> bun version
> git add ...
> git commit
> bun run build
> npm2git c
> git push
> git push --tags
```
