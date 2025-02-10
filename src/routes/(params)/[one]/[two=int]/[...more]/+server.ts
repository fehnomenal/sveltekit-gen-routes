import {
  SERVER_params_one_two_int_more_GET,
  SERVER_params_one_two_int_more_POST,
  SERVER_params_one_two_int_more_PUT,
} from '$routes';
import { json } from '@sveltejs/kit';
import { someFunction } from './external.js';

export { OPTIONS } from './external.js';

export const GET = () =>
  json({
    SERVER_params_one_two_int_more_GET: SERVER_params_one_two_int_more_GET({ one: '1', two: '2', more: [] }),
    SERVER_params_one_two_int_more_GET_query: SERVER_params_one_two_int_more_GET(
      { one: '1', two: '2', more: [] },
      { a: '123' },
    ),
  });

export const POST = () =>
  json({
    SERVER_params_one_two_int_more_POST: SERVER_params_one_two_int_more_POST({
      one: '1',
      two: '2',
      more: 'abc',
    }),
  });

export const PUT = () =>
  json({
    SERVER_params_one_two_int_more_PUT: SERVER_params_one_two_int_more_PUT({
      one: '1',
      two: '2',
      more: ['a', 'b', 'c'],
    }),
  });

export const HEAD = someFunction;

export { someFunction as DELETE };
