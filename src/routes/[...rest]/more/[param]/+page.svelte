<script>
  import { PAGE_rest_more_param } from '$routes';
</script>

<span data-testid="PAGE_rest_more_param_empty">{PAGE_rest_more_param({ param: 'abc' })}</span>
<span data-testid="PAGE_rest_more_param_empty_query"
  >{PAGE_rest_more_param({ rest: [], param: 'abc' }, { a: 'c' })}</span
>

<span data-testid="PAGE_rest_more_param_filled">{PAGE_rest_more_param({ rest: 'abc', param: 'def' })}</span>
<span data-testid="PAGE_rest_more_param_filled_query"
  >{PAGE_rest_more_param({ rest: ['a', 'b', 'c'], param: 'def' }, { a: 'c' })}</span
>
