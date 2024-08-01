# @fehnomenal/sveltekit-gen-routes

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
