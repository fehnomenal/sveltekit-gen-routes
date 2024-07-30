import { render, screen } from '@testing-library/svelte';
import { test } from 'vitest';
import Page from '../../../../src/routes/[...rest]/[param]/+page.svelte';

test('page', ({ expect }) => {
  render(Page);

  expect(screen.getByTestId('PAGE_rest_param_empty').innerText).toBe('/abc');
  expect(screen.getByTestId('PAGE_rest_param_empty_query').innerText).toBe('/abc?a=c');
  expect(screen.getByTestId('PAGE_rest_param_filled').innerText).toBe('/abc/def');
  expect(screen.getByTestId('PAGE_rest_param_filled_query').innerText).toBe('/a/b/c/def?a=c');
});
