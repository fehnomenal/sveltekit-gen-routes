import { render, screen } from '@testing-library/svelte';
import { test } from 'vitest';
import { actions } from '../../../../src/routes/(params)/[one]/+page.server.js';
import Page from '../../../../src/routes/(params)/[one]/+page.svelte';

test('page', ({ expect }) => {
  render(Page);

  expect(screen.getByTestId('PAGE_params_one').innerText).toBe('/1');
  expect(screen.getByTestId('PAGE_params_one_query').innerText).toBe('/1?a=b');
});

test('action', ({ expect }) => {
  const json = actions.default();

  expect(json.ACTION_params_one_default).toBe('/uno');
  expect(json.ACTION_params_one_default_query).toBe('/uno?a=b');
});
