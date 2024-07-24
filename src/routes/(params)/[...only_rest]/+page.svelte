<script>
  import { PAGE_params_only_rest } from '$routes';
</script>

<span data-testid="PAGE_params_only_rest_empty1">{PAGE_params_only_rest()}</span>
<span data-testid="PAGE_params_only_rest_empty2">{PAGE_params_only_rest([])}</span>
<span data-testid="PAGE_params_only_rest_empty3">{PAGE_params_only_rest('')}</span>
<span data-testid="PAGE_params_only_rest_empty_query">{PAGE_params_only_rest('', { a: 'b' })}</span>
<span data-testid="PAGE_params_only_rest_single">{PAGE_params_only_rest('single')}</span>
<span data-testid="PAGE_params_only_rest_one">{PAGE_params_only_rest(['single'])}</span>
<span data-testid="PAGE_params_only_rest_more">{PAGE_params_only_rest(['one', 'and', 'another'])}</span>
<span data-testid="PAGE_params_only_rest_query">{PAGE_params_only_rest(['abc', 'def'], { a: 'b' })}</span>
