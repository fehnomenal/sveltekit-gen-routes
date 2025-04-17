# @fehnomenal/sveltekit-gen-routes

## 4.2.5

### Patch Changes

- Respect exported functions as server methods _[`#21`](https://github.com/fehnomenal/sveltekit-gen-routes/pull/21) [`2dd1368`](https://github.com/fehnomenal/sveltekit-gen-routes/commit/2dd13680a8b27b32fb8d7fa24651d9cd53e527c0) [@fehnomenal](https://github.com/fehnomenal)_

## 4.2.4

### Patch Changes

- Fix release workflow _[`#16`](https://github.com/fehnomenal/sveltekit-gen-routes/pull/16) [`f19396c`](https://github.com/fehnomenal/sveltekit-gen-routes/commit/f19396cafc5fbad80a3a2e3077df2e4640299d2d) [@fehnomenal](https://github.com/fehnomenal)_

## 4.2.3

### Patch Changes

- Fix install instructions _[`#13`](https://github.com/fehnomenal/sveltekit-gen-routes/pull/13) [`473ab22`](https://github.com/fehnomenal/sveltekit-gen-routes/commit/473ab2287af6d07e4a59444e5e5f347bf03f3bfe) [@fehnomenal](https://github.com/fehnomenal)_

## 4.2.2

### Patch Changes

- Bump for releasing _[`#10`](https://github.com/fehnomenal/sveltekit-gen-routes/pull/10) [`293a3d4`](https://github.com/fehnomenal/sveltekit-gen-routes/commit/293a3d4882428f7e2f8cb100e1b18212fb8a7ae5) [@fehnomenal](https://github.com/fehnomenal)_

## 4.2.1

### Patch Changes

- Bump for releasing _[`#7`](https://github.com/fehnomenal/sveltekit-gen-routes/pull/7) [`0152a3e`](https://github.com/fehnomenal/sveltekit-gen-routes/commit/0152a3e6bd54228044ae7d712084673718d8c418) [@fehnomenal](https://github.com/fehnomenal)_

## 4.2.0

### Minor Changes

- f44159c: Support and test more ways to define route and action handlers

## 4.1.6

### Patch Changes

- 5683318: Correctly retrieve action names from explicitly typed object

## 4.1.5

### Patch Changes

- 4df1956: Do not check typescript in generated files

## 4.1.4

### Patch Changes

- 46636ae: Only import actually used helper functions

## 4.1.3

### Patch Changes

- ef77b33: Use os dependent newlines. This should be better for default git configurations.

## 4.1.2

### Patch Changes

- ef5c42f: Remove publish script in published package

## 4.1.1

### Patch Changes

- a66aac4: Reduce size by not bundling dependencies

## 4.1.0

### Minor Changes

- 460aed5: Optionally enforce creation of a root route

### Patch Changes

- 6fbce63: Correctly remove routes for removed files
- a8d7536: Make rest parameters optionally

## 4.0.0

### Major Changes

- 4cb3638: Do not generate urls with trailing slash
- 4cb3638: Generate root routes under key '\_ROOT'

  BREAKING: This changes the exported constant and function names.

### Minor Changes

- 4cb3638: Enhance route typings

## 3.1.1

### Patch Changes

- 6ac58bc: Correctly handle paths on windows

## 3.1.0

### Minor Changes

- 69b291d: Allow omitting an object for only optional parameters

### Patch Changes

- a9eaacf: Also handle action only routes
- e0d3303: Generate base route only once
- ec06547: Correctly handle rest path parameters and parameters with invalid names
- 7ba5d79: Also handle routes without `+page.svelte`

## 3.0.2

### Patch Changes

- 5f0c429: Handle extra parameters also if no query params are passed

## 3.0.1

### Patch Changes

- 4bcf024: Generate more optimal code

## 3.0.0

### Major Changes

- 172cea9: Try to infer better parameter types

## 2.0.0

### Major Changes

- 6465450: Rename package

## 1.1.1

### Patch Changes

- 4df60c7: Fix generation of deeply nested routes

## 1.1.0

### Minor Changes

- 63767da: Support nodejs 11

### Patch Changes

- f972038: Correctly handle multiple route params

## 1.0.0

### Major Changes

- Create initial implementation
