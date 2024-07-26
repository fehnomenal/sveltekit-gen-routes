import { render, screen } from '@testing-library/svelte';
import { test } from 'vitest';
import Page from '../../../../src/routes/(params)/[...only_rest]/+page.svelte';

test('page', ({ expect }) => {
  render(Page);

  expect(screen.getByTestId('PAGE_params_only_rest_empty1').innerText).toBe('/');
  expect(screen.getByTestId('PAGE_params_only_rest_empty2').innerText).toBe('/');
  expect(screen.getByTestId('PAGE_params_only_rest_empty3').innerText).toBe('/');
  expect(screen.getByTestId('PAGE_params_only_rest_empty_query').innerText).toBe('/?a=b');
  expect(screen.getByTestId('PAGE_params_only_rest_single').innerText).toBe('/single');
  expect(screen.getByTestId('PAGE_params_only_rest_one').innerText).toBe('/single');
  expect(screen.getByTestId('PAGE_params_only_rest_more').innerText).toBe('/one/and/another');
  expect(screen.getByTestId('PAGE_params_only_rest_query').innerText).toBe('/abc/def?a=b');
});
