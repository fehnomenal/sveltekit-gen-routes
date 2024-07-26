import { render, screen } from '@testing-library/svelte';
import { test } from 'vitest';
import Page from '../../../../src/routes/groups/(group)/+page.svelte';

test('page', ({ expect }) => {
  render(Page);

  expect(screen.getByTestId('PAGE_groups_group').innerText).toBe('/groups');
  expect(screen.getByTestId('PAGE_groups_group_query').innerText).toBe('/groups?a=c');
});
