import { render, screen } from '@testing-library/svelte';
import { test } from 'vitest';
import Page from '../../src/routes/+page.svelte';
import { HEAD } from '../../src/routes/+server.js';

test('page', ({ expect }) => {
  render(Page);

  expect(screen.getByTestId('PAGE__ROOT').innerText).toBe('/');
  expect(screen.getByTestId('PAGE__ROOT_query').innerText).toBe('/?a=b');
});

test('endpoint', async ({ expect }) => {
  const json = await HEAD().json();

  expect(json.SERVER__ROOT_HEAD).toBe('/');
  expect(json.SERVER__ROOT_HEAD_query).toBe('/');
});
