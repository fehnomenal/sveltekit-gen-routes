<script>
  import { PAGE_rest_more } from '$routes';
</script>

<span data-testid="PAGE_rest_more_empty">{PAGE_rest_more()}</span>
<span data-testid="PAGE_rest_more_empty_query">{PAGE_rest_more([], { a: 'c' })}</span>

<span data-testid="PAGE_rest_more_filled">{PAGE_rest_more('abc')}</span>
<span data-testid="PAGE_rest_more_filled_query">{PAGE_rest_more(['a', 'b', 'c'], { a: 'c' })}</span>
