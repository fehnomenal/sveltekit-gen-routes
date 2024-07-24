import {
  ACTION_groups_group_more_do_that,
  ACTION_groups_group_more_do_that_query,
  ACTION_groups_group_more_do_this,
  ACTION_groups_group_more_do_this_query,
} from '$routes';

export const actions = {
  do_this() {
    return {
      ACTION_groups_group_more_do_this: ACTION_groups_group_more_do_this,
      ACTION_groups_group_more_do_this_query: ACTION_groups_group_more_do_this_query({ a: 'xyz' }),
    };
  },

  do_that() {
    return {
      ACTION_groups_group_more_do_that: ACTION_groups_group_more_do_that,
      ACTION_groups_group_more_do_that_query: ACTION_groups_group_more_do_that_query({ b: 'uvw' }),
    };
  },
};
