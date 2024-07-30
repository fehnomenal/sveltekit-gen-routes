import { render, screen } from '@testing-library/svelte';
import { test } from 'vitest';
import Page from '../../../src/routes/[...rest]/+page.svelte';

test('page', ({ expect }) => {
  render(Page);

  expect(screen.getByTestId('PAGE_rest_empty').innerText).toBe('/');
  expect(screen.getByTestId('PAGE_rest_empty_query').innerText).toBe('/?a=c');
  expect(screen.getByTestId('PAGE_rest_filled').innerText).toBe('/abc');
  expect(screen.getByTestId('PAGE_rest_filled_query').innerText).toBe('/a/b/c?a=c');
});
