<script>
  import { PAGE_params_one } from '$routes';
</script>

<span data-testid="PAGE_params_one">{PAGE_params_one('1')}</span>
<span data-testid="PAGE_params_one_query">{PAGE_params_one('1', { a: 'b' })}</span>
