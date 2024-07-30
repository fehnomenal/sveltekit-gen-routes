import { render, screen } from '@testing-library/svelte';
import { test } from 'vitest';
import Page from '../../../../src/routes/[...rest]/more/+page.svelte';

test('page', ({ expect }) => {
  render(Page);

  expect(screen.getByTestId('PAGE_rest_more_empty').innerText).toBe('/more');
  expect(screen.getByTestId('PAGE_rest_more_empty_query').innerText).toBe('/more?a=c');
  expect(screen.getByTestId('PAGE_rest_more_filled').innerText).toBe('/abc/more');
  expect(screen.getByTestId('PAGE_rest_more_filled_query').innerText).toBe('/a/b/c/more?a=c');
});
