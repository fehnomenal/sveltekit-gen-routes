import { render, screen } from '@testing-library/svelte';
import { test } from 'vitest';
import Page from '../../../../../src/routes/[...rest]/more/[param]/+page.svelte';

test('page', ({ expect }) => {
  render(Page);

  expect(screen.getByTestId('PAGE_rest_more_param_empty').innerText).toBe('/more/abc');
  expect(screen.getByTestId('PAGE_rest_more_param_empty_query').innerText).toBe('/more/abc?a=c');
  expect(screen.getByTestId('PAGE_rest_more_param_filled').innerText).toBe('/abc/more/def');
  expect(screen.getByTestId('PAGE_rest_more_param_filled_query').innerText).toBe('/a/b/c/more/def?a=c');
});
