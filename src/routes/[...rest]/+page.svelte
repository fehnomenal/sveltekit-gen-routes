<script>
  import { PAGE_rest } from '$routes';
</script>

<span data-testid="PAGE_rest_empty">{PAGE_rest()}</span>
<span data-testid="PAGE_rest_empty_query">{PAGE_rest([], { a: 'c' })}</span>

<span data-testid="PAGE_rest_filled">{PAGE_rest('abc')}</span>
<span data-testid="PAGE_rest_filled_query">{PAGE_rest(['a', 'b', 'c'], { a: 'c' })}</span>
