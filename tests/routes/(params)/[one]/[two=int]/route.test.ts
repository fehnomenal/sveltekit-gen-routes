import { render, screen } from '@testing-library/svelte';
import { test } from 'vitest';
import Page from '../../../../../src/routes/(params)/[one]/[two=int]/+page.svelte';

test('page', ({ expect }) => {
  render(Page);

  expect(screen.getByTestId('PAGE_params_one_two_int').innerText).toBe('/1/2');
  expect(screen.getByTestId('PAGE_params_one_two_int_query').innerText).toBe('/1/2?a=123');
});
