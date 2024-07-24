<script>
  import { PAGE_params_one_two_int } from '$routes';
</script>

<span data-testid="PAGE_params_one_two_int">{PAGE_params_one_two_int({ one: '1', two: '2' })}</span>
<span data-testid="PAGE_params_one_two_int_query"
  >{PAGE_params_one_two_int({ one: '1', two: '2' }, { a: '123' })}</span
>
