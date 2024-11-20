import { ACTION_params_one_default } from '$routes';
import type { Actions } from './$types.js';

export const actions = {
  default() {
    return {
      ACTION_params_one_default: ACTION_params_one_default('uno'),
      ACTION_params_one_default_query: ACTION_params_one_default('uno', { a: 'b' }),
    };
  },
} satisfies Actions;
