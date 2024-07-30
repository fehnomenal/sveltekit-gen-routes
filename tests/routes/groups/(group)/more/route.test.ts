import { render, screen } from '@testing-library/svelte';
import { test } from 'vitest';
import { actions } from '../../../../../src/routes/groups/(group)/more/+page.server.js';
import Page from '../../../../../src/routes/groups/(group)/more/+page.svelte';

test('page', ({ expect }) => {
  render(Page);

  expect(screen.getByTestId('PAGE_groups_group_more').innerText).toBe('/groups/more');
  expect(screen.getByTestId('PAGE_groups_group_more_query').innerText).toBe('/groups/more?one=1&two=2');
});

test('action', ({ expect }) => {
  const do_this = actions.do_this();

  expect(do_this.ACTION_groups_group_more_do_this).toBe('/groups/more?/do_this');
  expect(do_this.ACTION_groups_group_more_do_this_query).toBe('/groups/more?/do_this&a=xyz');

  const do_that = actions.do_that();

  expect(do_that.ACTION_groups_group_more_do_that).toBe('/groups/more?/do_that');
  expect(do_that.ACTION_groups_group_more_do_that_query).toBe('/groups/more?/do_that&b=uvw');
});
